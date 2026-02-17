"use client";

import { Edges, Environment, Html, OrbitControls, useProgress } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import {
  AssetLoader,
  AssetLoaderErrorBoundary,
  preloadVisualAsset,
  type LoadedAssetModel,
} from "@/components/builder/visual/AssetLoader";
import type {
  SubstrateHeightfield,
  VisualAnchorType,
  VisualAsset,
  VisualCanvasItem,
  VisualCanvasState,
  VisualDepthZone,
  VisualItemTransform,
  VisualTank,
} from "@/components/builder/visual/types";
import {
  getProceduralPlantModel,
  proceduralPlantSeedFromString,
} from "@/components/builder/visual/ProceduralPlants";
import {
  getProceduralRockModel,
  getProceduralWoodModel,
  proceduralHardscapeSeedFromString,
} from "@/components/builder/visual/ProceduralHardscape";
import {
  applySubstrateBrush,
  buildTransformFromNormalized,
  clamp01,
  depthZoneFromZ,
  estimateCollisionRadius,
  normalizedToWorld,
  sampleSubstrateDepth,
  worldToNormalized,
  type SceneDims,
  type SubstrateBrushMode,
} from "@/components/builder/visual/scene-utils";
import {
  BLOOM_INTENSITY,
  BLOOM_LUMINANCE_SMOOTHING,
  BLOOM_LUMINANCE_THRESHOLD,
  resolveScenePostprocessingPipeline,
} from "@/components/builder/visual/postprocessing";
import {
  resolveVisualAsset,
  useAsset,
  type ResolvedVisualAsset,
} from "@/components/builder/visual/useAsset";
import {
  normalizeSubstrateHeightfield,
  SUBSTRATE_HEIGHTFIELD_RESOLUTION,
} from "@/lib/visual/substrate";

export type BuilderSceneStep =
  | "tank"
  | "substrate"
  | "hardscape"
  | "plants"
  | "equipment"
  | "review";

export type BuilderSceneToolMode = "place" | "move" | "rotate" | "delete" | "sculpt";

export type BuilderSceneQualityTier = "high" | "medium" | "low";

type PlacementRequest = {
  asset: VisualAsset;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  anchorType: VisualAnchorType;
  depthZone: VisualDepthZone | null;
  transform: VisualItemTransform;
};

type SceneRenderItem = {
  item: VisualCanvasItem;
  asset: VisualAsset;
  position: THREE.Vector3;
  size: {
    width: number;
    height: number;
    depth: number;
  };
  collisionRadius: number;
};

type PlantInstancedGroup = {
  asset: VisualAsset;
  items: SceneRenderItem[];
};

type CameraPresetMode = "step" | "free";

type CameraDiagnosticEvent = {
  type: "unexpected_pose_delta_detected";
  step: BuilderSceneStep;
  positionDelta: number;
  targetDelta: number;
};

type CameraIntent = {
  type: "reframe" | "reset";
  seq: number;
};

type VisualBuilderSceneProps = {
  tank: VisualTank | null;
  canvasState: VisualCanvasState;
  assetsById: Map<string, VisualAsset>;
  selectedItemId: string | null;
  currentStep: BuilderSceneStep;
  toolMode: BuilderSceneToolMode;
  placementAsset: VisualAsset | null;
  placementRotationDeg: number;
  placementClusterCount: number;
  showDepthGuides: boolean;
  qualityTier: BuilderSceneQualityTier;
  postprocessingEnabled: boolean;
  glassWallsEnabled: boolean;
  sculptMode: SubstrateBrushMode;
  sculptBrushSize: number;
  sculptStrength: number;
  idleOrbit: boolean;
  cameraPresetMode: CameraPresetMode;
  equipmentAssets: VisualAsset[];
  onSelectItem: (itemId: string | null) => void;
  onHoverItem?: (itemId: string | null) => void;
  onPlaceItem: (request: PlacementRequest) => void;
  onMoveItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onRotateItem: (itemId: string, deltaDeg: number) => void;
  onSubstrateHeightfield: (next: SubstrateHeightfield) => void;
  onSubstrateStrokeStart?: () => void;
  onSubstrateStrokeEnd?: () => void;
  onCaptureCanvas?: (canvas: HTMLCanvasElement | null) => void;
  onCameraPresetModeChange?: (mode: CameraPresetMode) => void;
  onCameraDiagnostic?: (event: CameraDiagnosticEvent) => void;
  cameraIntent?: CameraIntent | null;
};

type PlacementCandidate = {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  anchorType: VisualAnchorType;
  anchorItemId: string | null;
};

const TEMP_VEC3 = new THREE.Vector3();
const TEMP_VEC3_B = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const PLANT_COLORS = ["#356f42", "#4f9f5f", "#2f6f3f", "#77ba65"];
const ROCK_COLORS = ["#6b767e", "#737f87", "#5b666d", "#87939c"];
const WOOD_COLORS = ["#6d4f35", "#7f5e3f", "#8a6441", "#5f462f"];

const CLUSTER_OFFSETS: ReadonlyArray<[number, number]> = [
  [0, 0],
  [0.03, 0.01],
  [-0.028, 0.016],
  [0.02, -0.03],
  [-0.018, -0.026],
  [0.034, -0.012],
  [-0.035, -0.007],
  [0.012, 0.033],
];

const SUBSTRATE_SURFACE_SCALE = 0.96;
const SUBSTRATE_DEFAULT_DEPTH_IN = 1.6;
const SUBSTRATE_MIN_DEPTH_IN = 0.2;
const SUBSTRATE_MAX_DEPTH_RATIO = 0.62;
const SUBSTRATE_HEIGHT_EPSILON = 0.0001;
const SUBSTRATE_HEIGHTFIELD_CELL_COUNT =
  SUBSTRATE_HEIGHTFIELD_RESOLUTION * SUBSTRATE_HEIGHTFIELD_RESOLUTION;
const ASSET_LOAD_RETRY_DELAY_MS = 3500;
const WATER_SURFACE_TEXTURE_SEED = 0x51f91f7;
const WATER_SURFACE_NOISE_SCALE = 5.25;
const WATER_SURFACE_OCTAVES = 4;
const CAUSTIC_TEXTURE_SEED = 0x2a9df53;
const SIMPLEX_F2 = (Math.sqrt(3) - 1) * 0.5;
const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;
const SIMPLEX_GRADIENTS_2D: ReadonlyArray<[number, number]> = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DISABLED_RAYCAST: THREE.Mesh["raycast"] = () => undefined;

const WATER_SURFACE_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform sampler2D uNormalMap;
  uniform float uTime;
  uniform float uWaveAmplitude;
  uniform float uWaveScale;
  uniform float uNormalStrength;

  void main() {
    vUv = uv;

    vec2 flowUvA = uv * uWaveScale + vec2(uTime * 0.036, -uTime * 0.028);
    vec2 flowUvB = uv * (uWaveScale * 1.74) + vec2(-uTime * 0.022, uTime * 0.031);

    vec3 waveSampleA = texture2D(uNormalMap, flowUvA).xyz * 2.0 - 1.0;
    vec3 waveSampleB = texture2D(uNormalMap, flowUvB).xyz * 2.0 - 1.0;
    vec2 wave = (waveSampleA.xy + waveSampleB.xy) * 0.5;

    vec3 transformed = position;
    transformed.z += wave.x * uWaveAmplitude;

    vec3 perturbedNormal = normalize(vec3(wave * uNormalStrength, 1.0));
    vWorldNormal = normalize(mat3(modelMatrix) * perturbedNormal);

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_SURFACE_FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform sampler2D uNormalMap;
  uniform float uTime;
  uniform vec3 uTintColor;
  uniform float uOpacity;
  uniform float uNormalStrength;
  uniform float uFlowScale;

  void main() {
    vec2 detailUvA = vUv * uFlowScale + vec2(uTime * 0.027, -uTime * 0.021);
    vec2 detailUvB = vUv * (uFlowScale * 1.63) + vec2(-uTime * 0.016, uTime * 0.024);

    vec3 detailA = texture2D(uNormalMap, detailUvA).xyz * 2.0 - 1.0;
    vec3 detailB = texture2D(uNormalMap, detailUvB).xyz * 2.0 - 1.0;

    vec3 detailNormal = normalize(vec3((detailA.xy + detailB.xy) * (0.5 * uNormalStrength), 1.0));
    vec3 normal = normalize(vWorldNormal + detailNormal * 0.42);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.35);
    float shimmer = 0.5 + 0.5 * sin((vUv.x * 21.0 + vUv.y * 17.0) + uTime * 1.9);
    float glint = pow(max(dot(normal, normalize(vec3(0.22, 0.95, 0.31))), 0.0), 16.0);

    vec3 tint = mix(uTintColor * 0.82, uTintColor * 1.12, shimmer * 0.28);
    vec3 color = tint + vec3(0.12, 0.18, 0.22) * fresnel + vec3(0.18, 0.26, 0.34) * glint;

    float alpha = clamp(uOpacity + fresnel * 0.22, 0.0, 0.72);
    gl_FragColor = vec4(color, alpha);
  }
