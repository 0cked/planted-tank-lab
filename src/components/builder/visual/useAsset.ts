"use client";

import type {
  ProceduralRockFallbackType,
  ProceduralWoodFallbackType,
} from "@/components/builder/visual/ProceduralHardscape";
import type { VisualAsset } from "@/components/builder/visual/types";

import manifestJson from "../../../../public/visual-assets/manifest.json";

type ManifestCategory = "plant" | "rock" | "wood";

type ManifestPlacementZone =
  | "foreground"
  | "midground"
  | "background"
  | "hardscape"
  | "floating"
  | "any";

export type ProceduralPlantFallbackType =
  | "rosette"
  | "stem"
  | "moss"
  | "carpet"
  | "floating";

type ManifestEntry = {
  path?: string | null;
  previewImagePath?: string | null;
  category?: ManifestCategory;
  widthIn?: number;
  heightIn?: number;
  depthIn?: number;
  defaultScale?: number;
  placementZone?: ManifestPlacementZone;
  triangleCount?: number;
  fallbackPlantType?: ProceduralPlantFallbackType;
  fallbackRockType?: ProceduralRockFallbackType;
  fallbackWoodType?: ProceduralWoodFallbackType;
};

type AssetManifest = {
  version: number;
  assets: Record<string, ManifestEntry>;
};

export type AssetFallbackKind = ManifestCategory;

export type ResolvedVisualAsset = {
  manifestKey: string | null;
  glbPath: string | null;
  previewImagePath: string | null;
  category: ManifestCategory;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  defaultScale: number;
  placementZone: ManifestPlacementZone;
  triangleCount: number | null;
  fallbackKind: AssetFallbackKind;
  proceduralPlantType: ProceduralPlantFallbackType | null;
  proceduralRockType: ProceduralRockFallbackType | null;
  proceduralWoodType: ProceduralWoodFallbackType | null;
};

const WOOD_HAYSTACK_TERMS = [
  "spiderwood",
  "spider wood",
  "driftwood",
  "branchwood",
  "branch wood",
  "branch",
  "wood",
  "root",
  "manzanita",
  "twig",
];

const ROCK_HAYSTACK_TERMS = [
  "rock",
  "stone",
  "seiryu",
  "ohko",
  "dragon",
  "lava",
  "pebble",
  "boulder",
  "slate",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizePlantFallbackType(value: unknown): ProceduralPlantFallbackType | undefined {
  if (value === "rosette") return "rosette";
  if (value === "stem") return "stem";
  if (value === "moss") return "moss";
  if (value === "carpet") return "carpet";
  if (value === "floating") return "floating";
  return undefined;
}

function normalizeRockFallbackType(value: unknown): ProceduralRockFallbackType | undefined {
  if (value === "rounded") return "rounded";
  if (value === "jagged") return "jagged";
  if (value === "slate") return "slate";
  return undefined;
}

function normalizeWoodFallbackType(value: unknown): ProceduralWoodFallbackType | undefined {
  if (value === "spider") return "spider";
  if (value === "flowing") return "flowing";
  return undefined;
}

function normalizeManifest(input: unknown): AssetManifest {
  const root = asRecord(input);
  const assets = asRecord(root.assets);
  const normalizedAssets: Record<string, ManifestEntry> = {};

  for (const [key, rawEntry] of Object.entries(assets)) {
    const row = asRecord(rawEntry);
    const category = row.category;
    const placementZone = row.placementZone;

    normalizedAssets[key] = {
      path: typeof row.path === "string" ? row.path : null,
      previewImagePath:
        typeof row.previewImagePath === "string"
          ? row.previewImagePath
          : typeof row.previewPath === "string"
            ? row.previewPath
            : typeof row.thumbnailPath === "string"
              ? row.thumbnailPath
              : null,
      category:
        category === "plant" || category === "rock" || category === "wood"
          ? category
          : undefined,
      widthIn:
        typeof row.widthIn === "number" && Number.isFinite(row.widthIn)
          ? Math.max(0.1, row.widthIn)
          : undefined,
      heightIn:
        typeof row.heightIn === "number" && Number.isFinite(row.heightIn)
          ? Math.max(0.1, row.heightIn)
          : undefined,
      depthIn:
        typeof row.depthIn === "number" && Number.isFinite(row.depthIn)
          ? Math.max(0.1, row.depthIn)
          : undefined,
      defaultScale:
        typeof row.defaultScale === "number" && Number.isFinite(row.defaultScale)
          ? row.defaultScale
          : undefined,
      placementZone:
        placementZone === "foreground" ||
        placementZone === "midground" ||
        placementZone === "background" ||
        placementZone === "hardscape" ||
        placementZone === "floating" ||
        placementZone === "any"
          ? placementZone
          : undefined,
      triangleCount:
        typeof row.triangleCount === "number" && Number.isFinite(row.triangleCount)
          ? Math.max(0, Math.round(row.triangleCount))
          : undefined,
      fallbackPlantType: normalizePlantFallbackType(row.fallbackPlantType),
      fallbackRockType: normalizeRockFallbackType(row.fallbackRockType),
      fallbackWoodType: normalizeWoodFallbackType(row.fallbackWoodType),
    };
  }

  return {
    version:
      typeof root.version === "number" && Number.isFinite(root.version)
        ? Math.max(1, Math.round(root.version))
        : 1,
    assets: normalizedAssets,
  };
}

const ASSET_MANIFEST = normalizeManifest(manifestJson);

function normalizeManifestLookupToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildManifestNormalizedKeyIndex(
  assets: Record<string, ManifestEntry>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const key of Object.keys(assets)) {
    const normalized = normalizeManifestLookupToken(key);
    if (!normalized || index.has(normalized)) continue;
    index.set(normalized, key);
  }
  return index;
}

