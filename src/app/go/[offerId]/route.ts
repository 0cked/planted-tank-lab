import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/server/db";
import { offerClicks, offers, retailers } from "@/server/db/schema";
import {
  buildAffiliateUrl,
  extractIpFromHeaders,
  hashIp,
  isHostAllowed,
  isLikelyBotUserAgent,
} from "@/server/services/affiliate";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ offerId: string }> },
) {
  const params = await ctx.params;
  const offerId = params.offerId;

  if (!isUuid(offerId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rows = await db
    .select({
      offer: offers,
      retailer: retailers,
    })
    .from(offers)
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(and(eq(offers.id, offerId), eq(retailers.active, true)))
    .limit(1);

  const row = rows[0];
  if (!row) return new NextResponse("Not found", { status: 404 });

  const destination = buildAffiliateUrl({
    retailerSlug: row.retailer.slug,
    retailerAffiliateTag: row.retailer.affiliateTag ?? null,
    retailerAffiliateTagParam: row.retailer.affiliateTagParam ?? null,
    retailerAffiliateDeeplinkTemplate: row.retailer.affiliateDeeplinkTemplate ?? null,
    rawUrl: row.offer.url,
    affiliateUrl: row.offer.affiliateUrl ?? null,
  });

  // Validate final destination + prevent open redirects.
  let parsed: URL;
  try {
    parsed = new URL(destination);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new NextResponse("Bad destination", { status: 400 });
    }
    if (parsed.username || parsed.password) {
      return new NextResponse("Bad destination", { status: 400 });
    }
    if (
      !isHostAllowed({
        hostname: parsed.hostname,
        allowedHosts: (row.retailer as { allowedHosts?: unknown }).allowedHosts,
      })
    ) {
      return new NextResponse("Bad destination", { status: 400 });
    }
  } catch {
    return new NextResponse("Bad destination", { status: 400 });
  }

  const h = await headers();
  const ip = extractIpFromHeaders(h.get("x-forwarded-for"));
  const ua = h.get("user-agent");
  const ref = h.get("referer");

  const ipHash = hashIp(ip);
  const isBot = isLikelyBotUserAgent(ua);

  // Best-effort logging: do not fail redirect on logging errors.
  // We also dedupe repeated clicks for the same offer+IP to reduce bot spam.
  if (ipHash && !isBot) {
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recent = await db
        .select({ id: offerClicks.id })
        .from(offerClicks)
        .where(
          and(
            eq(offerClicks.offerId, row.offer.id),
            eq(offerClicks.ipHash, ipHash),
            gt(offerClicks.createdAt, tenMinAgo),
          ),
        )
        .limit(1);

      if (!recent[0]?.id) {
        await db.insert(offerClicks).values({
          offerId: row.offer.id,
          productId: row.offer.productId,
          retailerId: row.offer.retailerId,
          ipHash,
          userAgent: ua ? ua.slice(0, 500) : null,
          referer: ref ? ref.slice(0, 1000) : null,
        });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.redirect(parsed.toString(), { status: 302 });
}
