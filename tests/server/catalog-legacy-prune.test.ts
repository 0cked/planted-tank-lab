import { describe, expect, test } from "vitest";

import { buildLegacyCatalogPrunePlan } from "@/server/catalog/legacy-prune";

describe("legacy catalog prune plan", () => {
  test("includes direct legacy offers and offers tied to legacy products", () => {
    const plan = buildLegacyCatalogPrunePlan({
      targets: {
        productIds: ["product-legacy"],
        plantIds: ["plant-legacy"],
        offerIds: ["offer-direct"],
      },
      offerRows: [
        { id: "offer-direct", productId: "product-keep" },
        { id: "offer-linked", productId: "product-legacy" },
        { id: "offer-keep", productId: "product-keep" },
      ],
    });

    expect(plan.productIdsToDelete).toEqual(["product-legacy"]);
    expect(plan.plantIdsToDelete).toEqual(["plant-legacy"]);
    expect(plan.offerIdsToDelete).toEqual(["offer-direct", "offer-linked"]);
    expect(plan.refreshOfferSummaryProductIds).toEqual(["product-keep"]);
  });

  test("dedupes and sorts ids for deterministic output", () => {
    const plan = buildLegacyCatalogPrunePlan({
      targets: {
        productIds: ["p2", "p1", "p1"],
        plantIds: ["z", "a", "a"],
        offerIds: ["o3", "o1", "o1"],
      },
      offerRows: [
        { id: "o2", productId: "p1" },
        { id: "o3", productId: "k1" },
        { id: "o1", productId: "k2" },
      ],
    });

    expect(plan.productIdsToDelete).toEqual(["p1", "p2"]);
    expect(plan.plantIdsToDelete).toEqual(["a", "z"]);
    expect(plan.offerIdsToDelete).toEqual(["o1", "o2", "o3"]);
    expect(plan.refreshOfferSummaryProductIds).toEqual(["k1", "k2"]);
  });

  test("does not schedule offer-summary refresh for deleted products", () => {
    const plan = buildLegacyCatalogPrunePlan({
      targets: {
        productIds: ["product-legacy"],
        plantIds: [],
        offerIds: ["offer-direct-legacy-product"],
      },
      offerRows: [
        {
          id: "offer-direct-legacy-product",
          productId: "product-legacy",
        },
      ],
    });

    expect(plan.offerIdsToDelete).toEqual(["offer-direct-legacy-product"]);
    expect(plan.refreshOfferSummaryProductIds).toEqual([]);
  });
});
