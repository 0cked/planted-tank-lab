import type {
  SubstrateHeightfield,
  SubstrateMaterialGrid,
  SubstrateMaterialType,
  VisualAnchorType,
  VisualCanvasItem,
  VisualDepthZone,
  VisualItemTransform,
  VisualSubstrateProfile,
} from "@/components/builder/visual/types";
import {
  SUBSTRATE_MATERIAL_CODE_BY_TYPE,
  normalizeSubstrateMaterialGrid,
} from "@/lib/visual/substrate-materials";
import {
  legacySubstrateProfileToHeightfield,
  normalizeSubstrateHeightfield,
  sampleSubstrateHeightfieldDepth,
  SUBSTRATE_HEIGHTFIELD_RESOLUTION,
} from "@/lib/visual/substrate";

export type SceneDims = {
  widthIn: number;
  heightIn: number;
  depthIn: number;
};

export type SubstrateBrushMode = "raise" | "lower" | "smooth" | "erode" | "material";

export type SubstratePreset = "flat" | "island" | "slope" | "valley";

export const ASSET_RENDER_DIMENSION_SCALE = 0.72;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clampSubstrateDepth(value: number, tankHeightIn: number): number {
  const minDepth = 0.2;
  const maxDepth = Math.max(minDepth, tankHeightIn * 0.62);
  return clamp(value, minDepth, maxDepth);
}

function heightfieldIndex(xIndex: number, zIndex: number): number {
  return zIndex * SUBSTRATE_HEIGHTFIELD_RESOLUTION + xIndex;
}

function neighborAverage(
  heightfield: SubstrateHeightfield,
  xIndex: number,
  zIndex: number,
): number {
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;
  const left = heightfield[heightfieldIndex(Math.max(0, xIndex - 1), zIndex)] ?? 0;
  const right = heightfield[heightfieldIndex(Math.min(maxIndex, xIndex + 1), zIndex)] ?? 0;
  const front = heightfield[heightfieldIndex(xIndex, Math.max(0, zIndex - 1))] ?? 0;
  const back = heightfield[heightfieldIndex(xIndex, Math.min(maxIndex, zIndex + 1))] ?? 0;
  return (left + right + front + back) / 4;
}

function legacyPresetProfile(preset: SubstratePreset): VisualSubstrateProfile {
  switch (preset) {
    case "flat":
      return {
        leftDepthIn: 1.4,
        centerDepthIn: 1.6,
        rightDepthIn: 1.4,
        frontDepthIn: 1.3,
        backDepthIn: 1.8,
        moundHeightIn: 0,
        moundPosition: 0.5,
      };
    case "island":
      return {
        leftDepthIn: 1.3,
        centerDepthIn: 3.2,
        rightDepthIn: 1.5,
        frontDepthIn: 1.2,
        backDepthIn: 2.9,
        moundHeightIn: 1.4,
        moundPosition: 0.5,
      };
    case "slope":
      return {
        leftDepthIn: 1.1,
        centerDepthIn: 2.1,
        rightDepthIn: 3,
        frontDepthIn: 1.1,
        backDepthIn: 3.6,
        moundHeightIn: 0.9,
        moundPosition: 0.62,
      };
    case "valley":
      return {
        leftDepthIn: 2.7,
        centerDepthIn: 1.2,
        rightDepthIn: 2.8,
        frontDepthIn: 1.6,
        backDepthIn: 3,
        moundHeightIn: 0.5,
        moundPosition: 0.5,
      };
  }
}

export function depthZoneFromZ(z: number): VisualDepthZone {
  const normalized = clamp01(z);
  if (normalized <= 0.33) return "foreground";
  if (normalized <= 0.66) return "midground";
  return "background";
}

export function zFromDepthZone(zone: VisualDepthZone | null | undefined): number {
  if (zone === "foreground") return 0.2;
  if (zone === "midground") return 0.5;
  if (zone === "background") return 0.8;
  return 0.5;
}

export function defaultAnchorForCategory(categorySlug: string): VisualAnchorType {
  if (categorySlug === "hardscape") return "substrate";
  if (categorySlug === "plants") return "substrate";
  if (["light", "filter", "co2", "heater"].includes(categorySlug)) return "glass";
  return "substrate";
}