`;

const BACKDROP_VERTEX_SHADER = `
  varying float vGradient;

  void main() {
    vGradient = clamp(position.y * 0.5 + 0.5, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_FRAGMENT_SHADER = `
  varying float vGradient;

  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform float uCurve;

  void main() {
    float t = pow(vGradient, uCurve);
    vec3 color = mix(uBottomColor, uTopColor, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

type SubstrateSamplingMap = {
  sourceIndex00: Uint16Array;
  sourceIndex10: Uint16Array;
  sourceIndex01: Uint16Array;
  sourceIndex11: Uint16Array;
  tx: Float32Array;
  tz: Float32Array;
};

type SubstrateGeometryData = {
  geometry: THREE.BufferGeometry;
  positionAttribute: THREE.BufferAttribute;
  sampling: SubstrateSamplingMap;
  sampledHeights: Float32Array;
  sourceValues: Float32Array;
  sourceChanged: Uint8Array;
};

function clampPointToTankBounds(point: THREE.Vector3, dims: SceneDims): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(point.x, -dims.widthIn * 0.49, dims.widthIn * 0.49),
    THREE.MathUtils.clamp(point.y, 0, dims.heightIn),
    THREE.MathUtils.clamp(point.z, -dims.depthIn * 0.49, dims.depthIn * 0.49),
  );
}

function clampRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0;
  if (rotation < -180) return -180;
  if (rotation > 180) return 180;
  return rotation;
}

function normalizeDims(tank: VisualTank | null, canvasState: VisualCanvasState): SceneDims {
  return {
    widthIn: tank?.widthIn ?? canvasState.widthIn,
    heightIn: tank?.heightIn ?? canvasState.heightIn,
    depthIn: tank?.depthIn ?? canvasState.depthIn,
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPermutationTable(seed: number): Uint8Array {
  const values = Array.from({ length: 256 }, (_, index) => index);
  const random = seededRandom(seed ^ 0x9e3779b9);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const next = values[index] ?? 0;
    values[index] = values[swapIndex] ?? 0;
    values[swapIndex] = next;
  }

  const permutation = new Uint8Array(512);
  for (let index = 0; index < permutation.length; index += 1) {
    permutation[index] = values[index & 255] ?? 0;
  }

  return permutation;
}

function simplexDot2(gradient: [number, number], x: number, y: number): number {
  return gradient[0] * x + gradient[1] * y;
}

function createSimplexNoise2D(seed: number): (x: number, y: number) => number {
  const permutation = buildPermutationTable(seed);
  const perm = (index: number): number => permutation[index & 511] ?? 0;

  return (x: number, y: number): number => {
    const skew = (x + y) * SIMPLEX_F2;
    const i = Math.floor(x + skew);
    const j = Math.floor(y + skew);

    const unskew = (i + j) * SIMPLEX_G2;
    const x0 = x - (i - unskew);
    const y0 = y - (j - unskew);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + SIMPLEX_G2;
    const y1 = y0 - j1 + SIMPLEX_G2;
    const x2 = x0 - 1 + SIMPLEX_G2 * 2;
    const y2 = y0 - 1 + SIMPLEX_G2 * 2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = perm(ii + perm(jj)) % SIMPLEX_GRADIENTS_2D.length;
    const gi1 = perm(ii + i1 + perm(jj + j1)) % SIMPLEX_GRADIENTS_2D.length;
    const gi2 = perm(ii + 1 + perm(jj + 1)) % SIMPLEX_GRADIENTS_2D.length;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    const t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const t0Squared = t0 * t0;
      n0 =
        t0Squared *
        t0Squared *
        simplexDot2(SIMPLEX_GRADIENTS_2D[gi0] ?? [1, 1], x0, y0);
    }

    const t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const t1Squared = t1 * t1;
      n1 =
        t1Squared *
        t1Squared *
        simplexDot2(SIMPLEX_GRADIENTS_2D[gi1] ?? [1, 1], x1, y1);
    }

    const t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const t2Squared = t2 * t2;
      n2 =
        t2Squared *
        t2Squared *
        simplexDot2(SIMPLEX_GRADIENTS_2D[gi2] ?? [1, 1], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  };
}

function sampleTileableSimplex2D(params: {
  noise: (x: number, y: number) => number;
  x: number;
  y: number;
  periodX: number;
  periodY: number;
}): number {
  const periodX = Math.max(0.0001, params.periodX);
  const periodY = Math.max(0.0001, params.periodY);
  const wrappedX = THREE.MathUtils.euclideanModulo(params.x, periodX);
  const wrappedY = THREE.MathUtils.euclideanModulo(params.y, periodY);
  const blendX = wrappedX / periodX;
  const blendY = wrappedY / periodY;

  const n00 = params.noise(wrappedX, wrappedY);
  const n10 = params.noise(wrappedX - periodX, wrappedY);
  const n01 = params.noise(wrappedX, wrappedY - periodY);
  const n11 = params.noise(wrappedX - periodX, wrappedY - periodY);

  const top = THREE.MathUtils.lerp(n00, n10, blendX);
  const bottom = THREE.MathUtils.lerp(n01, n11, blendX);
  return THREE.MathUtils.lerp(top, bottom, blendY);
}

function waterSurfaceTextureSize(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "low") return 64;
  if (qualityTier === "medium") return 128;
  return 256;
}

function waterSurfaceGridResolution(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "low") return 52;
  if (qualityTier === "medium") return 72;
  return 96;
}

function createWaterSurfaceNormalTexture(params: {
  size: number;
  seed: number;
}): THREE.DataTexture {
  const size = Math.max(32, Math.floor(params.size));
  const heights = new Float32Array(size * size);
  const noise = createSimplexNoise2D(params.seed);
  const maxIndex = Math.max(1, size - 1);

  for (let yIndex = 0; yIndex < size; yIndex += 1) {
    const yNorm = yIndex / maxIndex;

    for (let xIndex = 0; xIndex < size; xIndex += 1) {
      const xNorm = xIndex / maxIndex;
      let amplitude = 1;
      let frequency = 1;
      let amplitudeTotal = 0;
      let combined = 0;

      for (let octave = 0; octave < WATER_SURFACE_OCTAVES; octave += 1) {
        const period = WATER_SURFACE_NOISE_SCALE * frequency;
        const sampleX = xNorm * period + octave * 17.13;
        const sampleY = yNorm * period - octave * 11.87;
        const value = sampleTileableSimplex2D({
          noise,
          x: sampleX,
          y: sampleY,
          periodX: period,
          periodY: period,
        });

        combined += value * amplitude;
        amplitudeTotal += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      heights[yIndex * size + xIndex] =
        amplitudeTotal > 0 ? combined / amplitudeTotal : 0;
    }
  }

  const textureData = new Uint8Array(size * size * 4);

  for (let yIndex = 0; yIndex < size; yIndex += 1) {
    const upRow = ((yIndex + 1) % size) * size;
    const downRow = ((yIndex - 1 + size) % size) * size;
    const row = yIndex * size;

    for (let xIndex = 0; xIndex < size; xIndex += 1) {
      const leftColumn = (xIndex - 1 + size) % size;
      const rightColumn = (xIndex + 1) % size;

      const left = heights[row + leftColumn] ?? 0;
      const right = heights[row + rightColumn] ?? 0;
      const up = heights[upRow + xIndex] ?? 0;
      const down = heights[downRow + xIndex] ?? 0;

      const gradientX = (right - left) * 1.85;
      const gradientY = (up - down) * 1.85;
      const nx = -gradientX;
      const ny = -gradientY;
      const nz = 1;
      const invLength = 1 / Math.max(0.0001, Math.hypot(nx, ny, nz));

      const offset = (row + xIndex) * 4;
      textureData[offset] = Math.round((nx * invLength * 0.5 + 0.5) * 255);
      textureData[offset + 1] = Math.round((ny * invLength * 0.5 + 0.5) * 255);
      textureData[offset + 2] = Math.round((nz * invLength * 0.5 + 0.5) * 255);
      textureData[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    textureData,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

type CausticVoronoiLayer = {
  cellCount: number;
  speedX: number;
  speedY: number;
  weight: number;
  sharpness: number;
  seedOffset: number;
};

type AnimatedCausticTexture = {
  texture: THREE.DataTexture;
  data: Uint8Array;
  size: number;
  layers: ReadonlyArray<CausticVoronoiLayer>;
};

const CAUSTIC_LAYERS_BY_QUALITY: Record<BuilderSceneQualityTier, ReadonlyArray<CausticVoronoiLayer>> = {
  low: [
    {
      cellCount: 8,
      speedX: 0.028,
      speedY: -0.018,
      weight: 0.66,
      sharpness: 5.8,
      seedOffset: 0x17b8,
    },
    {
      cellCount: 14,
      speedX: -0.021,
      speedY: 0.024,
      weight: 0.34,
      sharpness: 7.4,
      seedOffset: 0x2ea1,
    },
  ],
  medium: [
    {
      cellCount: 9,
      speedX: 0.031,
      speedY: -0.02,
      weight: 0.45,
      sharpness: 6,
      seedOffset: 0x17b8,
    },
    {
      cellCount: 15,
      speedX: -0.023,
      speedY: 0.027,
      weight: 0.34,
      sharpness: 7.8,
      seedOffset: 0x2ea1,
    },
    {
      cellCount: 24,
      speedX: 0.017,
      speedY: 0.018,
      weight: 0.21,
      sharpness: 9.2,
      seedOffset: 0x438c,
    },
  ],
  high: [
    {
      cellCount: 10,
      speedX: 0.034,
      speedY: -0.022,
      weight: 0.42,
      sharpness: 6.2,
      seedOffset: 0x17b8,
    },
    {
      cellCount: 16,
      speedX: -0.024,
      speedY: 0.029,
      weight: 0.33,
      sharpness: 8,
      seedOffset: 0x2ea1,
    },
    {
      cellCount: 26,
      speedX: 0.019,
      speedY: 0.02,
      weight: 0.25,
      sharpness: 9.5,
      seedOffset: 0x438c,
    },
  ],
};

function causticTextureSize(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "low") return 56;
  if (qualityTier === "medium") return 72;
  return 96;
}

function causticEmissiveIntensity(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "low") return 0.1;
  if (qualityTier === "medium") return 0.15;
  return 0.19;
}

function hashGridFloat(params: {
  x: number;
  y: number;
  seed: number;
}): number {
  let value =
    Math.imul((params.x | 0) ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul((params.y | 0) ^ 0xc2b2ae35, 0x27d4eb2f) ^
    (params.seed | 0);

  value ^= value >>> 15;
  value = Math.imul(value, 0x2c1b3c6d);
  value ^= value >>> 12;
  value = Math.imul(value, 0x297a2d39);
  value ^= value >>> 15;

  return (value >>> 0) / 4294967296;
}

function sampleTileableVoronoiDistances(params: {
  u: number;
  v: number;
  cellCount: number;
  seed: number;
}): {
  f1: number;
  f2: number;
} {
  const cellCount = Math.max(1, Math.floor(params.cellCount));
  const sampleX = THREE.MathUtils.euclideanModulo(params.u, 1) * cellCount;
  const sampleY = THREE.MathUtils.euclideanModulo(params.v, 1) * cellCount;
  const baseCellX = Math.floor(sampleX);
  const baseCellY = Math.floor(sampleY);

  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  let secondNearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      const cellX = baseCellX + xOffset;
      const cellY = baseCellY + yOffset;

      const wrappedCellX = THREE.MathUtils.euclideanModulo(cellX, cellCount);
      const wrappedCellY = THREE.MathUtils.euclideanModulo(cellY, cellCount);
      const featureOffsetX = hashGridFloat({
        x: wrappedCellX,
        y: wrappedCellY,
        seed: params.seed,
      });
      const featureOffsetY = hashGridFloat({
        x: wrappedCellX,
        y: wrappedCellY,
        seed: params.seed ^ 0x9e3779b9,
      });

      const dx = cellX + featureOffsetX - sampleX;
      const dy = cellY + featureOffsetY - sampleY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < nearestDistanceSquared) {
        secondNearestDistanceSquared = nearestDistanceSquared;
        nearestDistanceSquared = distanceSquared;
      } else if (distanceSquared < secondNearestDistanceSquared) {
        secondNearestDistanceSquared = distanceSquared;
      }
    }
  }

  return {
    f1: Math.sqrt(Math.max(0, nearestDistanceSquared)),
    f2: Math.sqrt(Math.max(0, secondNearestDistanceSquared)),
  };
}

function sampleCausticLayer(params: {
  u: number;
  v: number;
  time: number;
  layer: CausticVoronoiLayer;
}): number {
  const shiftedU = THREE.MathUtils.euclideanModulo(
    params.u + params.time * params.layer.speedX,
    1,
  );
  const shiftedV = THREE.MathUtils.euclideanModulo(
    params.v + params.time * params.layer.speedY,
    1,
  );

  const distances = sampleTileableVoronoiDistances({
    u: shiftedU,
    v: shiftedV,
    cellCount: params.layer.cellCount,
    seed: CAUSTIC_TEXTURE_SEED ^ params.layer.seedOffset,
  });

  const separation = Math.max(0, distances.f2 - distances.f1);
  const ridge = 1 - THREE.MathUtils.clamp(separation * params.layer.sharpness, 0, 1);
  return ridge * ridge;
}

function createAnimatedCausticTexture(
  qualityTier: BuilderSceneQualityTier,
): AnimatedCausticTexture {
  const size = causticTextureSize(qualityTier);
  const data = new Uint8Array(size * size * 4);
  data.fill(0);

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    data,
    size,
    layers: CAUSTIC_LAYERS_BY_QUALITY[qualityTier],
  };
}

function updateAnimatedCausticTexture(params: {
  state: AnimatedCausticTexture;
  qualityTier: BuilderSceneQualityTier;
  time: number;
}) {
  const { data, size, layers, texture } = params.state;
  const maxIndex = Math.max(1, size - 1);
  const qualityGain =
    params.qualityTier === "high"
      ? 1
      : params.qualityTier === "medium"
        ? 0.88
        : 0.72;

  for (let yIndex = 0; yIndex < size; yIndex += 1) {
    const v = yIndex / maxIndex;

    for (let xIndex = 0; xIndex < size; xIndex += 1) {
      const u = xIndex / maxIndex;
      let combined = 0;
      let totalWeight = 0;

      for (const layer of layers) {
        combined +=
          sampleCausticLayer({
            u,
            v,
            time: params.time,
            layer,
          }) * layer.weight;
        totalWeight += layer.weight;
      }

      const normalized = totalWeight > 0 ? combined / totalWeight : 0;
      const shaped = Math.pow(normalized, 1.5);
      const thresholded = THREE.MathUtils.clamp(
        (shaped - 0.19) * 1.52 * qualityGain,
        0,
        1,
      );
      const shimmer =
        0.92 + Math.sin(u * 26.3 + v * 17.8 + params.time * 2.1) * 0.08;
      const luminance = THREE.MathUtils.clamp(thresholded * shimmer, 0, 1);
      const encoded = Math.round(luminance * 255);

      const offset = (yIndex * size + xIndex) * 4;
      data[offset] = encoded;
      data[offset + 1] = encoded;
      data[offset + 2] = encoded;
      data[offset + 3] = 255;
    }
  }

  texture.needsUpdate = true;
}

function cameraPreset(step: BuilderSceneStep, dims: SceneDims): {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
} {
  if (step === "tank") {
    return {
      position: [dims.widthIn * 0.95, dims.heightIn * 0.72, dims.depthIn * 1.24],
      target: [0, dims.heightIn * 0.35, 0],
      fov: 42,
    };
  }
  if (step === "substrate") {
    return {
      position: [dims.widthIn * 0.58, dims.heightIn * 0.98, dims.depthIn * 0.9],
      target: [0, dims.heightIn * 0.2, 0],
      fov: 38,
    };
  }
  if (step === "hardscape") {
    return {
      position: [dims.widthIn * 0.78, dims.heightIn * 0.66, dims.depthIn * 1.02],
      target: [0, dims.heightIn * 0.3, 0],
      fov: 40,
    };
  }
  if (step === "plants") {
    return {
      position: [dims.widthIn * 0.66, dims.heightIn * 0.54, dims.depthIn * 0.84],
      target: [0, dims.heightIn * 0.3, 0],
      fov: 37,
    };
  }
  if (step === "equipment") {
    return {
      position: [dims.widthIn * 0.92, dims.heightIn * 0.6, dims.depthIn * 1.08],
      target: [0, dims.heightIn * 0.42, 0],
      fov: 42,
    };
  }
  return {
    position: [dims.widthIn * 1.1, dims.heightIn * 0.78, dims.depthIn * 1.38],
    target: [0, dims.heightIn * 0.35, 0],
    fov: 44,
  };
}

function materialPalette(asset: VisualAsset): string[] {
  const type = (asset.materialType ?? "").toLowerCase();
  if (type.includes("wood") || type.includes("branch") || type.includes("root")) {
    return WOOD_COLORS;
  }
  if (asset.categorySlug === "plants") {
    return PLANT_COLORS;
  }
  return ROCK_COLORS;
}

function hasHardscapeAttach(asset: VisualAsset): boolean {
  if (asset.categorySlug !== "plants") return false;
  const tags = asset.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const placement = asset.plantProfile?.placement?.toLowerCase() ?? "";
  return (
    tags.some((tag) => tag.includes("epiphyte") || tag.includes("moss") || tag.includes("anubias")) ||
    placement.includes("hardscape") ||
    placement.includes("epiphyte")
  );
}

function loadedAssetUniformScale(target: SceneRenderItem["size"], bounds: THREE.Vector3): number {
  const scaleX = target.width / Math.max(0.001, bounds.x);
  const scaleY = target.height / Math.max(0.001, bounds.y);
  const scaleZ = target.depth / Math.max(0.001, bounds.z);
  return Math.max(0.001, Math.min(scaleX, scaleY, scaleZ));
}

function cloneInstancedMaterial(source: THREE.Material | null, fallbackColor: string): THREE.Material {
  if (source instanceof THREE.MeshStandardMaterial) {
    const cloned = source.clone();
    cloned.vertexColors = true;
    return cloned;
  }

  const fallback = new THREE.MeshStandardMaterial({
    color: fallbackColor,
    roughness: 0.76,
    metalness: 0.05,
  });
  fallback.vertexColors = true;
  return fallback;
}

function collectBuildAssetGlbPaths(params: {
  items: VisualCanvasItem[];
  assetsById: Map<string, VisualAsset>;
}): string[] {
  const paths = new Set<string>();

  for (const item of params.items) {
    const asset = params.assetsById.get(item.assetId);
    if (!asset) continue;

    const resolvedAsset = resolveVisualAsset(asset);
    if (!resolvedAsset.glbPath) continue;

    paths.add(resolvedAsset.glbPath);
  }

  return Array.from(paths);
}

function useRetryableFailedAssetPath(assetId: string): {
  failedPath: string | null;
  markPathFailed: (path: string) => void;
} {
  const [failureState, setFailureState] = useState<{
    assetId: string;
    path: string;
    failedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!failureState) return;

    const elapsedMs = Date.now() - failureState.failedAt;
    const timeoutMs = Math.max(0, ASSET_LOAD_RETRY_DELAY_MS - elapsedMs);

    const retryTimeout = window.setTimeout(() => {
      setFailureState((current) => {
        if (!current) return null;
        if (current.assetId !== failureState.assetId) return current;
        if (current.path !== failureState.path) return current;
        return null;
      });
    }, timeoutMs);

    return () => {
      window.clearTimeout(retryTimeout);
    };
  }, [failureState]);

  return {
    failedPath: failureState?.assetId === assetId ? failureState.path : null,
    markPathFailed: (path: string) => {
      if (!path) return;
      setFailureState({
        assetId,
        path,
        failedAt: Date.now(),
      });
    },
  };
}

function SceneAssetLoadingIndicator(props: {
  enabled: boolean;
}) {
  const { active, progress, loaded, total } = useProgress();
  const clampedProgress = Number.isFinite(progress)
    ? THREE.MathUtils.clamp(progress, 0, 100)
    : 0;

  if (!props.enabled || !active || total < 1 || loaded >= total) {
    return null;
  }

  return (
    <Html center style={{ pointerEvents: "none" }}>
      <div className="rounded-xl border border-white/20 bg-slate-950/82 px-3 py-2 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          <span className="text-[11px] font-semibold text-slate-100">Loading 3D assets</span>
          <span className="text-[10px] text-slate-300">{Math.round(clampedProgress)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-700/75">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-150"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

function itemWorldPosition(params: {
  item: VisualCanvasItem;
  dims: SceneDims;
  substrateHeightfield: SubstrateHeightfield;
}): THREE.Vector3 {
  const world = normalizedToWorld({
    x: params.item.x,
    y: params.item.y,
    z: params.item.z,
    dims: params.dims,
  });

  if (params.item.anchorType === "glass") {
    const side = params.item.x < 0.5 ? -1 : 1;
    return new THREE.Vector3(
      side * (params.dims.widthIn * 0.48),
      Math.max(params.dims.heightIn * 0.2, params.item.y * params.dims.heightIn),
      world.z,
    );
  }

  const substrateY = sampleSubstrateDepth({
    xNorm: params.item.x,
    zNorm: params.item.z,
    heightfield: params.substrateHeightfield,
    tankHeightIn: params.dims.heightIn,
  });

  return new THREE.Vector3(world.x, Math.max(substrateY, world.y), world.z);
}

function substrateGridResolution(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "low") return 24;
  if (qualityTier === "medium") return 32;
  return 48;
}

function clampSubstrateDepth(depth: number, tankHeightIn: number): number {
  const safeHeight = Math.max(1, tankHeightIn);
  const maxDepth = Math.max(SUBSTRATE_MIN_DEPTH_IN, safeHeight * SUBSTRATE_MAX_DEPTH_RATIO);
  if (!Number.isFinite(depth)) return SUBSTRATE_DEFAULT_DEPTH_IN;
  if (depth < SUBSTRATE_MIN_DEPTH_IN) return SUBSTRATE_MIN_DEPTH_IN;
  if (depth > maxDepth) return maxDepth;
  return depth;
}

function createSubstrateSamplingMap(resolution: number): SubstrateSamplingMap {
  const vertexCount = resolution * resolution;
  const sourceIndex00 = new Uint16Array(vertexCount);
  const sourceIndex10 = new Uint16Array(vertexCount);
  const sourceIndex01 = new Uint16Array(vertexCount);
  const sourceIndex11 = new Uint16Array(vertexCount);
  const tx = new Float32Array(vertexCount);
  const tz = new Float32Array(vertexCount);

  const maxTargetIndex = Math.max(1, resolution - 1);
  const maxSourceIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;

  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    const zNorm = zIndex / maxTargetIndex;
    const sourceZ = zNorm * maxSourceIndex;
    const sourceZ0 = Math.floor(sourceZ);
    const sourceZ1 = Math.min(maxSourceIndex, sourceZ0 + 1);
    const sourceTz = sourceZ - sourceZ0;

    for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
      const vertexIndex = zIndex * resolution + xIndex;
      const xNorm = xIndex / maxTargetIndex;
      const sourceX = xNorm * maxSourceIndex;
      const sourceX0 = Math.floor(sourceX);
      const sourceX1 = Math.min(maxSourceIndex, sourceX0 + 1);

      sourceIndex00[vertexIndex] = sourceZ0 * SUBSTRATE_HEIGHTFIELD_RESOLUTION + sourceX0;
      sourceIndex10[vertexIndex] = sourceZ0 * SUBSTRATE_HEIGHTFIELD_RESOLUTION + sourceX1;
      sourceIndex01[vertexIndex] = sourceZ1 * SUBSTRATE_HEIGHTFIELD_RESOLUTION + sourceX0;
      sourceIndex11[vertexIndex] = sourceZ1 * SUBSTRATE_HEIGHTFIELD_RESOLUTION + sourceX1;
      tx[vertexIndex] = sourceX - sourceX0;
      tz[vertexIndex] = sourceTz;
    }
  }

  return {
    sourceIndex00,
    sourceIndex10,
    sourceIndex01,
    sourceIndex11,
    tx,
    tz,
  };
}

function createSubstrateGeometryData(params: {
  widthIn: number;
  depthIn: number;
  qualityTier: BuilderSceneQualityTier;
}): SubstrateGeometryData {
  const resolution = substrateGridResolution(params.qualityTier);
  const vertexCount = resolution * resolution;
  const width = params.widthIn * SUBSTRATE_SURFACE_SCALE;
  const depth = params.depthIn * SUBSTRATE_SURFACE_SCALE;
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const maxIndex = Math.max(1, resolution - 1);

  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    const zNorm = zIndex / maxIndex;
    const zPosition = zNorm * depth - halfDepth;

    for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
      const vertexIndex = zIndex * resolution + xIndex;
      const xNorm = xIndex / maxIndex;
      const xPosition = xNorm * width - halfWidth;

      const positionOffset = vertexIndex * 3;
      positions[positionOffset] = xPosition;
      positions[positionOffset + 1] = 0;
      positions[positionOffset + 2] = zPosition;

      const uvOffset = vertexIndex * 2;
      uvs[uvOffset] = xNorm;
      uvs[uvOffset + 1] = zNorm;
    }
  }

  const quadCount = (resolution - 1) * (resolution - 1);
  const indices = new Uint16Array(quadCount * 6);
  let cursor = 0;

  for (let zIndex = 0; zIndex < resolution - 1; zIndex += 1) {
    for (let xIndex = 0; xIndex < resolution - 1; xIndex += 1) {
      const topLeft = zIndex * resolution + xIndex;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + resolution;
      const bottomRight = bottomLeft + 1;

      indices[cursor] = topLeft;
      indices[cursor + 1] = bottomLeft;
      indices[cursor + 2] = topRight;
      indices[cursor + 3] = topRight;
      indices[cursor + 4] = bottomLeft;
      indices[cursor + 5] = bottomRight;
      cursor += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const sampledHeights = new Float32Array(vertexCount);
  sampledHeights.fill(Number.NaN);

  const sourceValues = new Float32Array(SUBSTRATE_HEIGHTFIELD_CELL_COUNT);
  sourceValues.fill(Number.NaN);

  return {
    geometry,
    positionAttribute,
    sampling: createSubstrateSamplingMap(resolution),
    sampledHeights,
    sourceValues,
    sourceChanged: new Uint8Array(SUBSTRATE_HEIGHTFIELD_CELL_COUNT),
  };
}

function resolveSubstrateSourceHeightfield(params: {
  heightfield: SubstrateHeightfield;
  tankHeightIn: number;
}): SubstrateHeightfield {
  if (params.heightfield.length === SUBSTRATE_HEIGHTFIELD_CELL_COUNT) {
    return params.heightfield;
  }

  return normalizeSubstrateHeightfield(params.heightfield, params.tankHeightIn);
}

function refreshChangedSourceValues(params: {
  source: SubstrateHeightfield;
  sourceValues: Float32Array;
  sourceChanged: Uint8Array;
  tankHeightIn: number;
}): boolean {
  let hasChanges = false;

  for (let index = 0; index < SUBSTRATE_HEIGHTFIELD_CELL_COUNT; index += 1) {
    const raw = params.source[index];
    const nextValue = clampSubstrateDepth(
      Number.isFinite(raw) ? raw : SUBSTRATE_DEFAULT_DEPTH_IN,
      params.tankHeightIn,
    );
    const previousValue = params.sourceValues[index];
    const didChange =
      !Number.isFinite(previousValue) ||
      Math.abs(nextValue - previousValue) > SUBSTRATE_HEIGHT_EPSILON;

    params.sourceChanged[index] = didChange ? 1 : 0;
    if (!didChange) continue;

    params.sourceValues[index] = nextValue;
    hasChanges = true;
  }

  return hasChanges;
}

function isVertexAffectedBySourceChange(params: {
  vertexIndex: number;
  sampling: SubstrateSamplingMap;
  sourceChanged: Uint8Array;
}): boolean {
  const index00 = params.sampling.sourceIndex00[params.vertexIndex] ?? 0;
  const index10 = params.sampling.sourceIndex10[params.vertexIndex] ?? 0;
  const index01 = params.sampling.sourceIndex01[params.vertexIndex] ?? 0;
  const index11 = params.sampling.sourceIndex11[params.vertexIndex] ?? 0;

  return (
    params.sourceChanged[index00] === 1 ||
    params.sourceChanged[index10] === 1 ||
    params.sourceChanged[index01] === 1 ||
    params.sourceChanged[index11] === 1
  );
}

function sampleInterpolatedSubstrateHeight(params: {
  vertexIndex: number;
  sampling: SubstrateSamplingMap;
  sourceValues: Float32Array;
  tankHeightIn: number;
}): number {
  const index00 = params.sampling.sourceIndex00[params.vertexIndex] ?? 0;
  const index10 = params.sampling.sourceIndex10[params.vertexIndex] ?? 0;
  const index01 = params.sampling.sourceIndex01[params.vertexIndex] ?? 0;
  const index11 = params.sampling.sourceIndex11[params.vertexIndex] ?? 0;
  const tx = params.sampling.tx[params.vertexIndex] ?? 0;
  const tz = params.sampling.tz[params.vertexIndex] ?? 0;

  const v00 = params.sourceValues[index00] ?? SUBSTRATE_DEFAULT_DEPTH_IN;
  const v10 = params.sourceValues[index10] ?? SUBSTRATE_DEFAULT_DEPTH_IN;
  const v01 = params.sourceValues[index01] ?? SUBSTRATE_DEFAULT_DEPTH_IN;
  const v11 = params.sourceValues[index11] ?? SUBSTRATE_DEFAULT_DEPTH_IN;

  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return clampSubstrateDepth(top * (1 - tz) + bottom * tz, params.tankHeightIn);
}

function applyHeightfieldToSubstrateGeometry(params: {
  data: SubstrateGeometryData;
  heightfield: SubstrateHeightfield;
  tankHeightIn: number;
}): boolean {
  const source = resolveSubstrateSourceHeightfield({
    heightfield: params.heightfield,
    tankHeightIn: params.tankHeightIn,
  });

  const sourceDidChange = refreshChangedSourceValues({
    source,
    sourceValues: params.data.sourceValues,
    sourceChanged: params.data.sourceChanged,
    tankHeightIn: params.tankHeightIn,
  });

  if (!sourceDidChange) return false;

  const positionBuffer = params.data.positionAttribute.array;
  if (!(positionBuffer instanceof Float32Array)) return false;

  let changedVertices = false;

  for (let vertexIndex = 0; vertexIndex < params.data.sampledHeights.length; vertexIndex += 1) {
    const previousHeight = params.data.sampledHeights[vertexIndex];
    const needsUpdate =
      !Number.isFinite(previousHeight) ||
      isVertexAffectedBySourceChange({
        vertexIndex,
        sampling: params.data.sampling,
        sourceChanged: params.data.sourceChanged,
      });
    if (!needsUpdate) continue;

    const nextHeight = sampleInterpolatedSubstrateHeight({
      vertexIndex,
      sampling: params.data.sampling,
      sourceValues: params.data.sourceValues,
      tankHeightIn: params.tankHeightIn,
    });

    if (
      Number.isFinite(previousHeight) &&
      Math.abs(nextHeight - previousHeight) <= SUBSTRATE_HEIGHT_EPSILON
    ) {
      continue;
    }

    params.data.sampledHeights[vertexIndex] = nextHeight;
    positionBuffer[vertexIndex * 3 + 1] = nextHeight;
    changedVertices = true;
  }

  if (!changedVertices) return false;

  params.data.positionAttribute.needsUpdate = true;
  params.data.geometry.computeVertexNormals();
  params.data.geometry.computeBoundingSphere();

  const normalAttribute = params.data.geometry.getAttribute("normal");
  if (normalAttribute instanceof THREE.BufferAttribute) {
    normalAttribute.needsUpdate = true;
  }

  return true;
}

function SceneCaptureBridge(props: { onCaptureCanvas?: (canvas: HTMLCanvasElement | null) => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    props.onCaptureCanvas?.(gl.domElement);
    return () => {
      props.onCaptureCanvas?.(null);
    };
  }, [gl.domElement, props]);
  return null;
}

function CinematicCameraRig(props: {
  step: BuilderSceneStep;
  dims: SceneDims;
  idleOrbit: boolean;
  cameraPresetMode: CameraPresetMode;
  onCameraPresetModeChange?: (mode: CameraPresetMode) => void;
  onCameraDiagnostic?: (event: CameraDiagnosticEvent) => void;
  cameraIntent?: CameraIntent | null;
}) {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const preset = useMemo(() => cameraPreset(props.step, props.dims), [props.dims, props.step]);
  const prevStepRef = useRef<BuilderSceneStep>(props.step);
  const shouldAutoFrameRef = useRef(true);
  const transitionProbeRef = useRef<{
    step: BuilderSceneStep;
    startTime: number;
    startPosition: THREE.Vector3;
    startTarget: THREE.Vector3;
    fired: boolean;
  } | null>(null);
  const forcedPresetRef = useRef<ReturnType<typeof cameraPreset> | null>(null);
  const lastIntentSeqRef = useRef<number>(0);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (props.cameraPresetMode === "step") {
        props.onCameraPresetModeChange?.("free");
      }
    };

    controls.addEventListener("start", handleStart);
    return () => {
      controls.removeEventListener("start", handleStart);
    };
  }, [props.cameraPresetMode, props.onCameraPresetModeChange]);

  useEffect(() => {
    if (prevStepRef.current === props.step) return;
    prevStepRef.current = props.step;

    const controls = controlsRef.current;
    if (!controls) return;

    transitionProbeRef.current = {
      step: props.step,
      startTime: performance.now(),
      startPosition: camera.position.clone(),
      startTarget: controls.target.clone(),
      fired: false,
    };

    if (props.cameraPresetMode === "step") {
      shouldAutoFrameRef.current = true;
    }
  }, [camera.position, props.cameraPresetMode, props.step]);

  useEffect(() => {
    if (!props.cameraIntent) return;
    if (props.cameraIntent.seq <= lastIntentSeqRef.current) return;

    lastIntentSeqRef.current = props.cameraIntent.seq;
    shouldAutoFrameRef.current = true;

    if (props.cameraIntent.type === "reset") {
      forcedPresetRef.current = cameraPreset("review", props.dims);
    } else {
      forcedPresetRef.current = cameraPreset(props.step, props.dims);
    }

    if (props.cameraPresetMode !== "step") {
      props.onCameraPresetModeChange?.("step");
    }
  }, [props.cameraIntent, props.cameraPresetMode, props.dims, props.onCameraPresetModeChange, props.step]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const isStepOwned = props.cameraPresetMode === "step";

    if (isStepOwned && shouldAutoFrameRef.current) {
      const blend = 1 - Math.exp(-delta * 3.8);
      const activePreset = forcedPresetRef.current ?? preset;
      TEMP_VEC3.set(activePreset.position[0], activePreset.position[1], activePreset.position[2]);
      TEMP_VEC3_B.set(activePreset.target[0], activePreset.target[1], activePreset.target[2]);
      camera.position.lerp(TEMP_VEC3, blend);
      controls.target.lerp(TEMP_VEC3_B, blend);

      if (camera.position.distanceTo(TEMP_VEC3) < 0.05 && controls.target.distanceTo(TEMP_VEC3_B) < 0.05) {
        shouldAutoFrameRef.current = false;
        forcedPresetRef.current = null;
      }
    }

    if (props.idleOrbit && props.step === "review" && isStepOwned) {
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() + delta * 0.12);
    }

    const probe = transitionProbeRef.current;
    if (probe && !probe.fired && !isStepOwned && performance.now() - probe.startTime > 250) {
      const positionDelta = camera.position.distanceTo(probe.startPosition);
      const targetDelta = controls.target.distanceTo(probe.startTarget);
      if (positionDelta > 0.45 || targetDelta > 0.45) {
        props.onCameraDiagnostic?.({
          type: "unexpected_pose_delta_detected",
          step: probe.step,
          positionDelta,
          targetDelta,
        });
      }
      probe.fired = true;
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.55}
      minDistance={Math.max(10, props.dims.widthIn * 0.6)}
      maxDistance={Math.max(36, props.dims.widthIn * 3)}
      dampingFactor={0.18}
      enableDamping
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}

function ProceduralPlantMesh(props: {
  renderItem: SceneRenderItem;
  resolvedAsset: ResolvedVisualAsset;
  highlightColor: string | null;
}) {
  const seed = useMemo(
    () => proceduralPlantSeedFromString(props.renderItem.asset.id),
    [props.renderItem.asset.id],
  );
  const proceduralType = props.resolvedAsset.proceduralPlantType ?? "rosette";
  const model = useMemo(
    () =>
      getProceduralPlantModel({
        type: proceduralType,
        seed,
      }),
    [proceduralType, seed],
  );
  const material = useMemo(() => {
    const next = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.76,
      metalness: 0.04,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
    return next;
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const scale: [number, number, number] = [
    props.renderItem.size.width / Math.max(0.001, model.bounds.x),
    props.renderItem.size.height / Math.max(0.001, model.bounds.y),
    props.renderItem.size.depth / Math.max(0.001, model.bounds.z),
  ];

  return (
    <mesh castShadow receiveShadow geometry={model.geometry} material={material} scale={scale}>
      {props.highlightColor ? <Edges color={props.highlightColor} threshold={22} /> : null}
    </mesh>
  );
}

function ProceduralHardscapeMesh(props: {
  renderItem: SceneRenderItem;
  resolvedAsset: ResolvedVisualAsset;
  highlightColor: string | null;
}) {
  const seed = useMemo(
    () => proceduralHardscapeSeedFromString(props.renderItem.asset.id),
    [props.renderItem.asset.id],
  );
  const isWood = props.resolvedAsset.fallbackKind === "wood";
  const rockType = props.resolvedAsset.proceduralRockType ?? "jagged";
  const woodType = props.resolvedAsset.proceduralWoodType ?? "spider";
  const model = useMemo(
    () =>
      isWood
        ? getProceduralWoodModel({
            type: woodType,
            seed,
          })
        : getProceduralRockModel({
            type: rockType,
            seed,
          }),
    [isWood, rockType, seed, woodType],
  );
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: isWood ? 0.88 : 0.82,
        metalness: isWood ? 0.05 : 0.1,
        vertexColors: true,
      }),
    [isWood],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const scale: [number, number, number] = [
    props.renderItem.size.width / Math.max(0.001, model.bounds.x),
    props.renderItem.size.height / Math.max(0.001, model.bounds.y),
    props.renderItem.size.depth / Math.max(0.001, model.bounds.z),
  ];

  return (
    <mesh castShadow receiveShadow geometry={model.geometry} material={material} scale={scale}>
      {props.highlightColor ? (
        <Edges color={props.highlightColor} threshold={isWood ? 26 : 20} />
      ) : null}
    </mesh>
  );
}

function ProceduralItemMesh(props: {
  renderItem: SceneRenderItem;
  resolvedAsset: ResolvedVisualAsset;
  highlightColor: string | null;
}) {
  if (props.renderItem.asset.categorySlug === "plants") {
    return (
      <ProceduralPlantMesh
        renderItem={props.renderItem}
        resolvedAsset={props.resolvedAsset}
        highlightColor={props.highlightColor}
      />
    );
  }

  return (
    <ProceduralHardscapeMesh
      renderItem={props.renderItem}
      resolvedAsset={props.resolvedAsset}
      highlightColor={props.highlightColor}
    />
  );
}

function ItemMesh(props: {
  renderItem: SceneRenderItem;
  selected: boolean;
  hovered: boolean;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onRotate: (itemId: string, deltaDeg: number) => void;
  onDelete: (itemId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const baseYRotation = useMemo(
    () => (props.renderItem.item.rotation * Math.PI) / 180,
    [props.renderItem.item.rotation],
  );
  const highlightColor = props.selected ? "#cbf2dd" : props.hovered ? "#d6e9ff" : null;
  const { failedPath, markPathFailed } = useRetryableFailedAssetPath(props.renderItem.asset.id);
  const resolvedAsset = useAsset(props.renderItem.asset, { failedPath });

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const pulse = props.selected ? 1 + Math.sin(state.clock.elapsedTime * 4.1) * 0.02 : 1;
    group.rotation.y =
      props.renderItem.asset.categorySlug === "plants"
        ?
            baseYRotation +
            Math.sin(state.clock.elapsedTime * 1.25 + props.renderItem.position.x * 0.2) * 0.06
        : baseYRotation;
    group.scale.setScalar(pulse);
  });

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (props.toolMode === "delete") {
      props.onDelete(props.renderItem.item.id);
      return;
    }
    if (props.toolMode === "rotate") {
      props.onRotate(props.renderItem.item.id, props.renderItem.item.constraints.rotationSnapDeg);
      return;
    }
    props.onSelect(props.renderItem.item.id);
  };

  const proceduralMesh = (
    <ProceduralItemMesh
      renderItem={props.renderItem}
      resolvedAsset={resolvedAsset}
      highlightColor={highlightColor}
    />
  );

  return (
    <group
      ref={groupRef}
      position={props.renderItem.position}
      onClick={onClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        props.onHover(props.renderItem.item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        props.onHover(null);
      }}
    >
      {!resolvedAsset.glbPath ? (
        proceduralMesh
      ) : (
        <AssetLoaderErrorBoundary
          resetKey={`${props.renderItem.asset.id}:${resolvedAsset.glbPath}`}
          fallback={proceduralMesh}
          onError={() => {
            if (!resolvedAsset.glbPath) return;
            markPathFailed(resolvedAsset.glbPath);
          }}
        >
          <Suspense fallback={proceduralMesh}>
            <AssetLoader path={resolvedAsset.glbPath}>
              {(model) => {
                const scale = loadedAssetUniformScale(props.renderItem.size, model.bounds);
                return (
                  <mesh
                    castShadow
                    receiveShadow
                    geometry={model.geometry}
                    material={model.material}
                    scale={scale}
                  >
                    {highlightColor ? <Edges color={highlightColor} threshold={22} /> : null}
                  </mesh>
                );
              }}
            </AssetLoader>
          </Suspense>
        </AssetLoaderErrorBoundary>
      )}
    </group>
  );
}

function anchorTypeForRenderItem(renderItem: SceneRenderItem): VisualAnchorType {
  if (renderItem.item.categorySlug === "hardscape") return "hardscape";
  return renderItem.item.anchorType;
}

function InstancedPlantRenderer(props: {
  group: PlantInstancedGroup;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  bounds: THREE.Vector3;
  loadedModel: boolean;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onRotate: (itemId: string, deltaDeg: number) => void;
  onDelete: (itemId: string) => void;
  onSurfacePointer: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceDown: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrixObject = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const palette = useMemo(() => materialPalette(props.group.asset), [props.group.asset]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const now = state.clock.elapsedTime;

    for (let index = 0; index < props.group.items.length; index += 1) {
      const renderItem = props.group.items[index];
      if (!renderItem) continue;

      const isSelected = renderItem.item.id === props.selectedItemId;
      const isHovered = renderItem.item.id === props.hoveredItemId;
      const sway = Math.sin(now * 1.25 + renderItem.position.x * 0.2 + index * 0.31) * 0.06;
      const pulse = isSelected ? 1 + Math.sin(now * 4.1) * 0.02 : 1;

      matrixObject.position.copy(renderItem.position);
      matrixObject.rotation.set(0, (renderItem.item.rotation * Math.PI) / 180 + sway, 0);

      if (props.loadedModel) {
        const uniformScale = loadedAssetUniformScale(renderItem.size, props.bounds) * pulse;
        matrixObject.scale.setScalar(uniformScale);
      } else {
        matrixObject.scale.set(
          (renderItem.size.width / Math.max(0.001, props.bounds.x)) * pulse,
          (renderItem.size.height / Math.max(0.001, props.bounds.y)) * pulse,
          (renderItem.size.depth / Math.max(0.001, props.bounds.z)) * pulse,
        );
      }

      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);

      const baseColor = props.loadedModel
        ? (palette[index % palette.length] ?? palette[0] ?? "#4f9f5f")
        : "#ffffff";
      color.set(isSelected ? "#cbf2dd" : isHovered ? "#d6e9ff" : baseColor);
      mesh.setColorAt(index, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  const renderItemFromInstanceId = (instanceId: number | undefined): SceneRenderItem | null => {
    if (typeof instanceId !== "number" || !Number.isInteger(instanceId)) return null;
    return props.group.items[instanceId] ?? null;
  };

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const renderItem = renderItemFromInstanceId(event.instanceId);
    if (!renderItem) return;

    if (props.toolMode === "delete") {
      props.onDelete(renderItem.item.id);
      return;
    }

    if (props.toolMode === "rotate") {
      props.onRotate(renderItem.item.id, renderItem.item.constraints.rotationSnapDeg);
      return;
    }

    props.onSelect(renderItem.item.id);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[props.geometry, props.material, props.group.items.length]}
      castShadow
      receiveShadow
      onClick={onClick}
      onPointerMove={(event) => {
        event.stopPropagation();
        const renderItem = renderItemFromInstanceId(event.instanceId);
        if (!renderItem) return;

        props.onHover(renderItem.item.id);
        props.onSurfacePointer(event, anchorTypeForRenderItem(renderItem), renderItem.item.id);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const renderItem = renderItemFromInstanceId(event.instanceId);
        if (!renderItem) return;

        props.onSurfaceDown(event, anchorTypeForRenderItem(renderItem), renderItem.item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        props.onHover(null);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        props.onSurfaceUp(event);
      }}
    />
  );
}

function LoadedPlantInstancedRenderer(props: {
  group: PlantInstancedGroup;
  model: LoadedAssetModel;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onRotate: (itemId: string, deltaDeg: number) => void;
  onDelete: (itemId: string) => void;
  onSurfacePointer: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceDown: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const palette = useMemo(() => materialPalette(props.group.asset), [props.group.asset]);
  const material = useMemo(
    () => cloneInstancedMaterial(props.model.material, palette[1] ?? PLANT_COLORS[1]),
    [palette, props.model.material],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <InstancedPlantRenderer
      group={props.group}
      geometry={props.model.geometry}
      material={material}
      bounds={props.model.bounds}
      loadedModel
      selectedItemId={props.selectedItemId}
      hoveredItemId={props.hoveredItemId}
      toolMode={props.toolMode}
      onSelect={props.onSelect}
      onHover={props.onHover}
      onRotate={props.onRotate}
      onDelete={props.onDelete}
      onSurfacePointer={props.onSurfacePointer}
      onSurfaceDown={props.onSurfaceDown}
      onSurfaceUp={props.onSurfaceUp}
    />
  );
}

function PlantInstancedGroupMesh(props: {
  group: PlantInstancedGroup;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onRotate: (itemId: string, deltaDeg: number) => void;
  onDelete: (itemId: string) => void;
  onSurfacePointer: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceDown: (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => void;
  onSurfaceUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const { failedPath, markPathFailed } = useRetryableFailedAssetPath(props.group.asset.id);
  const resolvedAsset = useAsset(props.group.asset, { failedPath });
  const proceduralSeed = useMemo(
    () => proceduralPlantSeedFromString(props.group.asset.id),
    [props.group.asset.id],
  );
  const proceduralType = resolvedAsset.proceduralPlantType ?? "rosette";
  const fallbackModel = useMemo(
    () =>
      getProceduralPlantModel({
        type: proceduralType,
        seed: proceduralSeed,
      }),
    [proceduralSeed, proceduralType],
  );
  const fallbackMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.76,
        metalness: 0.04,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      fallbackMaterial.dispose();
    };
  }, [fallbackMaterial]);

  const fallbackNode = (
    <InstancedPlantRenderer
      group={props.group}
      geometry={fallbackModel.geometry}
      material={fallbackMaterial}
      bounds={fallbackModel.bounds}
      loadedModel={false}
      selectedItemId={props.selectedItemId}
      hoveredItemId={props.hoveredItemId}
      toolMode={props.toolMode}
      onSelect={props.onSelect}
      onHover={props.onHover}
      onRotate={props.onRotate}
      onDelete={props.onDelete}
      onSurfacePointer={props.onSurfacePointer}
      onSurfaceDown={props.onSurfaceDown}
      onSurfaceUp={props.onSurfaceUp}
    />
  );

  if (!resolvedAsset.glbPath) {
    return fallbackNode;
  }

  return (
    <AssetLoaderErrorBoundary
      resetKey={`${props.group.asset.id}:${resolvedAsset.glbPath}`}
      fallback={fallbackNode}
      onError={() => {
        if (!resolvedAsset.glbPath) return;
        markPathFailed(resolvedAsset.glbPath);
      }}
    >
      <Suspense fallback={fallbackNode}>
        <AssetLoader path={resolvedAsset.glbPath}>
          {(model) => (
            <LoadedPlantInstancedRenderer
              group={props.group}
              model={model}
              selectedItemId={props.selectedItemId}
              hoveredItemId={props.hoveredItemId}
              toolMode={props.toolMode}
              onSelect={props.onSelect}
              onHover={props.onHover}
              onRotate={props.onRotate}
              onDelete={props.onDelete}
              onSurfacePointer={props.onSurfacePointer}
              onSurfaceDown={props.onSurfaceDown}
              onSurfaceUp={props.onSurfaceUp}
            />
          )}
        </AssetLoader>
      </Suspense>
    </AssetLoaderErrorBoundary>
  );
}

function WaterSurfacePlane(props: {
  widthIn: number;
  depthIn: number;
  waterLineY: number;
  qualityTier: BuilderSceneQualityTier;
}) {
  const textureSize = waterSurfaceTextureSize(props.qualityTier);
  const segmentCount = waterSurfaceGridResolution(props.qualityTier);
  const normalTexture = useMemo(
    () =>
      createWaterSurfaceNormalTexture({
        size: textureSize,
        seed: WATER_SURFACE_TEXTURE_SEED,
      }),
    [textureSize],
  );

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const initialUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNormalMap: { value: null as THREE.Texture | null },
      uTintColor: { value: new THREE.Color("#5da7b5") },
      uOpacity: { value: 0.3 },
      uNormalStrength: { value: 0.58 },
      uFlowScale: { value: 4.4 },
      uWaveScale: { value: 3.2 },
      uWaveAmplitude: { value: 0.06 },
    }),
    [],
  );

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  useEffect(() => {
    const material = materialRef.current;
    if (material) {
      material.uniforms.uNormalMap.value = normalTexture;
    }

    return () => {
      const currentMaterial = materialRef.current;
      if (currentMaterial && currentMaterial.uniforms.uNormalMap.value === normalTexture) {
        currentMaterial.uniforms.uNormalMap.value = null;
      }
      normalTexture.dispose();
    };
  }, [normalTexture]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uFlowScale.value =
      props.qualityTier === "high" ? 4.8 : props.qualityTier === "medium" ? 4.35 : 4;
    material.uniforms.uWaveScale.value =
      props.qualityTier === "high" ? 3.4 : props.qualityTier === "medium" ? 3.1 : 2.8;
    material.uniforms.uNormalStrength.value =
      props.qualityTier === "low" ? 0.52 : 0.58;
    material.uniforms.uWaveAmplitude.value = Math.max(
      0.045,
      Math.min(0.1, Math.min(props.widthIn, props.depthIn) * 0.0019),
    );
  }, [props.depthIn, props.qualityTier, props.widthIn]);

  return (
    <mesh
      position={[0, props.waterLineY + 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={DISABLED_RAYCAST}
      renderOrder={24}
    >
      <planeGeometry
        args={[props.widthIn * 0.95, props.depthIn * 0.95, segmentCount, segmentCount]}
      />
      <shaderMaterial
        ref={materialRef}
        uniforms={initialUniforms}
        vertexShader={WATER_SURFACE_VERTEX_SHADER}
        fragmentShader={WATER_SURFACE_FRAGMENT_SHADER}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SceneBackdrop() {
  const uniforms = useMemo(
    () => ({
      uTopColor: { value: new THREE.Color("#1b3042") },
      uBottomColor: { value: new THREE.Color("#071019") },
      uCurve: { value: 1.25 },
    }),
    [],
  );

  return (
    <mesh scale={[460, 460, 460]} renderOrder={-1000} raycast={DISABLED_RAYCAST}>
      <sphereGeometry args={[1, 40, 26]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={BACKDROP_VERTEX_SHADER}
        fragmentShader={BACKDROP_FRAGMENT_SHADER}
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function SceneGroundPlane(props: { dims: SceneDims }) {
  const groundWidth = props.dims.widthIn * 3.6;
  const groundDepth = props.dims.depthIn * 3.4;
  const groundY = -0.16;

  return (
    <group>
      <mesh
        position={[0, groundY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={DISABLED_RAYCAST}
      >
        <planeGeometry args={[groundWidth, groundDepth]} />
        <meshStandardMaterial color="#141f29" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh
        position={[0, groundY + 0.0015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={DISABLED_RAYCAST}
      >
        <planeGeometry args={[groundWidth, groundDepth]} />
        <shadowMaterial transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function SubstrateCausticMaterial(props: {
  qualityTier: BuilderSceneQualityTier;
}) {
  const caustics = useMemo(
    () => createAnimatedCausticTexture(props.qualityTier),
    [props.qualityTier],
  );

  useFrame((state) => {
    updateAnimatedCausticTexture({
      state: caustics,
      qualityTier: props.qualityTier,
      time: state.clock.elapsedTime,
    });
  });

  useEffect(() => {
    updateAnimatedCausticTexture({
      state: caustics,
      qualityTier: props.qualityTier,
      time: 0,
    });

    return () => {
      caustics.texture.dispose();
    };
  }, [caustics, props.qualityTier]);

  return (
    <meshStandardMaterial
      color="#a68354"
      roughness={0.93}
      metalness={0.03}
      emissive="#8fbfca"
      emissiveMap={caustics.texture}
      emissiveIntensity={causticEmissiveIntensity(props.qualityTier)}
    />
  );
}

function TankShell(props: {
  dims: SceneDims;
  qualityTier: BuilderSceneQualityTier;
  substrateHeightfield: SubstrateHeightfield;
  showGlassWalls: boolean;
  showDepthGuides: boolean;
  currentStep: BuilderSceneStep;
  onSurfacePointer: (event: ThreeEvent<PointerEvent>, anchorType: VisualAnchorType, itemId: string | null) => void;
  onSurfaceDown: (event: ThreeEvent<PointerEvent>, anchorType: VisualAnchorType, itemId: string | null) => void;
  onSurfaceUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const substrateGeometryData = useMemo(
    () =>
      createSubstrateGeometryData({
        widthIn: props.dims.widthIn,
        depthIn: props.dims.depthIn,
        qualityTier: props.qualityTier,
      }),
    [props.dims.widthIn, props.dims.depthIn, props.qualityTier],
  );

  useLayoutEffect(() => {
    applyHeightfieldToSubstrateGeometry({
      data: substrateGeometryData,
      heightfield: props.substrateHeightfield,
      tankHeightIn: props.dims.heightIn,
    });
  }, [props.substrateHeightfield, props.dims.heightIn, substrateGeometryData]);

  useEffect(() => {
    return () => {
      substrateGeometryData.geometry.dispose();
    };
  }, [substrateGeometryData]);

  const waterHeight = props.dims.heightIn * 0.94;
  const wallCenterY = props.dims.heightIn * 0.5;
  const halfWidth = props.dims.widthIn * 0.5;
  const halfDepth = props.dims.depthIn * 0.5;

  return (
    <group>
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[props.dims.widthIn * 0.98, 0.1, props.dims.depthIn * 0.98]} />
        <meshStandardMaterial color="#2f2924" roughness={0.95} metalness={0.02} />
      </mesh>

      <mesh
        position={[0, waterHeight * 0.5, 0]}
        receiveShadow
        onPointerMove={(event) => props.onSurfacePointer(event, "substrate", null)}
        onPointerDown={(event) => props.onSurfaceDown(event, "substrate", null)}
        onPointerUp={props.onSurfaceUp}
      >
        <boxGeometry args={[props.dims.widthIn * 0.95, waterHeight, props.dims.depthIn * 0.95]} />
        <meshPhysicalMaterial
          color="#8ec9da"
          transparent
          opacity={0.22}
          transmission={0.92}
          roughness={0.08}
          ior={1.33}
          thickness={2}
          attenuationColor="#5ea6ba"
          attenuationDistance={30}
        />
      </mesh>

      <WaterSurfacePlane
        widthIn={props.dims.widthIn}
        depthIn={props.dims.depthIn}
        waterLineY={waterHeight}
        qualityTier={props.qualityTier}
      />

      {props.showGlassWalls ? (
        <group>
          <mesh position={[0, wallCenterY, halfDepth]} receiveShadow>
            <planeGeometry args={[props.dims.widthIn, props.dims.heightIn]} />
            <meshPhysicalMaterial
              color="#cfefff"
              transparent
              opacity={0.18}
              transmission={0.9}
              roughness={0.05}
              thickness={0.3}
              ior={1.48}
              clearcoat={1}
              clearcoatRoughness={0.03}
              envMapIntensity={1.15}
              side={THREE.BackSide}
            />
          </mesh>

          <mesh position={[-halfWidth, wallCenterY, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[props.dims.depthIn, props.dims.heightIn]} />
            <meshPhysicalMaterial
              color="#cfefff"
              transparent
              opacity={0.18}
              transmission={0.9}
              roughness={0.05}
              thickness={0.3}
              ior={1.48}
              clearcoat={1}
              clearcoatRoughness={0.03}
              envMapIntensity={1.15}
              side={THREE.BackSide}
            />
          </mesh>

          <mesh position={[halfWidth, wallCenterY, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[props.dims.depthIn, props.dims.heightIn]} />
            <meshPhysicalMaterial
              color="#cfefff"
              transparent
              opacity={0.18}
              transmission={0.9}
              roughness={0.05}
              thickness={0.3}
              ior={1.48}
              clearcoat={1}
              clearcoatRoughness={0.03}
              envMapIntensity={1.15}
              side={THREE.BackSide}
            />
          </mesh>
        </group>
      ) : null}

      <mesh
        geometry={substrateGeometryData.geometry}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
        onPointerMove={(event) => props.onSurfacePointer(event, "substrate", null)}
        onPointerDown={(event) => props.onSurfaceDown(event, "substrate", null)}
        onPointerUp={props.onSurfaceUp}
      >
        <SubstrateCausticMaterial qualityTier={props.qualityTier} />
      </mesh>

      {props.showDepthGuides && (props.currentStep === "plants" || props.currentStep === "hardscape") ? (
        <group>
          {[0.2, 0.5, 0.8].map((zone, index) => (
            <mesh
              key={zone}
              position={[0, 0.3, (zone - 0.5) * props.dims.depthIn]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow={false}
            >
              <planeGeometry args={[props.dims.widthIn * 0.96, props.dims.depthIn * 0.24]} />
              <meshBasicMaterial
                color={index === 0 ? "#8cb6c6" : index === 1 ? "#7daea1" : "#8a9fcf"}
                transparent
                opacity={0.08}
              />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
}

function PlacementGhost(props: {
  candidate: PlacementCandidate;
  asset: VisualAsset;
  valid: boolean;
  rotationDeg: number;
  scale: number;
}) {
  const color = props.valid ? "#8ee8c5" : "#ef7f7f";
  const width = Math.max(0.3, props.asset.widthIn * props.scale * 0.18);
  const depth = Math.max(0.3, props.asset.depthIn * props.scale * 0.18);
  const height = Math.max(0.4, props.asset.heightIn * props.scale * 0.18);

  return (
    <group
      position={props.candidate.point}
      rotation={[0, (props.rotationDeg * Math.PI) / 180, 0]}
    >
      {props.asset.categorySlug === "plants" ? (
        <mesh position={[0, height * 0.5, 0]}>
          <coneGeometry args={[width * 0.36, height, 6]} />
          <meshStandardMaterial color={color} transparent opacity={0.42} />
          <Edges color={color} threshold={18} />
        </mesh>
      ) : (
        <mesh position={[0, height * 0.5, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} transparent opacity={0.34} />
          <Edges color={color} threshold={16} />
        </mesh>
      )}
    </group>
  );
}

function SceneRoot(props: VisualBuilderSceneProps) {
  const dims = useMemo(() => normalizeDims(props.tank, props.canvasState), [props.canvasState, props.tank]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<PlacementCandidate | null>(null);
  const sculptingRef = useRef(false);
  const onSubstrateStrokeStart = props.onSubstrateStrokeStart;
  const onSubstrateStrokeEnd = props.onSubstrateStrokeEnd;

  const renderItems = useMemo(() => {
    const resolved: SceneRenderItem[] = [];
    for (const item of props.canvasState.items) {
      const asset = props.assetsById.get(item.assetId);
      if (!asset) continue;
      const position = itemWorldPosition({
        item,
        dims,
        substrateHeightfield: props.canvasState.substrateHeightfield,
      });
      const size = {
        width: Math.max(0.35, asset.widthIn * item.scale * 0.18),
        height: Math.max(0.35, asset.heightIn * item.scale * 0.18),
        depth: Math.max(0.35, asset.depthIn * item.scale * 0.18),
      };

      resolved.push({
        item,
        asset,
        position,
        size,
        collisionRadius: estimateCollisionRadius({
          item,
          assetWidthIn: asset.widthIn,
          assetDepthIn: asset.depthIn,
        }),
      });
    }
    return resolved;
  }, [dims, props.assetsById, props.canvasState.items, props.canvasState.substrateHeightfield]);

  const loadableAssetPaths = useMemo(
    () =>
      collectBuildAssetGlbPaths({
        items: props.canvasState.items,
        assetsById: props.assetsById,
      }),
    [props.assetsById, props.canvasState.items],
  );

  const postprocessingPipeline = resolveScenePostprocessingPipeline({
    enabled: props.postprocessingEnabled,
    qualityTier: props.qualityTier,
  });

  const { singleRenderItems, plantInstancedGroups } = useMemo(() => {
    const singles: SceneRenderItem[] = [];
    const groupedPlants = new Map<string, PlantInstancedGroup>();

    for (const renderItem of renderItems) {
      if (renderItem.asset.categorySlug !== "plants") {
        singles.push(renderItem);
        continue;
      }

      const existingGroup = groupedPlants.get(renderItem.asset.id);
      if (!existingGroup) {
        groupedPlants.set(renderItem.asset.id, {
          asset: renderItem.asset,
          items: [renderItem],
        });
        continue;
      }

      existingGroup.items.push(renderItem);
    }

    const instanced: PlantInstancedGroup[] = [];
    for (const group of groupedPlants.values()) {
      if (group.items.length < 2) {
        singles.push(...group.items);
        continue;
      }
      instanced.push(group);
    }

    return {
      singleRenderItems: singles,
      plantInstancedGroups: instanced,
    };
  }, [renderItems]);

  useEffect(() => {
    props.onHoverItem?.(hoveredItemId);
  }, [hoveredItemId, props]);

  const finishSculptStroke = () => {
    if (!sculptingRef.current) return;
    sculptingRef.current = false;
    onSubstrateStrokeEnd?.();
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (!sculptingRef.current) return;
      sculptingRef.current = false;
      onSubstrateStrokeEnd?.();
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      handleGlobalPointerUp();
    };
  }, [onSubstrateStrokeEnd]);

  useEffect(() => {
    if (props.toolMode === "sculpt" && props.currentStep === "substrate") {
      return;
    }

    finishSculptStroke();
  }, [props.currentStep, props.toolMode, onSubstrateStrokeEnd, finishSculptStroke]);

  const evaluatePlacement = (
    nextCandidate: PlacementCandidate | null,
    asset: VisualAsset | null,
  ): { valid: boolean; yNorm: number; xNorm: number; zNorm: number } => {
    if (!nextCandidate || !asset) return { valid: false, yNorm: 0, xNorm: 0, zNorm: 0 };

    const snappedPoint = clampPointToTankBounds(nextCandidate.point, dims);

    const norm = worldToNormalized({
      x: snappedPoint.x,
      y: snappedPoint.y,
      z: snappedPoint.z,
      dims,
    });

    const yNorm = clamp01(snappedPoint.y / Math.max(1, dims.heightIn));
    const scale = Math.max(0.1, asset.defaultScale);

    const mockItem: VisualCanvasItem = {
      id: "preview",
      assetId: asset.id,
      assetType: asset.type,
      categorySlug: asset.categorySlug,
      sku: asset.sku,
      variant: asset.slug,
      x: norm.x,
      y: yNorm,
      z: norm.z,
      scale,
      rotation: props.placementRotationDeg,
      layer: 0,
      anchorType: nextCandidate.anchorType,
      depthZone: depthZoneFromZ(norm.z),
      constraints: {
        snapToSurface: true,
        canAttachToHardscape: hasHardscapeAttach(asset),
        requiresSubstrate: asset.categorySlug === "plants",
        rotationSnapDeg: asset.categorySlug === "plants" ? 5 : 15,
        collisionRadiusIn: 1.5,
      },
      transform: buildTransformFromNormalized({
        x: norm.x,
        y: yNorm,
        z: norm.z,
        scale,
        rotation: props.placementRotationDeg,
        dims,
      }),
    };

    const previewRadius = estimateCollisionRadius({
      item: mockItem,
      assetWidthIn: asset.widthIn,
      assetDepthIn: asset.depthIn,
    });

    let valid = true;
    for (const placed of renderItems) {
      const distance = placed.position.distanceTo(snappedPoint);
      if (distance < previewRadius + placed.collisionRadius * 0.88) {
        valid = false;
        break;
      }
    }

    if (nextCandidate.anchorType === "hardscape" && !hasHardscapeAttach(asset) && asset.categorySlug === "plants") {
      valid = false;
    }

    const insideX = Math.abs(snappedPoint.x) <= dims.widthIn * 0.49;
    const insideZ = Math.abs(snappedPoint.z) <= dims.depthIn * 0.49;
    const insideY = snappedPoint.y >= 0 && snappedPoint.y <= dims.heightIn;
    valid = valid && insideX && insideZ && insideY;

    return { valid, xNorm: norm.x, yNorm, zNorm: norm.z };
  };

  const placementValidity = evaluatePlacement(candidate, props.placementAsset);

  const performPlacement = (nextCandidate?: PlacementCandidate) => {
    const activeCandidate = nextCandidate ?? candidate;
    if (!props.placementAsset || !activeCandidate) return;
    const validity = evaluatePlacement(activeCandidate, props.placementAsset);
    if (!validity.valid) return;

    const count = Math.max(1, props.placementClusterCount);
    const anchorType = activeCandidate.anchorType;
    for (let i = 0; i < count; i += 1) {
      const offset = CLUSTER_OFFSETS[i % CLUSTER_OFFSETS.length] ?? [0, 0];
      const xNorm = clamp01(validity.xNorm + offset[0] * Math.min(1, props.sculptBrushSize + 0.25));
      const zNorm = clamp01(validity.zNorm + offset[1] * Math.min(1, props.sculptBrushSize + 0.25));
      const substrateY = sampleSubstrateDepth({
        xNorm,
        zNorm,
        heightfield: props.canvasState.substrateHeightfield,
        tankHeightIn: dims.heightIn,
      });
      const yNorm = clamp01(substrateY / Math.max(1, dims.heightIn));
      const scale = Math.max(0.1, props.placementAsset.defaultScale);

      props.onPlaceItem({
        asset: props.placementAsset,
        x: xNorm,
        y: yNorm,
        z: zNorm,
        scale,
        rotation: clampRotation(props.placementRotationDeg),
        anchorType,
        depthZone: depthZoneFromZ(zNorm),
        transform: buildTransformFromNormalized({
          x: xNorm,
          y: yNorm,
          z: zNorm,
          scale,
          rotation: clampRotation(props.placementRotationDeg),
          dims,
        }),
      });
    }
  };

  const sculptAtPoint = (point: THREE.Vector3) => {
    const normalized = worldToNormalized({
      x: point.x,
      y: point.y,
      z: point.z,
      dims,
    });

    const nextHeightfield = applySubstrateBrush({
      heightfield: props.canvasState.substrateHeightfield,
      mode: props.sculptMode,
      xNorm: normalized.x,
      zNorm: normalized.z,
      brushSize: props.sculptBrushSize,
      strength: props.sculptStrength,
      tankHeightIn: dims.heightIn,
    });
    props.onSubstrateHeightfield(nextHeightfield);
  };

  const handleSurfacePointer = (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => {
    event.stopPropagation();

    const isMoveDragGesture =
      event.buttons === 1 || (event.pointerType === "touch" && event.isPrimary);

    if (props.toolMode === "move" && props.selectedItemId && isMoveDragGesture) {
      const norm = worldToNormalized({
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
        dims,
      });
      const substrateY = sampleSubstrateDepth({
        xNorm: norm.x,
        zNorm: norm.z,
        heightfield: props.canvasState.substrateHeightfield,
        tankHeightIn: dims.heightIn,
      });
      const yNorm = clamp01(substrateY / Math.max(1, dims.heightIn));
      props.onMoveItem(props.selectedItemId, {
        x: norm.x,
        y: yNorm,
        z: norm.z,
        anchorType: "substrate",
        depthZone: depthZoneFromZ(norm.z),
        transform: buildTransformFromNormalized({
          x: norm.x,
          y: yNorm,
          z: norm.z,
          scale:
            props.canvasState.items.find((item) => item.id === props.selectedItemId)?.scale ?? 1,
          rotation:
            props.canvasState.items.find((item) => item.id === props.selectedItemId)?.rotation ?? 0,
          dims,
        }),
      });
    }

    if (props.toolMode === "sculpt" && sculptingRef.current && props.currentStep === "substrate") {
      sculptAtPoint(event.point);
    }

    const surfaceNormal = event.face?.normal
      ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
      : WORLD_UP.clone();
    setCandidate({
      point: event.point.clone(),
      normal: surfaceNormal,
      anchorType,
      anchorItemId: itemId,
    });
  };

  const handleSurfaceDown = (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => {
    event.stopPropagation();

    if (props.toolMode === "sculpt" && props.currentStep === "substrate") {
      if (!sculptingRef.current) {
        sculptingRef.current = true;
        onSubstrateStrokeStart?.();
      }
      sculptAtPoint(event.point);
      return;
    }

    if (props.toolMode === "move" && props.selectedItemId) {
      handleSurfacePointer(event, anchorType, itemId);
      return;
    }

    if (props.toolMode === "place" && props.placementAsset) {
      const surfaceNormal = event.face?.normal
        ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
        : WORLD_UP.clone();
      const immediateCandidate: PlacementCandidate = {
        point: event.point.clone(),
        normal: surfaceNormal,
        anchorType,
        anchorItemId: itemId,
      };
      setCandidate(immediateCandidate);
      performPlacement(immediateCandidate);
      return;
    }

    props.onSelectItem(null);
  };

  const handleSurfaceUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    finishSculptStroke();
  };

  const shadowMapSize = props.qualityTier === "high" ? 2048 : props.qualityTier === "medium" ? 1536 : 1024;

  return (
    <>
      <color attach="background" args={["#071019"]} />
      <SceneBackdrop />
      <fogExp2 attach="fog" args={["#0b1723", props.qualityTier === "low" ? 0.027 : 0.019]} />

      <ambientLight intensity={0.46} color="#a4c0d3" />
      <directionalLight
        castShadow
        intensity={1.25}
        color="#ffe9cc"
        position={[dims.widthIn * 0.72, dims.heightIn * 1.55, dims.depthIn * 1.05]}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-dims.widthIn * 1.1}
        shadow-camera-right={dims.widthIn * 1.1}
        shadow-camera-top={dims.heightIn * 1.35}
        shadow-camera-bottom={-dims.heightIn * 0.8}
        shadow-camera-near={0.4}
        shadow-camera-far={dims.widthIn * 4.4}
        shadow-bias={-0.0002}
      />
      <Environment preset="city" background={false} blur={0.66} />

      <SceneGroundPlane dims={dims} />

      <TankShell
        dims={dims}
        qualityTier={props.qualityTier}
        substrateHeightfield={props.canvasState.substrateHeightfield}
        showGlassWalls={props.glassWallsEnabled && props.qualityTier !== "low"}
        showDepthGuides={props.showDepthGuides}
        currentStep={props.currentStep}
        onSurfacePointer={handleSurfacePointer}
        onSurfaceDown={handleSurfaceDown}
        onSurfaceUp={handleSurfaceUp}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        onPointerMove={(event) => handleSurfacePointer(event, "substrate", null)}
        onPointerDown={(event) => handleSurfaceDown(event, "substrate", null)}
        onPointerUp={handleSurfaceUp}
      >
        <planeGeometry args={[dims.widthIn * 2.6, dims.depthIn * 2.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>

      {singleRenderItems.map((renderItem) => (
        <group
          key={renderItem.item.id}
          onPointerMove={(event) =>
            handleSurfacePointer(event, anchorTypeForRenderItem(renderItem), renderItem.item.id)
          }
          onPointerDown={(event) =>
            handleSurfaceDown(event, anchorTypeForRenderItem(renderItem), renderItem.item.id)
          }
          onPointerUp={handleSurfaceUp}
        >
          <ItemMesh
            renderItem={renderItem}
            selected={renderItem.item.id === props.selectedItemId}
            hovered={renderItem.item.id === hoveredItemId}
            toolMode={props.toolMode}
            onSelect={props.onSelectItem}
            onHover={setHoveredItemId}
            onRotate={props.onRotateItem}
            onDelete={props.onDeleteItem}
          />
        </group>
      ))}

      {plantInstancedGroups.map((group) => (
        <PlantInstancedGroupMesh
          key={`${group.asset.id}:${group.items.length}`}
          group={group}
          selectedItemId={props.selectedItemId}
          hoveredItemId={hoveredItemId}
          toolMode={props.toolMode}
          onSelect={props.onSelectItem}
          onHover={setHoveredItemId}
          onRotate={props.onRotateItem}
          onDelete={props.onDeleteItem}
          onSurfacePointer={handleSurfacePointer}
          onSurfaceDown={handleSurfaceDown}
          onSurfaceUp={handleSurfaceUp}
        />
      ))}

      {props.equipmentAssets.map((asset, index) => {
        const equipmentHeight = Math.max(0.8, asset.heightIn * 0.09);
        const y = dims.heightIn * 0.26 + index * equipmentHeight * 1.5;
        const z = -dims.depthIn * 0.44 + (index % 3) * (dims.depthIn * 0.18);
        return (
          <mesh key={`equipment-${asset.id}-${index}`} position={[dims.widthIn * 0.46, y, z]} castShadow>
            <boxGeometry args={[0.45, equipmentHeight, 0.45]} />
            <meshStandardMaterial color="#b7c6d8" roughness={0.56} metalness={0.32} />
          </mesh>
        );
      })}

      {props.placementAsset && candidate ? (
        <PlacementGhost
          candidate={candidate}
          asset={props.placementAsset}
          valid={placementValidity.valid}
          rotationDeg={props.placementRotationDeg}
          scale={Math.max(0.1, props.placementAsset.defaultScale)}
        />
      ) : null}

      <SceneAssetLoadingIndicator enabled={loadableAssetPaths.length > 0} />

      {postprocessingPipeline === "full" ? (
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
            luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
            intensity={BLOOM_INTENSITY}
          />
          <Vignette eskil={false} offset={0.24} darkness={0.33} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      ) : postprocessingPipeline === "bloom" ? (
        <EffectComposer multisampling={2}>
          <Bloom
            luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
            luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
            intensity={BLOOM_INTENSITY}
          />
        </EffectComposer>
      ) : null}

      <CinematicCameraRig
        step={props.currentStep}
        dims={dims}
        idleOrbit={props.idleOrbit}
        cameraPresetMode={props.cameraPresetMode}
        onCameraPresetModeChange={props.onCameraPresetModeChange}
        onCameraDiagnostic={props.onCameraDiagnostic}
        cameraIntent={props.cameraIntent}
      />
      <SceneCaptureBridge onCaptureCanvas={props.onCaptureCanvas} />
    </>
  );
}

export function VisualBuilderScene(props: VisualBuilderSceneProps) {
  const dims = useMemo(() => normalizeDims(props.tank, props.canvasState), [props.canvasState, props.tank]);
  const camera = useMemo(() => cameraPreset(props.currentStep, dims), [dims, props.currentStep]);
  const buildAssetGlbPaths = useMemo(
    () =>
      collectBuildAssetGlbPaths({
        items: props.canvasState.items,
        assetsById: props.assetsById,
      }),
    [props.assetsById, props.canvasState.items],
  );
  const preloadedAssetPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (buildAssetGlbPaths.length === 0) return;

    for (const path of buildAssetGlbPaths) {
      if (preloadedAssetPathsRef.current.has(path)) continue;
      preloadVisualAsset(path);
      preloadedAssetPathsRef.current.add(path);
    }
  }, [buildAssetGlbPaths]);

  return (
    <Canvas
      shadows={props.qualityTier !== "low"}
      dpr={props.qualityTier === "high" ? [1, 2] : props.qualityTier === "medium" ? [1, 1.6] : [1, 1.25]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      camera={{
        position: camera.position,
        fov: camera.fov,
        near: 0.1,
        far: 800,
      }}
      onPointerMissed={() => {
        props.onSelectItem(null);
      }}
      style={{ touchAction: "none" }}
    >
      <SceneRoot {...props} />
    </Canvas>
  );
}
