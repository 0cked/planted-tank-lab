import { z } from "zod";

export const BUILD_TAG_OPTIONS = [
  "iwagumi",
  "dutch",
  "nature",
  "jungle",
  "nano",
  "low-tech",
  "high-tech",
  "shrimp",
  "paludarium",
] as const;

export type BuildTagSlug = (typeof BUILD_TAG_OPTIONS)[number];

export const buildTagSlugSchema = z.enum(BUILD_TAG_OPTIONS);

const BUILD_TAG_SET = new Set<string>(BUILD_TAG_OPTIONS);

const BUILD_TAG_LABELS: Record<BuildTagSlug, string> = {
  iwagumi: "Iwagumi",
  dutch: "Dutch",
  nature: "Nature",
  jungle: "Jungle",
  nano: "Nano",
  "low-tech": "Low-tech",
  "high-tech": "High-tech",
  shrimp: "Shrimp",
  paludarium: "Paludarium",
};

export function isBuildTagSlug(value: string): value is BuildTagSlug {
  return BUILD_TAG_SET.has(value);
}

export function normalizeBuildTagSlugs(values: Iterable<string>): BuildTagSlug[] {
  const deduped = new Set<BuildTagSlug>();

  for (const value of values) {
    const slug = value.trim().toLowerCase();
    if (isBuildTagSlug(slug)) {
      deduped.add(slug);
    }
  }

  return BUILD_TAG_OPTIONS.filter((slug) => deduped.has(slug));
}

export function buildTagLabel(slug: BuildTagSlug): string {
  return BUILD_TAG_LABELS[slug];
}