const MANIFEST_NORMALIZED_KEY_INDEX = buildManifestNormalizedKeyIndex(ASSET_MANIFEST.assets);

function sanitizeDefaultScale(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0.1, Math.min(6, value));
}

function assetTextHaystack(asset: VisualAsset): string {
  const placement = asset.plantProfile?.placement?.toLowerCase() ?? "";
  const material = asset.materialType?.toLowerCase() ?? "";
  const tags = (asset.tags ?? []).join(" ").toLowerCase();
  return `${asset.name} ${asset.slug} ${placement} ${material} ${tags}`.toLowerCase();
}

function inferFallbackKind(asset: VisualAsset): AssetFallbackKind {
  if (asset.categorySlug === "plants") return "plant";

  const haystack = assetTextHaystack(asset);
  const materialType = asset.materialType?.toLowerCase() ?? "";
  if (
    materialType.includes("wood") ||
    materialType.includes("branch") ||
    materialType.includes("root") ||
    includesAny(haystack, WOOD_HAYSTACK_TERMS)
  ) {
    return "wood";
  }

  if (
    materialType.includes("rock") ||
    materialType.includes("stone") ||
    includesAny(haystack, ROCK_HAYSTACK_TERMS)
  ) {
    return "rock";
  }

  return "rock";
}

function inferPlacementZone(asset: VisualAsset): ManifestPlacementZone {
  if (asset.categorySlug === "plants") {
    const placement = asset.plantProfile?.placement?.toLowerCase() ?? "";
    if (placement.includes("foreground")) return "foreground";
    if (placement.includes("background")) return "background";
    if (placement.includes("floating")) return "floating";
    if (placement.includes("hardscape") || placement.includes("epiphyte")) return "hardscape";
    return "midground";
  }

  return "midground";
}

function manifestLookupKeys(asset: VisualAsset): string[] {
  const raw = [
    asset.id,
    `${asset.type}:${asset.slug}`,
    `${asset.categorySlug}:${asset.slug}`,
    asset.slug,
  ];

  const deduped = new Set<string>();
  for (const key of raw) {
    if (!key) continue;
    deduped.add(key);
  }

  return Array.from(deduped);
}

