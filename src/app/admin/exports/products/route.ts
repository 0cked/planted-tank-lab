import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { brands, categories, products } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";
import { toCsv } from "@/server/services/admin/csv";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      categorySlug: categories.slug,
      brandSlug: brands.slug,
      status: products.status,
      verified: products.verified,
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
      specs: products.specs,
      meta: products.meta,
      source: products.source,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .orderBy(asc(categories.slug), asc(products.name))
    .limit(20_000);

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "export.products_csv",
    targetType: "export",
    targetId: null,
    meta: { rows: rows.length },
  });

  const csv = toCsv({
    columns: [
      { header: "id", key: "id" },
      { header: "slug", key: "slug" },
      { header: "name", key: "name" },
      { header: "category_slug", key: "categorySlug" },
      { header: "brand_slug", key: "brandSlug" },
      { header: "status", key: "status" },
      { header: "verified", key: "verified" },
      { header: "image_url", key: "imageUrl" },
      { header: "image_urls_json", key: "imageUrls" },
      { header: "specs_json", key: "specs" },
      { header: "meta_json", key: "meta" },
      { header: "source", key: "source" },
      { header: "updated_at", key: "updatedAt" },
    ],
    rows,
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="products.csv"',
      "cache-control": "no-store",
    },
  });
}