export function buildTransformFromNormalized(params: {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  dims: SceneDims;
}): VisualItemTransform {
  return {
    position: [
      round((params.x - 0.5) * params.dims.widthIn),
      round(params.y * params.dims.heightIn),
      round((params.z - 0.5) * params.dims.depthIn),
    ],
    rotation: [0, round((params.rotation * Math.PI) / 180), 0],
    scale: [round(params.scale), round(params.scale), round(params.scale)],
  };
}

export function normalizedFromTransform(
  transform: Partial<VisualItemTransform> | undefined,
  dims: SceneDims,
): { x: number; y: number; z: number; scale: number; rotation: number } | null {
  if (!transform) return null;
  if (!Array.isArray(transform.position) || transform.position.length !== 3) return null;

  const px = Number(transform.position[0]);
  const py = Number(transform.position[1]);
  const pz = Number(transform.position[2]);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return null;

  const ry =
    Array.isArray(transform.rotation) && transform.rotation.length === 3
      ? Number(transform.rotation[1])
      : 0;
  const sx =
    Array.isArray(transform.scale) && transform.scale.length === 3
      ? Number(transform.scale[0])
      : 1;
  const sy =
    Array.isArray(transform.scale) && transform.scale.length === 3
      ? Number(transform.scale[1])
      : 1;
  const sz =
    Array.isArray(transform.scale) && transform.scale.length === 3
      ? Number(transform.scale[2])
      : 1;

  return {
    x: clamp01(px / Math.max(1, dims.widthIn) + 0.5),
    y: clamp01(py / Math.max(1, dims.heightIn)),
    z: clamp01(pz / Math.max(1, dims.depthIn) + 0.5),
    scale: clamp(
      Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz)
        ? (sx + sy + sz) / 3
        : 1,
      0.1,
      6,
    ),
    rotation: clamp(Number.isFinite(ry) ? (ry * 180) / Math.PI : 0, -180, 180),
  };
}

export function worldToNormalized(point: {
  x: number;
  y: number;
  z: number;
  dims: SceneDims;
}): { x: number; y: number; z: number } {
  return {
    x: clamp01(point.x / Math.max(1, point.dims.widthIn) + 0.5),
    y: clamp01(point.y / Math.max(1, point.dims.heightIn)),
    z: clamp01(point.z / Math.max(1, point.dims.depthIn) + 0.5),
  };
}

export function normalizedToWorld(point: {
  x: number;
  y: number;
  z: number;
  dims: SceneDims;
}): { x: number; y: number; z: number } {
  return {
    x: (clamp01(point.x) - 0.5) * point.dims.widthIn,
    y: clamp01(point.y) * point.dims.heightIn,
    z: (clamp01(point.z) - 0.5) * point.dims.depthIn,
  };
}

export function sampleSubstrateDepth(params: {
  xNorm: number;
  zNorm: number;
  heightfield: SubstrateHeightfield;
  tankHeightIn: number;
}): number {
  return sampleSubstrateHeightfieldDepth({
    xNorm: params.xNorm,
    zNorm: params.zNorm,
    heightfield: params.heightfield,
    tankHeightIn: params.tankHeightIn,
  });
}

function gaussianFalloff(distance: number, radius: number): number {
  const safeRadius = Math.max(0.0001, radius);
  return Math.exp(-(distance * distance) / (2 * safeRadius * safeRadius));
}