function resolveManifestEntry(asset: VisualAsset): {
  manifestKey: string | null;
  entry: ManifestEntry | null;
} {
  const lookupKeys = manifestLookupKeys(asset);

  for (const key of lookupKeys) {
    const entry = ASSET_MANIFEST.assets[key];
    if (!entry) continue;
    return { manifestKey: key, entry };
  }

  for (const key of lookupKeys) {
    const aliasKey = MANIFEST_NORMALIZED_KEY_INDEX.get(normalizeManifestLookupToken(key));
    if (!aliasKey) continue;
    const entry = ASSET_MANIFEST.assets[aliasKey];
    if (!entry) continue;
    return { manifestKey: aliasKey, entry };
  }

  return { manifestKey: null, entry: null };
}

function sanitizeModelPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return null;
  if (!trimmed.toLowerCase().endsWith(".glb")) return null;
  return trimmed;
}

function sanitizePreviewImagePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return null;
  if (
    !trimmed.match(
      /\.(png|jpe?g|webp|avif)$/i,
    )
  ) {
    return null;
  }
  return trimmed;
}

function includesAny(text: string, terms: string[]): boolean {
  for (const term of terms) {
    if (text.includes(term)) return true;
  }
  return false;
}

function inferPlantFallbackType(asset: VisualAsset): ProceduralPlantFallbackType {
  const placement = asset.plantProfile?.placement?.toLowerCase() ?? "";
  const tags = asset.tags?.join(" ").toLowerCase() ?? "";
  const haystack = `${asset.name} ${asset.slug} ${placement} ${tags}`.toLowerCase();

  if (
    placement.includes("floating") ||
    includesAny(haystack, ["duckweed", "frogbit", "salvinia", "water lettuce", "red root"])
  ) {
    return "floating";
  }

  if (includesAny(haystack, ["moss", "riccia", "pellia", "fissidens"])) {
    return "moss";
  }

  if (
    placement.includes("foreground") ||
    includesAny(haystack, [
      "carpet",
      "monte carlo",
      "hairgrass",
      "hemianthus",
      "glosso",
      "lilaeopsis",
    ])
  ) {
    return "carpet";
  }

  if (
    placement.includes("background") ||
    includesAny(haystack, ["stem", "rotala", "ludwigia", "bacopa", "hygrophila", "cabomba"])
  ) {
    return "stem";
  }

  return "rosette";
}

function inferRockFallbackType(asset: VisualAsset): ProceduralRockFallbackType {
  const tags = asset.tags?.join(" ").toLowerCase() ?? "";
  const material = asset.materialType?.toLowerCase() ?? "";
  const haystack = `${asset.name} ${asset.slug} ${material} ${tags}`.toLowerCase();

  if (includesAny(haystack, ["slate", "shale", "flat", "plate", "strata"])) {
    return "slate";
  }

  if (includesAny(haystack, ["seiryu", "dragon", "ohko", "lava", "jagged", "crag", "ridge"])) {
    return "jagged";
  }

  if (includesAny(haystack, ["river", "pebble", "boulder", "rounded", "smooth"])) {
    return "rounded";
  }

  return "jagged";
}

function inferWoodFallbackType(asset: VisualAsset): ProceduralWoodFallbackType {
  const tags = asset.tags?.join(" ").toLowerCase() ?? "";
  const material = asset.materialType?.toLowerCase() ?? "";
  const haystack = `${asset.name} ${asset.slug} ${material} ${tags}`.toLowerCase();

  if (includesAny(haystack, ["manzanita", "flow", "curved", "sweep", "branchscape"])) {
    return "flowing";
  }

  if (includesAny(haystack, ["spider", "twig", "branch", "root", "gnarled"])) {
    return "spider";
  }

  return "spider";
}

function resolveProceduralPlantType(
  asset: VisualAsset,
  fallbackKind: AssetFallbackKind,
  entry: ManifestEntry | null,
): ProceduralPlantFallbackType | null {
  if (fallbackKind !== "plant") return null;
  if (entry?.fallbackPlantType) return entry.fallbackPlantType;
  return inferPlantFallbackType(asset);
}

function resolveProceduralRockType(
  asset: VisualAsset,
  fallbackKind: AssetFallbackKind,
  entry: ManifestEntry | null,
): ProceduralRockFallbackType | null {
  if (fallbackKind !== "rock") return null;
  if (entry?.fallbackRockType) return entry.fallbackRockType;
  return inferRockFallbackType(asset);
}

