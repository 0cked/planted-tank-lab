import { describe, expect, it } from "vitest";

import type { VisualAsset } from "@/components/builder/visual/types";
import { useAsset } from "@/components/builder/visual/useAsset";

function buildAsset(overrides: Partial<VisualAsset>): VisualAsset {
  return {
    id: "asset-1",
    type: "plant",
    sourceMode: "catalog_plant",
    name: "Java Fern",
    slug: "java-fern",
    categorySlug: "plants",
    categoryName: "Plants",
    imageUrl: null,
    widthIn: 4,
    heightIn: 8,
    depthIn: 4,
    defaultScale: 0.7,
    sku: null,
    priceCents: null,
    estimatedUnitPriceCents: null,
    offerId: null,
    goUrl: null,
    purchaseUrl: "/plants/java-fern",
    retailerLinks: [],
    materialType: null,
    tags: [],
    bagVolumeLiters: null,
    specs: null,
    plantProfile: {
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "none",
      growthRate: "slow",
      placement: "midground",
      tempMinF: 68,
      tempMaxF: 82,
      phMin: 6,
      phMax: 7.5,
      ghMin: null,
      ghMax: null,
      khMin: null,
      khMax: null,
      maxHeightIn: 12,
    },
    ...overrides,
  };
}

describe("useAsset manifest resolution", () => {
  it("resolves GLB entries by typed slug key when id key is absent", () => {
    const asset = buildAsset({ id: "unknown-db-id", slug: "java-fern", type: "plant" });
    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("plant:java-fern");
    expect(resolved.glbPath).toBe("/visual-assets/plants/test-fern.glb");
    expect(resolved.category).toBe("plant");
  });

  it("falls back to procedural geometry when the GLB path has failed", () => {
    const asset = buildAsset({ id: "unknown-db-id", slug: "java-fern", type: "plant" });
    const resolved = useAsset(asset, { failedPath: "/visual-assets/plants/test-fern.glb" });

    expect(resolved.glbPath).toBeNull();
    expect(resolved.fallbackKind).toBe("plant");
  });

  it("infers wood fallback for hardscape assets without manifest entries", () => {
    const asset = buildAsset({
      id: "missing-hardscape-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "Branchwood",
      slug: "branchwood-piece",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "spider_wood",
      plantProfile: null,
      widthIn: 8,
      heightIn: 6,
      depthIn: 4,
      defaultScale: 1,
      priceCents: 1200,
      sku: "HW-1",
      offerId: "offer-1",
      goUrl: "/go/offer-1",
      purchaseUrl: "/go/offer-1",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.glbPath).toBeNull();
    expect(resolved.fallbackKind).toBe("wood");
  });
});
