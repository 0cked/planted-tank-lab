import { describe, expect, test } from "vitest";

import {
  isNonProductionCatalogSlug,
  shouldPlantBeActiveForCatalogPolicy,
  shouldProductBeActiveForCatalogPolicy,
} from "@/server/catalog/activation-policy";

describe("catalog activation policy helpers", () => {
  test("activates focus products only when specs and in-stock priced offers exist", () => {
    expect(
      shouldProductBeActiveForCatalogPolicy({
        inStockPricedOffers: 1,
        specs: { volume_gal: 20 },
      }),
    ).toBe(true);

    expect(
      shouldProductBeActiveForCatalogPolicy({
        inStockPricedOffers: 0,
        specs: { volume_gal: 20 },
      }),
    ).toBe(false);

    expect(
      shouldProductBeActiveForCatalogPolicy({
        inStockPricedOffers: 2,
        specs: {},
      }),
    ).toBe(false);
  });

  test("activates plants only when media + sources + description are present", () => {
    expect(
      shouldPlantBeActiveForCatalogPolicy({
        imageUrl: "https://example.com/plant.jpg",
        imageUrls: [],
        sources: ["https://example.com/citation"],
        description: "Healthy foreground plant.",
      }),
    ).toBe(true);

    expect(
      shouldPlantBeActiveForCatalogPolicy({
        imageUrl: null,
        imageUrls: [],
        sources: ["https://example.com/citation"],
        description: "Healthy foreground plant.",
      }),
    ).toBe(false);

    expect(
      shouldPlantBeActiveForCatalogPolicy({
        imageUrl: "https://example.com/plant.jpg",
        imageUrls: [],
        sources: [],
        description: "Healthy foreground plant.",
      }),
    ).toBe(false);

    expect(
      shouldPlantBeActiveForCatalogPolicy({
        imageUrl: "https://example.com/plant.jpg",
        imageUrls: [],
        sources: ["https://example.com/citation"],
        description: "  ",
      }),
    ).toBe(false);
  });

  test("detects non-production catalog artifact slugs", () => {
    expect(isNonProductionCatalogSlug("vitest-product-123")).toBe(true);
    expect(isNonProductionCatalogSlug("test-item-abc")).toBe(true);
    expect(isNonProductionCatalogSlug("my-e2e-plant")).toBe(true);
    expect(isNonProductionCatalogSlug("playwright-seed-row")).toBe(true);

    expect(isNonProductionCatalogSlug("fluval-plant-3-0-24")).toBe(false);
    expect(isNonProductionCatalogSlug("standard-20-gallon-long")).toBe(false);
    expect(isNonProductionCatalogSlug(null)).toBe(false);
  });
});