function resolveProceduralWoodType(
  asset: VisualAsset,
  fallbackKind: AssetFallbackKind,
  entry: ManifestEntry | null,
): ProceduralWoodFallbackType | null {
  if (fallbackKind !== "wood") return null;
  if (entry?.fallbackWoodType) return entry.fallbackWoodType;
  return inferWoodFallbackType(asset);
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizePlantHeightInches(
  rawHeight: number | null,
  placement: string,
  haystack: string,
): number | null {
  if (typeof rawHeight !== "number" || !Number.isFinite(rawHeight)) return null;
  if (rawHeight <= 0) return null;

  const foregroundLike =
    placement.includes("foreground") ||
    includesAny(haystack, ["carpet", "monte carlo", "hairgrass", "hemianthus", "glosso"]);
  const backgroundLike =
    placement.includes("background") ||
    includesAny(haystack, ["stem", "rotala", "ludwigia", "bacopa", "hygrophila", "cabomba"]);
  const hardscapeLike =
    placement.includes("hardscape") ||
    placement.includes("epiphyte") ||
    includesAny(haystack, ["anubias", "buce", "moss", "fissidens", "epiphyte"]);
  const floatingLike =
    placement.includes("floating") ||
    includesAny(haystack, ["duckweed", "frogbit", "salvinia", "water lettuce", "red root"]);
  const miniatureLike = includesAny(haystack, ["mini", "nana", "petite"]);

  const looksLikeCentimeters =
    rawHeight > 34 ||
    (foregroundLike && rawHeight > 8) ||
    (hardscapeLike && rawHeight > 12) ||
    (floatingLike && rawHeight > 6) ||
    (miniatureLike && rawHeight > 6) ||
    (!backgroundLike && rawHeight > 16);
  const inches = looksLikeCentimeters ? rawHeight / 2.54 : rawHeight;
  return Math.max(1.5, Math.min(30, inches));
}

function clampAdultPlantHeightIn(placement: string, haystack: string, rawHeightIn: number): number {
  const foregroundLike =
    placement.includes("foreground") ||
    includesAny(haystack, ["carpet", "monte carlo", "hairgrass", "hemianthus", "glosso"]);
  const backgroundLike =
    placement.includes("background") ||
    includesAny(haystack, ["stem", "rotala", "ludwigia", "bacopa", "hygrophila", "cabomba"]);
  const hardscapeLike =
    placement.includes("hardscape") ||
    placement.includes("epiphyte") ||
    includesAny(haystack, ["anubias", "buce", "moss", "fissidens", "epiphyte"]);
  const floatingLike =
    placement.includes("floating") ||
    includesAny(haystack, ["duckweed", "frogbit", "salvinia", "water lettuce", "red root"]);
  const miniatureLike = includesAny(haystack, ["mini", "nana", "petite"]);

  if (miniatureLike) {
    return Math.max(1.5, Math.min(6, rawHeightIn));
  }
  if (floatingLike) {
    return Math.max(1.5, Math.min(8, rawHeightIn));
  }
  if (foregroundLike) {
    return Math.max(2, Math.min(7, rawHeightIn));
  }
  if (hardscapeLike) {
    return Math.max(2, Math.min(10, rawHeightIn));
  }
  if (backgroundLike) {
    return Math.max(8, Math.min(24, rawHeightIn));
  }
  return Math.max(4, Math.min(14, rawHeightIn));
}

function defaultAdultPlantHeightIn(
  placement: string,
  haystack: string,
): number {
  if (includesAny(haystack, ["mini", "nana", "petite"])) {
    return 3.5;
  }
  if (
    placement.includes("foreground") ||
    includesAny(haystack, ["carpet", "monte carlo", "hairgrass", "hemianthus", "glosso"])
  ) {
    return 4;
  }
  if (
    placement.includes("background") ||
    includesAny(haystack, ["stem", "rotala", "ludwigia", "bacopa", "hygrophila", "cabomba"])
  ) {
    return 14;
  }
  if (includesAny(haystack, ["anubias", "buce", "moss", "fissidens", "epiphyte"])) {
    return 6;
  }
  if (includesAny(haystack, ["sword", "crypt", "aponogeton", "echinodorus"])) {
    return 11;
  }
  return 8.5;
}

function inferAdultPlantDimensions(asset: VisualAsset): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  const haystack = assetTextHaystack(asset);
  const placement = asset.plantProfile?.placement?.toLowerCase() ?? "";
  const profileHeightRaw =
    typeof asset.plantProfile?.maxHeightIn === "number" && Number.isFinite(asset.plantProfile.maxHeightIn)
      ? asset.plantProfile.maxHeightIn
      : null;
  const profileHeight = normalizePlantHeightInches(profileHeightRaw, placement, haystack);
  const fallbackHeight = normalizePlantHeightInches(asset.heightIn, placement, haystack);
  const unclampedHeight = Math.max(
    2,
    profileHeight ?? fallbackHeight ?? defaultAdultPlantHeightIn(placement, haystack),
  );
  const baseHeight = clampAdultPlantHeightIn(placement, haystack, unclampedHeight);
  let widthRatio = 0.48;
  let depthRatio = 0.38;

  if (
    placement.includes("foreground") ||
    includesAny(haystack, ["carpet", "monte carlo", "hairgrass", "hemianthus", "glosso"])
  ) {
    widthRatio = 0.72;
    depthRatio = 0.56;
  } else if (
    placement.includes("background") ||
    includesAny(haystack, ["stem", "rotala", "ludwigia", "bacopa", "hygrophila", "cabomba"])
  ) {
    widthRatio = 0.4;
    depthRatio = 0.3;
  } else if (
    placement.includes("hardscape") ||
    includesAny(haystack, ["anubias", "buce", "moss", "fissidens", "epiphyte"])
  ) {
    widthRatio = 0.62;
    depthRatio = 0.48;
  } else if (includesAny(haystack, ["sword", "crypt", "aponogeton", "echinodorus"])) {
    widthRatio = 0.66;
    depthRatio = 0.5;
  }

  return {
    widthIn: Math.max(1.5, roundToTenth(baseHeight * widthRatio)),
    heightIn: Math.max(2, roundToTenth(baseHeight)),
    depthIn: Math.max(1.2, roundToTenth(baseHeight * depthRatio)),
  };
}

