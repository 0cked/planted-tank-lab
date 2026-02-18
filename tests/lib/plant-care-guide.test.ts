import { describe, expect, it } from "vitest";

import {
  buildPlantCareMetrics,
  buildPlantCompatibleEquipmentLinks,
  careToneClasses,
} from "@/lib/plants/care-guide";

describe("plant care guide helpers", () => {
  it("maps care metrics to easy/moderate/demanding indicator tones", () => {
    const demanding = buildPlantCareMetrics({
      difficulty: "hard",
      lightDemand: "high",
      co2Demand: "high",
      growthRate: "fast",
      placement: "background",
      beginnerFriendly: false,
    });

    expect(demanding.find((metric) => metric.id === "difficulty")?.tone).toBe("demanding");
    expect(demanding.find((metric) => metric.id === "light")?.tone).toBe("demanding");
    expect(demanding.find((metric) => metric.id === "co2")?.tone).toBe("demanding");
    expect(demanding.find((metric) => metric.id === "growth")?.tone).toBe("demanding");

    const easy = buildPlantCareMetrics({
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "low",
      growthRate: "slow",
      placement: "foreground",
      beginnerFriendly: true,
    });

    expect(easy.find((metric) => metric.id === "difficulty")?.tone).toBe("easy");
    expect(easy.find((metric) => metric.id === "light")?.tone).toBe("easy");
    expect(easy.find((metric) => metric.id === "co2")?.tone).toBe("easy");
    expect(easy.find((metric) => metric.id === "growth")?.tone).toBe("easy");
    expect(easy.find((metric) => metric.id === "placement")?.tone).toBe("easy");
  });

  it("builds compatible equipment links from plant requirements", () => {
    const highDemand = buildPlantCompatibleEquipmentLinks({
      difficulty: "hard",
      lightDemand: "high",
      co2Demand: "high",
      growthRate: "fast",
      placement: "background",
      beginnerFriendly: false,
    });

    expect(highDemand.map((link) => link.categorySlug)).toEqual(
      expect.arrayContaining(["light", "co2", "fertilizer", "substrate", "test_kit"]),
    );
    expect(highDemand.find((link) => link.categorySlug === "light")?.href).toContain("parMin=80");

    const lowDemand = buildPlantCompatibleEquipmentLinks({
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "low",
      growthRate: "slow",
      placement: "foreground",
      beginnerFriendly: true,
    });

    expect(lowDemand.map((link) => link.categorySlug)).toEqual(
      expect.arrayContaining(["light", "substrate"]),
    );
    expect(lowDemand.find((link) => link.categorySlug === "co2")).toBeUndefined();
    expect(lowDemand.find((link) => link.categorySlug === "test_kit")).toBeUndefined();
    expect(lowDemand.find((link) => link.categorySlug === "light")?.href).toContain("parMax=40");
  });

  it("returns stable tone class palettes for all indicator states", () => {
    expect(careToneClasses("easy").bar).toContain("emerald");
    expect(careToneClasses("moderate").bar).toContain("amber");
    expect(careToneClasses("demanding").bar).toContain("rose");
  });
});
