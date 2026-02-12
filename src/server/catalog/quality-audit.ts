import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import { categories, offers, plants, products } from "@/server/db/schema";

export const CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS = [
  "tank",
  "light",
  "filter",
  "substrate",
  "hardscape",
] as const;

export const CATALOG_OFFER_FRESHNESS_WINDOW_HOURS = 24;
export const CATALOG_OFFER_FRESHNESS_SLO_PERCENT = 95;

const MAX_SAMPLE_SLUGS = 20;

type FocusCategorySlug = (typeof CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS)[number];

type ProductOfferAggregate = {
  productId: string;
  totalOffers: number;
  inStockPricedOffers: number;
  lastCheckedAt: Date | null;
};

export type CatalogQualityCategoryMetrics = {
  slug: FocusCategorySlug;
  name: string;
  productCount: number;
  productsWithImages: number;
  productsWithSpecs: number;
  productsWithAnyOffer: number;
  productsWithInStockPricedOffers: number;
  productsWithFreshOffers24h: number;
  productsMissingImages: number;
  productsMissingSpecs: number;
  productsWithoutAnyOffer: number;
  productsWithoutInStockPricedOffers: number;
  productsWithStaleOffers24h: number;
  sampleMissingImageSlugs: string[];
  sampleMissingSpecSlugs: string[];
  sampleMissingOfferSlugs: string[];
  sampleMissingInStockPricedOfferSlugs: string[];
  sampleStaleOfferSlugs: string[];
};

export type CatalogQualityPlantsMetrics = {
  total: number;
  withImages: number;
  withSources: number;
  withDescription: number;
  missingImages: number;
  missingSources: number;
  missingDescription: number;
  sampleMissingImageSlugs: string[];
  sampleMissingSourceSlugs: string[];
  sampleMissingDescriptionSlugs: string[];
};

export type CatalogQualityOfferFreshnessMetrics = {
  totalOffers: number;
  activeCatalogOffers: number;
  inactiveCatalogOffers: number;
  offersCheckedWithinWindow: number;
  offersStaleOrMissingCheck: number;
  offersMissingCheckTimestamp: number;
  inStockPricedOffers: number;
  freshnessWindowHours: number;
  freshnessSloPercent: number;
  freshnessPercent: number;
};

export type CatalogQualityFinding = {
  severity: "violation" | "warning";
  code: string;
  scope: string;
  message: string;
};

export type CatalogQualityAudit = {
  generatedAt: string;
  focusCategorySlugs: readonly FocusCategorySlug[];
  missingFocusCategories: FocusCategorySlug[];
  categories: CatalogQualityCategoryMetrics[];
  plants: CatalogQualityPlantsMetrics;
  offers: CatalogQualityOfferFreshnessMetrics;
  findings: {
    violations: CatalogQualityFinding[];
    warnings: CatalogQualityFinding[];
  };
  hasViolations: boolean;
  hasWarnings: boolean;
};

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
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return false;
  }

  return Object.keys(specs as Record<string, unknown>).length > 0;
}

function hasNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueSorted(values: string[], max = MAX_SAMPLE_SLUGS): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function toPercent(params: { numerator: number; denominator: number }): number {
  if (params.denominator <= 0) return 0;
  return Number(((params.numerator / params.denominator) * 100).toFixed(2));
}

function sortFindings(findings: CatalogQualityFinding[]): CatalogQualityFinding[] {
  return [...findings].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.message.localeCompare(b.message);
  });
}

