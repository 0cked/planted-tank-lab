import { describe, expect, it } from "vitest";

import {
  buildCo2KhPhReferenceTable,
  calculateCo2PpmFromKhPh,
  calculateCo2Targets,
  convertVolume,
} from "@/lib/co2-calculator";

describe("co2 calculator", () => {
  it("converts between gallons and liters", () => {
    expect(convertVolume(20, "gal", "l")).toBeCloseTo(75.708, 3);
    expect(convertVolume(75.708, "l", "gal")).toBeCloseTo(20, 3);
  });

  it("calculates pH target and consumption estimate", () => {
    const result = calculateCo2Targets({
      volume: 20,
      volumeUnit: "gal",
      desiredPpm: 30,
      kh: 4,
    });

    expect(result.phTarget).toBeCloseTo(6.6, 1);
    expect(result.suggestedBubbleRateBps).toBeCloseTo(2, 3);
    expect(result.estimatedConsumptionGPerDay).toBeCloseTo(1.99, 2);
  });

  it("calculates ppm from KH and pH", () => {
    expect(calculateCo2PpmFromKhPh(4, 6.6)).toBeCloseTo(30.14, 2);
    expect(calculateCo2PpmFromKhPh(4, 7)).toBeCloseTo(12, 5);
  });

  it("builds the KH/pH reference table", () => {
    const rows = buildCo2KhPhReferenceTable([6.6, 7], [2, 4]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.ppmByKh[1]).toBeCloseTo(30.14, 2);
    expect(rows[1]?.ppmByKh[0]).toBeCloseTo(6, 5);
  });
});
