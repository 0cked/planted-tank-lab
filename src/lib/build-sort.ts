import { z } from "zod";

export const BUILD_SORT_OPTIONS = [
  "most-voted",
  "newest",
  "most-items",
  "alphabetical",
] as const;

export type BuildSortOption = (typeof BUILD_SORT_OPTIONS)[number];

export const DEFAULT_BUILD_SORT_OPTION: BuildSortOption = "most-voted";

export const buildSortOptionSchema = z.enum(BUILD_SORT_OPTIONS);

const BUILD_SORT_SET = new Set<string>(BUILD_SORT_OPTIONS);

const BUILD_SORT_LABELS: Record<BuildSortOption, string> = {
  "most-voted": "Most voted",
  newest: "Newest",
  "most-items": "Most items",
  alphabetical: "Alphabetical",
};

export function isBuildSortOption(value: string): value is BuildSortOption {
  return BUILD_SORT_SET.has(value);
}

export function normalizeBuildSortOption(value: string | null | undefined): BuildSortOption {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !isBuildSortOption(normalized)) {
    return DEFAULT_BUILD_SORT_OPTION;
  }

  return normalized;
}

export function buildSortLabel(sort: BuildSortOption): string {
  return BUILD_SORT_LABELS[sort];
}
