import { describe, expect, it } from "vitest";

import {
  getProceduralRockModel,
  getProceduralWoodModel,
  PROCEDURAL_ROCK_TYPES,
  PROCEDURAL_WOOD_TYPES,
  proceduralHardscapeSeedFromString,
} from "@/components/builder/visual/ProceduralHardscape";

function firstPositionSnapshot(model: ReturnType<typeof getProceduralRockModel>): number[] {
  const position = model.geometry.getAttribute("position");
  const count = Math.min(18, position.array.length);
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    values.push(Number(position.array[index]?.toFixed(4) ?? 0));
  }

  return values;
}

describe("procedural hardscape generators", () => {
  it.each(PROCEDURAL_ROCK_TYPES)("builds %s rock geometry with bounds and vertex colors", (type) => {
    const model = getProceduralRockModel({
      type,
      seed: proceduralHardscapeSeedFromString(`rock-${type}`),
    });

    const position = model.geometry.getAttribute("position");
    const color = model.geometry.getAttribute("color");

    expect(position.count).toBeGreaterThan(60);
    expect(color.count).toBe(position.count);
    expect(model.bounds.x).toBeGreaterThan(0.05);
    expect(model.bounds.y).toBeGreaterThan(0.05);
    expect(model.bounds.z).toBeGreaterThan(0.05);
  });

  it.each(PROCEDURAL_WOOD_TYPES)("builds %s driftwood geometry with bounds and vertex colors", (type) => {
    const model = getProceduralWoodModel({
      type,
      seed: proceduralHardscapeSeedFromString(`wood-${type}`),
    });

    const position = model.geometry.getAttribute("position");
    const color = model.geometry.getAttribute("color");

    expect(position.count).toBeGreaterThan(100);
    expect(color.count).toBe(position.count);
    expect(model.bounds.x).toBeGreaterThan(0.05);
    expect(model.bounds.y).toBeGreaterThan(0.05);
    expect(model.bounds.z).toBeGreaterThan(0.05);
  });

  it("is deterministic for identical seeds", () => {
    const seed = proceduralHardscapeSeedFromString("seiryu-stone-id");
    const first = getProceduralRockModel({ type: "jagged", seed });
    const second = getProceduralRockModel({ type: "jagged", seed });

    expect(first).toBe(second);
    expect(firstPositionSnapshot(first)).toEqual(firstPositionSnapshot(second));
  });

  it("produces distinct silhouettes for rock variants", () => {
    const seed = proceduralHardscapeSeedFromString("shared-rock-seed");
    const rounded = getProceduralRockModel({ type: "rounded", seed });
    const jagged = getProceduralRockModel({ type: "jagged", seed });

    expect(firstPositionSnapshot(rounded)).not.toEqual(firstPositionSnapshot(jagged));
  });

  it("produces distinct silhouettes for wood variants", () => {
    const seed = proceduralHardscapeSeedFromString("shared-wood-seed");
    const spider = getProceduralWoodModel({ type: "spider", seed });
    const flowing = getProceduralWoodModel({ type: "flowing", seed });

    expect(firstPositionSnapshot(spider)).not.toEqual(firstPositionSnapshot(flowing));
  });
});
