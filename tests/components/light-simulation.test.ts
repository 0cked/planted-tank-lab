import { describe, expect, it } from "vitest";

import {
  clampLightMountHeightIn,
  estimateParAtSubstratePoint,
  resolveLightSimulationSource,
  writeParHeatmapColor,
} from "@/lib/visual/light-simulation";
import type { VisualAsset } from "@/lib/visual/types";

const BASE_LIGHT_ASSET: VisualAsset = {
  id: "light-1",
  type: "product",
  sourceMode: "catalog_product",
  name: "Chihiros WRGB II 60 50W LED",
  slug: "chihiros-wrgb-ii-60",
  categorySlug: "light",
  categoryName: "Lighting",
  imageUrl: null,
  widthIn: 24,
  heightIn: 1,
  depthIn: 4,
  defaultScale: 1,
  sku: null,
  priceCents: null,
  estimatedUnitPriceCents: null,
  offerId: null,
  goUrl: null,
  purchaseUrl: null,
  specs: {
    wattage: 50,
    light_type: "LED",
  },
  tags: ["planted", "freshwater"],
};

describe("light simulation helpers", () => {
  it("resolves wattage + fixture type from selected light products", () => {
    const source = resolveLightSimulationSource(BASE_LIGHT_ASSET);

    expect(source).not.toBeNull();
    expect(source?.wattage).toBe(50);
    expect(source?.fixtureType).toBe("led");
  });

  it("clamps light mounting height to supported bounds", () => {
    expect(clampLightMountHeightIn(undefined)).toBe(4);
    expect(clampLightMountHeightIn(-3)).toBe(0);
    expect(clampLightMountHeightIn(30)).toBe(24);
    expect(clampLightMountHeightIn(8.5)).toBe(8.5);
  });

  it("produces higher PAR for closer, shallower substrate points", () => {
    const source = resolveLightSimulationSource(BASE_LIGHT_ASSET);
    expect(source).not.toBeNull();

    const nearCenterPar = estimateParAtSubstratePoint({
      source: source!,
      pointXIn: 0,
      pointYIn: 3,
      pointZIn: 0,
      tankHeightIn: 16,
      lightMountHeightIn: 4,
      waterLineYIn: 15,
    });

    const farDeepPar = estimateParAtSubstratePoint({
      source: source!,
      pointXIn: 11,
      pointYIn: 1,
      pointZIn: 8,
      tankHeightIn: 16,
      lightMountHeightIn: 8,
      waterLineYIn: 15,
    });

    expect(nearCenterPar).toBeGreaterThan(farDeepPar);
    expect(nearCenterPar).toBeGreaterThan(15);
  });

  it("maps PAR thresholds into blue, green, yellow, red heatmap colors", () => {
    const color = { r: 0, g: 0, b: 0 };

    writeParHeatmapColor(10, color);
    expect(color.b).toBeGreaterThan(color.g);

    writeParHeatmapColor(45, color);
    expect(color.g).toBeGreaterThan(color.b);

    writeParHeatmapColor(75, color);
    expect(color.r).toBeGreaterThan(0.8);
    expect(color.g).toBeGreaterThan(0.6);

    writeParHeatmapColor(130, color);
    expect(color.r).toBeGreaterThan(color.g);
    expect(color.r).toBeGreaterThan(color.b);
  });
});
