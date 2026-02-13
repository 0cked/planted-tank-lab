import type {
  VisualAnchorType,
  VisualCanvasItem,
  VisualDepthZone,
  VisualItemTransform,
  VisualSubstrateProfile,
} from "@/components/builder/visual/types";
import { normalizeSubstrateProfile } from "@/lib/visual/substrate";

export type SceneDims = {
  widthIn: number;
  heightIn: number;
  depthIn: number;
};

export type SubstrateBrushMode = "raise" | "lower" | "smooth" | "erode";

export type SubstratePreset = "flat" | "island" | "slope" | "valley";

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

  const ry = Array.isArray(transform.rotation) && transform.rotation.length === 3
    ? Number(transform.rotation[1])
    : 0;
  const sx = Array.isArray(transform.scale) && transform.scale.length === 3
    ? Number(transform.scale[0])
    : 1;
  const sy = Array.isArray(transform.scale) && transform.scale.length === 3
    ? Number(transform.scale[1])
    : 1;
  const sz = Array.isArray(transform.scale) && transform.scale.length === 3
    ? Number(transform.scale[2])
    : 1;

  return {
    x: clamp01(px / Math.max(1, dims.widthIn) + 0.5),
    y: clamp01(py / Math.max(1, dims.heightIn)),
    z: clamp01(pz / Math.max(1, dims.depthIn) + 0.5),
    scale: clamp((Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz) ? (sx + sy + sz) / 3 : 1), 0.1, 6),
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

function sideDepthAtX(xNorm: number, profile: VisualSubstrateProfile): number {
  const x = clamp01(xNorm);
  if (x <= 0.5) {
    const t = x / 0.5;
    return profile.leftDepthIn * (1 - t) + profile.centerDepthIn * t;
  }
  const t = (x - 0.5) / 0.5;
  return profile.centerDepthIn * (1 - t) + profile.rightDepthIn * t;
}

function frontBackDepthAtZ(zNorm: number, profile: VisualSubstrateProfile): number {
  const z = clamp01(zNorm);
  return profile.frontDepthIn * (1 - z) + profile.backDepthIn * z;
}

export function sampleSubstrateDepth(params: {
  xNorm: number;
  zNorm: number;
  profile: VisualSubstrateProfile;
  tankHeightIn: number;
}): number {
  const normalizedProfile = normalizeSubstrateProfile(params.profile, params.tankHeightIn);
  const sideDepth = sideDepthAtX(params.xNorm, normalizedProfile);
  const frontBackDepth = frontBackDepthAtZ(params.zNorm, normalizedProfile);
  const moundDistance = Math.abs(clamp01(params.xNorm) - normalizedProfile.moundPosition);
  const moundWeight = Math.max(0, 1 - moundDistance / 0.32);
  const depth = (sideDepth * 0.64 + frontBackDepth * 0.36) + normalizedProfile.moundHeightIn * moundWeight;
  return clamp(depth, 0.1, Math.max(1, params.tankHeightIn * 0.72));
}

