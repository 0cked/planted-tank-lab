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
  SubstrateMaterialGrid,
  SubstrateMaterialType,
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
import { EquipmentVisuals } from "@/components/builder/visual/EquipmentVisuals";
import {
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
  clampLightMountHeightIn,
  estimateParAtSubstratePoint,
  resolveLightSimulationSource,
  writeParHeatmapColor,
  type LightSimulationSource,
} from "@/components/builder/visual/light-simulation";
import {
  resolvePlantGrowthScale,
  type GrowthTimelineMonths,
} from "@/components/builder/visual/plant-growth";
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
import {
  normalizeSubstrateMaterialGrid,
  SUBSTRATE_MATERIAL_RGB_BY_CODE,
} from "@/lib/visual/substrate-materials";
import { SubstrateControlPoints } from "@/components/builder/visual/SubstrateControlPoints";

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
type MeasurementUnit = "in" | "cm";

type CameraDiagnosticEvent = {
  type: "unexpected_pose_delta_detected";
  step: BuilderSceneStep;
  positionDelta: number;
  targetDelta: number;
};

type CameraIntent =
  | {
      type: "reframe" | "reset";
      seq: number;
    }
  | {
      type: "focus-item";
      itemId: string;
      seq: number;
    };

type CameraFocusTarget = {
  itemId: string;
  target: [number, number, number];
  radius: number;
};

