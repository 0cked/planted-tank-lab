import { beforeEach, describe, expect, it, vi } from "vitest";

type VisualBuilderStoreHook = Awaited<
  typeof import("@/stores/visual-builder-store")
>["useVisualBuilderStore"];

function createLocalStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("visual-builder-store substrate undo/redo", () => {
  let useVisualBuilderStore: VisualBuilderStoreHook;

  beforeEach(async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
      writable: true,
    });

    const storeModule = await import("@/stores/visual-builder-store");
    useVisualBuilderStore = storeModule.useVisualBuilderStore;
    useVisualBuilderStore.getState().resetAll();
  });

  it("records one undo entry per sculpt stroke and supports redo", () => {
    const initial = useVisualBuilderStore.getState().canvasState.substrateHeightfield.slice();

    useVisualBuilderStore.getState().beginSubstrateStroke();

    const firstPass = initial.slice();
    firstPass[0] = (firstPass[0] ?? 0) + 0.35;
    useVisualBuilderStore.getState().setSubstrateHeightfield(firstPass);

    const secondPass = firstPass.slice();
    secondPass[1] = (secondPass[1] ?? 0) + 0.22;
    useVisualBuilderStore.getState().setSubstrateHeightfield(secondPass);

    useVisualBuilderStore.getState().endSubstrateStroke();

    const afterStroke = useVisualBuilderStore.getState().canvasState.substrateHeightfield.slice();

    expect(useVisualBuilderStore.getState().substrateUndoStack).toHaveLength(1);
    expect(useVisualBuilderStore.getState().substrateRedoStack).toHaveLength(0);

    useVisualBuilderStore.getState().undoSubstrateStroke();

    const afterUndo = useVisualBuilderStore.getState().canvasState.substrateHeightfield;
    expect(afterUndo[0]).toBeCloseTo(initial[0] ?? 0, 4);
    expect(afterUndo[1]).toBeCloseTo(initial[1] ?? 0, 4);
    expect(useVisualBuilderStore.getState().substrateUndoStack).toHaveLength(0);
    expect(useVisualBuilderStore.getState().substrateRedoStack).toHaveLength(1);

    useVisualBuilderStore.getState().redoSubstrateStroke();

    const afterRedo = useVisualBuilderStore.getState().canvasState.substrateHeightfield;
    expect(afterRedo[0]).toBeCloseTo(afterStroke[0] ?? 0, 4);
    expect(afterRedo[1]).toBeCloseTo(afterStroke[1] ?? 0, 4);
    expect(useVisualBuilderStore.getState().substrateUndoStack).toHaveLength(1);
    expect(useVisualBuilderStore.getState().substrateRedoStack).toHaveLength(0);
  });

  it("caps the substrate undo stack at 30 stroke entries", () => {
    for (let i = 0; i < 35; i += 1) {
      useVisualBuilderStore.getState().beginSubstrateStroke();

      const nextHeightfield =
        useVisualBuilderStore.getState().canvasState.substrateHeightfield.slice();
      const index = i % nextHeightfield.length;
      nextHeightfield[index] = (nextHeightfield[index] ?? 0) + 0.12;

      useVisualBuilderStore.getState().setSubstrateHeightfield(nextHeightfield);
      useVisualBuilderStore.getState().endSubstrateStroke();
    }

    expect(useVisualBuilderStore.getState().substrateUndoStack).toHaveLength(30);
  });
});
