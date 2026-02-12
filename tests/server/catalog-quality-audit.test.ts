import { describe, expect, test } from "vitest";

import {
  buildCatalogQualityFindings,
  type CatalogQualityCategoryMetrics,
  type CatalogQualityOfferFreshnessMetrics,
  type CatalogQualityPlantsMetrics,
} from "@/server/catalog/quality-audit";

function categoryMetrics(overrides: Partial<CatalogQualityCategoryMetrics>): CatalogQualityCategoryMetrics {
  return {
    slug: "tank",
    name: "Tank",
    productCount: 3,
    productsWithImages: 3,
    productsWithSpecs: 3,
    productsWithAnyOffer: 3,
    productsWithInStockPricedOffers: 3,
    productsWithFreshOffers24h: 3,
    productsMissingImages: 0,
    productsMissingSpecs: 0,
    productsWithoutAnyOffer: 0,
    productsWithoutInStockPricedOffers: 0,
    productsWithStaleOffers24h: 0,
    sampleMissingImageSlugs: [],
    sampleMissingSpecSlugs: [],
    sampleMissingOfferSlugs: [],
    sampleMissingInStockPricedOfferSlugs: [],
    sampleStaleOfferSlugs: [],
    ...overrides,
  };
}

function plantsMetrics(overrides: Partial<CatalogQualityPlantsMetrics>): CatalogQualityPlantsMetrics {
  return {
    total: 10,
    withImages: 10,
    withSources: 10,
    withDescription: 10,
    missingImages: 0,
    missingSources: 0,
    missingDescription: 0,
    sampleMissingImageSlugs: [],
    sampleMissingSourceSlugs: [],
    sampleMissingDescriptionSlugs: [],
    ...overrides,
  };
}

function offerMetrics(
  overrides: Partial<CatalogQualityOfferFreshnessMetrics>,
): CatalogQualityOfferFreshnessMetrics {
  return {
    totalOffers: 100,
    offersCheckedWithinWindow: 100,
    offersStaleOrMissingCheck: 0,
    offersMissingCheckTimestamp: 0,
    inStockPricedOffers: 90,
    freshnessWindowHours: 24,
    freshnessSloPercent: 95,
    freshnessPercent: 100,
    ...overrides,
  };
}

describe("buildCatalogQualityFindings", () => {
  test("returns deterministic violations and warnings for completeness/freshness gaps", () => {
    const findings = buildCatalogQualityFindings({
      missingFocusCategories: ["hardscape"],
      categories: [
        categoryMetrics({
          slug: "light",
          name: "Light",
          productsWithInStockPricedOffers: 0,
          productsWithoutInStockPricedOffers: 3,
          productsMissingImages: 2,
          productsMissingSpecs: 1,
          productsWithoutAnyOffer: 1,
          productsWithStaleOffers24h: 2,
        }),
      ],
      plants: plantsMetrics({
        missingImages: 2,
        missingSources: 1,
        missingDescription: 3,
      }),
      offers: offerMetrics({
        totalOffers: 50,
        offersCheckedWithinWindow: 10,
        offersStaleOrMissingCheck: 40,
        offersMissingCheckTimestamp: 5,
        freshnessPercent: 20,
      }),
    });

    expect(findings.violations.map((finding) => finding.code)).toEqual([
      "focus_category_missing",
      "focus_category_no_priced_offers",
      "offer_freshness_below_slo",
    ]);

    expect(findings.warnings.map((finding) => finding.code)).toEqual([
      "focus_category_missing_images",
      "focus_category_missing_offers",
      "focus_category_missing_specs",
      "focus_category_stale_offers",
      "offers_missing_last_checked_at",
      "plants_missing_description",
      "plants_missing_images",
      "plants_missing_sources",
    ]);
  });

  test("returns no findings for healthy metrics", () => {
    const findings = buildCatalogQualityFindings({
      missingFocusCategories: [],
      categories: [
        categoryMetrics({ slug: "tank", name: "Tank" }),
        categoryMetrics({ slug: "light", name: "Light" }),
        categoryMetrics({ slug: "filter", name: "Filter" }),
        categoryMetrics({ slug: "substrate", name: "Substrate" }),
        categoryMetrics({ slug: "hardscape", name: "Hardscape" }),
      ],
      plants: plantsMetrics({}),
      offers: offerMetrics({}),
    });

    expect(findings.violations).toEqual([]);
    expect(findings.warnings).toEqual([]);
  });
});
