import { describe, expect, it } from "vitest";

import {
  STOCKING_SPECIES,
  calculateStockingLevel,
  getStockingStatus,
} from "@/lib/stocking-calculator";

describe("stocking calculator", () => {
  it("includes a predefined species list between 30 and 40 entries", () => {
    expect(STOCKING_SPECIES.length).toBeGreaterThanOrEqual(30);
    expect(STOCKING_SPECIES.length).toBeLessThanOrEqual(40);
  });

  it("estimates roughly 40% stocking for 10 neon tetras in a 20 gallon tank", () => {
    const result = calculateStockingLevel({
      tankVolumeGallons: 20,
      selections: [{ speciesId: "neon-tetra", quantity: 10 }],
    });

    expect(result.stockingPercent).toBeCloseTo(37.5, 1);
    expect(result.status).toBe("green");
  });

  it("pushes into red when adding five angelfish on top of 10 neon tetras", () => {
    const result = calculateStockingLevel({
      tankVolumeGallons: 20,
      selections: [
        { speciesId: "neon-tetra", quantity: 10 },
        { speciesId: "angelfish", quantity: 5 },
      ],
    });

    expect(result.stockingPercent).toBeGreaterThan(120);
    expect(result.status).toBe("red");
    expect(result.warnings.some((warning) => warning.code === "overstocked")).toBe(true);
  });

  it("flags shrimp risk when aggressive fish are combined with shrimp", () => {
    const result = calculateStockingLevel({
      tankVolumeGallons: 30,
      selections: [
        { speciesId: "cherry-shrimp", quantity: 12 },
        { speciesId: "tiger-barb", quantity: 8 },
      ],
    });

    const shrimpRiskWarning = result.warnings.find((warning) => warning.code === "shrimp-risk");

    expect(shrimpRiskWarning).toBeDefined();
    expect(shrimpRiskWarning?.severity).toBe("critical");
  });

  it("warns when schooling fish are below their minimum group size", () => {
    const result = calculateStockingLevel({
      tankVolumeGallons: 20,
      selections: [{ speciesId: "rummy-nose-tetra", quantity: 3 }],
    });

    expect(result.warnings.some((warning) => warning.code.startsWith("school-size:"))).toBe(true);
  });

  it("sanitizes invalid values and ignores unknown species", () => {
    const result = calculateStockingLevel({
      tankVolumeGallons: Number.NaN,
      selections: [
        { speciesId: "unknown-species", quantity: 10 },
        { speciesId: "neon-tetra", quantity: Number.NaN },
      ],
    });

    expect(result.tankVolumeGallons).toBe(0);
    expect(result.selections).toHaveLength(0);
    expect(result.stockingPercent).toBe(0);
  });

  it("classifies status thresholds", () => {
    expect(getStockingStatus(85)).toBe("green");
    expect(getStockingStatus(95)).toBe("yellow");
    expect(getStockingStatus(140)).toBe("red");
  });
});
