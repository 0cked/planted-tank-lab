import { describe, expect, it } from "vitest";

import { applySubstrateMaterialBrush } from "@/components/builder/visual/scene-utils";
import {
  createFlatSubstrateMaterialGrid,
  normalizeSubstrateMaterialGrid,
  substrateMaterialGridToArray,
  substrateMaterialTypeFromCode,
} from "@/lib/visual/substrate-materials";
import { SUBSTRATE_HEIGHTFIELD_RESOLUTION } from "@/lib/visual/substrate";

describe("substrate material grids", () => {
  it("creates a flat soil grid by default", () => {
    const grid = createFlatSubstrateMaterialGrid();

    expect(grid).toBeInstanceOf(Uint8Array);
    expect(grid.length).toBe(SUBSTRATE_HEIGHTFIELD_RESOLUTION * SUBSTRATE_HEIGHTFIELD_RESOLUTION);
    expect(new Set(grid).size).toBe(1);
    expect(grid[0]).toBe(0);
  });

  it("normalizes persisted numeric values into material codes", () => {
    const normalized = normalizeSubstrateMaterialGrid([0, 1, 2, 7, -4]);

    expect(normalized[0]).toBe(0);
    expect(normalized[1]).toBe(1);
    expect(normalized[2]).toBe(2);
    expect(normalized[3]).toBe(0);
    expect(normalized[4]).toBe(0);
    expect(substrateMaterialTypeFromCode(normalized[2] ?? 0)).toBe("gravel");
  });

  it("paints localized material zones with the brush", () => {
    const initial = createFlatSubstrateMaterialGrid("soil");

    const next = applySubstrateMaterialBrush({
      materialGrid: initial,
      xNorm: 0.5,
      zNorm: 0.85,
      brushSize: 0.2,
      strength: 1,
      materialType: "sand",
    });

    const centerBackIndex =
      Math.round(0.85 * (SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1)) * SUBSTRATE_HEIGHTFIELD_RESOLUTION +
      Math.round(0.5 * (SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1));
    const frontCenterIndex =
      Math.round(0.1 * (SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1)) * SUBSTRATE_HEIGHTFIELD_RESOLUTION +
      Math.round(0.5 * (SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1));

    expect(next[centerBackIndex]).toBe(1);
    expect(next[frontCenterIndex]).toBe(0);

    const uniqueCodes = new Set(substrateMaterialGridToArray(next));
    expect(uniqueCodes.has(0)).toBe(true);
    expect(uniqueCodes.has(1)).toBe(true);
  });
});
