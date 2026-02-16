"use client";

import { Edges, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, SSAO, ToneMapping, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";

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
  const baseYRotation = useMemo(() => (props.renderItem.item.rotation * Math.PI) / 180, [props.renderItem.item.rotation]);
  const palette = useMemo(() => materialPalette(props.renderItem.asset), [props.renderItem.asset]);
  const highlightColor = props.selected ? "#cbf2dd" : props.hovered ? "#d6e9ff" : null;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const pulse = props.selected ? 1 + Math.sin(state.clock.elapsedTime * 4.1) * 0.02 : 1;
    group.rotation.y =
      props.renderItem.asset.categorySlug === "plants"
        ? baseYRotation + Math.sin(state.clock.elapsedTime * 1.25 + props.renderItem.position.x * 0.2) * 0.06
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

  const sharedEvents = {
    onClick,
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      props.onHover(props.renderItem.item.id);
    },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      props.onHover(null);
    },
  };

  const width = props.renderItem.size.width;
  const depth = props.renderItem.size.depth;
  const height = props.renderItem.size.height;

  return (
    <group
      ref={groupRef}
      position={props.renderItem.position}
      onClick={sharedEvents.onClick}
      onPointerOver={sharedEvents.onPointerOver}
      onPointerOut={sharedEvents.onPointerOut}
    >
      {props.renderItem.asset.categorySlug === "plants" ? (
        <group>
          {Array.from({ length: 4 }).map((_, index) => {
            const hue = palette[index % palette.length] ?? palette[0] ?? "#4f9f5f";
            const localScale = 0.76 + index * 0.18;
            const localHeight = height * localScale;
            const localWidth = Math.max(0.2, width * 0.17 * localScale);
            return (
              <mesh
                key={index}
                castShadow
                receiveShadow
                position={[
                  Math.sin(index * 1.73) * width * 0.14,
                  localHeight * 0.5,
                  Math.cos(index * 1.73) * depth * 0.14,
                ]}
              >
                <coneGeometry args={[localWidth, localHeight, 7]} />
                <meshStandardMaterial color={hue} roughness={0.74} metalness={0.06} />
                {highlightColor ? <Edges color={highlightColor} threshold={22} /> : null}
              </mesh>
            );
          })}
        </group>
      ) : props.renderItem.asset.materialType?.includes("wood") ? (
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[Math.max(0.28, width * 0.16), Math.max(0.5, height * 0.78), 8, 12]} />
          <meshStandardMaterial color={palette[1] ?? WOOD_COLORS[1]} roughness={0.88} metalness={0.05} />
          {highlightColor ? <Edges color={highlightColor} threshold={28} /> : null}
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[Math.max(0.35, Math.max(width, depth) * 0.26), 1]} />
          <meshStandardMaterial color={palette[1] ?? ROCK_COLORS[1]} roughness={0.82} metalness={0.1} />
          {highlightColor ? <Edges color={highlightColor} threshold={18} /> : null}
        </mesh>
      )}
    </group>
  );
}

function TankShell(props: {
  dims: SceneDims;
  qualityTier: BuilderSceneQualityTier;
  substrateHeightfield: SubstrateHeightfield;
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

      <mesh
        position={[0, props.dims.heightIn * 0.5, 0]}
        receiveShadow
        onPointerMove={(event) => props.onSurfacePointer(event, "substrate", null)}
        onPointerDown={(event) => props.onSurfaceDown(event, "substrate", null)}
        onPointerUp={props.onSurfaceUp}
      >
        <boxGeometry args={[props.dims.widthIn, props.dims.heightIn, props.dims.depthIn]} />
        <meshPhysicalMaterial
          color="#c8f0ff"
          transparent
          opacity={0.12}
          transmission={0.99}
          roughness={0.03}
          thickness={1.5}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      <mesh
        geometry={substrateGeometryData.geometry}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
        onPointerMove={(event) => props.onSurfacePointer(event, "substrate", null)}
        onPointerDown={(event) => props.onSurfaceDown(event, "substrate", null)}
        onPointerUp={props.onSurfaceUp}
      >
        <meshStandardMaterial color="#a68354" roughness={0.93} metalness={0.03} />
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

  useEffect(() => {
    props.onHoverItem?.(hoveredItemId);
  }, [hoveredItemId, props]);

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

    if (props.toolMode === "move" && props.selectedItemId && event.buttons === 1) {
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
      sculptingRef.current = true;
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
    sculptingRef.current = false;
  };

  const shadowMapSize = props.qualityTier === "high" ? 2048 : props.qualityTier === "medium" ? 1536 : 1024;

  return (
    <>
      <color attach="background" args={["#08141f"]} />
      <fogExp2 attach="fog" args={["#0a1622", props.qualityTier === "low" ? 0.028 : 0.02]} />

      <ambientLight intensity={0.28} color="#95bed6" />
      <hemisphereLight intensity={0.44} color="#9fcde3" groundColor="#2d261f" />
      <directionalLight
        castShadow
        intensity={1.35}
        color="#fff2d6"
        position={[dims.widthIn * 0.8, dims.heightIn * 1.6, dims.depthIn * 0.7]}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-dims.widthIn}
        shadow-camera-right={dims.widthIn}
        shadow-camera-top={dims.heightIn * 1.4}
        shadow-camera-bottom={-dims.heightIn * 0.6}
        shadow-camera-near={0.5}
        shadow-camera-far={dims.widthIn * 4}
      />
      <directionalLight
        intensity={0.6}
        color="#7bb7ff"
        position={[-dims.widthIn * 0.75, dims.heightIn * 1.1, -dims.depthIn * 1.2]}
      />
      <pointLight intensity={0.38} color="#d8ecff" position={[0, dims.heightIn * 0.5, dims.depthIn * 0.9]} />
      <Environment preset="city" background={false} blur={0.66} />

      <TankShell
        dims={dims}
        qualityTier={props.qualityTier}
        substrateHeightfield={props.canvasState.substrateHeightfield}
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

      {renderItems.map((renderItem) => (
        <group
          key={renderItem.item.id}
          onPointerMove={(event) =>
            handleSurfacePointer(
              event,
              renderItem.item.categorySlug === "hardscape" ? "hardscape" : renderItem.item.anchorType,
              renderItem.item.id,
            )
          }
          onPointerDown={(event) =>
            handleSurfaceDown(
              event,
              renderItem.item.categorySlug === "hardscape" ? "hardscape" : renderItem.item.anchorType,
              renderItem.item.id,
            )
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

      {props.postprocessingEnabled && props.qualityTier !== "low" ? (
        <EffectComposer multisampling={4}>
          <SSAO
            samples={props.qualityTier === "high" ? 28 : 18}
            radius={props.qualityTier === "high" ? 0.26 : 0.2}
            intensity={props.qualityTier === "high" ? 12 : 8}
            luminanceInfluence={0.45}
          />
          <Bloom
            luminanceThreshold={0.72}
            luminanceSmoothing={0.44}
            intensity={props.qualityTier === "high" ? 0.48 : 0.4}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.42} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.02} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      ) : props.postprocessingEnabled ? (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.72} luminanceSmoothing={0.44} intensity={0.3} />
          <Vignette eskil={false} offset={0.22} darkness={0.36} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.018} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
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
    >
      <SceneRoot {...props} />
    </Canvas>
  );
}
