import type { VisualSubstrateProfile } from "@/components/builder/visual/types";

const CUBIC_IN_PER_LITER = 61.0237;
const MIN_SUBSTRATE_DEPTH_IN = 0.2;
const MAX_SUBSTRATE_DEPTH_RATIO = 0.62;
const MAX_MOUND_RATIO = 0.38;

export const DEFAULT_SUBSTRATE_PROFILE: VisualSubstrateProfile = {
  leftDepthIn: 1.5,
  centerDepthIn: 2.5,
  rightDepthIn: 1.8,
  moundHeightIn: 0.8,
  moundPosition: 0.54,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clampDepth(value: number, tankHeightIn: number): number {
  const maxDepth = Math.max(MIN_SUBSTRATE_DEPTH_IN, tankHeightIn * MAX_SUBSTRATE_DEPTH_RATIO);
  return clamp(value, MIN_SUBSTRATE_DEPTH_IN, maxDepth);
}

function clampMound(value: number, tankHeightIn: number): number {
  const maxMound = Math.max(0, tankHeightIn * MAX_MOUND_RATIO);
  return clamp(value, 0, maxMound);
}

export function normalizeSubstrateProfile(
  input: Partial<VisualSubstrateProfile> | undefined,
  tankHeightIn: number,
): VisualSubstrateProfile {
  const safeHeight = Math.max(1, tankHeightIn);
  const source = input ?? DEFAULT_SUBSTRATE_PROFILE;
  return {
    leftDepthIn: clampDepth(source.leftDepthIn ?? DEFAULT_SUBSTRATE_PROFILE.leftDepthIn, safeHeight),
    centerDepthIn: clampDepth(
      source.centerDepthIn ?? DEFAULT_SUBSTRATE_PROFILE.centerDepthIn,
      safeHeight,
    ),
    rightDepthIn: clampDepth(
      source.rightDepthIn ?? DEFAULT_SUBSTRATE_PROFILE.rightDepthIn,
      safeHeight,
    ),
    moundHeightIn: clampMound(
      source.moundHeightIn ?? DEFAULT_SUBSTRATE_PROFILE.moundHeightIn,
      safeHeight,
    ),
    moundPosition: clamp(source.moundPosition ?? DEFAULT_SUBSTRATE_PROFILE.moundPosition, 0.2, 0.8),
  };
}

export function estimateSubstrateVolume(params: {
  tankWidthIn: number;
  tankDepthIn: number;
  tankHeightIn: number;
  profile: VisualSubstrateProfile;
}): {
  normalizedProfile: VisualSubstrateProfile;
  averageDepthIn: number;
  volumeCubicIn: number;
  volumeLiters: number;
} {
  const normalizedProfile = normalizeSubstrateProfile(params.profile, params.tankHeightIn);
  const tankWidthIn = Math.max(1, params.tankWidthIn);
  const tankDepthIn = Math.max(1, params.tankDepthIn);

  const averageDepthIn =
    (normalizedProfile.leftDepthIn +
      normalizedProfile.centerDepthIn +
      normalizedProfile.rightDepthIn) /
    3;

  const baseVolumeCubicIn = tankWidthIn * tankDepthIn * averageDepthIn;
  // Approximation for a localized mound. 0.18 reflects that the mound is not full-width.
  const moundVolumeCubicIn =
    tankWidthIn * tankDepthIn * normalizedProfile.moundHeightIn * 0.18;
  const volumeCubicIn = Math.max(0, baseVolumeCubicIn + moundVolumeCubicIn);

  return {
    normalizedProfile,
    averageDepthIn,
    volumeCubicIn,
    volumeLiters: volumeCubicIn / CUBIC_IN_PER_LITER,
  };
}

export function estimateSubstrateBags(params: {
  volumeLiters: number;
  bagVolumeLiters: number;
}): {
  bagVolumeLiters: number;
  bagsRequired: number;
} {
  const bagVolumeLiters = Math.max(0.1, params.bagVolumeLiters);
  const bagsRequired = Math.max(1, Math.ceil(Math.max(0, params.volumeLiters) / bagVolumeLiters));
  return {
    bagVolumeLiters,
    bagsRequired,
  };
}

export function substrateContourPercentages(params: {
  profile: VisualSubstrateProfile;
  tankHeightIn: number;
}): {
  leftTopPct: number;
  centerTopPct: number;
  rightTopPct: number;
  moundTopPct: number;
  moundPositionPct: number;
  averageDepthPct: number;
} {
  const normalized = normalizeSubstrateProfile(params.profile, params.tankHeightIn);
  const toTopPct = (depthIn: number) =>
    clamp(100 - (depthIn / Math.max(1, params.tankHeightIn)) * 100, 26, 98);

  const leftTopPct = toTopPct(normalized.leftDepthIn);
  const centerTopPct = toTopPct(normalized.centerDepthIn);
  const rightTopPct = toTopPct(normalized.rightDepthIn);
  const moundTopPct = toTopPct(normalized.centerDepthIn + normalized.moundHeightIn);

  const averageDepthPct = clamp(
    ((normalized.leftDepthIn + normalized.centerDepthIn + normalized.rightDepthIn) /
      3 /
      Math.max(1, params.tankHeightIn)) *
      100,
    2,
    55,
  );

  return {
    leftTopPct,
    centerTopPct,
    rightTopPct,
    moundTopPct,
    moundPositionPct: normalized.moundPosition * 100,
    averageDepthPct,
  };
}