export function buildCatalogQualityFindings(params: {
  missingFocusCategories: FocusCategorySlug[];
  categories: CatalogQualityCategoryMetrics[];
  plants: CatalogQualityPlantsMetrics;
  offers: CatalogQualityOfferFreshnessMetrics;
}): {
  violations: CatalogQualityFinding[];
  warnings: CatalogQualityFinding[];
} {
  const violations: CatalogQualityFinding[] = [];
  const warnings: CatalogQualityFinding[] = [];

  for (const slug of params.missingFocusCategories) {
    violations.push({
      severity: "violation",
      code: "focus_category_missing",
      scope: `category:${slug}`,
      message: `Required focus category '${slug}' is missing from canonical categories.`,
    });
  }

  for (const category of params.categories) {
    if (category.productCount === 0) {
      violations.push({
        severity: "violation",
        code: "focus_category_empty",
        scope: `category:${category.slug}`,
        message: `Focus category '${category.slug}' has zero active products.`,
      });
    }

    if (
      category.productCount > 0 &&
      category.productsWithInStockPricedOffers === 0
    ) {
      violations.push({
        severity: "violation",
        code: "focus_category_no_priced_offers",
        scope: `category:${category.slug}`,
        message: `Focus category '${category.slug}' has no active products with in-stock priced offers.`,
      });
    }

    if (category.productsMissingImages > 0) {
      warnings.push({
        severity: "warning",
        code: "focus_category_missing_images",
        scope: `category:${category.slug}`,
        message: `${category.productsMissingImages} products in '${category.slug}' are missing catalog images.`,
      });
    }

    if (category.productsMissingSpecs > 0) {
      warnings.push({
        severity: "warning",
        code: "focus_category_missing_specs",
        scope: `category:${category.slug}`,
        message: `${category.productsMissingSpecs} products in '${category.slug}' are missing specs objects.`,
      });
    }

    if (category.productsWithoutAnyOffer > 0) {
      warnings.push({
        severity: "warning",
        code: "focus_category_missing_offers",
        scope: `category:${category.slug}`,
        message: `${category.productsWithoutAnyOffer} products in '${category.slug}' have no offers.`,
      });
    }

    if (category.productsWithStaleOffers24h > 0) {
      warnings.push({
        severity: "warning",
        code: "focus_category_stale_offers",
        scope: `category:${category.slug}`,
        message: `${category.productsWithStaleOffers24h} products in '${category.slug}' have stale/no offer freshness checks in the last ${CATALOG_OFFER_FRESHNESS_WINDOW_HOURS}h.`,
      });
    }
  }

  if (
    params.offers.freshnessPercent < params.offers.freshnessSloPercent &&
    params.offers.activeCatalogOffers > 0
  ) {
    violations.push({
      severity: "violation",
      code: "offer_freshness_below_slo",
      scope: "offers",
      message: `Offer freshness is ${params.offers.freshnessPercent}% (${params.offers.offersCheckedWithinWindow}/${params.offers.activeCatalogOffers} active-catalog offers checked within ${params.offers.freshnessWindowHours}h; SLO ${params.offers.freshnessSloPercent}%).`,
    });
  }

  if (params.offers.totalOffers === 0 || params.offers.activeCatalogOffers === 0) {
    violations.push({
      severity: "violation",
      code: "offers_empty",
      scope: "offers",
      message:
        params.offers.totalOffers === 0
          ? "Canonical offers table has zero rows."
          : "Active catalog has zero offers attached to active products.",
    });
  }

  if (params.offers.offersMissingCheckTimestamp > 0) {
    warnings.push({
      severity: "warning",
      code: "offers_missing_last_checked_at",
      scope: "offers",
      message: `${params.offers.offersMissingCheckTimestamp} active-catalog offers are missing last_checked_at timestamps.`,
    });
  }

  if (params.plants.missingImages > 0) {
    warnings.push({
      severity: "warning",
      code: "plants_missing_images",
      scope: "plants",
      message: `${params.plants.missingImages} active plants are missing images.`,
    });
  }

  if (params.plants.missingSources > 0) {
    warnings.push({
      severity: "warning",
      code: "plants_missing_sources",
      scope: "plants",
      message: `${params.plants.missingSources} active plants are missing sources/citations.`,
    });
  }

  if (params.plants.missingDescription > 0) {
    warnings.push({
      severity: "warning",
      code: "plants_missing_description",
      scope: "plants",
      message: `${params.plants.missingDescription} active plants are missing descriptions.`,
    });
  }

  return {
    violations: sortFindings(violations),
    warnings: sortFindings(warnings),
  };
}

