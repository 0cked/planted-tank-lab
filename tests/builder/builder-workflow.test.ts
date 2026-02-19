import { describe, expect, test } from "vitest";

import { buildWorkflow, coreProgress, isStepComplete, nextRecommendedCoreStep } from "@/components/builder/builder-workflow";
import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";

const flags: BuildFlags = { hasShrimp: false };

function product(id: string): ProductSnapshot {
  return { id, name: id, slug: id, categorySlug: "x", specs: {} };
}

describe("builder workflow", () => {
  test("buildWorkflow produces core order + plants step", () => {
    const wf = buildWorkflow({
      categories: [
        { slug: "tank", name: "Tank", builderRequired: true },
        { slug: "light", name: "Light", builderRequired: true },
        { slug: "filter", name: "Filter", builderRequired: false },
        { slug: "co2", name: "CO2", builderRequired: false },
        { slug: "substrate", name: "Substrate", builderRequired: true },
        { slug: "plants", name: "Plants", builderRequired: false },
        { slug: "heater", name: "Heater", builderRequired: false },
      ],
    });

    expect(wf.core.map((s) => s.id)).toEqual([
      "tank",
      "light",
      "filter",
      "co2",
      "substrate",
      "plants",
    ]);
    expect(wf.extras.map((s) => s.id)).toEqual(["heater"]);
  });

  test("CO2 step is complete when lowTechNoCo2 is enabled", () => {
    const wf = buildWorkflow({
      categories: [
        { slug: "tank", name: "Tank", builderRequired: true },
        { slug: "co2", name: "CO2", builderRequired: false },
      ],
    });

    const state = {
      productsByCategory: {} as Record<string, ProductSnapshot | undefined>,
      plants: [] as PlantSnapshot[],
      flags,
      lowTechNoCo2: true,
    };

    const co2Step = wf.core.find((s) => s.id === "co2");
    expect(co2Step).toBeTruthy();
    expect(isStepComplete(co2Step!, state)).toBe(true);
  });

  test("nextRecommendedCoreStep returns the first incomplete step", () => {
    const wf = buildWorkflow({
      categories: [
        { slug: "tank", name: "Tank", builderRequired: true },
        { slug: "light", name: "Light", builderRequired: true },
        { slug: "substrate", name: "Substrate", builderRequired: true },
      ],
    });

    const state = {
      productsByCategory: { tank: product("tank-1") } as Record<
        string,
        ProductSnapshot | undefined
      >,
      plants: [] as PlantSnapshot[],
      flags,
      lowTechNoCo2: false,
    };

    expect(nextRecommendedCoreStep(wf.core, state)?.id).toBe("light");
    expect(coreProgress(wf.core, state)).toEqual({ done: 1, total: 4 });
  });
});

