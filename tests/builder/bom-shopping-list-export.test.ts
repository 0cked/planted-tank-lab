import { describe, expect, it } from "vitest";

import {
  formatBomShoppingList,
  type BomLine,
} from "@/components/builder/visual/builder-page-utils";
import type { VisualAsset } from "@/components/builder/visual/types";

function createAsset(overrides: Partial<VisualAsset> = {}): VisualAsset {
  return {
    id: "asset-1",
    type: "product",
    sourceMode: "catalog_product",
    name: "Asset",
    slug: "asset",
    categorySlug: "equipment",
    categoryName: "Equipment",
    imageUrl: null,
    widthIn: 1,
    heightIn: 1,
    depthIn: 1,
    defaultScale: 1,
    sku: "SKU-1",
    priceCents: 12_999,
    estimatedUnitPriceCents: null,
    offerId: "offer-1",
    goUrl: "/go/offer-1",
    purchaseUrl: "/go/offer-1",
    retailerLinks: [{ label: "Buy from Aqua Depot", url: "/go/offer-1" }],
    materialType: null,
    tags: [],
    bagVolumeLiters: null,
    specs: null,
    plantProfile: null,
    ...overrides,
  };
}

function createLine(overrides: Partial<BomLine> = {}): BomLine {
  return {
    key: "line-1",
    categorySlug: "equipment",
    categoryName: "Equipment",
    quantity: 1,
    asset: createAsset(),
    type: "product",
    ...overrides,
  };
}

describe("formatBomShoppingList", () => {
  it("includes required shopping list fields for each BOM line", () => {
    const lines: BomLine[] = [
      createLine({
        quantity: 2,
        categoryName: "Filters",
        asset: createAsset({
          name: "Canister Filter 307",
          categoryName: "Filters",
          priceCents: 15_999,
          goUrl: "/go/filter-offer",
          retailerLinks: [{ label: "Buy from Green Aqua", url: "/go/filter-offer" }],
        }),
      }),
    ];

    const shoppingList = formatBomShoppingList({
      lines,
      totalCents: 31_998,
      baseUrl: "https://plantedtanklab.com",
      generatedAt: new Date("2026-02-18T05:00:00.000Z"),
    });

    expect(shoppingList).toContain("Planted Tank Lab Shopping List");
    expect(shoppingList).toContain("Generated: 2026-02-18");
    expect(shoppingList).toContain("1. Canister Filter 307");
    expect(shoppingList).toContain("Category: Filters");
    expect(shoppingList).toContain("Best price: $159.99");
    expect(shoppingList).toContain("Retailer: Green Aqua");
    expect(shoppingList).toContain("Affiliate link: https://plantedtanklab.com/go/filter-offer");
    expect(shoppingList).toContain("Total estimated cost: $319.98");
  });

  it("falls back gracefully when offer metadata is unavailable", () => {
    const lines: BomLine[] = [
      createLine({
        asset: createAsset({
          name: "Java Fern",
          type: "plant",
          sourceMode: "catalog_plant",
          categorySlug: "plants",
          categoryName: "Plants",
          sku: null,
          priceCents: null,
          estimatedUnitPriceCents: null,
          offerId: null,
          goUrl: null,
          purchaseUrl: null,
          retailerLinks: [],
        }),
        type: "plant",
        categorySlug: "plants",
        categoryName: "Plants",
      }),
    ];

    const shoppingList = formatBomShoppingList({
      lines,
      totalCents: 0,
      generatedAt: new Date("2026-02-18T05:00:00.000Z"),
    });

    expect(shoppingList).toContain("Best price: —");
    expect(shoppingList).toContain("Retailer: No retailer listed");
    expect(shoppingList).toContain("Affiliate link: No affiliate link available");
    expect(shoppingList).toContain("Total estimated cost: $0.00");
  });
});
