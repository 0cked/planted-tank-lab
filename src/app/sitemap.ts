import type { MetadataRoute } from "next";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/server/db";
import { builds, categories, plants, products } from "@/server/db/schema";

const BASE_URL = "https://plantedtanklab.com";

// This route queries the DB; force it to be dynamic so `next build` does not
// prerender it with many parallel workers (which can exhaust DB pooler clients).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [categoryIdRows, prods, pls, publicBuilds] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug }).from(categories),
    db
      .select({ slug: products.slug, categoryId: products.categoryId, updatedAt: products.updatedAt })
      .from(products),
    db.select({ slug: plants.slug, updatedAt: plants.updatedAt }).from(plants),
    db
      .select({ shareSlug: builds.shareSlug, updatedAt: builds.updatedAt })
      .from(builds)
      .where(and(eq(builds.isPublic, true), isNotNull(builds.shareSlug)))
      .limit(500),
  ]);

  const categorySlugById2 = new Map(categoryIdRows.map((c) => [c.id, c.slug] as const));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now },
    { url: `${BASE_URL}/builder`, lastModified: now },
    { url: `${BASE_URL}/products`, lastModified: now },
    { url: `${BASE_URL}/plants`, lastModified: now },
    { url: `${BASE_URL}/builds`, lastModified: now },
    { url: `${BASE_URL}/tools/substrate-calculator`, lastModified: now },
    { url: `${BASE_URL}/tools/co2-calculator`, lastModified: now },
    { url: `${BASE_URL}/tools/lighting-calculator`, lastModified: now },
    { url: `${BASE_URL}/tools/fertilizer-calculator`, lastModified: now },
    { url: `${BASE_URL}/about`, lastModified: now },
    { url: `${BASE_URL}/privacy`, lastModified: now },
    { url: `${BASE_URL}/terms`, lastModified: now },
    { url: `${BASE_URL}/contact`, lastModified: now },
  ];

  const productCategoryRoutes: MetadataRoute.Sitemap = categoryIdRows
    .filter((c) => c.slug !== "plants")
    .map((c) => ({
      url: `${BASE_URL}/products/${c.slug}`,
      lastModified: now,
    }));

  const productDetailRoutes: MetadataRoute.Sitemap = prods
    .map((p) => {
      const catSlug = categorySlugById2.get(p.categoryId);
      if (!catSlug || catSlug === "plants") return null;
      return {
        url: `${BASE_URL}/products/${catSlug}/${p.slug}`,
        lastModified: p.updatedAt ?? now,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const plantDetailRoutes: MetadataRoute.Sitemap = pls.map((p) => ({
    url: `${BASE_URL}/plants/${p.slug}`,
    lastModified: p.updatedAt ?? now,
  }));

  const publicBuildRoutes: MetadataRoute.Sitemap = publicBuilds
    .map((b) => b.shareSlug)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((shareSlug) => ({ url: `${BASE_URL}/builds/${shareSlug}`, lastModified: now }));

  return [
    ...staticRoutes,
    ...productCategoryRoutes,
    ...productDetailRoutes,
    ...plantDetailRoutes,
    ...publicBuildRoutes,
  ];
}
