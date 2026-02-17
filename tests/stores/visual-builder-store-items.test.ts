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
  id: "asset-test-rock",
  type: "product",
  sourceMode: "design_archetype",
  name: "Test Rock",
  slug: "test-rock",
  categorySlug: "hardscape",
  categoryName: "Hardscape",
  imageUrl: null,
  widthIn: 3,
  heightIn: 2,
  depthIn: 2,
  defaultScale: 1,
  sku: null,
  priceCents: null,
  estimatedUnitPriceCents: null,
  offerId: null,
  goUrl: null,
  purchaseUrl: null,
};

describe("visual-builder-store canvas item actions", () => {
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

  it("duplicates selected items with a 1-inch offset", () => {
    const store = useVisualBuilderStore.getState();

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.4,
      y: 0,
      z: 0.4,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "midground",
    });

    const stateAfterAdd = useVisualBuilderStore.getState();
    const sourceItem = stateAfterAdd.canvasState.items[0];
    expect(sourceItem).toBeDefined();

    store.duplicateCanvasItem(sourceItem!.id);

    const stateAfterDuplicate = useVisualBuilderStore.getState();
    const [original, duplicate] = stateAfterDuplicate.canvasState.items;
    expect(stateAfterDuplicate.canvasState.items).toHaveLength(2);
    expect(duplicate).toBeDefined();

    const widthOffset = 1 / stateAfterDuplicate.canvasState.widthIn;
    const depthOffset = 1 / stateAfterDuplicate.canvasState.depthIn;

    expect((duplicate!.x ?? 0) - (original?.x ?? 0)).toBeCloseTo(widthOffset, 4);
    expect((duplicate!.z ?? 0) - (original?.z ?? 0)).toBeCloseTo(depthOffset, 4);
  });

  it("duplicates away from bounds when a +1 inch offset would exceed the tank edges", () => {
    const store = useVisualBuilderStore.getState();

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.98,
      y: 0,
      z: 0.97,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "background",
    });

    const stateAfterAdd = useVisualBuilderStore.getState();
    const sourceItem = stateAfterAdd.canvasState.items[0];
    expect(sourceItem).toBeDefined();

    store.duplicateCanvasItem(sourceItem!.id);

    const stateAfterDuplicate = useVisualBuilderStore.getState();
    const [original, duplicate] = stateAfterDuplicate.canvasState.items;

    const widthOffset = 1 / stateAfterDuplicate.canvasState.widthIn;
    const depthOffset = 1 / stateAfterDuplicate.canvasState.depthIn;

    expect((duplicate!.x ?? 0) - (original?.x ?? 0)).toBeCloseTo(-widthOffset, 4);
    expect((duplicate!.z ?? 0) - (original?.z ?? 0)).toBeCloseTo(-depthOffset, 4);
  });
});
