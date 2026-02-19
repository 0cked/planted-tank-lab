import { describe, expect, it } from "vitest";

import {
  applyHistoryUpdate,
  commitTransientHistoryState,
  createDefaultState,
  createHistoryState,
  replaceHistoryPresent,
  redoHistoryState,
  undoHistoryState,
} from "@/components/builder2d/state";
import type { Builder2DState, StageItem } from "@/components/builder2d/types";

function composeState(overrides: Partial<Builder2DState> = {}): Builder2DState {
  return {
    ...createDefaultState(),
    step: "compose",
    ...overrides,
  };
}

function stageItem(overrides: Partial<StageItem> = {}): StageItem {
  return {
    id: "item-1",
    assetId: "anubias-nana",
    xPct: 0.5,
    yPct: 0.8,
    scale: 1,
    rotationDeg: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

describe("builder2d history state", () => {
  it("tracks updates and supports undo/redo", () => {
    const initial = composeState({ search: "" });
    const withSearch = composeState({ search: "anubias" });
    const withGroup = composeState({ search: "anubias", activeGroup: "hardscape" });

    let history = createHistoryState(initial);
    history = applyHistoryUpdate(history, () => withSearch);
    history = applyHistoryUpdate(history, () => withGroup);

    expect(history.present).toEqual(withGroup);
    expect(history.past).toHaveLength(2);
    expect(history.future).toHaveLength(0);

    history = undoHistoryState(history);
    expect(history.present).toEqual(withSearch);
    expect(history.future).toHaveLength(1);

    history = redoHistoryState(history);
    expect(history.present).toEqual(withGroup);
    expect(history.future).toHaveLength(0);
  });

  it("does not create history entries for no-op updates", () => {
    const initial = composeState();
    const history = createHistoryState(initial);
    const nextHistory = applyHistoryUpdate(history, (prev) => prev);

    expect(nextHistory).toBe(history);
    expect(nextHistory.past).toHaveLength(0);
    expect(nextHistory.future).toHaveLength(0);
  });

  it("commits drag preview updates as one undo entry", () => {
    const baseline = composeState({
      items: [stageItem({ xPct: 0.42 })],
      selectedItemId: "item-1",
    });

    let history = createHistoryState(baseline);
    history = replaceHistoryPresent(history, (prev) => ({
      ...prev,
      items: [stageItem({ xPct: 0.49 })],
    }));
    history = replaceHistoryPresent(history, (prev) => ({
      ...prev,
      items: [stageItem({ xPct: 0.56 })],
    }));

    expect(history.past).toHaveLength(0);
    expect(history.present.items[0]?.xPct).toBe(0.56);

    history = commitTransientHistoryState(history, baseline);
    expect(history.past).toHaveLength(1);
    expect(history.past[0]?.items[0]?.xPct).toBe(0.42);

    history = undoHistoryState(history);
    expect(history.present.items[0]?.xPct).toBe(0.42);
  });

  it("caps undo history to the configured limit", () => {
    let history = createHistoryState(composeState({ search: "" }));

    for (let index = 0; index < 60; index += 1) {
      history = applyHistoryUpdate(history, (prev) =>
        composeState({
          ...prev,
          search: `q${index}`,
        }),
      );
    }

    expect(history.past).toHaveLength(50);
    expect(history.past[0]?.search).toBe("q9");
    expect(history.present.search).toBe("q59");
  });
});
