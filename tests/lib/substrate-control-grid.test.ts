import { describe, expect, it } from "vitest";

import {
  computeControlGridDimensions,
  interpolateHeightfieldFromControlPoints,
  sampleControlPointHeights,
} from "@/lib/visual/substrate-control-grid";
import {
  createFlatSubstrateHeightfield,
  sampleSubstrateHeightfieldDepth,
} from "@/lib/visual/substrate";

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

  it("samples control point heights in depth inches (not normalized units)", () => {
    const tankHeightIn = 18;
    const flat = createFlatSubstrateHeightfield({ tankHeightIn, depthIn: 1.6 });

    const heights = sampleControlPointHeights({
      heightfield: flat,
      cols: 4,
      rows: 3,
      tankHeightIn,
    });

    expect(heights.length).toBe(12);
    for (const height of heights) {
      expect(height).toBeCloseTo(1.6, 3);
    }
  });

  it("rebuilds a valid inch-based heightfield from control points", () => {
    const rebuilt = interpolateHeightfieldFromControlPoints({
      heights: new Array(12).fill(2.4),
      cols: 4,
      rows: 3,
      tankHeightIn: 18,
    });

    const centerDepth = sampleSubstrateHeightfieldDepth({
      heightfield: rebuilt,
      xNorm: 0.5,
      zNorm: 0.5,
      tankHeightIn: 18,
    });

    expect(centerDepth).toBeCloseTo(2.4, 2);
  });

  it("keeps control points aligned when using inset node grids", () => {
    const tankHeightIn = 18;
    const sourceHeights = [1.2, 2, 2.8, 3.6];

    const rebuilt = interpolateHeightfieldFromControlPoints({
      heights: sourceHeights,
      cols: 2,
      rows: 2,
      tankHeightIn,
      edgeInsetXNorm: 0.1,
      edgeInsetZNorm: 0.1,
    });

    const sampled = sampleControlPointHeights({
      heightfield: rebuilt,
      cols: 2,
      rows: 2,
      tankHeightIn,
      edgeInsetXNorm: 0.1,
      edgeInsetZNorm: 0.1,
    });

    expect(sampled[0]).toBeCloseTo(sourceHeights[0] ?? 0, 1);
    expect(sampled[1]).toBeCloseTo(sourceHeights[1] ?? 0, 1);
    expect(sampled[2]).toBeCloseTo(sourceHeights[2] ?? 0, 1);
    expect(sampled[3]).toBeCloseTo(sourceHeights[3] ?? 0, 1);
  });
});