type VisualBuilderSceneProps = {
  tank: VisualTank | null;
  canvasState: VisualCanvasState;
  assetsById: Map<string, VisualAsset>;
  selectedItemId: string | null;
  selectedItemIds: string[];
  currentStep: BuilderSceneStep;
  toolMode: BuilderSceneToolMode;
  placementAsset: VisualAsset | null;
  placementRotationDeg: number;
  placementClusterCount: number;
  showDepthGuides: boolean;
  gridSnapEnabled: boolean;
  showMeasurements: boolean;
  measurementUnit: MeasurementUnit;
  qualityTier: BuilderSceneQualityTier;
  postprocessingEnabled: boolean;
  glassWallsEnabled: boolean;
  ambientParticlesEnabled: boolean;
  lightingSimulationEnabled: boolean;
  lightMountHeightIn: number;
  growthTimelineMonths: GrowthTimelineMonths;
  selectedLightAsset: VisualAsset | null;
  sculptMode: SubstrateBrushMode;
  sculptBrushSize: number;
  sculptStrength: number;
  sculptMaterial: SubstrateMaterialType;
  idleOrbit: boolean;
  cameraPresetMode: CameraPresetMode;
  equipmentAssets: VisualAsset[];
  onSelectItem: (itemId: string | null, selectionMode?: "replace" | "toggle") => void;
  onHoverItem?: (itemId: string | null) => void;
  onPlaceItem: (request: PlacementRequest) => void;
  onMoveItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onRotateItem: (itemId: string, deltaDeg: number) => void;
  onSubstrateHeightfield: (next: SubstrateHeightfield) => void;
  onSubstrateMaterialGrid: (next: SubstrateMaterialGrid) => void;
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

type TransformHandleDragState =
  | {
      mode: "rotate";
      pointerId: number;
      startAngle: number;
      startRotationDeg: number;
    }
  | {
      mode: "scale";
      pointerId: number;
      startScale: number;
      startDistance: number;
      direction: THREE.Vector3;
      directionSign: 1 | -1;
    };

type MoveDragState = {
  pointerId: number;
  startPointer: { x: number; z: number };
  minDeltaX: number;
  maxDeltaX: number;
  minDeltaZ: number;
  maxDeltaZ: number;
  releasePointerCaptureTarget?: {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
  };
  items: Array<{
    id: string;
    x: number;
    z: number;
    scale: number;
    rotation: number;
  }>;
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
const SUBSTRATE_HEATMAP_Y_OFFSET = 0.015;
const SUBSTRATE_HEATMAP_OPACITY = 0.64;
const SUBSTRATE_HEIGHTFIELD_CELL_COUNT =
  SUBSTRATE_HEIGHTFIELD_RESOLUTION * SUBSTRATE_HEIGHTFIELD_RESOLUTION;
const ASSET_LOAD_RETRY_DELAY_MS = 3500;
const WATER_SURFACE_TEXTURE_SEED = 0x51f91f7;
const WATER_SURFACE_NOISE_SCALE = 5.25;
const WATER_SURFACE_OCTAVES = 4;
const CAUSTIC_TEXTURE_SEED = 0x2a9df53;
const AMBIENT_PARTICLE_SEED = 0x1bd5c91;
const AMBIENT_PARTICLE_COLORS: ReadonlyArray<[number, number, number]> = [
  [0.94, 0.99, 0.97],
  [0.88, 0.97, 0.92],
  [0.9, 0.95, 0.9],
];
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
const DISABLED_POINTS_RAYCAST: THREE.Points["raycast"] = () => undefined;
const DISABLED_LINE_SEGMENTS_RAYCAST: THREE.LineSegments["raycast"] = () => undefined;
const TRANSFORM_HANDLE_RING_COLOR = "#8fd3ff";
const TRANSFORM_HANDLE_SCALE_COLOR = "#9ceec5";
const TRANSFORM_HANDLE_RING_EMISSIVE = "#2f6f96";
const TRANSFORM_HANDLE_SCALE_EMISSIVE = "#2f7b56";
const TRANSFORM_HANDLE_MIN_SCALE = 0.1;
const TRANSFORM_HANDLE_MAX_SCALE = 6;

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
  heatmapGeometry: THREE.BufferGeometry;
  positionAttribute: THREE.BufferAttribute;
  materialColorAttribute: THREE.BufferAttribute;
  materialColors: Float32Array;
  heatmapColorAttribute: THREE.BufferAttribute;
  heatmapColors: Float32Array;
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

function inchGridStepNormalized(sizeIn: number): number {
  if (!Number.isFinite(sizeIn) || sizeIn <= 0) return 1;
  return 1 / Math.max(1, sizeIn);
}

function snapNormalizedToInchGrid(value: number, sizeIn: number): number {
  const step = inchGridStepNormalized(sizeIn);
  if (!Number.isFinite(step) || step <= 0) return clamp01(value);

  const clampedValue = clamp01(value);
  const snappedValue = clamp01(Math.round(clampedValue / step) * step);

  const minInterior = step;
  const maxInterior = 1 - step;
  if (minInterior >= maxInterior) {
    return 0.5;
  }

  return THREE.MathUtils.clamp(snappedValue, minInterior, maxInterior);
}

function buildInchGridAxisValues(sizeIn: number): number[] {
  const safeSize = Math.max(1, sizeIn);
  const step = inchGridStepNormalized(safeSize);

  const axisValues: number[] = [0];
  let nextValue = step;

  while (nextValue < 1) {
    axisValues.push(clamp01(nextValue));
    nextValue += step;
  }

  if ((axisValues[axisValues.length - 1] ?? 0) < 1) {
    axisValues.push(1);
  }

  return axisValues;
}

function formatDimensionValue(valueIn: number, unit: MeasurementUnit): string {
  const scaledValue = unit === "cm" ? valueIn * 2.54 : valueIn;
  const rounded = Math.round(scaledValue * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDimensionLabel(prefix: string, valueIn: number, unit: MeasurementUnit): string {
  return `${prefix}: ${formatDimensionValue(valueIn, unit)} ${unit}`;
}

function pushLineSegment(
  positions: number[],
  start: readonly [number, number, number],
  end: readonly [number, number, number],
) {
  positions.push(start[0], start[1], start[2], end[0], end[1], end[2]);
}

function pushDimensionLineWithCaps(params: {
  positions: number[];
  start: readonly [number, number, number];
  end: readonly [number, number, number];
  capDirection: readonly [number, number, number];
  capLength: number;
}) {
  pushLineSegment(params.positions, params.start, params.end);

  const halfCap = params.capLength * 0.5;
  const startCapStart: [number, number, number] = [
    params.start[0] - params.capDirection[0] * halfCap,
    params.start[1] - params.capDirection[1] * halfCap,
    params.start[2] - params.capDirection[2] * halfCap,
  ];
  const startCapEnd: [number, number, number] = [
    params.start[0] + params.capDirection[0] * halfCap,
    params.start[1] + params.capDirection[1] * halfCap,
    params.start[2] + params.capDirection[2] * halfCap,
  ];
  const endCapStart: [number, number, number] = [
    params.end[0] - params.capDirection[0] * halfCap,
    params.end[1] - params.capDirection[1] * halfCap,
    params.end[2] - params.capDirection[2] * halfCap,
  ];
  const endCapEnd: [number, number, number] = [
    params.end[0] + params.capDirection[0] * halfCap,
    params.end[1] + params.capDirection[1] * halfCap,
    params.end[2] + params.capDirection[2] * halfCap,
  ];

  pushLineSegment(params.positions, startCapStart, startCapEnd);
  pushLineSegment(params.positions, endCapStart, endCapEnd);
}

function clampRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0;
  if (rotation < -180) return -180;
  if (rotation > 180) return 180;
  return rotation;
}

function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return THREE.MathUtils.clamp(scale, TRANSFORM_HANDLE_MIN_SCALE, TRANSFORM_HANDLE_MAX_SCALE);
}

function normalizeSignedRadians(value: number): number {
  if (!Number.isFinite(value)) return 0;

  let next = value;
  while (next > Math.PI) {
    next -= Math.PI * 2;
  }
  while (next < -Math.PI) {
    next += Math.PI * 2;
  }

  return next;
}

function transformHandleRadius(renderItem: SceneRenderItem): number {
  const footprint = Math.max(renderItem.size.width, renderItem.size.depth);
  return THREE.MathUtils.clamp(footprint * 0.72, 0.65, 7);
}

function normalizeDims(tank: VisualTank | null, canvasState: VisualCanvasState): SceneDims {
  const widthIn =
    Number.isFinite(canvasState.widthIn) && canvasState.widthIn > 0
      ? canvasState.widthIn
      : tank?.widthIn ?? 24;
  const heightIn =
    Number.isFinite(canvasState.heightIn) && canvasState.heightIn > 0
      ? canvasState.heightIn
      : tank?.heightIn ?? 14;
  const depthIn =
    Number.isFinite(canvasState.depthIn) && canvasState.depthIn > 0
      ? canvasState.depthIn
      : tank?.depthIn ?? 12;

  return {
    widthIn,
    heightIn,
    depthIn,
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

type AmbientParticleField = {
  positions: Float32Array;
  colors: Float32Array;
  baseX: Float32Array;
  baseZ: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  wobbleAmplitude: Float32Array;
  wobbleFrequency: Float32Array;
  phase: Float32Array;
};

function ambientParticleCount(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "high") return 220;
  if (qualityTier === "medium") return 190;
  return 150;
}

function ambientParticleSizePx(qualityTier: BuilderSceneQualityTier): number {
  if (qualityTier === "high") return 2;
  if (qualityTier === "medium") return 1.8;
  return 1.5;
}

function createAmbientParticleField(params: {
  count: number;
  dims: SceneDims;
  waterLineY: number;
  seed: number;
}): AmbientParticleField {
  const count = Math.max(1, Math.floor(params.count));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseX = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const y = new Float32Array(count);
  const speed = new Float32Array(count);
  const wobbleAmplitude = new Float32Array(count);
  const wobbleFrequency = new Float32Array(count);
  const phase = new Float32Array(count);

  const random = seededRandom(params.seed);
  const halfWidth = params.dims.widthIn * 0.46;
  const halfDepth = params.dims.depthIn * 0.46;
  const minY = Math.max(0.16, params.waterLineY * 0.08);
  const maxY = Math.max(minY + 0.2, params.waterLineY - 0.12);
  const verticalSpan = Math.max(0.2, maxY - minY);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;

    baseX[index] = THREE.MathUtils.lerp(-halfWidth, halfWidth, random());
    baseZ[index] = THREE.MathUtils.lerp(-halfDepth, halfDepth, random());
    y[index] = minY + random() * verticalSpan;
    speed[index] = THREE.MathUtils.lerp(0.045, 0.115, random());
    wobbleAmplitude[index] = THREE.MathUtils.lerp(0.012, 0.052, random());
    wobbleFrequency[index] = THREE.MathUtils.lerp(0.45, 1.05, random());
    phase[index] = random() * Math.PI * 2;

    const wobbleX = Math.sin(phase[index]) * wobbleAmplitude[index];
    const wobbleZ = Math.cos(phase[index] * 1.37) * wobbleAmplitude[index] * 0.8;

    positions[offset] = baseX[index] + wobbleX;
    positions[offset + 1] = y[index];
    positions[offset + 2] = baseZ[index] + wobbleZ;

    const paletteColor =
      AMBIENT_PARTICLE_COLORS[Math.floor(random() * AMBIENT_PARTICLE_COLORS.length)] ??
      AMBIENT_PARTICLE_COLORS[0] ??
      [0.9, 0.98, 0.95];
    const tint = THREE.MathUtils.lerp(0.9, 1.04, random());

    colors[offset] = paletteColor[0] * tint;
    colors[offset + 1] = paletteColor[1] * tint;
    colors[offset + 2] = paletteColor[2] * tint;
  }

  return {
    positions,
    colors,
    baseX,
    baseZ,
    y,
    speed,
    wobbleAmplitude,
    wobbleFrequency,
    phase,
  };
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

function focusItemCameraPreset(params: {
  target: CameraFocusTarget["target"];
  radius: number;
  dims: SceneDims;
}): {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
} {
  const framingRadius = Math.max(0.35, params.radius);
  const baseDistance = Math.max(
    framingRadius * 4.8,
    params.dims.widthIn * 0.24,
    params.dims.depthIn * 0.24,
  );
  const maxDistance = Math.max(12, params.dims.widthIn * 1.9);
  const distance = THREE.MathUtils.clamp(baseDistance, 3.6, maxDistance);

  const targetX = params.target[0];
  const targetY = params.target[1];
  const targetZ = params.target[2];

  const maxX = params.dims.widthIn * 1.15;
  const maxY = params.dims.heightIn * 1.28;
  const maxZ = params.dims.depthIn * 1.2;

  const positionX = THREE.MathUtils.clamp(targetX + distance * 0.74, -maxX, maxX);
  const positionY = THREE.MathUtils.clamp(
    targetY + Math.max(framingRadius * 2.1, params.dims.heightIn * 0.1),
    1,
    maxY,
  );
  const positionZ = THREE.MathUtils.clamp(targetZ + distance * 0.92, -maxZ, maxZ);

  return {
    position: [positionX, positionY, positionZ],
    target: [targetX, targetY, targetZ],
    fov: 40,
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
  const heatmapGeometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const uvAttribute = new THREE.BufferAttribute(uvs, 2);
  const indexAttribute = new THREE.BufferAttribute(indices, 1);

  const materialColors = new Float32Array(vertexCount * 3);
  materialColors.fill(0);
  const materialColorAttribute = new THREE.BufferAttribute(materialColors, 3);

  const heatmapColors = new Float32Array(vertexCount * 3);
  heatmapColors.fill(0);
  const heatmapColorAttribute = new THREE.BufferAttribute(heatmapColors, 3);

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("uv", uvAttribute);
  geometry.setAttribute("color", materialColorAttribute);
  geometry.setIndex(indexAttribute);

  heatmapGeometry.setAttribute("position", positionAttribute);
  heatmapGeometry.setAttribute("uv", uvAttribute);
  heatmapGeometry.setAttribute("color", heatmapColorAttribute);
  heatmapGeometry.setIndex(indexAttribute);

  const sampledHeights = new Float32Array(vertexCount);
  sampledHeights.fill(Number.NaN);

  const sourceValues = new Float32Array(SUBSTRATE_HEIGHTFIELD_CELL_COUNT);
  sourceValues.fill(Number.NaN);

  return {
    geometry,
    heatmapGeometry,
    positionAttribute,
    materialColorAttribute,
    materialColors,
    heatmapColorAttribute,
    heatmapColors,
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

function applySubstrateMaterialsToGeometry(params: {
  data: SubstrateGeometryData;
  materialGrid: SubstrateMaterialGrid;
}) {
  const source = normalizeSubstrateMaterialGrid(params.materialGrid);
  const vertexCount = params.data.sampledHeights.length;

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const sourceIndex00 = params.data.sampling.sourceIndex00[vertexIndex] ?? 0;
    const sourceIndex10 = params.data.sampling.sourceIndex10[vertexIndex] ?? sourceIndex00;
    const sourceIndex01 = params.data.sampling.sourceIndex01[vertexIndex] ?? sourceIndex00;
    const sourceIndex11 = params.data.sampling.sourceIndex11[vertexIndex] ?? sourceIndex00;
    const tx = params.data.sampling.tx[vertexIndex] ?? 0;
    const tz = params.data.sampling.tz[vertexIndex] ?? 0;

    const w00 = (1 - tx) * (1 - tz);
    const w10 = tx * (1 - tz);
    const w01 = (1 - tx) * tz;
    const w11 = tx * tz;

    const materialWeights = [0, 0, 0];

    const code00 = Math.min(2, Math.max(0, source[sourceIndex00] ?? 0));
    const code10 = Math.min(2, Math.max(0, source[sourceIndex10] ?? 0));
    const code01 = Math.min(2, Math.max(0, source[sourceIndex01] ?? 0));
    const code11 = Math.min(2, Math.max(0, source[sourceIndex11] ?? 0));

    materialWeights[code00] = (materialWeights[code00] ?? 0) + w00;
    materialWeights[code10] = (materialWeights[code10] ?? 0) + w10;
    materialWeights[code01] = (materialWeights[code01] ?? 0) + w01;
    materialWeights[code11] = (materialWeights[code11] ?? 0) + w11;

    const offset = vertexIndex * 3;
    const soil = materialWeights[0] ?? 0;
    const sand = materialWeights[1] ?? 0;
    const gravel = materialWeights[2] ?? 0;

    const soilRgb = SUBSTRATE_MATERIAL_RGB_BY_CODE[0] ?? [0.36, 0.26, 0.16];
    const sandRgb = SUBSTRATE_MATERIAL_RGB_BY_CODE[1] ?? [0.76, 0.67, 0.5];
    const gravelRgb = SUBSTRATE_MATERIAL_RGB_BY_CODE[2] ?? [0.48, 0.5, 0.51];

    params.data.materialColors[offset] = soilRgb[0] * soil + sandRgb[0] * sand + gravelRgb[0] * gravel;
    params.data.materialColors[offset + 1] =
      soilRgb[1] * soil + sandRgb[1] * sand + gravelRgb[1] * gravel;
    params.data.materialColors[offset + 2] =
      soilRgb[2] * soil + sandRgb[2] * sand + gravelRgb[2] * gravel;
  }

  params.data.materialColorAttribute.needsUpdate = true;
}

function applyParHeatmapToSubstrateGeometry(params: {
  data: SubstrateGeometryData;
  dims: SceneDims;
  source: LightSimulationSource;
  lightMountHeightIn: number;
}) {
  const positionBuffer = params.data.positionAttribute.array;
  if (!(positionBuffer instanceof Float32Array)) return;

  const vertexCount = params.data.sampledHeights.length;
  const waterLineYIn = params.dims.heightIn * 0.94;
  const mountHeightIn = clampLightMountHeightIn(params.lightMountHeightIn);
  const color = { r: 0, g: 0, b: 0 };

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const offset = vertexIndex * 3;
    const pointX = positionBuffer[offset] ?? 0;
    const pointY = positionBuffer[offset + 1] ?? 0;
    const pointZ = positionBuffer[offset + 2] ?? 0;

    const par = estimateParAtSubstratePoint({
      source: params.source,
      pointXIn: pointX,
      pointYIn: pointY,
      pointZIn: pointZ,
      tankHeightIn: params.dims.heightIn,
      lightMountHeightIn: mountHeightIn,
      waterLineYIn,
    });

    writeParHeatmapColor(par, color);
    params.data.heatmapColors[offset] = color.r;
    params.data.heatmapColors[offset + 1] = color.g;
    params.data.heatmapColors[offset + 2] = color.b;
  }

  params.data.heatmapColorAttribute.needsUpdate = true;
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
  controlsEnabled: boolean;
  onCameraPresetModeChange?: (mode: CameraPresetMode) => void;
  onCameraDiagnostic?: (event: CameraDiagnosticEvent) => void;
  cameraIntent?: CameraIntent | null;
  focusTarget?: CameraFocusTarget | null;
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
    } else if (props.cameraIntent.type === "focus-item") {
      if (props.focusTarget && props.focusTarget.itemId === props.cameraIntent.itemId) {
        forcedPresetRef.current = focusItemCameraPreset({
          target: props.focusTarget.target,
          radius: props.focusTarget.radius,
          dims: props.dims,
        });
      } else {
        forcedPresetRef.current = cameraPreset(props.step, props.dims);
      }
    } else {
      forcedPresetRef.current = cameraPreset(props.step, props.dims);
    }

    if (props.cameraPresetMode !== "step") {
      props.onCameraPresetModeChange?.("step");
    }
  }, [
    props.cameraIntent,
    props.cameraPresetMode,
    props.dims,
    props.focusTarget,
    props.onCameraPresetModeChange,
    props.step,
  ]);

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
      enabled={props.controlsEnabled}
      enablePan={true}
      enableZoom={true}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.55}
      minDistance={Math.max(10, props.dims.widthIn * 0.6)}
      maxDistance={Math.max(36, props.dims.widthIn * 3)}
      dampingFactor={0.18}
      enableDamping
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      }}
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
  interactive: boolean;
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
    <mesh
      castShadow
      receiveShadow
      geometry={model.geometry}
      material={material}
      scale={scale}
      raycast={props.interactive ? undefined : DISABLED_RAYCAST}
    >
      {props.highlightColor ? <Edges color={props.highlightColor} threshold={22} /> : null}
    </mesh>
  );
}

