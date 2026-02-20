import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VisualAsset } from "@/components/builder/visual/types";

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

const TEST_ASSET: VisualAsset = {
  id: "test-rock",
  type: "product",
  sourceMode: "catalog_product",
  name: "Test Rock",
  slug: "test-rock",
  categorySlug: "hardscape",
  categoryName: "Hardscape",
  imageUrl: null,
  widthIn: 8,
  heightIn: 6,
  depthIn: 5,
  defaultScale: 1,
  sku: null,
  priceCents: null,
  offerId: null,
  goUrl: null,
  purchaseUrl: null,
};

describe("visual-builder-store action history", () => {
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

    expect(useVisualBuilderStore.getState().undoStack).toHaveLength(1);
    expect(useVisualBuilderStore.getState().redoStack).toHaveLength(0);

    useVisualBuilderStore.getState().undoAction();

    const afterUndo = useVisualBuilderStore.getState().canvasState.substrateHeightfield;
    expect(afterUndo[0]).toBeCloseTo(initial[0] ?? 0, 4);
    expect(afterUndo[1]).toBeCloseTo(initial[1] ?? 0, 4);
    expect(useVisualBuilderStore.getState().undoStack).toHaveLength(0);
    expect(useVisualBuilderStore.getState().redoStack).toHaveLength(1);

    useVisualBuilderStore.getState().redoAction();

    const afterRedo = useVisualBuilderStore.getState().canvasState.substrateHeightfield;
    expect(afterRedo[0]).toBeCloseTo(afterStroke[0] ?? 0, 4);
    expect(afterRedo[1]).toBeCloseTo(afterStroke[1] ?? 0, 4);
    expect(useVisualBuilderStore.getState().undoStack).toHaveLength(1);
    expect(useVisualBuilderStore.getState().redoStack).toHaveLength(0);
  });

  it("tracks item placement, movement, and deletion in the same undo stack", () => {
    useVisualBuilderStore.getState().addCanvasItemFromAsset(TEST_ASSET, { x: 0.4, y: 0.4, z: 0.5 });
    const addedItem = useVisualBuilderStore.getState().canvasState.items[0];
    expect(addedItem).toBeDefined();

    useVisualBuilderStore.getState().updateCanvasItem(addedItem!.id, { x: 0.7, z: 0.3, rotation: 30 });
    useVisualBuilderStore.getState().removeCanvasItem(addedItem!.id);
    expect(useVisualBuilderStore.getState().canvasState.items).toHaveLength(0);

    useVisualBuilderStore.getState().undoAction();
    const restored = useVisualBuilderStore.getState().canvasState.items[0];
    expect(restored).toBeDefined();
    expect(restored?.x).toBeCloseTo(0.7, 4);
    expect(restored?.rotation).toBeCloseTo(30, 4);

    useVisualBuilderStore.getState().undoAction();
    const movedBack = useVisualBuilderStore.getState().canvasState.items[0];
    expect(movedBack).toBeDefined();
    expect(movedBack?.x).toBeCloseTo(0.4, 4);
    expect(movedBack?.rotation).toBeCloseTo(0, 4);

    useVisualBuilderStore.getState().redoAction();
    const movedForward = useVisualBuilderStore.getState().canvasState.items[0];
    expect(movedForward?.x).toBeCloseTo(0.7, 4);
  });

  it("undoes and redoes tank dimension changes", () => {
    const initialWidth = useVisualBuilderStore.getState().canvasState.widthIn;

    useVisualBuilderStore.getState().setCanvasDimensions({
      widthIn: initialWidth + 10,
      heightIn: useVisualBuilderStore.getState().canvasState.heightIn,
      depthIn: useVisualBuilderStore.getState().canvasState.depthIn,
    });

    expect(useVisualBuilderStore.getState().canvasState.widthIn).toBeCloseTo(initialWidth + 10, 4);

    useVisualBuilderStore.getState().undoAction();
    expect(useVisualBuilderStore.getState().canvasState.widthIn).toBeCloseTo(initialWidth, 4);

    useVisualBuilderStore.getState().redoAction();
    expect(useVisualBuilderStore.getState().canvasState.widthIn).toBeCloseTo(initialWidth + 10, 4);
  });

  it("caps the unified undo stack at 120 action entries", () => {
    for (let i = 0; i < 140; i += 1) {
      useVisualBuilderStore.getState().beginSubstrateStroke();

      const nextHeightfield =
        useVisualBuilderStore.getState().canvasState.substrateHeightfield.slice();
      const index = i % nextHeightfield.length;
      nextHeightfield[index] = (nextHeightfield[index] ?? 0) + 0.12;

      useVisualBuilderStore.getState().setSubstrateHeightfield(nextHeightfield);
      useVisualBuilderStore.getState().endSubstrateStroke();
    }

    expect(useVisualBuilderStore.getState().undoStack).toHaveLength(120);
  });
});
