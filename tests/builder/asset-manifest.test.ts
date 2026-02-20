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
    expect(resolved.previewImagePath).toBeNull();
    expect(resolved.category).toBe("plant");
    expect(resolved.widthIn).toBe(10);
    expect(resolved.heightIn).toBe(12);
    expect(resolved.depthIn).toBe(8);
    expect(resolved.defaultScale).toBe(1);
    expect(resolved.fallbackKind).toBe("plant");
    expect(resolved.proceduralPlantType).toBe("rosette");
    expect(resolved.proceduralRockType).toBeNull();
    expect(resolved.proceduralWoodType).toBeNull();
  });

  it("falls back to procedural geometry when the GLB path has failed", () => {
    const asset = buildAsset({ id: "unknown-db-id", slug: "java-fern", type: "plant" });
    const resolved = useAsset(asset, { failedPath: "/visual-assets/plants/test-fern.glb" });

    expect(resolved.glbPath).toBeNull();
    expect(resolved.previewImagePath).toBeNull();
    expect(resolved.fallbackKind).toBe("plant");
    expect(resolved.proceduralPlantType).toBe("rosette");
  });

  it("resolves a manifest stem plant variant by slug key", () => {
    const asset = buildAsset({
      id: "unknown-db-id",
      slug: "ludwigia-repens",
      name: "Ludwigia repens",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("plant:ludwigia-repens");
    expect(resolved.glbPath).toBe("/visual-assets/plants/ludwigia-repens.glb");
    expect(resolved.previewImagePath).toBe("/visual-assets/plants/ludwigia-repens.webp");
    expect(resolved.fallbackKind).toBe("plant");
    expect(resolved.proceduralPlantType).toBe("stem");
  });

  it("resolves newly added plant assets with thumbnail previews", () => {
    const asset = buildAsset({
      id: "unknown-db-id",
      slug: "amazon-sword",
      name: "Amazon Sword",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("plant:amazon-sword");
    expect(resolved.glbPath).toBe("/visual-assets/plants/amazon-sword.glb");
    expect(resolved.previewImagePath).toBe("/visual-assets/plants/amazon-sword.webp");
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
    expect(resolved.widthIn).toBe(13);
    expect(resolved.heightIn).toBe(15);
    expect(resolved.depthIn).toBe(9);
    expect(resolved.defaultScale).toBe(1);
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

  it("defaults non-manifest plants to adult-size scale", () => {
    const asset = buildAsset({
      id: "non-manifest-plant-id",
      slug: "myriophyllum-tall",
      name: "Myriophyllum sp. Tall",
      defaultScale: 0.65,
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.defaultScale).toBe(1);
    expect(resolved.heightIn).toBe(12);
    expect(resolved.widthIn).toBeGreaterThan(4);
    expect(resolved.depthIn).toBeGreaterThan(3);
  });

  it("infers 15-inch spiderwood dimensions when a manifest key is missing", () => {
    const asset = buildAsset({
      id: "non-manifest-spiderwood-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "Spiderwood XL Piece",
      slug: "custom-spiderwood-xl",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "spider_wood",
      plantProfile: null,
      widthIn: 9,
      heightIn: 7,
      depthIn: 4,
      defaultScale: 0.9,
      priceCents: 2400,
      sku: "SPIDER-CUSTOM",
      offerId: "offer-spider",
      goUrl: "/go/offer-spider",
      purchaseUrl: "/go/offer-spider",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.heightIn).toBe(15);
    expect(resolved.widthIn).toBe(11.1);
    expect(resolved.depthIn).toBe(8.7);
    expect(resolved.defaultScale).toBe(1);
  });

  it("converts hardscape dimensions that look metric and keeps realistic inch sizing", () => {
    const asset = buildAsset({
      id: "metric-hardscape-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "River Stone Cluster",
      slug: "river-stone-cluster",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "stone",
      plantProfile: null,
      widthIn: 38,
      heightIn: 22,
      depthIn: 24,
      defaultScale: 0.9,
      priceCents: 2600,
      sku: "RIVER-STONE-CLUSTER",
      offerId: "offer-river-stone-cluster",
      goUrl: "/go/offer-river-stone-cluster",
      purchaseUrl: "/go/offer-river-stone-cluster",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.fallbackKind).toBe("rock");
    expect(resolved.heightIn).toBe(10.8);
    expect(resolved.widthIn).toBe(15);
    expect(resolved.depthIn).toBe(11.4);
    expect(resolved.defaultScale).toBe(1);
  });

  it("matches manifest entries with normalized lookup keys", () => {
    const asset = buildAsset({
      id: "non-manifest-spider-alias-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "Spider Wood Branch",
      slug: "spiderwoodbranch",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: "spider_wood",
      plantProfile: null,
      widthIn: 8,
      heightIn: 6,
      depthIn: 4,
      defaultScale: 0.88,
      priceCents: 2800,
      sku: "HW-SPIDER",
      offerId: "offer-2",
      goUrl: "/go/offer-2",
      purchaseUrl: "/go/offer-2",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBe("product:spider-wood-branch");
    expect(resolved.heightIn).toBe(15);
    expect(resolved.widthIn).toBe(13);
    expect(resolved.depthIn).toBe(9);
    expect(resolved.defaultScale).toBe(1);
  });

  it("infers wood fallback from spiderwood naming even without material type", () => {
    const asset = buildAsset({
      id: "non-manifest-spider-name-id",
      type: "product",
      sourceMode: "catalog_product",
      name: "Spiderwood Branch",
      slug: "custom-spiderwood-branch-xl",
      categorySlug: "hardscape",
      categoryName: "Hardscape",
      materialType: null,
      plantProfile: null,
      widthIn: 4,
      heightIn: 3,
      depthIn: 2,
      defaultScale: 0.8,
      priceCents: 2600,
      sku: "SPIDER-NOMATERIAL",
      offerId: "offer-spider-name",
      goUrl: "/go/offer-spider-name",
      purchaseUrl: "/go/offer-spider-name",
    });

    const resolved = useAsset(asset);

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.fallbackKind).toBe("wood");
    expect(resolved.proceduralWoodType).toBe("spider");
    expect(resolved.heightIn).toBe(15);
    expect(resolved.defaultScale).toBe(1);
  });

  it("normalizes metric-like plant heights to realistic adult inches for foreground plants", () => {
    const asset = buildAsset({
      id: "foreground-metric-height-id",
      name: "Anubias nana petite",
      slug: "anubias-nana-petite",
    });

    if (!asset.plantProfile) {
      throw new Error("test asset is missing plant profile");
    }

    const resolved = useAsset({
      ...asset,
      plantProfile: {
        ...asset.plantProfile,
        placement: "foreground",
        maxHeightIn: 36,
      },
    });

    expect(resolved.manifestKey).toBeNull();
    expect(resolved.heightIn).toBe(6);
    expect(resolved.widthIn).toBeGreaterThan(4);
    expect(resolved.defaultScale).toBe(1);
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

  it("infers stem fallback type for background stem plants without manifest entries", () => {
    const asset = buildAsset({
      id: "rotala-id",
      slug: "rotala-hra",
      name: "Rotala HRA",
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