function ProceduralHardscapeMesh(props: {
  renderItem: SceneRenderItem;
  resolvedAsset: ResolvedVisualAsset;
  highlightColor: string | null;
  interactive: boolean;
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
    <mesh
      castShadow
      receiveShadow
      geometry={model.geometry}
      material={material}
      scale={scale}
      raycast={props.interactive ? undefined : DISABLED_RAYCAST}
    >
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
  interactive: boolean;
}) {
  if (props.renderItem.asset.categorySlug === "plants") {
    return (
      <ProceduralPlantMesh
        renderItem={props.renderItem}
        resolvedAsset={props.resolvedAsset}
        highlightColor={props.highlightColor}
        interactive={props.interactive}
      />
    );
  }

  return (
    <ProceduralHardscapeMesh
      renderItem={props.renderItem}
      resolvedAsset={props.resolvedAsset}
      highlightColor={props.highlightColor}
      interactive={props.interactive}
    />
  );
}

function ItemMesh(props: {
  renderItem: SceneRenderItem;
  selected: boolean;
  hovered: boolean;
  toolMode: BuilderSceneToolMode;
  interactive: boolean;
  onSelect: (id: string | null, selectionMode?: "replace" | "toggle") => void;
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
    if (!props.interactive) return;
    event.stopPropagation();
    if (props.toolMode === "delete") {
      props.onDelete(props.renderItem.item.id);
      return;
    }
    if (props.toolMode === "rotate") {
      props.onRotate(props.renderItem.item.id, props.renderItem.item.constraints.rotationSnapDeg);
      return;
    }
    props.onSelect(props.renderItem.item.id, event.shiftKey ? "toggle" : "replace");
  };

  const proceduralMesh = (
    <ProceduralItemMesh
      renderItem={props.renderItem}
      resolvedAsset={resolvedAsset}
      highlightColor={highlightColor}
      interactive={props.interactive}
    />
  );

  return (
    <group
      ref={groupRef}
      position={props.renderItem.position}
      onClick={props.interactive ? onClick : undefined}
      onPointerOver={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              props.onHover(props.renderItem.item.id);
            }
          : undefined
      }
      onPointerOut={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              props.onHover(null);
            }
          : undefined
      }
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
                    raycast={props.interactive ? undefined : DISABLED_RAYCAST}
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

