import { inArray, sql } from "drizzle-orm";

import { CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS } from "@/server/catalog/quality-audit";
import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import { categories, offers, plants, products } from "@/server/db/schema";

const MAX_SAMPLE_SLUGS = 20;
const NON_PRODUCTION_SLUG_PATTERN =
  /(^|[-_])(vitest|test|e2e|playwright)([-_]|$)/i;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function hasCatalogImage(imageUrl: string | null, imageUrls: unknown): boolean {
  return (imageUrl ?? "").trim().length > 0 || toStringArray(imageUrls).length > 0;
}

function hasSpecsObject(specs: unknown): boolean {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return false;
  return Object.keys(specs as Record<string, unknown>).length > 0;
}

function hasNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_SAMPLE_SLUGS);
}

export function isNonProductionCatalogSlug(
  slug: string | null | undefined,
): boolean {
  if (typeof slug !== "string") return false;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  return NON_PRODUCTION_SLUG_PATTERN.test(normalized);
}

export function shouldProductBeActiveForCatalogPolicy(params: {
  inStockPricedOffers: number;
  specs: unknown;
  imageUrl: string | null;
  imageUrls: unknown;
}): boolean {
  return (
    params.inStockPricedOffers > 0 &&
    hasSpecsObject(params.specs) &&
    hasCatalogImage(params.imageUrl, params.imageUrls)
  );
}

export function shouldPlantBeActiveForCatalogPolicy(params: {
  imageUrl: string | null;
  imageUrls: unknown;
  sources: unknown;
  description: string | null;
}): boolean {
  return (
    hasCatalogImage(params.imageUrl, params.imageUrls) &&
    toStringArray(params.sources).length > 0 &&
    hasNonEmptyText(params.description)
  );
}

export type CatalogActivationPolicyResult = {
  generatedAt: string;
  focusCategorySlugs: readonly string[];
  products: {
    evaluated: number;
    activated: number;
    deactivated: number;
    sampleActivatedSlugs: string[];
    sampleDeactivatedSlugs: string[];
  };
  plants: {
    evaluated: number;
    activated: number;
    deactivated: number;
    sampleActivatedSlugs: string[];
    sampleDeactivatedSlugs: string[];
  };
};

export async function applyCatalogActivationPolicy(
  database: DbClient = db,
): Promise<CatalogActivationPolicyResult> {
  const generatedAt = new Date().toISOString();

  const focusCategoryRows = await database
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, [...CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS]));

  const focusCategoryIds = focusCategoryRows.map((row) => row.id);

  const focusProducts =
    focusCategoryIds.length > 0
      ? await database
          .select({
            id: products.id,
            slug: products.slug,
            status: products.status,
            specs: products.specs,
            imageUrl: products.imageUrl,
            imageUrls: products.imageUrls,
          })
          .from(products)
          .where(inArray(products.categoryId, focusCategoryIds))
      : [];

  const focusProductIds = focusProducts.map((row) => row.id);

  const offerCounts =
    focusProductIds.length > 0
      ? await database
          .select({
            productId: offers.productId,
            inStockPricedOffers: sql<number>`
              coalesce(sum(case when ${offers.inStock} = true and ${offers.priceCents} is not null then 1 else 0 end), 0)::int
            `.as("in_stock_priced_offers"),
          })
          .from(offers)
          .where(inArray(offers.productId, focusProductIds))
          .groupBy(offers.productId)
      : [];

  const inStockCountByProductId = new Map(
    offerCounts.map((row) => [row.productId, Number(row.inStockPricedOffers ?? 0)] as const),
  );

  const productIdsToActivate: string[] = [];
  const productSlugsToActivate: string[] = [];
  const productIdsToDeactivate: string[] = [];
  const productSlugsToDeactivate: string[] = [];

  for (const product of focusProducts) {
    const inStockPricedOffers = inStockCountByProductId.get(product.id) ?? 0;
    const isArtifact = isNonProductionCatalogSlug(product.slug);
    const shouldBeActive =
      !isArtifact &&
      shouldProductBeActiveForCatalogPolicy({
        inStockPricedOffers,
        specs: product.specs,
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls,
      });

    if (shouldBeActive && product.status !== "active") {
      productIdsToActivate.push(product.id);
      productSlugsToActivate.push(product.slug);
    }

    if (!shouldBeActive && product.status === "active") {
      productIdsToDeactivate.push(product.id);
      productSlugsToDeactivate.push(product.slug);
    }
  }

  const plantRows = await database
    .select({
      id: plants.id,
      slug: plants.slug,
      status: plants.status,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      sources: plants.sources,
      description: plants.description,
    })
    .from(plants);

  const plantIdsToActivate: string[] = [];
  const plantSlugsToActivate: string[] = [];
  const plantIdsToDeactivate: string[] = [];
  const plantSlugsToDeactivate: string[] = [];

  for (const plant of plantRows) {
    const isArtifact = isNonProductionCatalogSlug(plant.slug);
    const shouldBeActive =
      !isArtifact &&
      shouldPlantBeActiveForCatalogPolicy({
        imageUrl: plant.imageUrl,
        imageUrls: plant.imageUrls,
        sources: plant.sources,
        description: plant.description,
      });

    if (shouldBeActive && plant.status !== "active") {
      plantIdsToActivate.push(plant.id);
      plantSlugsToActivate.push(plant.slug);
    }

    if (!shouldBeActive && plant.status === "active") {
      plantIdsToDeactivate.push(plant.id);
      plantSlugsToDeactivate.push(plant.slug);
    }
  }

  const now = new Date();

  if (productIdsToActivate.length > 0) {
    await database
      .update(products)
      .set({ status: "active", updatedAt: now })
      .where(inArray(products.id, productIdsToActivate));
  }

  if (productIdsToDeactivate.length > 0) {
    await database
      .update(products)
      .set({ status: "inactive", updatedAt: now })
      .where(inArray(products.id, productIdsToDeactivate));
  }

  if (plantIdsToActivate.length > 0) {
    await database
      .update(plants)
      .set({ status: "active", updatedAt: now })
      .where(inArray(plants.id, plantIdsToActivate));
  }

  if (plantIdsToDeactivate.length > 0) {
    await database
      .update(plants)
      .set({ status: "inactive", updatedAt: now })
      .where(inArray(plants.id, plantIdsToDeactivate));
  }

  return {
    generatedAt,
    focusCategorySlugs: CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS,
    products: {
      evaluated: focusProducts.length,
      activated: productIdsToActivate.length,
      deactivated: productIdsToDeactivate.length,
      sampleActivatedSlugs: uniqueSorted(productSlugsToActivate),
      sampleDeactivatedSlugs: uniqueSorted(productSlugsToDeactivate),
    },
    plants: {
      evaluated: plantRows.length,
      activated: plantIdsToActivate.length,
      deactivated: plantIdsToDeactivate.length,
      sampleActivatedSlugs: uniqueSorted(plantSlugsToActivate),
      sampleDeactivatedSlugs: uniqueSorted(plantSlugsToDeactivate),
    },
  };
}
