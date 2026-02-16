import { describe, expect, it } from "vitest";

import { migratePersistedSubstrateHeightfield } from "@/stores/visual-builder-store-migrate";

describe("visual-builder-store substrate migration", () => {
  it("converts legacy substrate profiles into a 32x32 Float32Array heightfield", () => {
    const heightfield = migratePersistedSubstrateHeightfield(
      {
        heightIn: 18,
        substrateProfile: {
          leftDepthIn: 1.2,
          centerDepthIn: 3.8,
          rightDepthIn: 1.3,
          frontDepthIn: 1.1,
          backDepthIn: 3.4,
          moundHeightIn: 1.4,
          moundPosition: 0.52,
        },
      },
      18,
    );

    expect(heightfield).toBeInstanceOf(Float32Array);
    expect(heightfield.length).toBe(32 * 32);

    const center = heightfield[16 * 32 + 16] ?? 0;
    const leftEdge = heightfield[16 * 32] ?? 0;
    expect(center).toBeGreaterThan(leftEdge);
  });

  it("uses existing persisted heightfield data when present", () => {
    const values = Array.from({ length: 32 * 32 }, (_, index) => 1 + index * 0.0005);
    const heightfield = migratePersistedSubstrateHeightfield(
      {
        heightIn: 16,
        substrateHeightfield: values,
      },
      16,
    );

    expect(heightfield[0]).toBeCloseTo(1, 4);
    expect(heightfield[1023]).toBeGreaterThan(heightfield[0] ?? 0);
  });

  it("falls back to a flat heightfield when persisted data is missing", () => {
    const heightfield = migratePersistedSubstrateHeightfield({}, 14);

    expect(heightfield).toBeInstanceOf(Float32Array);
    expect(heightfield.length).toBe(32 * 32);
    expect(new Set(Array.from(heightfield)).size).toBe(1);
  });
});
