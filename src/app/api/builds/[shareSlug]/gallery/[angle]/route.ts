import { eq } from "drizzle-orm";

import {
  decodePngDataUrl,
  extractGalleryDataUrls,
  parseBuildGalleryAngleParam,
} from "@/server/build-image-flags";
import { db } from "@/server/db";
import { builds } from "@/server/db/schema";

const CACHE_CONTROL_HEADER = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: Request,
  props: { params: Promise<{ shareSlug: string; angle: string }> },
) {
  const { shareSlug, angle } = await props.params;
  const galleryAngle = parseBuildGalleryAngleParam(angle);
  if (!galleryAngle) {
    return new Response("Not found", { status: 404 });
  }

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

  const galleryDataUrls = extractGalleryDataUrls(row.flags);
  const imageDataUrl = galleryDataUrls[galleryAngle] ?? null;
  if (!imageDataUrl) {
    return new Response("Not found", { status: 404 });
  }

  const pngBytes = decodePngDataUrl(imageDataUrl);
  if (!pngBytes) {
    return new Response("Not found", { status: 404 });
  }

  const pngBuffer = Buffer.from(pngBytes);
  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL_HEADER,
      "Content-Length": String(pngBytes.byteLength),
      "Content-Disposition": `inline; filename="build-${galleryAngle}.png"`,
    },
  });
}