function resolveHardscapeMajorSizeIn(
  haystack: string,
  fallbackMajorIn: number,
  woodLike: boolean,
): number {
  let normalizedFallback = Number.isFinite(fallbackMajorIn) ? fallbackMajorIn : NaN;
  if (Number.isFinite(normalizedFallback) && normalizedFallback > 24 && normalizedFallback <= 96) {
    // Catalog data sometimes carries centimeter values in inch fields.
    normalizedFallback = normalizedFallback / 2.54;
  }
  if (!Number.isFinite(normalizedFallback) || normalizedFallback < 2 || normalizedFallback > 24) {
    normalizedFallback = woodLike ? 11 : 8;
  }
  const base = Math.max(woodLike ? 8 : 6, normalizedFallback);
  if (includesAny(haystack, ["spiderwood", "spider wood", "spider-wood"])) {
    return 15;
  }
  if (includesAny(haystack, ["xl", "x-large", "extra large", "giant"])) {
    return Math.max(base, woodLike ? 15 : 12);
  }
  if (includesAny(haystack, ["large", "boulder", "ridge", "arch", "branch", "root"])) {
    return Math.max(base, woodLike ? 12 : 9);
  }
  if (includesAny(haystack, ["small", "accent", "nano", "twig", "mini"])) {
    return Math.min(base, woodLike ? 8 : 6);
  }
  return base;
}