export async function runCatalogQualityAudit(
  database: DbClient = db,
): Promise<CatalogQualityAudit> {
  const generatedAt = new Date().toISOString();
  const freshnessCutoffMs =
    Date.now() - CATALOG_OFFER_FRESHNESS_WINDOW_HOURS * 60 * 60 * 1000;

  const focusCategories = await database
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    })
    .from(categories)
    .where(inArray(categories.slug, [...CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS]));

  const categoryBySlug = new Map(
    focusCategories.map((row) => [row.slug as FocusCategorySlug, row] as const),
  );

  const missingFocusCategories = CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS.filter(
    (slug) => !categoryBySlug.has(slug),
  );

  const focusCategoryIds = focusCategories.map((row) => row.id);

  const focusProducts =
    focusCategoryIds.length > 0
      ? await database
          .select({
            id: products.id,
            slug: products.slug,
            categoryId: products.categoryId,
            imageUrl: products.imageUrl,
            imageUrls: products.imageUrls,
            specs: products.specs,
          })
          .from(products)
          .where(
            and(
              eq(products.status, "active"),
              inArray(products.categoryId, focusCategoryIds),
            ),
          )
      : [];

  const productIds = focusProducts.map((row) => row.id);

  const offerAggregates: ProductOfferAggregate[] =
    productIds.length > 0
      ? (
          await database
            .select({
              productId: offers.productId,
              totalOffers: sql<number>`count(*)::int`.as("total_offers"),
              inStockPricedOffers: sql<number>`
                coalesce(sum(case when ${offers.inStock} = true and ${offers.priceCents} is not null then 1 else 0 end), 0)::int
              `.as("in_stock_priced_offers"),
              lastCheckedAt: sql<Date | null>`max(${offers.lastCheckedAt})`.as(
                "last_checked_at",
              ),
            })
            .from(offers)
            .where(inArray(offers.productId, productIds))
            .groupBy(offers.productId)
        ).map((row) => ({
          productId: row.productId,
          totalOffers: Number(row.totalOffers ?? 0),
          inStockPricedOffers: Number(row.inStockPricedOffers ?? 0),
          lastCheckedAt: row.lastCheckedAt ? new Date(row.lastCheckedAt) : null,
        }))
      : [];

  const offerAggregateByProductId = new Map(
    offerAggregates.map((row) => [row.productId, row] as const),
  );

  const categoriesMetrics: CatalogQualityCategoryMetrics[] =
    CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS.map((slug) => {
      const category = categoryBySlug.get(slug);
      const rows = category
        ? focusProducts.filter((product) => product.categoryId === category.id)
        : [];

      const missingImageSlugs: string[] = [];
      const missingSpecSlugs: string[] = [];
      const missingOfferSlugs: string[] = [];
      const missingInStockPricedOfferSlugs: string[] = [];
      const staleOfferSlugs: string[] = [];

      let withImages = 0;
      let withSpecs = 0;
      let withAnyOffer = 0;
      let withInStockPricedOffers = 0;
      let withFreshOffers24h = 0;

      for (const product of rows) {
        const aggregate = offerAggregateByProductId.get(product.id);
        const hasImage = hasCatalogImage(product.imageUrl, product.imageUrls);
        const hasSpecs = hasSpecsObject(product.specs);
        const hasAnyOffer = (aggregate?.totalOffers ?? 0) > 0;
        const hasInStockPricedOffer = (aggregate?.inStockPricedOffers ?? 0) > 0;
        const hasFreshOffer =
          aggregate?.lastCheckedAt != null &&
          aggregate.lastCheckedAt.getTime() >= freshnessCutoffMs;

        if (hasImage) withImages += 1;
        else missingImageSlugs.push(product.slug);

        if (hasSpecs) withSpecs += 1;
        else missingSpecSlugs.push(product.slug);

        if (hasAnyOffer) withAnyOffer += 1;
        else missingOfferSlugs.push(product.slug);

        if (hasInStockPricedOffer) withInStockPricedOffers += 1;
        else missingInStockPricedOfferSlugs.push(product.slug);

        if (hasFreshOffer) {
          withFreshOffers24h += 1;
        } else if (hasAnyOffer) {
          staleOfferSlugs.push(product.slug);
        }
      }

      return {
        slug,
        name: category?.name ?? slug,
        productCount: rows.length,
        productsWithImages: withImages,
        productsWithSpecs: withSpecs,
        productsWithAnyOffer: withAnyOffer,
        productsWithInStockPricedOffers: withInStockPricedOffers,
        productsWithFreshOffers24h: withFreshOffers24h,
        productsMissingImages: rows.length - withImages,
        productsMissingSpecs: rows.length - withSpecs,
        productsWithoutAnyOffer: rows.length - withAnyOffer,
        productsWithoutInStockPricedOffers: rows.length - withInStockPricedOffers,
        productsWithStaleOffers24h: staleOfferSlugs.length,
        sampleMissingImageSlugs: uniqueSorted(missingImageSlugs),
        sampleMissingSpecSlugs: uniqueSorted(missingSpecSlugs),
        sampleMissingOfferSlugs: uniqueSorted(missingOfferSlugs),
        sampleMissingInStockPricedOfferSlugs: uniqueSorted(
          missingInStockPricedOfferSlugs,
        ),
        sampleStaleOfferSlugs: uniqueSorted(staleOfferSlugs),
      };
    });

  const activePlants = await database
    .select({
      slug: plants.slug,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      sources: plants.sources,
      description: plants.description,
    })
    .from(plants)
    .where(eq(plants.status, "active"));

  const missingPlantImageSlugs: string[] = [];
  const missingPlantSourceSlugs: string[] = [];
  const missingPlantDescriptionSlugs: string[] = [];

  let plantsWithImages = 0;
  let plantsWithSources = 0;
  let plantsWithDescription = 0;

  for (const plant of activePlants) {
    const hasImage = hasCatalogImage(plant.imageUrl, plant.imageUrls);
    const hasSources = toStringArray(plant.sources).length > 0;
    const hasDescription = hasNonEmptyText(plant.description);

    if (hasImage) plantsWithImages += 1;
    else missingPlantImageSlugs.push(plant.slug);

    if (hasSources) plantsWithSources += 1;
    else missingPlantSourceSlugs.push(plant.slug);

    if (hasDescription) plantsWithDescription += 1;
    else missingPlantDescriptionSlugs.push(plant.slug);
  }

  const plantsMetrics: CatalogQualityPlantsMetrics = {
    total: activePlants.length,
    withImages: plantsWithImages,
    withSources: plantsWithSources,
    withDescription: plantsWithDescription,
    missingImages: activePlants.length - plantsWithImages,
    missingSources: activePlants.length - plantsWithSources,
    missingDescription: activePlants.length - plantsWithDescription,
    sampleMissingImageSlugs: uniqueSorted(missingPlantImageSlugs),
    sampleMissingSourceSlugs: uniqueSorted(missingPlantSourceSlugs),
    sampleMissingDescriptionSlugs: uniqueSorted(missingPlantDescriptionSlugs),
  };

  const offerFreshnessRow = (
    await database
      .select({
        totalOffers: sql<number>`count(*)::int`.as("total_offers"),
        activeCatalogOffers: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' then 1 else 0 end), 0)::int
        `.as("active_catalog_offers"),
        offersCheckedWithinWindow: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.lastCheckedAt} is not null and ${offers.lastCheckedAt} >= now() - (${CATALOG_OFFER_FRESHNESS_WINDOW_HOURS} * interval '1 hour') then 1 else 0 end), 0)::int
        `.as("offers_checked_within_window"),
        offersMissingCheckTimestamp: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.lastCheckedAt} is null then 1 else 0 end), 0)::int
        `.as("offers_missing_check_timestamp"),
        inStockPricedOffers: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.inStock} = true and ${offers.priceCents} is not null then 1 else 0 end), 0)::int
        `.as("in_stock_priced_offers"),
      })
      .from(offers)
      .innerJoin(products, eq(offers.productId, products.id))
  )[0];

  const totalOffers = Number(offerFreshnessRow?.totalOffers ?? 0);
  const activeCatalogOffers = Number(offerFreshnessRow?.activeCatalogOffers ?? 0);
  const offersCheckedWithinWindow = Number(
    offerFreshnessRow?.offersCheckedWithinWindow ?? 0,
  );
  const offersMissingCheckTimestamp = Number(
    offerFreshnessRow?.offersMissingCheckTimestamp ?? 0,
  );
  const inStockPricedOffers = Number(offerFreshnessRow?.inStockPricedOffers ?? 0);

  const offersMetrics: CatalogQualityOfferFreshnessMetrics = {
    totalOffers,
    activeCatalogOffers,
    inactiveCatalogOffers: Math.max(0, totalOffers - activeCatalogOffers),
    offersCheckedWithinWindow,
    offersStaleOrMissingCheck: Math.max(0, activeCatalogOffers - offersCheckedWithinWindow),
    offersMissingCheckTimestamp,
    inStockPricedOffers,
    freshnessWindowHours: CATALOG_OFFER_FRESHNESS_WINDOW_HOURS,
    freshnessSloPercent: CATALOG_OFFER_FRESHNESS_SLO_PERCENT,
    freshnessPercent: toPercent({
      numerator: offersCheckedWithinWindow,
      denominator: activeCatalogOffers,
    }),
  };

  const findings = buildCatalogQualityFindings({
    missingFocusCategories,
    categories: categoriesMetrics,
    plants: plantsMetrics,
    offers: offersMetrics,
  });

  return {
    generatedAt,
    focusCategorySlugs: CATALOG_QUALITY_FOCUS_CATEGORY_SLUGS,
    missingFocusCategories,
    categories: categoriesMetrics,
    plants: plantsMetrics,
    offers: offersMetrics,
    findings,
    hasViolations: findings.violations.length > 0,
    hasWarnings: findings.warnings.length > 0,
  };
}
