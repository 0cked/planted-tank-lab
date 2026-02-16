import type { SubstrateHeightfield } from "@/components/builder/visual/types";
import { normalizeSubstrateHeightfield } from "@/lib/visual/substrate";

export const MAX_SUBSTRATE_UNDO_ENTRIES = 30;
const SUBSTRATE_DIFF_EPSILON = 0.0001;

export type SubstrateHeightfieldDiff = {
  indices: Uint16Array;
  deltas: Float32Array;
};

export function createSubstrateHeightfieldDiff(params: {
  previous: SubstrateHeightfield;
  next: SubstrateHeightfield;
  tankHeightIn: number;
}): SubstrateHeightfieldDiff | null {
  const previousHeightfield = normalizeSubstrateHeightfield(params.previous, params.tankHeightIn);
  const nextHeightfield = normalizeSubstrateHeightfield(params.next, params.tankHeightIn);

  const changedIndices: number[] = [];
  const changedDeltas: number[] = [];

  const limit = Math.min(previousHeightfield.length, nextHeightfield.length);
  for (let i = 0; i < limit; i += 1) {
    const previousValue = previousHeightfield[i] ?? 0;
    const nextValue = nextHeightfield[i] ?? 0;
    const delta = nextValue - previousValue;
    if (Math.abs(delta) <= SUBSTRATE_DIFF_EPSILON) continue;

    changedIndices.push(i);
    changedDeltas.push(delta);
  }

  if (changedIndices.length === 0) {
    return null;
  }

  return {
    indices: Uint16Array.from(changedIndices),
    deltas: Float32Array.from(changedDeltas),
  };
}

export function applySubstrateHeightfieldDiff(params: {
  base: SubstrateHeightfield;
  diff: SubstrateHeightfieldDiff;
  tankHeightIn: number;
  invert?: boolean;
}): SubstrateHeightfield {
  const direction = params.invert ? -1 : 1;
  const next = normalizeSubstrateHeightfield(params.base, params.tankHeightIn).slice();

  const limit = Math.min(params.diff.indices.length, params.diff.deltas.length);
  for (let i = 0; i < limit; i += 1) {
    const index = params.diff.indices[i] ?? -1;
    if (index < 0 || index >= next.length) continue;

    next[index] = (next[index] ?? 0) + (params.diff.deltas[i] ?? 0) * direction;
  }

  return normalizeSubstrateHeightfield(next, params.tankHeightIn);
}

export function appendSubstrateUndoEntry(
  entries: SubstrateHeightfieldDiff[],
  nextEntry: SubstrateHeightfieldDiff,
): SubstrateHeightfieldDiff[] {
  const nextEntries = [...entries, nextEntry];
  if (nextEntries.length <= MAX_SUBSTRATE_UNDO_ENTRIES) {
    return nextEntries;
  }

  return nextEntries.slice(nextEntries.length - MAX_SUBSTRATE_UNDO_ENTRIES);
}