export function applySubstrateBrush(params: {
  profile: VisualSubstrateProfile;
  mode: SubstrateBrushMode;
  xNorm: number;
  zNorm: number;
  brushSize: number;
  strength: number;
  tankHeightIn: number;
}): VisualSubstrateProfile {
  const profile = normalizeSubstrateProfile(params.profile, params.tankHeightIn);
  const x = clamp01(params.xNorm);
  const z = clamp01(params.zNorm);
  const brushSize = clamp(params.brushSize, 0.05, 0.6);
  const strength = clamp(params.strength, 0.01, 1);

  const radial = Math.hypot(x - 0.5, z - 0.5);
  const radialFalloff = Math.max(0, 1 - radial / Math.max(brushSize, 0.08));
  const sign = params.mode === "lower" || params.mode === "erode" ? -1 : 1;
  const delta = sign * strength * radialFalloff * Math.max(0.02, params.tankHeightIn * 0.018);

  const leftWeight = clamp(1 - x * 1.9, 0, 1);
  const centerWeight = clamp(1 - Math.abs(x - 0.5) * 2, 0, 1);
  const rightWeight = clamp((x - 0.05) * 1.9, 0, 1);
  const frontWeight = clamp(1 - z * 1.2, 0, 1);
  const backWeight = clamp(z * 1.2, 0, 1);

  if (params.mode === "smooth") {
    const avg =
      (profile.leftDepthIn +
        profile.centerDepthIn +
        profile.rightDepthIn +
        profile.frontDepthIn +
        profile.backDepthIn) /
      5;
    const smoothMix = clamp(0.08 + strength * 0.22, 0.08, 0.4);
    return normalizeSubstrateProfile(
      {
        leftDepthIn: profile.leftDepthIn + (avg - profile.leftDepthIn) * smoothMix,
        centerDepthIn: profile.centerDepthIn + (avg - profile.centerDepthIn) * smoothMix,
        rightDepthIn: profile.rightDepthIn + (avg - profile.rightDepthIn) * smoothMix,
        frontDepthIn: profile.frontDepthIn + (avg - profile.frontDepthIn) * smoothMix,
        backDepthIn: profile.backDepthIn + (avg - profile.backDepthIn) * smoothMix,
        moundHeightIn: profile.moundHeightIn * (1 - smoothMix * 0.4),
        moundPosition: profile.moundPosition + (x - profile.moundPosition) * smoothMix * 0.3,
      },
      params.tankHeightIn,
    );
  }

  const erosionFactor = params.mode === "erode" ? 1.5 : 1;

  return normalizeSubstrateProfile(
    {
      leftDepthIn: profile.leftDepthIn + delta * leftWeight * erosionFactor,
      centerDepthIn: profile.centerDepthIn + delta * centerWeight * erosionFactor,
      rightDepthIn: profile.rightDepthIn + delta * rightWeight * erosionFactor,
      frontDepthIn: profile.frontDepthIn + delta * frontWeight,
      backDepthIn: profile.backDepthIn + delta * backWeight,
      moundHeightIn: profile.moundHeightIn + delta * centerWeight * 0.62,
      moundPosition: profile.moundPosition + (x - profile.moundPosition) * strength * 0.06,
    },
    params.tankHeightIn,
  );
}

export function buildSubstratePreset(params: {
  preset: SubstratePreset;
  tankHeightIn: number;
}): VisualSubstrateProfile {
  const h = Math.max(1, params.tankHeightIn);
  switch (params.preset) {
    case "flat":
      return normalizeSubstrateProfile(
        {
          leftDepthIn: 1.4,
          centerDepthIn: 1.6,
          rightDepthIn: 1.4,
          frontDepthIn: 1.3,
          backDepthIn: 1.8,
          moundHeightIn: 0,
          moundPosition: 0.5,
        },
        h,
      );
    case "island":
      return normalizeSubstrateProfile(
        {
          leftDepthIn: 1.3,
          centerDepthIn: 3.2,
          rightDepthIn: 1.5,
          frontDepthIn: 1.2,
          backDepthIn: 2.9,
          moundHeightIn: 1.4,
          moundPosition: 0.5,
        },
        h,
      );
    case "slope":
      return normalizeSubstrateProfile(
        {
          leftDepthIn: 1.1,
          centerDepthIn: 2.1,
          rightDepthIn: 3,
          frontDepthIn: 1.1,
          backDepthIn: 3.6,
          moundHeightIn: 0.9,
          moundPosition: 0.62,
        },
        h,
      );
    case "valley":
      return normalizeSubstrateProfile(
        {
          leftDepthIn: 2.7,
          centerDepthIn: 1.2,
          rightDepthIn: 2.8,
          frontDepthIn: 1.6,
          backDepthIn: 3,
          moundHeightIn: 0.5,
          moundPosition: 0.5,
        },
        h,
      );
  }
}

export function estimateCollisionRadius(params: {
  item: VisualCanvasItem;
  assetWidthIn: number;
  assetDepthIn: number;
}): number {
  const base = Math.max(params.assetWidthIn, params.assetDepthIn) * 0.5;
  const scale = clamp(params.item.scale, 0.1, 6);
  const hint = params.item.constraints.collisionRadiusIn;
  return Math.max(0.3, base * scale * 0.36, hint * 0.6);
}
