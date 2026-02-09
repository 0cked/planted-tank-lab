import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { offers, products, retailers } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";
import { toCsv } from "@/server/services/admin/csv";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select({
      id: offers.id,
      productId: offers.productId,
      productSlug: products.slug,
      retailerId: offers.retailerId,
      retailerSlug: retailers.slug,
      priceCents: offers.priceCents,
      currency: offers.currency,
      inStock: offers.inStock,
      url: offers.url,
      affiliateUrl: offers.affiliateUrl,
      lastCheckedAt: offers.lastCheckedAt,
      updatedAt: offers.updatedAt,
    })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .orderBy(asc(retailers.slug), asc(products.slug))
    .limit(50_000);

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "export.offers_csv",
    targetType: "export",
    targetId: null,
    meta: { rows: rows.length },
  });

  const csv = toCsv({
    columns: [
      { header: "id", key: "id" },
      { header: "product_id", key: "productId" },
      { header: "product_slug", key: "productSlug" },
      { header: "retailer_id", key: "retailerId" },
      { header: "retailer_slug", key: "retailerSlug" },
      { header: "price_cents", key: "priceCents" },
      { header: "currency", key: "currency" },
      { header: "in_stock", key: "inStock" },
      { header: "url", key: "url" },
      { header: "affiliate_url", key: "affiliateUrl" },
      { header: "last_checked_at", key: "lastCheckedAt" },
      { header: "updated_at", key: "updatedAt" },
    ],
    rows,
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="offers.csv"',
      "cache-control": "no-store",
    },
  });
}
