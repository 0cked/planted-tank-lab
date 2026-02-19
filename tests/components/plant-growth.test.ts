import { describe, expect, it } from "vitest";

import {
  growthTimelineFromSliderIndex,
  growthTimelineSliderIndex,
  normalizeGrowthTimelineMonths,
  resolvePlantGrowthScale,
} from "@/lib/visual/plant-growth";
import type { VisualAsset } from "@/lib/visual/types";

const FAST_STEM_PLANT: VisualAsset = {
  id: "plant-fast-stem",
  type: "plant",
  sourceMode: "catalog_plant",
  name: "Rotala rotundifolia",
  slug: "rotala-rotundifolia",
  categorySlug: "plants",
  categoryName: "Plants",
  imageUrl: null,
  widthIn: 3,
  heightIn: 8,
  depthIn: 3,
  defaultScale: 1,
  sku: null,
  priceCents: null,
  estimatedUnitPriceCents: null,
  offerId: null,
  goUrl: null,
  purchaseUrl: null,
  plantProfile: {
    difficulty: "easy",
    lightDemand: "medium",
    co2Demand: "low",
    growthRate: "fast",
    placement: "background",
    tempMinF: null,
    tempMaxF: null,
    phMin: null,
    phMax: null,
    ghMin: null,
    ghMax: null,
    khMin: null,
    khMax: null,
    maxHeightIn: 14,
  },
};

const SLOW_ANUBIAS: VisualAsset = {
  ...FAST_STEM_PLANT,
  id: "plant-slow-anubias",
  name: "Anubias barteri nana",
  slug: "anubias-barteri-nana",
  plantProfile: {
    ...FAST_STEM_PLANT.plantProfile!,
    growthRate: "slow",
    placement: "midground",
  },
};

const CARPET_PLANT: VisualAsset = {
  ...FAST_STEM_PLANT,
  id: "plant-carpet",
  name: "Micranthemum Monte Carlo",
  slug: "micranthemum-monte-carlo",
  plantProfile: {
    ...FAST_STEM_PLANT.plantProfile!,
    growthRate: "fast",
    placement: "foreground",
  },
};

describe("plant growth projection", () => {
  it("normalizes timeline values to 1/3/6 month milestones", () => {
    expect(normalizeGrowthTimelineMonths(undefined)).toBe(1);
    expect(normalizeGrowthTimelineMonths(0)).toBe(1);
    expect(normalizeGrowthTimelineMonths(2.7)).toBe(3);
    expect(normalizeGrowthTimelineMonths(6)).toBe(6);
    expect(growthTimelineSliderIndex(3)).toBe(1);
    expect(growthTimelineFromSliderIndex(2)).toBe(6);
  });

  it("grows fast stem plants much taller by 6 months", () => {
    const monthOne = resolvePlantGrowthScale({
      asset: FAST_STEM_PLANT,
      timelineMonths: 1,
      plantTypeHint: "stem",
    });
    const monthSix = resolvePlantGrowthScale({
      asset: FAST_STEM_PLANT,
      timelineMonths: 6,
      plantTypeHint: "stem",
    });

    expect(monthOne).toEqual({ x: 1, y: 1, z: 1 });
    expect(monthSix.y).toBeGreaterThan(monthSix.x);
    expect(monthSix.y).toBeGreaterThanOrEqual(2);
    expect(monthSix.y).toBeLessThanOrEqual(3);
  });

  it("keeps slow growers close to ~1.2x at 6 months", () => {
    const monthSix = resolvePlantGrowthScale({
      asset: SLOW_ANUBIAS,
      timelineMonths: 6,
      plantTypeHint: "rosette",
    });

    expect(monthSix.x).toBeGreaterThan(1.1);
    expect(monthSix.y).toBeGreaterThan(1.1);
    expect(monthSix.y).toBeLessThan(1.25);
  });

  it("spreads carpet plants across XZ more than Y", () => {
    const monthSix = resolvePlantGrowthScale({
      asset: CARPET_PLANT,
      timelineMonths: 6,
      plantTypeHint: "carpet",
    });

    expect(monthSix.x).toBeGreaterThan(monthSix.y);
    expect(monthSix.z).toBeGreaterThan(monthSix.y);
    expect(monthSix.x).toBeGreaterThan(2);
  });

  it("interpolates growth over time", () => {
    const monthThree = resolvePlantGrowthScale({
      asset: FAST_STEM_PLANT,
      timelineMonths: 3,
      plantTypeHint: "stem",
    });
    const monthSix = resolvePlantGrowthScale({
      asset: FAST_STEM_PLANT,
      timelineMonths: 6,
      plantTypeHint: "stem",
    });

    expect(monthThree.y).toBeGreaterThan(1);
    expect(monthThree.y).toBeLessThan(monthSix.y);
  });
});
