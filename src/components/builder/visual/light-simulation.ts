import type { VisualAsset } from "@/components/builder/visual/types";

export type LightFixtureType = "led" | "t5" | "t8";

export type LightSimulationSource = {
  assetId: string;
  assetName: string;
  wattage: number;
  fixtureType: LightFixtureType;
  efficiency: number;
};

export const DEFAULT_LIGHT_MOUNT_HEIGHT_IN = 4;

const MIN_LIGHT_MOUNT_HEIGHT_IN = 0;
const MAX_LIGHT_MOUNT_HEIGHT_IN = 24;
const MIN_LIGHT_DISTANCE_FEET = 0.28;
const WATER_ABSORPTION_PER_IN = 0.018;
const PAR_CALIBRATION_FACTOR = 50;

const LIGHT_EFFICIENCY_BY_TYPE: Record<LightFixtureType, number> = {
  led: 1.35,
  t5: 1.05,
  t8: 0.82,
};

type MutableRgb = {
  r: number;
  g: number;
  b: number;
};

const HEATMAP_BLUE: Readonly<MutableRgb> = { r: 0.12, g: 0.31, b: 0.96 };
const HEATMAP_GREEN: Readonly<MutableRgb> = { r: 0.2, g: 0.82, b: 0.36 };
const HEATMAP_YELLOW: Readonly<MutableRgb> = { r: 0.98, g: 0.84, b: 0.26 };
const HEATMAP_RED: Readonly<MutableRgb> = { r: 0.95, g: 0.34, b: 0.32 };

const WATTAGE_SPEC_KEYS: ReadonlyArray<string> = [
  "wattage",
  "watts",
  "power_watts",
  "powerWatts",
  "power",
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function writeLerpedColor(
  from: Readonly<MutableRgb>,
  to: Readonly<MutableRgb>,
  t: number,
  target: MutableRgb,
) {
  const progress = clamp01(t);
  target.r = lerp(from.r, to.r, progress);
  target.g = lerp(from.g, to.g, progress);
  target.b = lerp(from.b, to.b, progress);
}

function normalizeSpecRecord(specs: unknown): Record<string, unknown> {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return {};
  }

  return specs as Record<string, unknown>;
}

function readPositiveNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return input;
  }

  if (typeof input === "string") {
    const normalized = input.trim();
    if (normalized.length === 0) return null;

    const numericMatch = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!numericMatch) return null;

    const parsed = Number.parseFloat(numericMatch[0]);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  return null;
}

function resolveFixtureTypeFromText(text: string): LightFixtureType {
  const normalized = text.toLowerCase();
  if (normalized.includes("t5")) return "t5";
  if (normalized.includes("t8")) return "t8";
  return "led";
}

function formatFixtureTypeLabel(type: LightFixtureType): string {
  if (type === "t5") return "T5";
  if (type === "t8") return "T8";
  return "LED";
}

export function clampLightMountHeightIn(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LIGHT_MOUNT_HEIGHT_IN;
  }

  return Math.min(MAX_LIGHT_MOUNT_HEIGHT_IN, Math.max(MIN_LIGHT_MOUNT_HEIGHT_IN, value));
}

export function resolveLightSimulationSource(
  lightAsset: VisualAsset | null,
): LightSimulationSource | null {
  if (!lightAsset || lightAsset.categorySlug !== "light") return null;

  const specs = normalizeSpecRecord(lightAsset.specs);
  let wattage: number | null = null;

  for (const key of WATTAGE_SPEC_KEYS) {
    const value = readPositiveNumber(specs[key]);
    if (!value) continue;
    wattage = value;
    break;
  }

  if (!wattage) {
    wattage = readPositiveNumber(lightAsset.name);
  }

  if (!wattage) return null;

  const fixtureTypeHints = [
    specs["light_type"],
    specs["lightType"],
    specs["fixture_type"],
    specs["fixtureType"],
    lightAsset.name,
    lightAsset.slug,
    ...(lightAsset.tags ?? []),
  ]
    .map((value) => (typeof value === "string" ? value : ""))
    .filter((value) => value.length > 0)
    .join(" ");

  const fixtureType = resolveFixtureTypeFromText(fixtureTypeHints);

  return {
    assetId: lightAsset.id,
    assetName: lightAsset.name,
    wattage,
    fixtureType,
    efficiency: LIGHT_EFFICIENCY_BY_TYPE[fixtureType],
  };
}

export function describeLightSimulationSource(source: LightSimulationSource | null): string {
  if (!source) return "No compatible light selected";
  return `${Math.round(source.wattage)}W ${formatFixtureTypeLabel(source.fixtureType)}`;
}

export function estimateParAtSubstratePoint(params: {
  source: LightSimulationSource;
  pointXIn: number;
  pointYIn: number;
  pointZIn: number;
  tankHeightIn: number;
  lightMountHeightIn: number;
  waterLineYIn?: number;
}): number {
  const lightYIn =
    Math.max(1, params.tankHeightIn) + clampLightMountHeightIn(params.lightMountHeightIn);
  const distanceIn = Math.hypot(
    params.pointXIn,
    lightYIn - params.pointYIn,
    params.pointZIn,
  );
  const distanceFeet = Math.max(MIN_LIGHT_DISTANCE_FEET, distanceIn / 12);

  const waterLineYIn =
    typeof params.waterLineYIn === "number" && Number.isFinite(params.waterLineYIn)
      ? params.waterLineYIn
      : Math.max(1, params.tankHeightIn) * 0.94;
  const depthIn = Math.max(0, waterLineYIn - params.pointYIn);

  const attenuation = Math.exp(-WATER_ABSORPTION_PER_IN * depthIn);
  const basePar =
    (params.source.wattage * params.source.efficiency) /
    (4 * Math.PI * distanceFeet * distanceFeet);

  return Math.max(0, basePar * attenuation * PAR_CALIBRATION_FACTOR);
}

export function writeParHeatmapColor(par: number, target: MutableRgb) {
  const safePar = Number.isFinite(par) ? Math.max(0, par) : 0;

  if (safePar <= 30) {
    writeLerpedColor(HEATMAP_BLUE, HEATMAP_GREEN, safePar / 30, target);
    return;
  }

  if (safePar <= 60) {
    writeLerpedColor(HEATMAP_GREEN, HEATMAP_YELLOW, (safePar - 30) / 30, target);
    return;
  }

  if (safePar <= 100) {
    writeLerpedColor(HEATMAP_YELLOW, HEATMAP_RED, (safePar - 60) / 40, target);
    return;
  }

  target.r = HEATMAP_RED.r;
  target.g = HEATMAP_RED.g;
  target.b = HEATMAP_RED.b;
}
