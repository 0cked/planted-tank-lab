import { describe, expect, it } from "vitest";

import {
  calculateSubstrateVolume,
  convertLength,
  estimateSubstrateWeight,
} from "@/lib/substrate-calculator";

describe("substrate calculator", () => {
  it("calculates sloped substrate volume in liters", () => {
    const result = calculateSubstrateVolume({
      length: 36,
      width: 18,
      frontDepth: 1,
      backDepth: 3,
      unit: "in",
    });

    expect(result.averageDepthIn).toBeCloseTo(2, 5);
    expect(result.volumeCubicIn).toBeCloseTo(1296, 5);
    expect(result.volumeLiters).toBeCloseTo(21.24, 2);
  });

  it("supports centimeter input", () => {
    const inchResult = calculateSubstrateVolume({
      length: 36,
      width: 18,
      frontDepth: 1,
      backDepth: 3,
      unit: "in",
    });

    const centimeterResult = calculateSubstrateVolume({
      length: 91.44,
      width: 45.72,
      frontDepth: 2.54,
      backDepth: 7.62,
      unit: "cm",
    });

    expect(centimeterResult.volumeLiters).toBeCloseTo(inchResult.volumeLiters, 4);
  });

  it("estimates substrate weight by material density", () => {
    const estimates = estimateSubstrateWeight(21.24);

    const aquasoil = estimates.find((entry) => entry.key === "aquasoil");
    const sand = estimates.find((entry) => entry.key === "sand");

    expect(aquasoil?.pounds).toBeCloseTo(35.1, 1);
    expect(sand?.pounds).toBeCloseTo(74.9, 1);
  });

  it("converts units between inches and centimeters", () => {
    expect(convertLength(10, "in", "cm")).toBeCloseTo(25.4, 6);
    expect(convertLength(25.4, "cm", "in")).toBeCloseTo(10, 6);
  });
});
