import { describe, expect, test } from "vitest";

import {
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
});
