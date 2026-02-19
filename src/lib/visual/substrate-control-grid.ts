import type { SubstrateHeightfield } from "@/components/builder/visual/types";
import {
  normalizeSubstrateHeightfield,
  SUBSTRATE_HEIGHTFIELD_RESOLUTION,
} from "@/lib/visual/substrate";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeEdgeInset(value: number | undefined): number {
  return clamp(Number.isFinite(value) ? (value as number) : 0, 0, 0.45);
}

function controlIndexToNormalizedPosition(index: number, count: number, edgeInsetNorm: number): number {
  if (count <= 1) return 0.5;
  const t = index / (count - 1);
  return edgeInsetNorm + t * (1 - edgeInsetNorm * 2);
}

function normalizedPositionToControlIndex(valueNorm: number, count: number, edgeInsetNorm: number): number {
  if (count <= 1) return 0;
  const usableNorm = Math.max(1e-4, 1 - edgeInsetNorm * 2);
  const localNorm = clamp((valueNorm - edgeInsetNorm) / usableNorm, 0, 1);
  return localNorm * (count - 1);
}

function controlHeightAt(params: {
  heights: number[];
  cols: number;
  rows: number;
  col: number;
  row: number;
}): number {
  const safeCol = clamp(params.col, 0, params.cols - 1);
  const safeRow = clamp(params.row, 0, params.rows - 1);
  return params.heights[safeRow * params.cols + safeCol] ?? 0;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const tt = t * t;
  const ttt = tt * t;
  return (
    0.5 *
    ((2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * tt +
      (-p0 + 3 * p1 - 3 * p2 + p3) * ttt)
  );
}

/**
 * Compute the number of control-point columns and rows for a given tank footprint.
 * Targets ~12 dots for small tanks, scaling up for larger footprints.
 */
export function computeControlGridDimensions(
  widthIn: number,
  depthIn: number,
): { cols: number; rows: number } {
  const cols = clamp(Math.ceil(widthIn / 7) + 1, 4, 9);
  const rows = clamp(Math.ceil(depthIn / 9) + 1, 3, 6);
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
  edgeInsetXNorm?: number;
  edgeInsetZNorm?: number;
}): number[] {
  const { cols, rows, tankHeightIn } = params;
  const heightfield = normalizeSubstrateHeightfield(params.heightfield, tankHeightIn);
  const edgeInsetXNorm = normalizeEdgeInset(params.edgeInsetXNorm);
  const edgeInsetZNorm = normalizeEdgeInset(params.edgeInsetZNorm);
  const res = SUBSTRATE_HEIGHTFIELD_RESOLUTION;
  const maxIdx = res - 1;
  const heights: number[] = [];

  for (let r = 0; r < rows; r++) {
    const nz = controlIndexToNormalizedPosition(r, rows, edgeInsetZNorm);
    for (let c = 0; c < cols; c++) {
      const nx = controlIndexToNormalizedPosition(c, cols, edgeInsetXNorm);

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

      const depthIn =
        v00 * (1 - tx) * (1 - tz) +
        v10 * tx * (1 - tz) +
        v01 * (1 - tx) * tz +
        v11 * tx * tz;

      heights.push(depthIn);
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
  edgeInsetXNorm?: number;
  edgeInsetZNorm?: number;
}): SubstrateHeightfield {
  const { heights, cols, rows, tankHeightIn } = params;
  const edgeInsetXNorm = normalizeEdgeInset(params.edgeInsetXNorm);
  const edgeInsetZNorm = normalizeEdgeInset(params.edgeInsetZNorm);
  const res = SUBSTRATE_HEIGHTFIELD_RESOLUTION;
  const total = res * res;
  const result = new Float32Array(total);
  const minDepth = 0.2;
  const maxDepth = Math.max(minDepth, tankHeightIn * 0.62);

  for (let z = 0; z < res; z++) {
    const nz = z / (res - 1);
    // Map to control grid row (supports optional edge insets)
    const fr = normalizedPositionToControlIndex(nz, rows, edgeInsetZNorm);
    const r1 = Math.floor(fr);
    const tr = fr - r1;
    const r0 = r1 - 1;
    const r2 = r1 + 1;
    const r3 = r1 + 2;

    for (let x = 0; x < res; x++) {
      const nx = x / (res - 1);
      // Map to control grid column (supports optional edge insets)
      const fc = normalizedPositionToControlIndex(nx, cols, edgeInsetXNorm);
      const c1 = Math.floor(fc);
      const tc = fc - c1;
      const c0 = c1 - 1;
      const c2 = c1 + 1;
      const c3 = c1 + 2;

      const row0 = catmullRom(
        controlHeightAt({ heights, cols, rows, col: c0, row: r0 }),
        controlHeightAt({ heights, cols, rows, col: c1, row: r0 }),
        controlHeightAt({ heights, cols, rows, col: c2, row: r0 }),
        controlHeightAt({ heights, cols, rows, col: c3, row: r0 }),
        tc,
      );
      const row1 = catmullRom(
        controlHeightAt({ heights, cols, rows, col: c0, row: r1 }),
        controlHeightAt({ heights, cols, rows, col: c1, row: r1 }),
        controlHeightAt({ heights, cols, rows, col: c2, row: r1 }),
        controlHeightAt({ heights, cols, rows, col: c3, row: r1 }),
        tc,
      );
      const row2 = catmullRom(
        controlHeightAt({ heights, cols, rows, col: c0, row: r2 }),
        controlHeightAt({ heights, cols, rows, col: c1, row: r2 }),
        controlHeightAt({ heights, cols, rows, col: c2, row: r2 }),
        controlHeightAt({ heights, cols, rows, col: c3, row: r2 }),
        tc,
      );
      const row3 = catmullRom(
        controlHeightAt({ heights, cols, rows, col: c0, row: r3 }),
        controlHeightAt({ heights, cols, rows, col: c1, row: r3 }),
        controlHeightAt({ heights, cols, rows, col: c2, row: r3 }),
        controlHeightAt({ heights, cols, rows, col: c3, row: r3 }),
        tc,
      );

      const heightIn = catmullRom(row0, row1, row2, row3, tr);

      result[z * res + x] = clamp(heightIn, minDepth, maxDepth);
    }
  }

  return result;
}
