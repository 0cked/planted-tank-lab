import { describe, expect, it } from "vitest";

import { AQUASCAPING_STYLE_GUIDE } from "@/lib/guides/aquascaping-styles";

describe("aquascaping styles guide content", () => {
  it("covers the five required styles", () => {
    expect(AQUASCAPING_STYLE_GUIDE).toHaveLength(5);

    const styleNames = new Set(AQUASCAPING_STYLE_GUIDE.map((style) => style.name));
    expect(styleNames.has("Nature Aquarium (Amano)")).toBe(true);
    expect(styleNames.has("Dutch")).toBe(true);
    expect(styleNames.has("Iwagumi")).toBe(true);
    expect(styleNames.has("Jungle")).toBe(true);
    expect(styleNames.has("Walstad / Low-tech")).toBe(true);
  });

  it("includes core content fields and internal links for each style", () => {
    for (const style of AQUASCAPING_STYLE_GUIDE) {
      expect(style.description.trim().length).toBeGreaterThan(20);
      expect(style.keyCharacteristics.length).toBeGreaterThanOrEqual(3);
      expect(style.recommendedPlants.length).toBeGreaterThanOrEqual(3);
      expect(style.recommendedHardscape.length).toBeGreaterThanOrEqual(2);
      expect(style.exampleTankDimensions.trim().length).toBeGreaterThan(5);
      expect(style.difficulty.rating).toBeGreaterThanOrEqual(1);
      expect(style.difficulty.rating).toBeLessThanOrEqual(5);

      expect(style.buildTag.length).toBeGreaterThan(1);
      for (const plant of style.recommendedPlants) {
        expect(plant.href.startsWith("/plants?")).toBe(true);
      }
    }
  });
});
