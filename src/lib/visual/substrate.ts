import type {
  SubstrateHeightfield,
  VisualSubstrateProfile,
} from "@/lib/visual/types";

const CUBIC_IN_PER_LITER = 61.0237;
const MIN_SUBSTRATE_DEPTH_IN = 0.2;
const MAX_SUBSTRATE_DEPTH_RATIO = 0.62;
const MAX_MOUND_RATIO = 0.38;

const DEFAULT_FLAT_SUBSTRATE_DEPTH_IN = 1.6;

export const SUBSTRATE_HEIGHTFIELD_RESOLUTION = 32;
const SUBSTRATE_HEIGHTFIELD_CELL_COUNT =
  SUBSTRATE_HEIGHTFIELD_RESOLUTION * SUBSTRATE_HEIGHTFIELD_RESOLUTION;

export const DEFAULT_SUBSTRATE_PROFILE: VisualSubstrateProfile = {
  leftDepthIn: 1.5,
  centerDepthIn: 2.5,
  rightDepthIn: 1.8,
  frontDepthIn: 1.4,
  backDepthIn: 3.2,
  moundHeightIn: 0.8,
  moundPosition: 0.54,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function maxSubstrateDepth(tankHeightIn: number): number {
  return Math.max(MIN_SUBSTRATE_DEPTH_IN, tankHeightIn * MAX_SUBSTRATE_DEPTH_RATIO);
}

function clampDepth(value: number, tankHeightIn: number): number {
  return clamp(value, MIN_SUBSTRATE_DEPTH_IN, maxSubstrateDepth(tankHeightIn));
}

function clampMound(value: number, tankHeightIn: number): number {
  const maxMound = Math.max(0, tankHeightIn * MAX_MOUND_RATIO);
  return clamp(value, 0, maxMound);
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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeHeightfieldFromArrayLike(
  values: ArrayLike<number>,
  tankHeightIn: number,
): SubstrateHeightfield {
  const next = createFlatSubstrateHeightfield({ tankHeightIn });
  const limit = Math.min(SUBSTRATE_HEIGHTFIELD_CELL_COUNT, values.length);
  for (let i = 0; i < limit; i += 1) {
    const value = Number(values[i]);
    next[i] = clampDepth(
      Number.isFinite(value) ? value : next[i] ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN,
      tankHeightIn,
    );
  }
  return next;
}

function extractHeightfieldArrayLike(input: unknown): ArrayLike<number> | null {
  if (input instanceof Float32Array) return input;
  if (Array.isArray(input)) return input;

  const record = asRecord(input);
  if (Object.keys(record).length === 0) return null;

  const values = record.values;
  if (values instanceof Float32Array || Array.isArray(values)) {
    return values;
  }

  let hasNumericKeys = false;
  const numericValues = new Array<number>(SUBSTRATE_HEIGHTFIELD_CELL_COUNT);
  for (let i = 0; i < SUBSTRATE_HEIGHTFIELD_CELL_COUNT; i += 1) {
    const raw = record[String(i)];
    if (raw != null) hasNumericKeys = true;
    numericValues[i] = Number(raw);
  }

  if (hasNumericKeys) return numericValues;
  return null;
}

function heightfieldIndex(xIndex: number, zIndex: number): number {
  return zIndex * SUBSTRATE_HEIGHTFIELD_RESOLUTION + xIndex;
}

function toTopPct(depthIn: number, tankHeightIn: number): number {
  return clamp(100 - (depthIn / Math.max(1, tankHeightIn)) * 100, 26, 98);
}

function averageDepthFromHeightfield(heightfield: SubstrateHeightfield): number {
  let total = 0;
  for (let i = 0; i < heightfield.length; i += 1) {
    total += heightfield[i] ?? 0;
  }
  return total / Math.max(1, heightfield.length);
}

export function isLegacySubstrateProfile(
  value: unknown,
): value is Partial<VisualSubstrateProfile> {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Float32Array) {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    "leftDepthIn" in row ||
    "centerDepthIn" in row ||
    "rightDepthIn" in row ||
    "moundHeightIn" in row ||
    "moundPosition" in row
  );
}

export function createFlatSubstrateHeightfield(params?: {
  tankHeightIn?: number;
  depthIn?: number;
}): SubstrateHeightfield {
  const tankHeightIn = Math.max(1, params?.tankHeightIn ?? 14);
  const fillDepth = clampDepth(params?.depthIn ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN, tankHeightIn);
  const next = new Float32Array(SUBSTRATE_HEIGHTFIELD_CELL_COUNT);
  next.fill(fillDepth);
  return next;
}

export function substrateHeightfieldToArray(heightfield: SubstrateHeightfield): number[] {
  return Array.from(heightfield);
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
    frontDepthIn: clampDepth(
      source.frontDepthIn ?? DEFAULT_SUBSTRATE_PROFILE.frontDepthIn,
      safeHeight,
    ),
    backDepthIn: clampDepth(
      source.backDepthIn ?? DEFAULT_SUBSTRATE_PROFILE.backDepthIn,
      safeHeight,
    ),
    moundHeightIn: clampMound(
      source.moundHeightIn ?? DEFAULT_SUBSTRATE_PROFILE.moundHeightIn,
      safeHeight,
    ),
    moundPosition: clamp(source.moundPosition ?? DEFAULT_SUBSTRATE_PROFILE.moundPosition, 0.2, 0.8),
  };
}

