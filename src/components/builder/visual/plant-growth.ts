import type { VisualAsset } from "@/components/builder/visual/types";

export type GrowthTimelineMonths = 1 | 3 | 6;

export type PlantGrowthScale = {
  x: number;
  y: number;
  z: number;
};

type PlantGrowthForm = "carpet" | "stem" | "rosette" | "moss" | "floating";

export const GROWTH_TIMELINE_MONTH_OPTIONS: readonly GrowthTimelineMonths[] = [1, 3, 6];
export const DEFAULT_GROWTH_TIMELINE_MONTHS: GrowthTimelineMonths = 1;

const CARPET_HINTS: readonly string[] = [
  "carpet",
  "monte carlo",
  "hemianthus",
  "hairgrass",
  "glosso",
  "lilaeopsis",
  "marsilea",
];

const STEM_HINTS: readonly string[] = [
  "stem",
  "rotala",
  "ludwigia",
  "bacopa",
  "hygrophila",
  "cabomba",
  "myriophyllum",
];

const MOSS_HINTS: readonly string[] = ["moss", "fissidens", "riccia", "pellia"];

const FLOATING_HINTS: readonly string[] = [
  "floating",
  "duckweed",
  "frogbit",
  "salvinia",
  "water lettuce",
  "red root",
];

function textIncludesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp01(t);
}

function resolvePlantDescriptor(asset: VisualAsset): string {
  const placement = asset.plantProfile?.placement ?? "";
  const tags = asset.tags?.join(" ") ?? "";
  return `${asset.name} ${asset.slug} ${placement} ${tags}`.toLowerCase();
}

function resolvePlantGrowthForm(params: {
  asset: VisualAsset;
  plantTypeHint?: string | null;
}): PlantGrowthForm {
  const hintedType = params.plantTypeHint;
  if (hintedType === "carpet") return "carpet";
  if (hintedType === "stem") return "stem";
  if (hintedType === "moss") return "moss";
  if (hintedType === "floating") return "floating";
  if (hintedType === "rosette") return "rosette";

  const descriptor = resolvePlantDescriptor(params.asset);

  if (textIncludesAny(descriptor, FLOATING_HINTS)) return "floating";
  if (textIncludesAny(descriptor, MOSS_HINTS)) return "moss";

  const placement = params.asset.plantProfile?.placement?.toLowerCase() ?? "";
  if (placement.includes("foreground") || textIncludesAny(descriptor, CARPET_HINTS)) {
    return "carpet";
  }

  if (placement.includes("background") || textIncludesAny(descriptor, STEM_HINTS)) {
    return "stem";
  }

  return "rosette";
}

function resolveSixMonthUniformGrowth(growthRate: string | null | undefined): number {
  const normalized = (growthRate ?? "").toLowerCase().trim();

  if (normalized.includes("very fast")) return 2.8;
  if (normalized.includes("fast")) return 2.4;
  if (normalized.includes("moderate") || normalized.includes("medium")) return 1.7;
  if (normalized.includes("very slow")) return 1.1;
  if (normalized.includes("slow")) return 1.2;

  return 1.55;
}

function resolveSixMonthAxisScale(params: {
  sixMonthUniformGrowth: number;
  form: PlantGrowthForm;
}): PlantGrowthScale {
  const delta = Math.max(0, params.sixMonthUniformGrowth - 1);

  if (params.form === "carpet") {
    const spread = 1 + delta * 1.18;
    const height = 1 + delta * 0.28;
    return { x: spread, y: height, z: spread };
  }

  if (params.form === "stem") {
    const spread = 1 + delta * 0.52;
    const height = Math.min(3, 1 + delta * 1.25);
    return { x: spread, y: height, z: spread };
  }

  if (params.form === "floating") {
    const spread = 1 + delta * 0.92;
    const height = 1 + delta * 0.24;
    return { x: spread, y: height, z: spread };
  }

  if (params.form === "moss") {
    const spread = 1 + delta * 0.74;
    const height = 1 + delta * 0.64;
    return { x: spread, y: height, z: spread };
  }

  const spread = 1 + delta * 0.9;
  const height = 1 + delta;
  return { x: spread, y: height, z: spread };
}

function timelineProgress(months: GrowthTimelineMonths): number {
  if (months <= 1) return 0;
  if (months >= 6) return 1;
  return (months - 1) / 5;
}

export function normalizeGrowthTimelineMonths(value: unknown): GrowthTimelineMonths {
  if (value === 1 || value === 3 || value === 6) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_GROWTH_TIMELINE_MONTHS;
  }

  let bestOption = GROWTH_TIMELINE_MONTH_OPTIONS[0];
  let smallestDistance = Number.POSITIVE_INFINITY;

  for (const option of GROWTH_TIMELINE_MONTH_OPTIONS) {
    const distance = Math.abs(option - value);
    if (distance >= smallestDistance) continue;

    bestOption = option;
    smallestDistance = distance;
  }

  return bestOption;
}

export function growthTimelineSliderIndex(months: GrowthTimelineMonths): number {
  const index = GROWTH_TIMELINE_MONTH_OPTIONS.indexOf(months);
  return index >= 0 ? index : 0;
}

export function growthTimelineFromSliderIndex(index: number): GrowthTimelineMonths {
  const clampedIndex = Math.max(0, Math.min(GROWTH_TIMELINE_MONTH_OPTIONS.length - 1, index));
  return GROWTH_TIMELINE_MONTH_OPTIONS[clampedIndex] ?? DEFAULT_GROWTH_TIMELINE_MONTHS;
}

export function resolvePlantGrowthScale(params: {
  asset: VisualAsset;
  timelineMonths: GrowthTimelineMonths;
  plantTypeHint?: string | null;
}): PlantGrowthScale {
  if (params.asset.categorySlug !== "plants") {
    return { x: 1, y: 1, z: 1 };
  }

  const sixMonthUniformGrowth = resolveSixMonthUniformGrowth(
    params.asset.plantProfile?.growthRate,
  );
  const form = resolvePlantGrowthForm({
    asset: params.asset,
    plantTypeHint: params.plantTypeHint,
  });
  const targetAtSixMonths = resolveSixMonthAxisScale({
    sixMonthUniformGrowth,
    form,
  });
  const progress = timelineProgress(params.timelineMonths);

  return {
    x: lerp(1, targetAtSixMonths.x, progress),
    y: lerp(1, targetAtSixMonths.y, progress),
    z: lerp(1, targetAtSixMonths.z, progress),
  };
}
