import { describe, expect, it } from "vitest";

import {
  calculateLightingPar,
  classifyLightingSuitability,
  classifyParBand,
} from "@/lib/lighting-calculator";

describe("lighting calculator", () => {
  it("estimates PAR for a typical LED setup", () => {
    const result = calculateLightingPar({
      wattage: 30,
      tankDepthInches: 18,
      mountingHeightInches: 4,
      lightType: "led",
    });

    expect(result.estimatedPar).toBeCloseTo(54, 1);
    expect(result.parBand).toBe("medium");
    expect(result.suitability).toBe("medium");
  });

  it("ranks LED, T5, and T8 output in that order", () => {
    const led = calculateLightingPar({
      wattage: 30,
      tankDepthInches: 18,
      mountingHeightInches: 4,
      lightType: "led",
    });

    const t5 = calculateLightingPar({
      wattage: 30,
      tankDepthInches: 18,
      mountingHeightInches: 4,
      lightType: "t5",
    });

    const t8 = calculateLightingPar({
      wattage: 30,
      tankDepthInches: 18,
      mountingHeightInches: 4,
      lightType: "t8",
    });

    expect(led.estimatedPar).toBeGreaterThan(t5.estimatedPar);
    expect(t5.estimatedPar).toBeGreaterThan(t8.estimatedPar);
  });

  it("classifies PAR ranges into low, medium, and high bands", () => {
    expect(classifyParBand(39.9)).toBe("low");
    expect(classifyParBand(40)).toBe("medium");
    expect(classifyParBand(79.99)).toBe("medium");
    expect(classifyParBand(80)).toBe("high");
  });

  it("maps PAR bands to low-tech, medium, and high-tech suitability", () => {
    expect(classifyLightingSuitability(20)).toBe("low-tech");
    expect(classifyLightingSuitability(50)).toBe("medium");
    expect(classifyLightingSuitability(95)).toBe("high-tech");
  });

  it("sanitizes invalid inputs", () => {
    const result = calculateLightingPar({
      wattage: -30,
      tankDepthInches: Number.NaN,
      mountingHeightInches: Number.POSITIVE_INFINITY,
      lightType: "led",
    });

    expect(result.estimatedPar).toBe(0);
    expect(result.parBand).toBe("low");
    expect(result.suitability).toBe("low-tech");
  });
});
