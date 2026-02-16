import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { builds } from "@/server/db/schema";

const BUILD_THUMBNAIL_FLAG_KEY = "thumbnailDataUrl";
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const CACHE_CONTROL_HEADER = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractThumbnailDataUrl(flags: unknown): string | null {
  const row = asRecord(flags);
  const raw = row[BUILD_THUMBNAIL_FLAG_KEY];
  if (typeof raw !== "string") return null;

  const normalized = raw.trim();
  if (!normalized.startsWith(PNG_DATA_URL_PREFIX)) return null;

  const payload = normalized.slice(PNG_DATA_URL_PREFIX.length);
  if (!payload || !/^[A-Za-z0-9+/]+=*$/.test(payload)) return null;

  return normalized;
}

function decodePngDataUrl(dataUrl: string): Uint8Array | null {
  const payload = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  try {
    const buffer = Buffer.from(payload, "base64");
    if (buffer.byteLength === 0) return null;
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ shareSlug: string }> },
) {
  const { shareSlug } = await props.params;

  const rows = await db
    .select({
      isPublic: builds.isPublic,
      flags: builds.flags,
    })
    .from(builds)
    .where(eq(builds.shareSlug, shareSlug))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isPublic) {
    return new Response("Not found", { status: 404 });
  }

  const thumbnailDataUrl = extractThumbnailDataUrl(row.flags);
  if (!thumbnailDataUrl) {
    return new Response("Not found", { status: 404 });
  }

  const pngBytes = decodePngDataUrl(thumbnailDataUrl);
  if (!pngBytes) {
    return new Response("Not found", { status: 404 });
  }

  const pngBuffer = Buffer.from(pngBytes);

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL_HEADER,
      "Content-Length": String(pngBytes.byteLength),
      "Content-Disposition": 'inline; filename="build-thumbnail.png"',
    },
  });
}
