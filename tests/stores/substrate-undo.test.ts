import { describe, expect, it } from "vitest";

import { createFlatSubstrateHeightfield } from "@/lib/visual/substrate";
import {
  appendSubstrateUndoEntry,
  applySubstrateHeightfieldDiff,
  createSubstrateHeightfieldDiff,
  MAX_SUBSTRATE_UNDO_ENTRIES,
  type SubstrateHeightfieldDiff,
} from "@/stores/substrate-undo";

describe("substrate undo helpers", () => {
  it("creates and reapplies reversible diffs", () => {
    const initial = createFlatSubstrateHeightfield({ tankHeightIn: 14 });
    const updated = initial.slice();

    updated[0] = (updated[0] ?? 0) + 0.5;
    updated[16 * 32 + 16] = (updated[16 * 32 + 16] ?? 0) - 0.25;

    const diff = createSubstrateHeightfieldDiff({
      previous: initial,
      next: updated,
      tankHeightIn: 14,
    });

    expect(diff).not.toBeNull();
    expect(diff?.indices.length).toBe(2);

    const applied = applySubstrateHeightfieldDiff({
      base: initial,
      diff: diff!,
      tankHeightIn: 14,
    });
    expect(applied[0]).toBeCloseTo(updated[0] ?? 0, 4);
    expect(applied[16 * 32 + 16]).toBeCloseTo(updated[16 * 32 + 16] ?? 0, 4);

    const reverted = applySubstrateHeightfieldDiff({
      base: applied,
      diff: diff!,
      tankHeightIn: 14,
      invert: true,
    });
    expect(reverted[0]).toBeCloseTo(initial[0] ?? 0, 4);
    expect(reverted[16 * 32 + 16]).toBeCloseTo(initial[16 * 32 + 16] ?? 0, 4);
  });

  it("caps undo entries at 30 diffs", () => {
    let stack: SubstrateHeightfieldDiff[] = [];

    for (let i = 0; i < MAX_SUBSTRATE_UNDO_ENTRIES + 7; i += 1) {
      stack = appendSubstrateUndoEntry(stack, {
        indices: Uint16Array.of(i % 32),
        deltas: Float32Array.of(i + 0.1),
      });
    }

    expect(stack).toHaveLength(MAX_SUBSTRATE_UNDO_ENTRIES);

    const firstDelta = stack[0]?.deltas[0] ?? 0;
    const lastDelta = stack.at(-1)?.deltas[0] ?? 0;
    expect(firstDelta).toBeCloseTo(7.1, 4);
    expect(lastDelta).toBeCloseTo(36.1, 4);
  });
});
