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
    expect(resolved.previewImagePath).toBe("/visual-assets/plants/test-fern.png");
    expect(resolved.category).toBe("plant");
    expect(resolved.fallbackKind).toBe("plant");
    expect(resolved.proceduralPlantType).toBe("rosette");
    expect(resolved.proceduralRockType).toBeNull();
    expect(resolved.proceduralWoodType).toBeNull();
  });

  it("falls back to procedural geometry when the GLB path has failed", () => {
    const asset = buildAsset({ id: "unknown-db-id", slug: "java-fern", type: "plant" });
    const resolved = useAsset(asset, { failedPath: "/visual-assets/plants/test-fern.glb" });

    expect(resolved.glbPath).toBeNull();
    expect(resolved.previewImagePath).toBe("/visual-assets/plants/test-fern.png");
    expect(resolved.fallbackKind).toBe("plant");
    expect(resolved.proceduralPlantType).toBe("rosette");
  });

  it("resolves a manifest rock variant for hardscape assets", () => {
    const asset = buildAsset({
      id: "2fdd4f61-8b91-4a56-930f-d4f15e8e4c1a",
      type: "product",
      sourceMode: "catalog_product",
      name: "Seiryu Stone",
      slug: "seiryu-stone",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "rock",
      plantProfile: null,
      widthIn: 8,
      heightIn: 6,
      depthIn: 5,
      defaultScale: 1,
      priceCents: 2400,
      sku: "HS-SEIRYU",
      offerId: "offer-1",
      goUrl: "/go/offer-1",
      purchaseUrl: "/go/offer-1",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("2fdd4f61-8b91-4a56-930f-d4f15e8e4c1a");
    expect(resolved.glbPath).toBe("/visual-assets/hardscape/seiryu-1.glb");
    expect(resolved.fallbackKind).toBe("rock");
    expect(resolved.proceduralRockType).toBe("jagged");
    expect(resolved.proceduralWoodType).toBeNull();
  });

  it("resolves a manifest wood variant for spiderwood hardscape assets", () => {
    const asset = buildAsset({
      id: "9f7fd6f9-74aa-4b3a-a6f2-ebbe7af11d60",
      type: "product",
      sourceMode: "catalog_product",
      name: "Spider Wood Branch",
      slug: "spider-wood-branch",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "spider_wood",
      plantProfile: null,
      widthIn: 10,
      heightIn: 7,
      depthIn: 4,
      defaultScale: 0.88,
      priceCents: 2800,
      sku: "HW-SPIDER",
      offerId: "offer-2",
      goUrl: "/go/offer-2",
      purchaseUrl: "/go/offer-2",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("9f7fd6f9-74aa-4b3a-a6f2-ebbe7af11d60");
    expect(resolved.glbPath).toBe("/visual-assets/hardscape/spiderwood-1.glb");
    expect(resolved.fallbackKind).toBe("wood");
    expect(resolved.proceduralWoodType).toBe("spider");
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
    expect(resolved.proceduralPlantType).toBeNull();
    expect(resolved.proceduralRockType).toBeNull();
    expect(resolved.proceduralWoodType).toBe("spider");
  });

  it("uses manifest-configured wood fallback types when no GLB path is present", () => {
    const asset = buildAsset({
      id: "manzanita-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "Manzanita Branch",
      slug: "manzanita-branch",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "manzanita_wood",
      plantProfile: null,
      widthIn: 8,
      heightIn: 7,
      depthIn: 5,
      defaultScale: 1,
      priceCents: 1800,
      sku: "HW-2",
      offerId: "offer-2",
      goUrl: "/go/offer-2",
      purchaseUrl: "/go/offer-2",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("product:manzanita-branch");
    expect(resolved.glbPath).toBeNull();
    expect(resolved.previewImagePath).toBeNull();
    expect(resolved.fallbackKind).toBe("wood");
    expect(resolved.proceduralWoodType).toBe("flowing");
  });

  it("infers floating fallback type from placement when manifest is absent", () => {
    const asset = buildAsset({
      id: "floating-plant-id",
      slug: "red-root-floater",
      name: "Red Root Floater",
    });

    if (!asset.plantProfile) {
      throw new Error("test asset is missing plant profile");
    }

    const resolved = useAsset({
      ...asset,
      plantProfile: {
        ...asset.plantProfile,
        placement: "floating",
      },
    });

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.proceduralPlantType).toBe("floating");
  });

  it("infers stem fallback type for common background stem plants", () => {
    const asset = buildAsset({
      id: "rotala-id",
      slug: "rotala-rotundifolia",
      name: "Rotala Rotundifolia",
    });

    if (!asset.plantProfile) {
      throw new Error("test asset is missing plant profile");
    }

    const resolved = useAsset({
      ...asset,
      plantProfile: {
        ...asset.plantProfile,
        placement: "background",
      },
    });

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.proceduralPlantType).toBe("stem");
  });
});
