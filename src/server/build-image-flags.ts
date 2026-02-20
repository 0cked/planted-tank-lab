export const MAX_BUILD_IMAGE_DATA_URL_LENGTH = 1_500_000;
export const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
export const BUILD_THUMBNAIL_FLAG_KEY = "thumbnailDataUrl";
export const BUILD_GALLERY_FLAG_KEY = "galleryDataUrls";

export type BuildGalleryAngle = "front" | "top" | "threeQuarter";
export const BUILD_GALLERY_ANGLES: readonly BuildGalleryAngle[] = ["front", "top", "threeQuarter"] as const;

const GALLERY_ANGLE_SEGMENT: Record<BuildGalleryAngle, string> = {
  front: "front",
  top: "top",
  threeQuarter: "three-quarter",
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function sanitizePngDataUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized.startsWith(PNG_DATA_URL_PREFIX)) return null;
  if (normalized.length > MAX_BUILD_IMAGE_DATA_URL_LENGTH) return null;

  const encoded = normalized.slice(PNG_DATA_URL_PREFIX.length);
  if (!encoded) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(encoded)) return null;
  return normalized;
}

export function extractThumbnailDataUrl(flags: unknown): string | null {
  const row = asRecord(flags);
  return sanitizePngDataUrl(row[BUILD_THUMBNAIL_FLAG_KEY]);
}

export function sanitizeGalleryDataUrls(value: unknown): Partial<Record<BuildGalleryAngle, string>> {
  const row = asRecord(value);
  const next: Partial<Record<BuildGalleryAngle, string>> = {};
  for (const angle of BUILD_GALLERY_ANGLES) {
    const normalized = sanitizePngDataUrl(row[angle]);
    if (normalized) {
      next[angle] = normalized;
    }
  }
  return next;
}

export function extractGalleryDataUrls(flags: unknown): Partial<Record<BuildGalleryAngle, string>> {
  const row = asRecord(flags);
  return sanitizeGalleryDataUrls(row[BUILD_GALLERY_FLAG_KEY]);
}

export function withBuildImageFlags(
  flags: Record<string, unknown>,
  params: {
    thumbnailDataUrl: string | null;
    galleryDataUrls: Partial<Record<BuildGalleryAngle, string>>;
  },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...flags };

  if (params.thumbnailDataUrl) {
    next[BUILD_THUMBNAIL_FLAG_KEY] = params.thumbnailDataUrl;
  } else {
    delete next[BUILD_THUMBNAIL_FLAG_KEY];
  }

  if (BUILD_GALLERY_ANGLES.some((angle) => Boolean(params.galleryDataUrls[angle]))) {
    next[BUILD_GALLERY_FLAG_KEY] = params.galleryDataUrls;
  } else {
    delete next[BUILD_GALLERY_FLAG_KEY];
  }

  return next;
}

export function buildThumbnailRoute(shareSlug: string): string {
  return `/api/builds/${shareSlug}/thumbnail`;
}

export function buildGalleryRoute(shareSlug: string, angle: BuildGalleryAngle): string {
  return `/api/builds/${shareSlug}/gallery/${GALLERY_ANGLE_SEGMENT[angle]}`;
}

export function buildGalleryRoutes(
  shareSlug: string,
  galleryDataUrls: Partial<Record<BuildGalleryAngle, string>>,
): string[] {
  return BUILD_GALLERY_ANGLES.filter((angle) => Boolean(galleryDataUrls[angle])).map((angle) =>
    buildGalleryRoute(shareSlug, angle),
  );
}

export function parseBuildGalleryAngleParam(value: string): BuildGalleryAngle | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "front") return "front";
  if (normalized === "top") return "top";
  if (normalized === "three-quarter" || normalized === "threequarter") return "threeQuarter";
  return null;
}

export function decodePngDataUrl(dataUrl: string): Uint8Array | null {
  const payload = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  try {
    const buffer = Buffer.from(payload, "base64");
    if (buffer.byteLength === 0) return null;
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } catch {
    return null;
  }
}