function inferHardscapeDimensions(
  asset: VisualAsset,
  fallbackKind: AssetFallbackKind,
): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  const haystack = assetTextHaystack(asset);
  const woodLike = fallbackKind === "wood";
  const fallbackMajor = Math.max(asset.widthIn, asset.heightIn, asset.depthIn);
  const majorSizeIn = resolveHardscapeMajorSizeIn(haystack, fallbackMajor, woodLike);

  if (woodLike) {
    return {
      widthIn: Math.max(4, roundToTenth(majorSizeIn * 0.74)),
      heightIn: Math.max(3, roundToTenth(majorSizeIn)),
      depthIn: Math.max(3, roundToTenth(majorSizeIn * 0.58)),
    };
  }

  return {
    widthIn: Math.max(3, roundToTenth(majorSizeIn)),
    heightIn: Math.max(2.4, roundToTenth(majorSizeIn * 0.72)),
    depthIn: Math.max(2.4, roundToTenth(majorSizeIn * 0.76)),
  };
}

function inferRealisticDimensions(
  asset: VisualAsset,
  fallbackKind: AssetFallbackKind,
): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} | null {
  if (fallbackKind === "plant") {
    return inferAdultPlantDimensions(asset);
  }
  if (asset.categorySlug === "hardscape" || fallbackKind === "rock" || fallbackKind === "wood") {
    return inferHardscapeDimensions(asset, fallbackKind);
  }
  return null;
}

function resolvePhysicalDimensions(
  asset: VisualAsset,
  entry: ManifestEntry | null,
  fallbackKind: AssetFallbackKind,
): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  const inferred = inferRealisticDimensions(asset, fallbackKind);
  const entryWidth = entry?.widthIn;
  const entryHeight = entry?.heightIn;
  const entryDepth = entry?.depthIn;
  const widthIn =
    typeof entryWidth === "number" && Number.isFinite(entryWidth)
      ? Math.max(0.1, entryWidth)
      : inferred?.widthIn ?? Math.max(0.1, asset.widthIn);
  const heightIn =
    typeof entryHeight === "number" && Number.isFinite(entryHeight)
      ? Math.max(0.1, entryHeight)
      : inferred?.heightIn ?? Math.max(0.1, asset.heightIn);
  const depthIn =
    typeof entryDepth === "number" && Number.isFinite(entryDepth)
      ? Math.max(0.1, entryDepth)
      : inferred?.depthIn ?? Math.max(0.1, asset.depthIn);

  return {
    widthIn: Math.max(0.1, widthIn),
    heightIn: Math.max(0.1, heightIn),
    depthIn: Math.max(0.1, depthIn),
  };
}

export function resolveVisualAsset(
  asset: VisualAsset,
  options?: {
    failedPath?: string | null;
  },
): ResolvedVisualAsset {
  const failedPath = options?.failedPath ?? null;
  const inferredFallbackKind = inferFallbackKind(asset);
  const { manifestKey, entry } = resolveManifestEntry(asset);
  const fallbackKind = entry?.category ?? inferredFallbackKind;
  const declaredGlbPath = sanitizeModelPath(entry?.path);
  const shouldFallback = failedPath != null && failedPath === declaredGlbPath;
  const glbPath = shouldFallback ? null : declaredGlbPath;
  const previewImagePath = sanitizePreviewImagePath(entry?.previewImagePath);
  const dimensions = resolvePhysicalDimensions(asset, entry, fallbackKind);
  const defaultScale =
    sanitizeDefaultScale(entry?.defaultScale) ??
    (asset.categorySlug === "plants" || asset.categorySlug === "hardscape"
      ? 1
      : sanitizeDefaultScale(asset.defaultScale) ?? 1);

  return {
    manifestKey,
    glbPath,
    previewImagePath,
    category: fallbackKind,
    widthIn: dimensions.widthIn,
    heightIn: dimensions.heightIn,
    depthIn: dimensions.depthIn,
    defaultScale,
    placementZone: entry?.placementZone ?? inferPlacementZone(asset),
    triangleCount: entry?.triangleCount ?? null,
    fallbackKind,
    proceduralPlantType: resolveProceduralPlantType(asset, fallbackKind, entry),
    proceduralRockType: resolveProceduralRockType(asset, fallbackKind, entry),
    proceduralWoodType: resolveProceduralWoodType(asset, fallbackKind, entry),
  };
}

export function useAsset(
  asset: VisualAsset,
  options?: {
    failedPath?: string | null;
  },
): ResolvedVisualAsset {
  return resolveVisualAsset(asset, options);
}
