"use client";

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

type ManifestEntry = {
  path?: string | null;
  category?: ManifestCategory;
  defaultScale?: number;
  placementZone?: ManifestPlacementZone;
  triangleCount?: number;
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
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
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

export function useAsset(
  asset: VisualAsset,
  options?: {
    failedPath?: string | null;
  },
): ResolvedVisualAsset {
  const failedPath = options?.failedPath ?? null;
  const fallbackKind = inferFallbackKind(asset);
  const { manifestKey, entry } = resolveManifestEntry(asset);
  const glbPath = sanitizeModelPath(entry?.path);
  const shouldFallback = failedPath != null && failedPath === glbPath;

  return {
    manifestKey,
    glbPath: shouldFallback ? null : glbPath,
    category: entry?.category ?? fallbackKind,
    defaultScale: entry?.defaultScale ?? asset.defaultScale,
    placementZone: entry?.placementZone ?? inferPlacementZone(asset),
    triangleCount: entry?.triangleCount ?? null,
    fallbackKind,
  };
}
