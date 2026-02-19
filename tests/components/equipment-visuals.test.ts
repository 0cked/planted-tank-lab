import { describe, expect, it } from "vitest";

import {
  resolveEquipmentVisualAssets,
  resolveEquipmentVisualLayout,
} from "@/components/builder/visual/EquipmentVisuals";
import type { VisualAsset } from "@/components/builder/visual/types";

function createEquipmentAsset(params: {
  id: string;
  categorySlug: string;
  name: string;
}): VisualAsset {
  return {
    id: params.id,
    type: "product",
    sourceMode: "catalog_product",
    name: params.name,
    slug: params.id,
    categorySlug: params.categorySlug,
    categoryName: params.categorySlug,
    imageUrl: null,
    widthIn: 5,
    heightIn: 5,
    depthIn: 5,
    defaultScale: 1,
    sku: null,
    priceCents: null,
    estimatedUnitPriceCents: null,
    offerId: null,
    goUrl: null,
    purchaseUrl: null,
    tags: [],
  };
}

describe("equipment visuals", () => {
  it("maps selected equipment assets into visualization slots by category", () => {
    const assets = [
      createEquipmentAsset({ id: "filter-main", categorySlug: "filter", name: "Canister Filter" }),
      createEquipmentAsset({ id: "light-main", categorySlug: "light", name: "LED Fixture" }),
      createEquipmentAsset({ id: "co2-main", categorySlug: "co2", name: "CO2 Kit" }),
      createEquipmentAsset({ id: "heater-main", categorySlug: "heater", name: "Heater" }),
      createEquipmentAsset({ id: "stand-main", categorySlug: "stand", name: "Cabinet Stand" }),
    ];

    const slots = resolveEquipmentVisualAssets(assets);

    expect(slots.filter?.id).toBe("filter-main");
    expect(slots.light?.id).toBe("light-main");
    expect(slots.co2?.id).toBe("co2-main");
    expect(slots.heater?.id).toBe("heater-main");
    expect(slots.others.map((asset) => asset.id)).toEqual(["stand-main"]);
  });

  it("treats co2 aliases as the CO2 equipment slot", () => {
    const assets = [
      createEquipmentAsset({
        id: "co2-alias",
        categorySlug: "co2-system",
        name: "Inline CO2 System",
      }),
    ];

    const slots = resolveEquipmentVisualAssets(assets);

    expect(slots.co2?.id).toBe("co2-alias");
    expect(slots.filter).toBeNull();
    expect(slots.light).toBeNull();
    expect(slots.heater).toBeNull();
    expect(slots.others).toHaveLength(0);
  });

  it("positions the light fixture based on configurable mount height", () => {
    const dims = {
      widthIn: 40,
      heightIn: 16,
      depthIn: 20,
    };

    const lowMount = resolveEquipmentVisualLayout({
      dims,
      lightMountHeightIn: 2,
    });
    const highMount = resolveEquipmentVisualLayout({
      dims,
      lightMountHeightIn: 10,
    });

    expect(lowMount.lightAnchor[1]).toBeGreaterThan(lowMount.waterLineY);
    expect(highMount.lightAnchor[1]).toBeGreaterThan(lowMount.lightAnchor[1]);
    expect(highMount.backWallZ).toBeLessThan(0);
  });
});
