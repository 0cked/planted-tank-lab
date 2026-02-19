import { describe, expect, it } from "vitest";

import { applySubstrateBrush } from "@/components/builder/visual/scene-utils";
import {
  createFlatSubstrateHeightfield,
  SUBSTRATE_HEIGHTFIELD_RESOLUTION,
} from "@/lib/visual/substrate";

const TANK_HEIGHT_IN = 18;

function toGridIndex(xNorm: number, zNorm: number): number {
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;
  const xIndex = Math.max(0, Math.min(maxIndex, Math.round(xNorm * maxIndex)));
  const zIndex = Math.max(0, Math.min(maxIndex, Math.round(zNorm * maxIndex)));
  return zIndex * SUBSTRATE_HEIGHTFIELD_RESOLUTION + xIndex;
}

function valueAt(heightfield: Float32Array, index: number): number {
  return heightfield[index] ?? 0;
}

describe("applySubstrateBrush", () => {
  it("raises terrain locally without affecting distant cells", () => {
    const source = createFlatSubstrateHeightfield({
      tankHeightIn: TANK_HEIGHT_IN,
      depthIn: 1.6,
    });

    const raised = applySubstrateBrush({
      heightfield: source,
      mode: "raise",
      xNorm: 0.18,
      zNorm: 0.5,
      brushSize: 0.12,
      strength: 1,
      tankHeightIn: TANK_HEIGHT_IN,
    });

    const nearIndex = toGridIndex(0.18, 0.5);
    const farIndex = toGridIndex(0.88, 0.5);

    expect(valueAt(raised, nearIndex) - valueAt(source, nearIndex)).toBeGreaterThan(0.01);
    expect(Math.abs(valueAt(raised, farIndex) - valueAt(source, farIndex))).toBeLessThan(0.0001);
  });

  it("uses Gaussian falloff so center cells change more than edge cells", () => {
    const source = createFlatSubstrateHeightfield({
      tankHeightIn: TANK_HEIGHT_IN,
      depthIn: 1.6,
    });

    const raised = applySubstrateBrush({
      heightfield: source,
      mode: "raise",
      xNorm: 0.5,
      zNorm: 0.5,
      brushSize: 0.25,
      strength: 1,
      tankHeightIn: TANK_HEIGHT_IN,
    });

    const centerIndex = toGridIndex(0.5, 0.5);
    const midIndex = toGridIndex(0.62, 0.5);
    const edgeIndex = toGridIndex(0.73, 0.5);

    const centerDelta = valueAt(raised, centerIndex) - valueAt(source, centerIndex);
    const midDelta = valueAt(raised, midIndex) - valueAt(source, midIndex);
    const edgeDelta = valueAt(raised, edgeIndex) - valueAt(source, edgeIndex);

    expect(centerDelta).toBeGreaterThan(midDelta);
    expect(midDelta).toBeGreaterThan(edgeDelta);
    expect(edgeDelta).toBeGreaterThan(0);
  });

  it("smooth mode blends high points toward neighboring depth", () => {
    const source = createFlatSubstrateHeightfield({
      tankHeightIn: TANK_HEIGHT_IN,
      depthIn: 1.6,
    });

    const centerX = Math.round((SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1) * 0.5);
    const centerZ = Math.round((SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1) * 0.5);
    const centerIndex = centerZ * SUBSTRATE_HEIGHTFIELD_RESOLUTION + centerX;
    const eastIndex = centerZ * SUBSTRATE_HEIGHTFIELD_RESOLUTION + Math.min(SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1, centerX + 1);

    source[centerIndex] = 4.6;

    const smoothed = applySubstrateBrush({
      heightfield: source,
      mode: "smooth",
      xNorm: 0.5,
      zNorm: 0.5,
      brushSize: 0.2,
      strength: 1,
      tankHeightIn: TANK_HEIGHT_IN,
    });

    expect(valueAt(smoothed, centerIndex)).toBeLessThan(valueAt(source, centerIndex));
    expect(valueAt(smoothed, eastIndex)).toBeGreaterThan(valueAt(source, eastIndex));
  });

  it("erode mode lowers terrain and reduces steep transitions", () => {
    const source = createFlatSubstrateHeightfield({
      tankHeightIn: TANK_HEIGHT_IN,
      depthIn: 1.6,
    });

    const centerX = Math.round((SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1) * 0.5);
    const centerZ = Math.round((SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1) * 0.5);
    const centerIndex = centerZ * SUBSTRATE_HEIGHTFIELD_RESOLUTION + centerX;
    const eastIndex = centerZ * SUBSTRATE_HEIGHTFIELD_RESOLUTION + Math.min(SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1, centerX + 1);

    source[centerIndex] = 4.6;

    const eroded = applySubstrateBrush({
      heightfield: source,
      mode: "erode",
      xNorm: 0.5,
      zNorm: 0.5,
      brushSize: 0.2,
      strength: 1,
      tankHeightIn: TANK_HEIGHT_IN,
    });

    const contrastBefore = Math.abs(valueAt(source, centerIndex) - valueAt(source, eastIndex));
    const contrastAfter = Math.abs(valueAt(eroded, centerIndex) - valueAt(eroded, eastIndex));

    expect(valueAt(eroded, centerIndex)).toBeLessThan(valueAt(source, centerIndex));
    expect(contrastAfter).toBeLessThan(contrastBefore);
  });
});