export function applySubstrateBrush(params: {
  heightfield: SubstrateHeightfield;
  mode: SubstrateBrushMode;
  xNorm: number;
  zNorm: number;
  brushSize: number;
  strength: number;
  tankHeightIn: number;
}): SubstrateHeightfield {
  const source = normalizeSubstrateHeightfield(params.heightfield, params.tankHeightIn);
  if (params.mode === "material") {
    return source.slice();
  }

  const next = source.slice();

  const centerX = clamp01(params.xNorm);
  const centerZ = clamp01(params.zNorm);
  const brushRadius = clamp(params.brushSize, 0.05, 0.6);
  const strength = clamp(params.strength, 0.01, 1);
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;

  const deltaBase = Math.max(0.02, params.tankHeightIn * 0.02) * strength;
  const smoothWeightBase = clamp(strength * 0.55, 0.06, 0.55);
  const erodeSmoothWeight = clamp(strength * 0.28, 0.05, 0.28);

  for (let zIndex = 0; zIndex < SUBSTRATE_HEIGHTFIELD_RESOLUTION; zIndex += 1) {
    const zNorm = maxIndex === 0 ? 0 : zIndex / maxIndex;

    for (let xIndex = 0; xIndex < SUBSTRATE_HEIGHTFIELD_RESOLUTION; xIndex += 1) {
      const xNorm = maxIndex === 0 ? 0 : xIndex / maxIndex;
      const distance = Math.hypot(xNorm - centerX, zNorm - centerZ);
      if (distance > brushRadius) continue;

      const index = heightfieldIndex(xIndex, zIndex);
      const currentDepth = source[index] ?? 0;
      const falloff = gaussianFalloff(distance, brushRadius);
      const delta = deltaBase * falloff;

      if (params.mode === "raise") {
        next[index] = clampSubstrateDepth(currentDepth + delta, params.tankHeightIn);
        continue;
      }

      if (params.mode === "lower") {
        next[index] = clampSubstrateDepth(currentDepth - delta, params.tankHeightIn);
        continue;
      }

      const neighborDepth = neighborAverage(source, xIndex, zIndex);

      if (params.mode === "smooth") {
        const blend = smoothWeightBase * falloff;
        next[index] = clampSubstrateDepth(
          currentDepth + (neighborDepth - currentDepth) * blend,
          params.tankHeightIn,
        );
        continue;
      }

      const loweredDepth = clampSubstrateDepth(currentDepth - delta * 1.2, params.tankHeightIn);
      const erosionBlend = erodeSmoothWeight * falloff;
      next[index] = clampSubstrateDepth(
        loweredDepth + (neighborDepth - loweredDepth) * erosionBlend,
        params.tankHeightIn,
      );
    }
  }

  return next;
}

export function applySubstrateMaterialBrush(params: {
  materialGrid: SubstrateMaterialGrid;
  xNorm: number;
  zNorm: number;
  brushSize: number;
  strength: number;
  materialType: SubstrateMaterialType;
}): SubstrateMaterialGrid {
  const source = normalizeSubstrateMaterialGrid(params.materialGrid);
  const next = source.slice();

  const centerX = clamp01(params.xNorm);
  const centerZ = clamp01(params.zNorm);
  const brushRadius = clamp(params.brushSize, 0.05, 0.6);
  const strength = clamp(params.strength, 0.01, 1);
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;
  const targetCode = SUBSTRATE_MATERIAL_CODE_BY_TYPE[params.materialType] ?? 0;
  const minimumInfluence = Math.max(0.08, (1 - strength) * 0.22);

  for (let zIndex = 0; zIndex < SUBSTRATE_HEIGHTFIELD_RESOLUTION; zIndex += 1) {
    const zNorm = maxIndex === 0 ? 0 : zIndex / maxIndex;

    for (let xIndex = 0; xIndex < SUBSTRATE_HEIGHTFIELD_RESOLUTION; xIndex += 1) {
      const xNorm = maxIndex === 0 ? 0 : xIndex / maxIndex;
      const distance = Math.hypot(xNorm - centerX, zNorm - centerZ);
      if (distance > brushRadius) continue;

      const influence = gaussianFalloff(distance, brushRadius) * strength;
      if (influence < minimumInfluence) continue;

      next[heightfieldIndex(xIndex, zIndex)] = targetCode;
    }
  }

  return next;
}

export function buildSubstratePreset(params: {
  preset: SubstratePreset;
  tankHeightIn: number;
}): SubstrateHeightfield {
  return legacySubstrateProfileToHeightfield({
    profile: legacyPresetProfile(params.preset),
    tankHeightIn: Math.max(1, params.tankHeightIn),
  });
}

export function estimateCollisionRadius(params: {
  item: VisualCanvasItem;
  assetWidthIn: number;
  assetDepthIn: number;
}): number {
  // Match collision radius to the rendered world footprint.
  const renderedFootprint =
    Math.max(params.assetWidthIn, params.assetDepthIn) * ASSET_RENDER_DIMENSION_SCALE;
  const scale = clamp(params.item.scale, 0.1, 6);
  const hint = params.item.constraints.collisionRadiusIn;
  return Math.max(0.18, renderedFootprint * scale * 0.48, hint * 0.28);
}
