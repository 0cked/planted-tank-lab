export type PlantComparisonTone = "easier" | "harder" | "neutral";

const MAX_COMPARE_PLANTS = 4;

function normalizeSlugToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");
}

export function normalizePlantCompareSlugs(
  value: string | string[] | null | undefined,
): string[] {
  const segments: string[] = [];

  if (typeof value === "string") {
    segments.push(...value.split(","));
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") continue;
      segments.push(...item.split(","));
    }
  }

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const slug = normalizeSlugToken(segment);
    if (!slug || seen.has(slug)) continue;

    seen.add(slug);
    unique.push(slug);

    if (unique.length >= MAX_COMPARE_PLANTS) break;
  }

  return unique;
}

export function serializePlantCompareSlugs(slugs: string[]): string {
  const normalized = normalizePlantCompareSlugs(slugs);
  return normalized.join(",");
}

function normalizedText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function titleWords(value: string | null | undefined): string {
  const normalized = normalizedText(value);
  if (!normalized) return "—";

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseMaxHeightIn(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function rankDifficulty(value: string | null | undefined): number | null {
  const token = normalizedText(value);
  if (!token) return null;

  if (token.includes("easy") || token.includes("beginner") || token.includes("low")) {
    return 1;
  }

  if (token.includes("moderate") || token.includes("medium") || token.includes("mid")) {
    return 2;
  }

  if (
    token.includes("hard") ||
    token.includes("difficult") ||
    token.includes("advanced") ||
    token.includes("high")
  ) {
    return 3;
  }

  return 2;
}

export function rankDemand(value: string | null | undefined): number | null {
  const token = normalizedText(value);
  if (!token) return null;

  if (
    token.includes("none") ||
    token.includes("low") ||
    token.includes("minimal") ||
    token.includes("easy")
  ) {
    return 1;
  }

  if (token.includes("beneficial") || token.includes("moderate") || token.includes("medium")) {
    return 2;
  }

  if (token.includes("required") || token.includes("high") || token.includes("demanding")) {
    return 3;
  }

  return 2;
}

export function rankGrowth(value: string | null | undefined): number | null {
  const token = normalizedText(value);
  if (!token) return null;

  if (token.includes("slow")) return 1;
  if (token.includes("moderate") || token.includes("medium")) return 2;
  if (token.includes("fast") || token.includes("aggressive") || token.includes("rapid")) {
    return 3;
  }

  return 2;
}

export function resolveRelativeComparisonTone(params: {
  rank: number | null;
  allRanks: Array<number | null | undefined>;
  lowerIsEasier?: boolean;
}): PlantComparisonTone {
  if (params.rank == null || !Number.isFinite(params.rank)) return "neutral";

  const numericRanks = params.allRanks.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (numericRanks.length < 2) return "neutral";

  const minimum = Math.min(...numericRanks);
  const maximum = Math.max(...numericRanks);
  if (minimum === maximum) return "neutral";

  const lowerIsEasier = params.lowerIsEasier ?? true;

  if (lowerIsEasier) {
    if (params.rank === minimum) return "easier";
    if (params.rank === maximum) return "harder";
    return "neutral";
  }

  if (params.rank === maximum) return "easier";
  if (params.rank === minimum) return "harder";
  return "neutral";
}

export function comparisonToneClass(tone: PlantComparisonTone): string {
  if (tone === "easier") return "bg-emerald-50 text-emerald-900 border-emerald-200";
  if (tone === "harder") return "bg-rose-50 text-rose-900 border-rose-200";
  return "bg-white/70 text-neutral-800 border-neutral-200";
}
