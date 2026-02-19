import { describe, expect, it } from "vitest";

import { computeControlGridDimensions } from "@/lib/visual/substrate-control-grid";

describe("computeControlGridDimensions", () => {
  it("uses about twelve nodes for compact tanks", () => {
    const grid = computeControlGridDimensions(14, 14);

    expect(grid.cols).toBe(4);
    expect(grid.rows).toBe(3);
    expect(grid.cols * grid.rows).toBe(12);
  });

  it("scales node count up as tank footprint grows", () => {
    const compact = computeControlGridDimensions(20, 10);
    const medium = computeControlGridDimensions(36, 18);
    const large = computeControlGridDimensions(72, 30);

    expect(medium.cols * medium.rows).toBeGreaterThan(compact.cols * compact.rows);
    expect(large.cols * large.rows).toBeGreaterThan(medium.cols * medium.rows);
  });

  it("keeps node counts within stable bounds", () => {
    const tiny = computeControlGridDimensions(8, 8);
    const huge = computeControlGridDimensions(120, 48);

    expect(tiny.cols).toBeGreaterThanOrEqual(4);
    expect(tiny.rows).toBeGreaterThanOrEqual(3);
    expect(huge.cols).toBeLessThanOrEqual(9);
    expect(huge.rows).toBeLessThanOrEqual(6);
  });
});