export function sampleLegacySubstrateDepth(params: {
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
  const depth =
    sideDepth * 0.64 +
    frontBackDepth * 0.36 +
    normalizedProfile.moundHeightIn * moundWeight;
  return clamp(depth, MIN_SUBSTRATE_DEPTH_IN, Math.max(1, params.tankHeightIn * 0.72));
}

export function legacySubstrateProfileToHeightfield(params: {
  profile: Partial<VisualSubstrateProfile> | undefined;
  tankHeightIn: number;
}): SubstrateHeightfield {
  const normalizedProfile = normalizeSubstrateProfile(params.profile, params.tankHeightIn);
  const next = new Float32Array(SUBSTRATE_HEIGHTFIELD_CELL_COUNT);
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;

  for (let z = 0; z < SUBSTRATE_HEIGHTFIELD_RESOLUTION; z += 1) {
    const zNorm = maxIndex === 0 ? 0 : z / maxIndex;
    for (let x = 0; x < SUBSTRATE_HEIGHTFIELD_RESOLUTION; x += 1) {
      const xNorm = maxIndex === 0 ? 0 : x / maxIndex;
      next[heightfieldIndex(x, z)] = sampleLegacySubstrateDepth({
        xNorm,
        zNorm,
        profile: normalizedProfile,
        tankHeightIn: params.tankHeightIn,
      });
    }
  }

  return next;
}

export function normalizeSubstrateHeightfield(
  input: unknown,
  tankHeightIn: number,
): SubstrateHeightfield {
  const safeHeight = Math.max(1, tankHeightIn);

  if (isLegacySubstrateProfile(input)) {
    return legacySubstrateProfileToHeightfield({
      profile: input,
      tankHeightIn: safeHeight,
    });
  }

  const values = extractHeightfieldArrayLike(input);
  if (!values) {
    return createFlatSubstrateHeightfield({ tankHeightIn: safeHeight });
  }

  return normalizeHeightfieldFromArrayLike(values, safeHeight);
}

export function sampleSubstrateHeightfieldDepth(params: {
  heightfield: SubstrateHeightfield;
  xNorm: number;
  zNorm: number;
  tankHeightIn: number;
}): number {
  const safeHeight = Math.max(1, params.tankHeightIn);
  const source =
    params.heightfield.length === SUBSTRATE_HEIGHTFIELD_CELL_COUNT
      ? params.heightfield
      : normalizeSubstrateHeightfield(params.heightfield, safeHeight);

  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;
  const x = clamp01(params.xNorm) * maxIndex;
  const z = clamp01(params.zNorm) * maxIndex;

  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(maxIndex, x0 + 1);
  const z1 = Math.min(maxIndex, z0 + 1);

  const tx = x - x0;
  const tz = z - z0;

  const v00 = clampDepth(source[heightfieldIndex(x0, z0)] ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN, safeHeight);
  const v10 = clampDepth(source[heightfieldIndex(x1, z0)] ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN, safeHeight);
  const v01 = clampDepth(source[heightfieldIndex(x0, z1)] ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN, safeHeight);
  const v11 = clampDepth(source[heightfieldIndex(x1, z1)] ?? DEFAULT_FLAT_SUBSTRATE_DEPTH_IN, safeHeight);

  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return clampDepth(top * (1 - tz) + bottom * tz, safeHeight);
}

export function estimateSubstrateVolume(params: {
  tankWidthIn: number;
  tankDepthIn: number;
  tankHeightIn: number;
  heightfield: SubstrateHeightfield;
}): {
  normalizedHeightfield: SubstrateHeightfield;
  averageDepthIn: number;
  volumeCubicIn: number;
  volumeLiters: number;
} {
  const normalizedHeightfield = normalizeSubstrateHeightfield(
    params.heightfield,
    params.tankHeightIn,
  );
  const tankWidthIn = Math.max(1, params.tankWidthIn);
  const tankDepthIn = Math.max(1, params.tankDepthIn);
  const averageDepthIn = averageDepthFromHeightfield(normalizedHeightfield);
  const volumeCubicIn = Math.max(0, tankWidthIn * tankDepthIn * averageDepthIn);

  return {
    normalizedHeightfield,
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
  const bagsRequired = Math.max(
    1,
    Math.ceil(Math.max(0, params.volumeLiters) / bagVolumeLiters),
  );
  return {
    bagVolumeLiters,
    bagsRequired,
  };
}

export function substrateContourPercentages(params: {
  heightfield: SubstrateHeightfield;
  tankHeightIn: number;
}): {
  leftTopPct: number;
  centerTopPct: number;
  rightTopPct: number;
  frontTopPct: number;
  backTopPct: number;
  moundTopPct: number;
  moundPositionPct: number;
  averageDepthPct: number;
} {
  const normalizedHeightfield = normalizeSubstrateHeightfield(
    params.heightfield,
    params.tankHeightIn,
  );

  const leftDepth = sampleSubstrateHeightfieldDepth({
    heightfield: normalizedHeightfield,
    xNorm: 0,
    zNorm: 0.5,
    tankHeightIn: params.tankHeightIn,
  });
  const centerDepth = sampleSubstrateHeightfieldDepth({
    heightfield: normalizedHeightfield,
    xNorm: 0.5,
    zNorm: 0.5,
    tankHeightIn: params.tankHeightIn,
  });
  const rightDepth = sampleSubstrateHeightfieldDepth({
    heightfield: normalizedHeightfield,
    xNorm: 1,
    zNorm: 0.5,
    tankHeightIn: params.tankHeightIn,
  });
  const frontDepth = sampleSubstrateHeightfieldDepth({
    heightfield: normalizedHeightfield,
    xNorm: 0.5,
    zNorm: 0,
    tankHeightIn: params.tankHeightIn,
  });
  const backDepth = sampleSubstrateHeightfieldDepth({
    heightfield: normalizedHeightfield,
    xNorm: 0.5,
    zNorm: 1,
    tankHeightIn: params.tankHeightIn,
  });

  let moundDepth = MIN_SUBSTRATE_DEPTH_IN;
  let moundIndex = 0;
  for (let i = 0; i < normalizedHeightfield.length; i += 1) {
    const depth = normalizedHeightfield[i] ?? MIN_SUBSTRATE_DEPTH_IN;
    if (depth > moundDepth) {
      moundDepth = depth;
      moundIndex = i;
    }
  }

  const moundX = moundIndex % SUBSTRATE_HEIGHTFIELD_RESOLUTION;
  const moundPositionPct =
    (moundX / Math.max(1, SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1)) * 100;
  const averageDepthIn = averageDepthFromHeightfield(normalizedHeightfield);

  return {
    leftTopPct: toTopPct(leftDepth, params.tankHeightIn),
    centerTopPct: toTopPct(centerDepth, params.tankHeightIn),
    rightTopPct: toTopPct(rightDepth, params.tankHeightIn),
    frontTopPct: toTopPct(frontDepth, params.tankHeightIn),
    backTopPct: toTopPct(backDepth, params.tankHeightIn),
    moundTopPct: toTopPct(moundDepth, params.tankHeightIn),
    moundPositionPct,
    averageDepthPct: clamp(
      (averageDepthIn / Math.max(1, params.tankHeightIn)) * 100,
      2,
      55,
    ),
  };
}
