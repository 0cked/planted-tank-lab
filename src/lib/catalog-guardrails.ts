export const CATALOG_PLACEHOLDER_IMAGE_MARKERS = [
  "/images/aquascape-hero-2400.jpg",
] as const;

export const CATALOG_PLACEHOLDER_COPY_MARKERS = [
  "photo coming soon",
  "no photo yet",
  "no details yet",
  "no specs yet",
  "no offers yet",
  "still filling",
  "open for care details",
  "lorem ipsum",
  "tbd",
] as const;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForContainsCheck(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeImageCandidate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutParams = trimmed.split(/[?#]/, 1)[0]?.trim() ?? "";
  if (!withoutParams) return "";

  if (withoutParams.startsWith("http://") || withoutParams.startsWith("https://")) {
    try {
      const parsed = new URL(withoutParams);
      return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch {
      // fall through and treat as generic path
    }
  }

  return withoutParams.toLowerCase();
}

export function isPlaceholderImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeImageCandidate(value);
  if (!normalized) return false;

  return CATALOG_PLACEHOLDER_IMAGE_MARKERS.some((marker) => {
    const m = marker.toLowerCase();
    return normalized === m || normalized.endsWith(m);
  });
}

export function sanitizeCatalogImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isPlaceholderImageUrl(trimmed)) return null;
  return trimmed;
}

export function sanitizeCatalogImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    const normalized = sanitizeCatalogImageUrl(typeof item === "string" ? item : null);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function firstCatalogImageUrl(
  imageUrl: string | null | undefined,
  imageUrls: unknown,
): string | null {
  return sanitizeCatalogImageUrl(imageUrl) ?? sanitizeCatalogImageUrls(imageUrls)[0] ?? null;
}

export function containsPlaceholderCopy(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeForContainsCheck(value);
  if (!normalized) return false;

  return CATALOG_PLACEHOLDER_COPY_MARKERS.some((marker) => normalized.includes(marker));
}

export function sanitizeCatalogCopy(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (containsPlaceholderCopy(trimmed)) return null;
  return trimmed;
}
