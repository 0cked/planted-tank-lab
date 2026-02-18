import type { SubstrateHeightfield } from "@/components/builder/visual/types";
import { SUBSTRATE_HEIGHTFIELD_RESOLUTION } from "@/lib/visual/substrate";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the number of control-point columns and rows for a given tank footprint.
 * Targets ~12 dots for a small cube, up to ~24 for a large tank.
 */
export function computeControlGridDimensions(
  widthIn: number,
  depthIn: number,
): { cols: number; rows: number } {
  const cols = clamp(Math.ceil(widthIn / 6), 3, 6);
  const rows = clamp(Math.ceil(depthIn / 5), 2, 4);
  return { cols, rows };
}

/**
 * Sample the current heightfield at each control-point grid position.
 * Returns an array of height values (in inches) for each control point,
 * ordered row-major (row 0 col 0, row 0 col 1, ...).
 */
export function sampleControlPointHeights(params: {
  heightfield: SubstrateHeightfield;
  cols: number;
  rows: number;
  tankHeightIn: number;
}): number[] {
  const { heightfield, cols, rows, tankHeightIn } = params;
  const res = SUBSTRATE_HEIGHTFIELD_RESOLUTION;
  const maxIdx = res - 1;
  const heights: number[] = [];

  for (let r = 0; r < rows; r++) {
    const nz = rows > 1 ? r / (rows - 1) : 0.5;
    for (let c = 0; c < cols; c++) {
      const nx = cols > 1 ? c / (cols - 1) : 0.5;

      // Bilinear sample from the heightfield
      const fx = nx * maxIdx;
      const fz = nz * maxIdx;
      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const x1 = Math.min(x0 + 1, maxIdx);
      const z1 = Math.min(z0 + 1, maxIdx);
      const tx = fx - x0;
      const tz = fz - z0;

      const v00 = heightfield[z0 * res + x0] ?? 0;
      const v10 = heightfield[z0 * res + x1] ?? 0;
      const v01 = heightfield[z1 * res + x0] ?? 0;
      const v11 = heightfield[z1 * res + x1] ?? 0;

      const normalized =
        v00 * (1 - tx) * (1 - tz) +
        v10 * tx * (1 - tz) +
        v01 * (1 - tx) * tz +
        v11 * tx * tz;

      // Convert normalized [0..1] to inches (0 = no substrate, tankHeightIn * fraction)
      heights.push(normalized * tankHeightIn * 0.35);
    }
  }

  return heights;
}

/**
 * Rebuild a full heightfield from sparse control-point heights using bilinear interpolation.
 */
export function interpolateHeightfieldFromControlPoints(params: {
  heights: number[];
  cols: number;
  rows: number;
  tankHeightIn: number;
}): SubstrateHeightfield {
  const { heights, cols, rows, tankHeightIn } = params;
  const res = SUBSTRATE_HEIGHTFIELD_RESOLUTION;
  const total = res * res;
  const result = new Float32Array(total);
  const maxScale = tankHeightIn * 0.35;

  for (let z = 0; z < res; z++) {
    const nz = z / (res - 1);
    // Map to control grid row
    const fr = nz * (rows - 1);
    const r0 = Math.floor(fr);
    const r1 = Math.min(r0 + 1, rows - 1);
    const tr = fr - r0;

    for (let x = 0; x < res; x++) {
      const nx = x / (res - 1);
      // Map to control grid col
      const fc = nx * (cols - 1);
      const c0 = Math.floor(fc);
      const c1 = Math.min(c0 + 1, cols - 1);
      const tc = fc - c0;

      const h00 = heights[r0 * cols + c0] ?? 0;
      const h10 = heights[r0 * cols + c1] ?? 0;
      const h01 = heights[r1 * cols + c0] ?? 0;
      const h11 = heights[r1 * cols + c1] ?? 0;

      const heightIn =
        h00 * (1 - tc) * (1 - tr) +
        h10 * tc * (1 - tr) +
        h01 * (1 - tc) * tr +
        h11 * tc * tr;

      // Convert back to normalized [0..1]
      result[z * res + x] = maxScale > 0 ? clamp(heightIn / maxScale, 0, 1) : 0;
    }
  }

  return result;
}
