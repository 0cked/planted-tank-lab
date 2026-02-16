import { describe, expect, it } from "vitest";

import {
  getProceduralPlantModel,
  PROCEDURAL_PLANT_TYPES,
  proceduralPlantSeedFromString,
} from "@/components/builder/visual/ProceduralPlants";

function firstPositionSnapshot(model: ReturnType<typeof getProceduralPlantModel>): number[] {
  const position = model.geometry.getAttribute("position");
  const count = Math.min(18, position.array.length);
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    values.push(Number(position.array[index]?.toFixed(4) ?? 0));
  }

  return values;
}

describe("procedural plant generators", () => {
  it.each(PROCEDURAL_PLANT_TYPES)("builds %s geometry with bounds and vertex colors", (type) => {
    const model = getProceduralPlantModel({
      type,
      seed: proceduralPlantSeedFromString(`plant-${type}`),
    });

    const position = model.geometry.getAttribute("position");
    const color = model.geometry.getAttribute("color");

    expect(position.count).toBeGreaterThan(40);
    expect(color.count).toBe(position.count);
    expect(model.bounds.x).toBeGreaterThan(0.05);
    expect(model.bounds.y).toBeGreaterThan(0.05);
    expect(model.bounds.z).toBeGreaterThan(0.05);
  });

  it("is deterministic for the same seed", () => {
    const seed = proceduralPlantSeedFromString("java-fern-id");
    const first = getProceduralPlantModel({ type: "rosette", seed });
    const second = getProceduralPlantModel({ type: "rosette", seed });

    expect(first).toBe(second);
    expect(firstPositionSnapshot(first)).toEqual(firstPositionSnapshot(second));
  });

  it("produces different geometry for different seeds", () => {
    const first = getProceduralPlantModel({
      type: "moss",
      seed: proceduralPlantSeedFromString("moss-1"),
    });
    const second = getProceduralPlantModel({
      type: "moss",
      seed: proceduralPlantSeedFromString("moss-2"),
    });

    expect(firstPositionSnapshot(first)).not.toEqual(firstPositionSnapshot(second));
  });
});
