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
  category?: ManifestCategory;
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
  category: ManifestCategory;
  defaultScale: number;
  placementZone: ManifestPlacementZone;
  triangleCount: number | null;
  fallbackKind: AssetFallbackKind;
  proceduralPlantType: ProceduralPlantFallbackType | null;
  proceduralRockType: ProceduralRockFallbackType | null;
  proceduralWoodType: ProceduralWoodFallbackType | null;
};

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
      category:
        category === "plant" || category === "rock" || category === "wood"
          ? category
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

function inferFallbackKind(asset: VisualAsset): AssetFallbackKind {
  if (asset.categorySlug === "plants") return "plant";

  const materialType = asset.materialType?.toLowerCase() ?? "";
  if (
    materialType.includes("wood") ||
    materialType.includes("branch") ||
    materialType.includes("root")
  ) {
    return "wood";
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
  for (const key of manifestLookupKeys(asset)) {
    const entry = ASSET_MANIFEST.assets[key];
    if (!entry) continue;
    return { manifestKey: key, entry };
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

export function useAsset(
  asset: VisualAsset,
  options?: {
    failedPath?: string | null;
  },
): ResolvedVisualAsset {
  const failedPath = options?.failedPath ?? null;
  const inferredFallbackKind = inferFallbackKind(asset);
  const { manifestKey, entry } = resolveManifestEntry(asset);
  const fallbackKind = entry?.category ?? inferredFallbackKind;
  const glbPath = sanitizeModelPath(entry?.path);
  const shouldFallback = failedPath != null && failedPath === glbPath;

  return {
    manifestKey,
    glbPath: shouldFallback ? null : glbPath,
    category: fallbackKind,
    defaultScale: entry?.defaultScale ?? asset.defaultScale,
    placementZone: entry?.placementZone ?? inferPlacementZone(asset),
    triangleCount: entry?.triangleCount ?? null,
    fallbackKind,
    proceduralPlantType: resolveProceduralPlantType(asset, fallbackKind, entry),
    proceduralRockType: resolveProceduralRockType(asset, fallbackKind, entry),
    proceduralWoodType: resolveProceduralWoodType(asset, fallbackKind, entry),
  };
}
