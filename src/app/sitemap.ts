import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { categories, plants, products } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://plantedtanklab.com";

  const productRows = await db
    .select({
      productSlug: products.slug,
      categorySlug: categories.slug,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id));

  const plantRows = await db
    .select({ slug: plants.slug, updatedAt: plants.updatedAt })
    .from(plants);

  const urls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/builder`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/products`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/plants`, changeFrequency: "weekly", priority: 0.8 },
  ];

  for (const row of productRows) {
    urls.push({
      url: `${baseUrl}/products/${row.categorySlug}/${row.productSlug}`,
      lastModified: row.updatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const row of plantRows) {
    urls.push({
      url: `${baseUrl}/plants/${row.slug}`,
      lastModified: row.updatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return urls;
}