function ItemTransformHandles(props: {
  renderItem: SceneRenderItem;
  onUpdateItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onInteractionStateChange?: (active: boolean) => void;
}) {
  const ringRadius = useMemo(() => transformHandleRadius(props.renderItem), [props.renderItem]);
  const ringTubeRadius = useMemo(
    () => THREE.MathUtils.clamp(ringRadius * 0.12, 0.08, 0.32),
    [ringRadius],
  );
  const handleRadius = useMemo(
    () => THREE.MathUtils.clamp(ringRadius * 0.24, 0.16, 0.5),
    [ringRadius],
  );
  const ringHitTubeRadius = useMemo(
    () => THREE.MathUtils.clamp(ringTubeRadius * 2.2, 0.2, 0.62),
    [ringTubeRadius],
  );
  const scaleHitRadius = useMemo(
    () => THREE.MathUtils.clamp(handleRadius * 2.1, 0.34, 1.15),
    [handleRadius],
  );
  const scaleLaneYOffset = useMemo(
    () => Math.max(0.65, props.renderItem.size.height * 0.34, ringRadius * 0.72),
    [props.renderItem.size.height, ringRadius],
  );
  const scaleLaneRadius = useMemo(
    () => THREE.MathUtils.clamp(ringRadius * 0.82, 0.55, 2.8),
    [ringRadius],
  );
  const centerY = useMemo(
    () => props.renderItem.position.y + Math.max(0.12, props.renderItem.size.height * 0.06),
    [props.renderItem.position.y, props.renderItem.size.height],
  );
  const center = useMemo(
    () => new THREE.Vector3(props.renderItem.position.x, centerY, props.renderItem.position.z),
    [centerY, props.renderItem.position.x, props.renderItem.position.z],
  );
  const rotationRad = useMemo(
    () => (props.renderItem.item.rotation * Math.PI) / 180,
    [props.renderItem.item.rotation],
  );
  const handleDirection = useMemo(
    () => new THREE.Vector3(Math.cos(rotationRad), 0, Math.sin(rotationRad)).normalize(),
    [rotationRad],
  );
  const positiveHandlePosition = useMemo<[number, number, number]>(
    () => [
      center.x + handleDirection.x * scaleLaneRadius,
      center.y + scaleLaneYOffset,
      center.z + handleDirection.z * scaleLaneRadius,
    ],
    [
      center.x,
      center.y,
      center.z,
      handleDirection.x,
      handleDirection.z,
      scaleLaneRadius,
      scaleLaneYOffset,
    ],
  );
  const negativeHandlePosition = useMemo<[number, number, number]>(
    () => [
      center.x - handleDirection.x * scaleLaneRadius,
      center.y + scaleLaneYOffset,
      center.z - handleDirection.z * scaleLaneRadius,
    ],
    [
      center.x,
      center.y,
      center.z,
      handleDirection.x,
      handleDirection.z,
      scaleLaneRadius,
      scaleLaneYOffset,
    ],
  );

  const dragStateRef = useRef<TransformHandleDragState | null>(null);
  const interactionPlaneRef = useRef<THREE.Plane>(new THREE.Plane(WORLD_UP, -centerY));

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
      props.onInteractionStateChange?.(false);
    };
  }, [props.onInteractionStateChange]);

  const projectPointerToInteractionPlane = (event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    const projectedPoint = new THREE.Vector3();
    if (!event.ray.intersectPlane(interactionPlaneRef.current, projectedPoint)) {
      return null;
    }
    return projectedPoint;
  };

  const endDrag = (event?: ThreeEvent<PointerEvent>) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag) return;
    if (event && activeDrag.pointerId !== event.pointerId) return;

    if (event) {
      event.stopPropagation();
      const pointerTarget = event.target as {
        releasePointerCapture?: (pointerId: number) => void;
      };
      pointerTarget.releasePointerCapture?.(event.pointerId);
    }

    dragStateRef.current = null;
    props.onInteractionStateChange?.(false);
  };

  const beginRotateDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    interactionPlaneRef.current.set(WORLD_UP, -centerY);

    const projectedPoint = projectPointerToInteractionPlane(event);
    if (!projectedPoint) return;

    dragStateRef.current = {
      mode: "rotate",
      pointerId: event.pointerId,
      startAngle: Math.atan2(projectedPoint.z - center.z, projectedPoint.x - center.x),
      startRotationDeg: props.renderItem.item.rotation,
    };

    const pointerTarget = event.target as {
      setPointerCapture?: (pointerId: number) => void;
    };
    pointerTarget.setPointerCapture?.(event.pointerId);
    props.onInteractionStateChange?.(true);
  };

  const beginScaleDrag = (event: ThreeEvent<PointerEvent>, directionSign: 1 | -1) => {
    event.stopPropagation();
    interactionPlaneRef.current.set(WORLD_UP, -(centerY + scaleLaneYOffset));

    const projectedPoint = projectPointerToInteractionPlane(event);
    if (!projectedPoint) return;

    const signedDistance =
      projectedPoint.clone().sub(center).dot(handleDirection) * directionSign;

    dragStateRef.current = {
      mode: "scale",
      pointerId: event.pointerId,
      startScale: props.renderItem.item.scale,
      startDistance: Math.max(0.08, signedDistance),
      direction: handleDirection.clone(),
      directionSign,
    };

    const pointerTarget = event.target as {
      setPointerCapture?: (pointerId: number) => void;
    };
    pointerTarget.setPointerCapture?.(event.pointerId);
    props.onInteractionStateChange?.(true);
  };

  const handleDragMove = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag) return;
    if (activeDrag.pointerId !== event.pointerId) return;

    event.stopPropagation();

    const projectedPoint = projectPointerToInteractionPlane(event);
    if (!projectedPoint) return;

    if (activeDrag.mode === "rotate") {
      const nextAngle = Math.atan2(projectedPoint.z - center.z, projectedPoint.x - center.x);
      const deltaRadians = normalizeSignedRadians(nextAngle - activeDrag.startAngle);
      const nextRotation = clampRotation(
        activeDrag.startRotationDeg + THREE.MathUtils.radToDeg(deltaRadians),
      );
      props.onUpdateItem(props.renderItem.item.id, { rotation: nextRotation });
      return;
    }

    const signedDistance =
      projectedPoint.clone().sub(center).dot(activeDrag.direction) * activeDrag.directionSign;
    const deltaDistance = signedDistance - activeDrag.startDistance;
    const nextScale = clampScale(activeDrag.startScale + deltaDistance * 0.22);

    props.onUpdateItem(props.renderItem.item.id, { scale: nextScale });
  };

  return (
    <group>
      <mesh
        raycast={DISABLED_RAYCAST}
        position={[center.x, center.y + scaleLaneYOffset * 0.5, center.z]}
        renderOrder={90}
      >
        <cylinderGeometry args={[0.03, 0.03, scaleLaneYOffset, 10]} />
        <meshStandardMaterial
          color={TRANSFORM_HANDLE_SCALE_COLOR}
          emissive={TRANSFORM_HANDLE_SCALE_EMISSIVE}
          emissiveIntensity={0.2}
          roughness={0.34}
          metalness={0.08}
          transparent
          opacity={0.45}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <mesh
        raycast={DISABLED_RAYCAST}
        position={[center.x, center.y, center.z]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={90}
      >
        <torusGeometry args={[ringRadius, ringTubeRadius, 24, 84]} />
        <meshStandardMaterial
          color={TRANSFORM_HANDLE_RING_COLOR}
          emissive={TRANSFORM_HANDLE_RING_EMISSIVE}
          emissiveIntensity={0.32}
          roughness={0.42}
          metalness={0.08}
          transparent
          opacity={0.88}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <mesh
        position={[center.x, center.y, center.z]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={91}
        onPointerDown={beginRotateDrag}
        onPointerMove={handleDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <torusGeometry args={[ringRadius, ringHitTubeRadius, 16, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>

      <mesh
        raycast={DISABLED_RAYCAST}
        position={positiveHandlePosition}
        renderOrder={90}
      >
        <sphereGeometry args={[handleRadius, 20, 20]} />
        <meshStandardMaterial
          color={TRANSFORM_HANDLE_SCALE_COLOR}
          emissive={TRANSFORM_HANDLE_SCALE_EMISSIVE}
          emissiveIntensity={0.3}
          roughness={0.26}
          metalness={0.18}
          transparent
          opacity={0.94}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <mesh
        position={positiveHandlePosition}
        renderOrder={91}
        onPointerDown={(event) => beginScaleDrag(event, 1)}
        onPointerMove={handleDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <sphereGeometry args={[scaleHitRadius, 14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>

      <mesh
        raycast={DISABLED_RAYCAST}
        position={negativeHandlePosition}
        renderOrder={90}
      >
        <sphereGeometry args={[handleRadius, 20, 20]} />
        <meshStandardMaterial
          color={TRANSFORM_HANDLE_SCALE_COLOR}
          emissive={TRANSFORM_HANDLE_SCALE_EMISSIVE}
          emissiveIntensity={0.3}
          roughness={0.26}
          metalness={0.18}
          transparent
          opacity={0.94}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <mesh
        position={negativeHandlePosition}
        renderOrder={91}
        onPointerDown={(event) => beginScaleDrag(event, -1)}
        onPointerMove={handleDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <sphereGeometry args={[scaleHitRadius, 14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
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
  interactive: boolean;
  selectedItemIds: ReadonlySet<string>;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null, selectionMode?: "replace" | "toggle") => void;
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

      const isSelected = props.selectedItemIds.has(renderItem.item.id);
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

    props.onSelect(renderItem.item.id, event.shiftKey ? "toggle" : "replace");
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[props.geometry, props.material, props.group.items.length]}
      castShadow
      receiveShadow
      raycast={props.interactive ? undefined : DISABLED_RAYCAST}
      onClick={props.interactive ? onClick : undefined}
      onPointerMove={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              const renderItem = renderItemFromInstanceId(event.instanceId);
              if (!renderItem) return;

              props.onHover(renderItem.item.id);
              props.onSurfacePointer(event, anchorTypeForRenderItem(renderItem), renderItem.item.id);
            }
          : undefined
      }
      onPointerDown={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              const renderItem = renderItemFromInstanceId(event.instanceId);
              if (!renderItem) return;

              props.onSurfaceDown(event, anchorTypeForRenderItem(renderItem), renderItem.item.id);
            }
          : undefined
      }
      onPointerOut={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              props.onHover(null);
            }
          : undefined
      }
      onPointerUp={
        props.interactive
          ? (event) => {
              event.stopPropagation();
              props.onSurfaceUp(event);
            }
          : undefined
      }
    />
  );
}

function LoadedPlantInstancedRenderer(props: {
  group: PlantInstancedGroup;
  model: LoadedAssetModel;
  interactive: boolean;
  selectedItemIds: ReadonlySet<string>;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null, selectionMode?: "replace" | "toggle") => void;
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
      interactive={props.interactive}
      selectedItemIds={props.selectedItemIds}
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
  interactive: boolean;
  selectedItemIds: ReadonlySet<string>;
  hoveredItemId: string | null;
  toolMode: BuilderSceneToolMode;
  onSelect: (id: string | null, selectionMode?: "replace" | "toggle") => void;
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
      interactive={props.interactive}
      selectedItemIds={props.selectedItemIds}
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
              interactive={props.interactive}
              selectedItemIds={props.selectedItemIds}
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

function AmbientWaterParticles(props: {
  dims: SceneDims;
  qualityTier: BuilderSceneQualityTier;
  waterLineY: number;
}) {
  const particleCount = ambientParticleCount(props.qualityTier);
  const fieldSeed = useMemo(
    () =>
      AMBIENT_PARTICLE_SEED ^
      Math.round(props.dims.widthIn * 67) ^
      Math.round(props.dims.depthIn * 43) ^
      Math.round(props.waterLineY * 29) ^
      (props.qualityTier === "high" ? 0x1f7a : props.qualityTier === "medium" ? 0x09d3 : 0x0471),
    [props.dims.depthIn, props.dims.widthIn, props.qualityTier, props.waterLineY],
  );

  const field = useMemo(
    () =>
      createAmbientParticleField({
        count: particleCount,
        dims: props.dims,
        waterLineY: props.waterLineY,
        seed: fieldSeed,
      }),
    [fieldSeed, particleCount, props.dims, props.waterLineY],
  );

  const fieldRef = useRef<AmbientParticleField>(field);
  const recycleRandomRef = useRef<() => number>(seededRandom(fieldSeed ^ 0x7f4a7c15));
  const positionAttributeRef = useRef<THREE.BufferAttribute>(null);

  useEffect(() => {
    fieldRef.current = field;
  }, [field]);

  useEffect(() => {
    recycleRandomRef.current = seededRandom(fieldSeed ^ 0x7f4a7c15);
  }, [fieldSeed]);

  useFrame((state, deltaSeconds) => {
    const currentField = fieldRef.current;
    const random = recycleRandomRef.current;
    const safeDeltaSeconds = Math.min(0.08, Math.max(0, deltaSeconds));
    const time = state.clock.elapsedTime;
    const halfWidth = props.dims.widthIn * 0.46;
    const halfDepth = props.dims.depthIn * 0.46;
    const minY = Math.max(0.16, props.waterLineY * 0.08);
    const maxY = Math.max(minY + 0.2, props.waterLineY - 0.12);
    const resetSpan = Math.max(0.18, maxY - minY);

    for (let index = 0; index < currentField.y.length; index += 1) {
      currentField.y[index] += currentField.speed[index] * safeDeltaSeconds;

      if (currentField.y[index] > maxY) {
        currentField.y[index] = minY - random() * Math.min(0.5, resetSpan * 0.35);
        currentField.baseX[index] = THREE.MathUtils.lerp(-halfWidth, halfWidth, random());
        currentField.baseZ[index] = THREE.MathUtils.lerp(-halfDepth, halfDepth, random());
        currentField.speed[index] = THREE.MathUtils.lerp(0.045, 0.115, random());
        currentField.phase[index] = random() * Math.PI * 2;
      }

      const wobblePhase = time * currentField.wobbleFrequency[index] + currentField.phase[index];
      const wobbleAmplitude = currentField.wobbleAmplitude[index];
      const x = currentField.baseX[index] + Math.sin(wobblePhase) * wobbleAmplitude;
      const z =
        currentField.baseZ[index] +
        Math.cos(wobblePhase * 0.83 + currentField.phase[index] * 0.37) * wobbleAmplitude * 0.78;
      const offset = index * 3;

      currentField.positions[offset] = THREE.MathUtils.clamp(x, -halfWidth, halfWidth);
      currentField.positions[offset + 1] = currentField.y[index];
      currentField.positions[offset + 2] = THREE.MathUtils.clamp(z, -halfDepth, halfDepth);
    }

    const positionAttribute = positionAttributeRef.current;
    if (positionAttribute) {
      positionAttribute.needsUpdate = true;
    }
  });

  return (
    <points raycast={DISABLED_POINTS_RAYCAST} renderOrder={22} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[field.positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute attach="attributes-color" args={[field.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={ambientParticleSizePx(props.qualityTier)}
        sizeAttenuation={false}
        transparent
        opacity={props.qualityTier === "high" ? 0.5 : 0.44}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
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
      color="#ffffff"
      vertexColors
      roughness={0.93}
      metalness={0.03}
      emissive="#8fbfca"
      emissiveMap={caustics.texture}
      emissiveIntensity={causticEmissiveIntensity(props.qualityTier)}
    />
  );
}

function SubstrateSnapGridOverlay(props: {
  dims: SceneDims;
  substrateHeightfield: SubstrateHeightfield;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const xAxis = buildInchGridAxisValues(props.dims.widthIn);
    const zAxis = buildInchGridAxisValues(props.dims.depthIn);
    const yOffset = 0.035;

    for (const zNorm of zAxis) {
      const zWorld = (zNorm - 0.5) * props.dims.depthIn;

      for (let index = 0; index < xAxis.length - 1; index += 1) {
        const startXNorm = xAxis[index] ?? 0;
        const endXNorm = xAxis[index + 1] ?? 1;

        const startXWorld = (startXNorm - 0.5) * props.dims.widthIn;
        const endXWorld = (endXNorm - 0.5) * props.dims.widthIn;

        const startY =
          sampleSubstrateDepth({
            xNorm: startXNorm,
            zNorm,
            heightfield: props.substrateHeightfield,
            tankHeightIn: props.dims.heightIn,
          }) + yOffset;
        const endY =
          sampleSubstrateDepth({
            xNorm: endXNorm,
            zNorm,
            heightfield: props.substrateHeightfield,
            tankHeightIn: props.dims.heightIn,
          }) + yOffset;

        positions.push(startXWorld, startY, zWorld, endXWorld, endY, zWorld);
      }
    }

    for (const xNorm of xAxis) {
      const xWorld = (xNorm - 0.5) * props.dims.widthIn;

      for (let index = 0; index < zAxis.length - 1; index += 1) {
        const startZNorm = zAxis[index] ?? 0;
        const endZNorm = zAxis[index + 1] ?? 1;

        const startZWorld = (startZNorm - 0.5) * props.dims.depthIn;
        const endZWorld = (endZNorm - 0.5) * props.dims.depthIn;

        const startY =
          sampleSubstrateDepth({
            xNorm,
            zNorm: startZNorm,
            heightfield: props.substrateHeightfield,
            tankHeightIn: props.dims.heightIn,
          }) + yOffset;
        const endY =
          sampleSubstrateDepth({
            xNorm,
            zNorm: endZNorm,
            heightfield: props.substrateHeightfield,
            tankHeightIn: props.dims.heightIn,
          }) + yOffset;

        positions.push(xWorld, startY, startZWorld, xWorld, endY, endZWorld);
      }
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return nextGeometry;
  }, [props.dims.depthIn, props.dims.heightIn, props.dims.widthIn, props.substrateHeightfield]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={24} raycast={DISABLED_LINE_SEGMENTS_RAYCAST}>
      <lineBasicMaterial
        color="#8fd3ff"
        transparent
        opacity={0.28}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function TankMeasurementOverlay(props: {
  dims: SceneDims;
  unit: MeasurementUnit;
}) {
  const geometry = useMemo(() => {
    const halfWidth = props.dims.widthIn * 0.5;
    const halfDepth = props.dims.depthIn * 0.5;
    const sideOffset = Math.max(0.36, Math.min(1.4, Math.min(props.dims.widthIn, props.dims.depthIn) * 0.06));
    const capLength = Math.max(0.16, sideOffset * 0.6);
    const baseY = -0.16;
    const widthLineZ = -halfDepth - sideOffset;
    const depthLineX = halfWidth + sideOffset;
    const heightLineX = -halfWidth - sideOffset;
    const heightLineZ = -halfDepth;

    const positions: number[] = [];

    const widthStart: [number, number, number] = [-halfWidth, baseY, widthLineZ];
    const widthEnd: [number, number, number] = [halfWidth, baseY, widthLineZ];
    pushDimensionLineWithCaps({
      positions,
      start: widthStart,
      end: widthEnd,
      capDirection: [0, 0, 1],
      capLength,
    });

    const depthStart: [number, number, number] = [depthLineX, baseY, -halfDepth];
    const depthEnd: [number, number, number] = [depthLineX, baseY, halfDepth];
    pushDimensionLineWithCaps({
      positions,
      start: depthStart,
      end: depthEnd,
      capDirection: [1, 0, 0],
      capLength,
    });

    const heightStart: [number, number, number] = [heightLineX, 0, heightLineZ];
    const heightEnd: [number, number, number] = [heightLineX, props.dims.heightIn, heightLineZ];
    pushDimensionLineWithCaps({
      positions,
      start: heightStart,
      end: heightEnd,
      capDirection: [0, 0, 1],
      capLength,
    });

    pushLineSegment(positions, [-halfWidth, baseY, -halfDepth], widthStart);
    pushLineSegment(positions, [halfWidth, baseY, -halfDepth], widthEnd);
    pushLineSegment(positions, [halfWidth, baseY, -halfDepth], depthStart);
    pushLineSegment(positions, [halfWidth, baseY, halfDepth], depthEnd);
    pushLineSegment(positions, [-halfWidth, 0, -halfDepth], heightStart);
    pushLineSegment(positions, [-halfWidth, props.dims.heightIn, -halfDepth], heightEnd);

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    return {
      geometry: nextGeometry,
      labels: {
        width: [0, baseY - 0.05, widthLineZ] as [number, number, number],
        depth: [depthLineX, baseY - 0.05, 0] as [number, number, number],
        height: [heightLineX, props.dims.heightIn * 0.5, heightLineZ] as [number, number, number],
      },
    };
  }, [props.dims.depthIn, props.dims.heightIn, props.dims.widthIn]);

  useEffect(() => {
    return () => {
      geometry.geometry.dispose();
    };
  }, [geometry]);

  return (
    <group renderOrder={26}>
      <lineSegments geometry={geometry.geometry} raycast={DISABLED_LINE_SEGMENTS_RAYCAST}>
        <lineBasicMaterial
          color="#c9e8ff"
          transparent
          opacity={0.78}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      <Html center position={geometry.labels.width} style={{ pointerEvents: "none" }}>
        <div className="rounded-full border border-cyan-200/40 bg-slate-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100 shadow-[0_0_16px_rgba(20,68,90,0.45)]">
          {formatDimensionLabel("W", props.dims.widthIn, props.unit)}
        </div>
      </Html>

      <Html center position={geometry.labels.depth} style={{ pointerEvents: "none" }}>
        <div className="rounded-full border border-cyan-200/40 bg-slate-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100 shadow-[0_0_16px_rgba(20,68,90,0.45)]">
          {formatDimensionLabel("D", props.dims.depthIn, props.unit)}
        </div>
      </Html>

      <Html center position={geometry.labels.height} style={{ pointerEvents: "none" }}>
        <div className="rounded-full border border-cyan-200/40 bg-slate-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100 shadow-[0_0_16px_rgba(20,68,90,0.45)]">
          {formatDimensionLabel("H", props.dims.heightIn, props.unit)}
        </div>
      </Html>
    </group>
  );
}

function TankShell(props: {
  dims: SceneDims;
  qualityTier: BuilderSceneQualityTier;
  substrateHeightfield: SubstrateHeightfield;
  substrateMaterialGrid: SubstrateMaterialGrid;
  showGlassWalls: boolean;
  showAmbientParticles: boolean;
  showDepthGuides: boolean;
  showSnapGrid: boolean;
  showLightingHeatmap: boolean;
  lightSimulationSource: LightSimulationSource | null;
  lightMountHeightIn: number;
  showSubstrateControlPoints: boolean;
  currentStep: BuilderSceneStep;
  onSurfacePointer: (event: ThreeEvent<PointerEvent>, anchorType: VisualAnchorType, itemId: string | null) => void;
  onSurfaceDown: (event: ThreeEvent<PointerEvent>, anchorType: VisualAnchorType, itemId: string | null) => void;
  onSurfaceUp: (event: ThreeEvent<PointerEvent>) => void;
  onSubstrateHeightfield: (next: SubstrateHeightfield) => void;
  onSubstrateStrokeStart: () => void;
  onSubstrateStrokeEnd: () => void;
  onSubstrateControlPointDragStateChange: (active: boolean) => void;
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

    applySubstrateMaterialsToGeometry({
      data: substrateGeometryData,
      materialGrid: props.substrateMaterialGrid,
    });

    if (!props.showLightingHeatmap || !props.lightSimulationSource) {
      return;
    }

    applyParHeatmapToSubstrateGeometry({
      data: substrateGeometryData,
      dims: props.dims,
      source: props.lightSimulationSource,
      lightMountHeightIn: props.lightMountHeightIn,
    });
  }, [
    props.dims,
    props.lightMountHeightIn,
    props.lightSimulationSource,
    props.showLightingHeatmap,
    props.substrateHeightfield,
    props.substrateMaterialGrid,
    substrateGeometryData,
  ]);

  useEffect(() => {
    return () => {
      substrateGeometryData.geometry.dispose();
      substrateGeometryData.heatmapGeometry.dispose();
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
        raycast={DISABLED_RAYCAST}
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

      {props.showAmbientParticles ? (
        <AmbientWaterParticles
          dims={props.dims}
          qualityTier={props.qualityTier}
          waterLineY={waterHeight}
        />
      ) : null}

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

      {props.showLightingHeatmap && props.lightSimulationSource ? (
        <mesh
          geometry={substrateGeometryData.heatmapGeometry}
          position={[0, SUBSTRATE_HEATMAP_Y_OFFSET, 0]}
          raycast={DISABLED_RAYCAST}
          renderOrder={32}
        >
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={SUBSTRATE_HEATMAP_OPACITY}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {props.showSnapGrid ? (
        <SubstrateSnapGridOverlay
          dims={props.dims}
          substrateHeightfield={props.substrateHeightfield}
        />
      ) : null}

      {props.showSubstrateControlPoints ? (
        <SubstrateControlPoints
          dims={props.dims}
          heightfield={props.substrateHeightfield}
          onHeightfieldChange={props.onSubstrateHeightfield}
          onStrokeStart={props.onSubstrateStrokeStart}
          onStrokeEnd={props.onSubstrateStrokeEnd}
          onDragStateChange={props.onSubstrateControlPointDragStateChange}
        />
      ) : null}

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
  const lightSimulationSource = useMemo(
    () => resolveLightSimulationSource(props.selectedLightAsset),
    [props.selectedLightAsset],
  );
  const showLightingHeatmap = props.lightingSimulationEnabled && Boolean(lightSimulationSource);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<PlacementCandidate | null>(null);
  const [transformInteractionLocked, setTransformInteractionLocked] = useState(false);
  const [substrateNodeDragActive, setSubstrateNodeDragActive] = useState(false);
  const itemInteractionsEnabled = props.currentStep !== "substrate";
  const moveDragRef = useRef<MoveDragState | null>(null);
  const moveDragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(WORLD_UP, 0));
  const onSubstrateStrokeStart = props.onSubstrateStrokeStart;
  const onSubstrateStrokeEnd = props.onSubstrateStrokeEnd;
  const selectedItemIds = props.selectedItemIds;

  const selectedItemIdSet = useMemo(() => {
    const next = new Set(selectedItemIds);
    if (props.selectedItemId) {
      next.add(props.selectedItemId);
    }
    return next;
  }, [props.selectedItemId, selectedItemIds]);

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
      const plantGrowthScale =
        asset.categorySlug === "plants"
          ? resolvePlantGrowthScale({
              asset,
              timelineMonths: props.growthTimelineMonths,
              plantTypeHint: resolveVisualAsset(asset).proceduralPlantType,
            })
          : { x: 1, y: 1, z: 1 };

      const size = {
        width: Math.max(0.35, asset.widthIn * item.scale * 0.18 * plantGrowthScale.x),
        height: Math.max(0.35, asset.heightIn * item.scale * 0.18 * plantGrowthScale.y),
        depth: Math.max(0.35, asset.depthIn * item.scale * 0.18 * plantGrowthScale.z),
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
  }, [
    dims,
    props.assetsById,
    props.canvasState.items,
    props.canvasState.substrateHeightfield,
    props.growthTimelineMonths,
  ]);

  const selectedRenderItem = useMemo(() => {
    if (!props.selectedItemId || selectedItemIdSet.size !== 1) return null;
    return renderItems.find((renderItem) => renderItem.item.id === props.selectedItemId) ?? null;
  }, [props.selectedItemId, renderItems, selectedItemIdSet]);

  const cameraFocusTarget = useMemo<CameraFocusTarget | null>(() => {
    const intent = props.cameraIntent;
    if (!intent || intent.type !== "focus-item") return null;

    const renderItem = renderItems.find((nextItem) => nextItem.item.id === intent.itemId);
    if (!renderItem) return null;

    const focusY = renderItem.position.y + renderItem.size.height * 0.45;

    return {
      itemId: renderItem.item.id,
      target: [renderItem.position.x, focusY, renderItem.position.z],
      radius: Math.max(renderItem.collisionRadius, renderItem.size.width * 0.5, renderItem.size.depth * 0.5),
    };
  }, [props.cameraIntent, renderItems]);

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

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      moveDragRef.current = null;
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  useEffect(() => {
    if (props.toolMode === "move") return;
    moveDragRef.current = null;
  }, [props.toolMode]);

  const resolvePlacementCoordinates = (params: {
    point: THREE.Vector3;
    anchorType: VisualAnchorType;
  }): {
    xNorm: number;
    yNorm: number;
    zNorm: number;
    point: THREE.Vector3;
  } => {
    const boundedPoint = clampPointToTankBounds(params.point, dims);
    const normalizedPoint = worldToNormalized({
      x: boundedPoint.x,
      y: boundedPoint.y,
      z: boundedPoint.z,
      dims,
    });

    const shouldSnapToGrid = props.gridSnapEnabled && params.anchorType === "substrate";
    const xNorm = shouldSnapToGrid
      ? snapNormalizedToInchGrid(normalizedPoint.x, dims.widthIn)
      : normalizedPoint.x;
    const zNorm = shouldSnapToGrid
      ? snapNormalizedToInchGrid(normalizedPoint.z, dims.depthIn)
      : normalizedPoint.z;

    if (params.anchorType === "substrate") {
      const substrateY = sampleSubstrateDepth({
        xNorm,
        zNorm,
        heightfield: props.canvasState.substrateHeightfield,
        tankHeightIn: dims.heightIn,
      });
      const yNorm = clamp01(substrateY / Math.max(1, dims.heightIn));
      const worldPoint = normalizedToWorld({ x: xNorm, y: yNorm, z: zNorm, dims });

      return {
        xNorm,
        yNorm,
        zNorm,
        point: new THREE.Vector3(worldPoint.x, substrateY, worldPoint.z),
      };
    }

    const worldPoint = normalizedToWorld({
      x: xNorm,
      y: normalizedPoint.y,
      z: zNorm,
      dims,
    });

    return {
      xNorm,
      yNorm: normalizedPoint.y,
      zNorm,
      point: new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z),
    };
  };

  const evaluatePlacement = (
    nextCandidate: PlacementCandidate | null,
    asset: VisualAsset | null,
  ): { valid: boolean; yNorm: number; xNorm: number; zNorm: number } => {
    if (!nextCandidate || !asset) return { valid: false, yNorm: 0, xNorm: 0, zNorm: 0 };

    const resolvedPlacement = resolvePlacementCoordinates({
      point: nextCandidate.point,
      anchorType: nextCandidate.anchorType,
    });

    const snappedPoint = resolvedPlacement.point;
    const yNorm = resolvedPlacement.yNorm;
    const scale = Math.max(0.1, asset.defaultScale);

    const mockItem: VisualCanvasItem = {
      id: "preview",
      assetId: asset.id,
      assetType: asset.type,
      categorySlug: asset.categorySlug,
      sku: asset.sku,
      variant: asset.slug,
      x: resolvedPlacement.xNorm,
      y: yNorm,
      z: resolvedPlacement.zNorm,
      scale,
      rotation: props.placementRotationDeg,
      layer: 0,
      anchorType: nextCandidate.anchorType,
      depthZone: depthZoneFromZ(resolvedPlacement.zNorm),
      constraints: {
        snapToSurface: true,
        canAttachToHardscape: hasHardscapeAttach(asset),
        requiresSubstrate: asset.categorySlug === "plants",
        rotationSnapDeg: asset.categorySlug === "plants" ? 5 : 15,
        collisionRadiusIn: 1.5,
      },
      transform: buildTransformFromNormalized({
        x: resolvedPlacement.xNorm,
        y: yNorm,
        z: resolvedPlacement.zNorm,
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

    const insideX = Math.abs(snappedPoint.x) <= dims.widthIn * 0.495;
    const insideZ = Math.abs(snappedPoint.z) <= dims.depthIn * 0.495;
    const insideY = snappedPoint.y >= 0 && snappedPoint.y <= dims.heightIn;
    valid = valid && insideX && insideZ && insideY;

    return {
      valid,
      xNorm: resolvedPlacement.xNorm,
      yNorm,
      zNorm: resolvedPlacement.zNorm,
    };
  };

  const placementValidity = evaluatePlacement(candidate, props.placementAsset);

  const performPlacement = (nextCandidate?: PlacementCandidate) => {
    const activeCandidate = nextCandidate ?? candidate;
    if (!props.placementAsset || !activeCandidate) return;
    const validity = evaluatePlacement(activeCandidate, props.placementAsset);
    if (!validity.valid) return;

    const count = Math.max(1, props.placementClusterCount);
    const anchorType = activeCandidate.anchorType;
    const shouldSnapToGrid = props.gridSnapEnabled && anchorType === "substrate";

    for (let i = 0; i < count; i += 1) {
      const offset = CLUSTER_OFFSETS[i % CLUSTER_OFFSETS.length] ?? [0, 0];
      let xNorm = clamp01(validity.xNorm + offset[0] * Math.min(1, props.sculptBrushSize + 0.25));
      let zNorm = clamp01(validity.zNorm + offset[1] * Math.min(1, props.sculptBrushSize + 0.25));

      if (shouldSnapToGrid) {
        xNorm = snapNormalizedToInchGrid(xNorm, dims.widthIn);
        zNorm = snapNormalizedToInchGrid(zNorm, dims.depthIn);
      }

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

  const pointerToMoveSurface = (
    event: ThreeEvent<PointerEvent>,
  ): {
    x: number;
    z: number;
  } => {
    const intersection = new THREE.Vector3();
    if (!event.ray.intersectPlane(moveDragPlaneRef.current, intersection)) {
      const fallback = worldToNormalized({
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
        dims,
      });
      return { x: clamp01(fallback.x), z: clamp01(fallback.z) };
    }

    const normalized = worldToNormalized({
      x: intersection.x,
      y: 0,
      z: intersection.z,
      dims,
    });
    return { x: clamp01(normalized.x), z: clamp01(normalized.z) };
  };

  const startMoveDrag = (
    event: ThreeEvent<PointerEvent>,
    anchorItemId: string | null,
  ): boolean => {
    if (event.shiftKey) return false;
    if (!anchorItemId) return false;

    // Require a direct drag on the selected item to avoid accidental moves while orbiting/panning.
    if (!selectedItemIdSet.has(anchorItemId)) {
      props.onSelectItem(anchorItemId, event.shiftKey ? "toggle" : "replace");
      return false;
    }

    const candidateSelectionIds = Array.from(selectedItemIdSet);

    const selectedDragItems: MoveDragState["items"] = [];
    for (const selectedId of candidateSelectionIds) {
      const selectedItem = props.canvasState.items.find((item) => item.id === selectedId);
      if (!selectedItem) continue;

      selectedDragItems.push({
        id: selectedItem.id,
        x: selectedItem.x,
        z: selectedItem.z,
        scale: selectedItem.scale,
        rotation: selectedItem.rotation,
      });
    }

    if (selectedDragItems.length === 0) return false;
    const pointerNorm = pointerToMoveSurface(event);
    const pointerTarget = event.target as {
      setPointerCapture?: (pointerId: number) => void;
    };
    pointerTarget.setPointerCapture?.(event.pointerId);

    let minX = 1;
    let maxX = 0;
    let minZ = 1;
    let maxZ = 0;
    for (const selectedDragItem of selectedDragItems) {
      if (selectedDragItem.x < minX) minX = selectedDragItem.x;
      if (selectedDragItem.x > maxX) maxX = selectedDragItem.x;
      if (selectedDragItem.z < minZ) minZ = selectedDragItem.z;
      if (selectedDragItem.z > maxZ) maxZ = selectedDragItem.z;
    }

    moveDragRef.current = {
      pointerId: event.pointerId,
      startPointer: {
        x: pointerNorm.x,
        z: pointerNorm.z,
      },
      minDeltaX: -minX,
      maxDeltaX: 1 - maxX,
      minDeltaZ: -minZ,
      maxDeltaZ: 1 - maxZ,
      releasePointerCaptureTarget: pointerTarget,
      items: selectedDragItems,
    };
    return true;
  };

  const moveSelectedItems = (event: ThreeEvent<PointerEvent>) => {
    const activeMoveDrag = moveDragRef.current;
    if (!activeMoveDrag) return;
    if (activeMoveDrag.pointerId !== event.pointerId) return;

    const pointerNorm = pointerToMoveSurface(event);

    const deltaX = THREE.MathUtils.clamp(
      pointerNorm.x - activeMoveDrag.startPointer.x,
      activeMoveDrag.minDeltaX,
      activeMoveDrag.maxDeltaX,
    );
    const deltaZ = THREE.MathUtils.clamp(
      pointerNorm.z - activeMoveDrag.startPointer.z,
      activeMoveDrag.minDeltaZ,
      activeMoveDrag.maxDeltaZ,
    );

    for (const selectedDragItem of activeMoveDrag.items) {
      const nextX = clamp01(selectedDragItem.x + deltaX);
      const nextZ = clamp01(selectedDragItem.z + deltaZ);
      const substrateY = sampleSubstrateDepth({
        xNorm: nextX,
        zNorm: nextZ,
        heightfield: props.canvasState.substrateHeightfield,
        tankHeightIn: dims.heightIn,
      });
      const nextY = clamp01(substrateY / Math.max(1, dims.heightIn));

      props.onMoveItem(selectedDragItem.id, {
        x: nextX,
        y: nextY,
        z: nextZ,
        anchorType: "substrate",
        depthZone: depthZoneFromZ(nextZ),
        transform: buildTransformFromNormalized({
          x: nextX,
          y: nextY,
          z: nextZ,
          scale: selectedDragItem.scale,
          rotation: selectedDragItem.rotation,
          dims,
        }),
      });
    }
  };

  const handleSurfacePointer = (
    event: ThreeEvent<PointerEvent>,
    anchorType: VisualAnchorType,
    itemId: string | null,
  ) => {
    event.stopPropagation();

    const isMoveDragGesture =
      event.buttons === 1 || (event.pointerType === "touch" && event.isPrimary);

    if (props.toolMode === "move" && isMoveDragGesture) {
      moveSelectedItems(event);
    }

    const surfaceNormal = event.face?.normal
      ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
      : WORLD_UP.clone();
    const candidatePoint =
      props.toolMode === "place" && props.placementAsset
        ? resolvePlacementCoordinates({
            point: event.point,
            anchorType,
          }).point
        : event.point.clone();

    setCandidate({
      point: candidatePoint,
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
    if (props.toolMode === "move" && (selectedItemIds.length > 0 || props.selectedItemId)) {
      const moveDragStarted = startMoveDrag(event, itemId);
      if (moveDragStarted) {
        event.stopPropagation();
        handleSurfacePointer(event, anchorType, itemId);
      }
      return;
    }

    event.stopPropagation();

    if (props.toolMode === "place" && props.placementAsset) {
      const surfaceNormal = event.face?.normal
        ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
        : WORLD_UP.clone();
      const immediateCandidate: PlacementCandidate = {
        point: resolvePlacementCoordinates({
          point: event.point,
          anchorType,
        }).point,
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
    if (moveDragRef.current && moveDragRef.current.pointerId === event.pointerId) {
      moveDragRef.current.releasePointerCaptureTarget?.releasePointerCapture?.(event.pointerId);
    }
    moveDragRef.current = null;
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
        substrateMaterialGrid={props.canvasState.substrateMaterialGrid}
        showGlassWalls={props.glassWallsEnabled && props.qualityTier !== "low"}
        showAmbientParticles={props.ambientParticlesEnabled && props.qualityTier !== "low"}
        showDepthGuides={props.showDepthGuides}
        showSnapGrid={props.gridSnapEnabled}
        showLightingHeatmap={showLightingHeatmap}
        lightSimulationSource={lightSimulationSource}
        lightMountHeightIn={props.lightMountHeightIn}
        showSubstrateControlPoints={props.currentStep === "substrate"}
        currentStep={props.currentStep}
        onSurfacePointer={handleSurfacePointer}
        onSurfaceDown={handleSurfaceDown}
        onSurfaceUp={handleSurfaceUp}
        onSubstrateHeightfield={props.onSubstrateHeightfield}
        onSubstrateStrokeStart={onSubstrateStrokeStart ?? (() => {})}
        onSubstrateStrokeEnd={onSubstrateStrokeEnd ?? (() => {})}
        onSubstrateControlPointDragStateChange={setSubstrateNodeDragActive}
      />

      {props.showMeasurements ? (
        <TankMeasurementOverlay dims={dims} unit={props.measurementUnit} />
      ) : null}

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
          onPointerMove={
            itemInteractionsEnabled
              ? (event) =>
                  handleSurfacePointer(event, anchorTypeForRenderItem(renderItem), renderItem.item.id)
              : undefined
          }
          onPointerDown={
            itemInteractionsEnabled
              ? (event) =>
                  handleSurfaceDown(event, anchorTypeForRenderItem(renderItem), renderItem.item.id)
              : undefined
          }
          onPointerUp={itemInteractionsEnabled ? handleSurfaceUp : undefined}
        >
          <ItemMesh
            renderItem={renderItem}
            selected={selectedItemIdSet.has(renderItem.item.id)}
            hovered={renderItem.item.id === hoveredItemId}
            toolMode={props.toolMode}
            interactive={itemInteractionsEnabled}
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
          interactive={itemInteractionsEnabled}
          selectedItemIds={selectedItemIdSet}
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

      {selectedRenderItem && itemInteractionsEnabled ? (
        <ItemTransformHandles
          renderItem={selectedRenderItem}
          onUpdateItem={props.onMoveItem}
          onInteractionStateChange={setTransformInteractionLocked}
        />
      ) : null}

      <EquipmentVisuals
        dims={dims}
        equipmentAssets={props.equipmentAssets}
        lightMountHeightIn={props.lightMountHeightIn}
      />

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
        controlsEnabled={!transformInteractionLocked && !substrateNodeDragActive}
        onCameraPresetModeChange={props.onCameraPresetModeChange}
        onCameraDiagnostic={props.onCameraDiagnostic}
        cameraIntent={props.cameraIntent}
        focusTarget={cameraFocusTarget}
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
