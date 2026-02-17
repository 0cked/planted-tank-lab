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

  it("persists rotation and scale updates through save + hydrate", () => {
    const store = useVisualBuilderStore.getState();

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.45,
      y: 0,
      z: 0.55,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "midground",
    });

    const createdItemId = useVisualBuilderStore.getState().canvasState.items[0]?.id;
    expect(createdItemId).toBeDefined();

    store.updateCanvasItem(createdItemId!, {
      rotation: 72,
      scale: 1.85,
    });

    const updatedItem = useVisualBuilderStore.getState().canvasState.items[0];
    expect(updatedItem?.rotation).toBeCloseTo(72, 4);
    expect(updatedItem?.scale).toBeCloseTo(1.85, 4);
    expect(updatedItem?.transform.rotation[1]).toBeCloseTo((72 * Math.PI) / 180, 4);
    expect(updatedItem?.transform.scale).toEqual([1.85, 1.85, 1.85]);

    const payload = useVisualBuilderStore.getState().toBuildPayload({ bomLineItems: [] });

    store.resetAll();

    store.hydrateFromBuild({
      buildId: "build-transform-1",
      shareSlug: null,
      name: payload.name,
      description: payload.description,
      tags: payload.tags,
      isPublic: payload.isPublic,
      tankId: payload.tankId,
      canvasState: payload.canvasState,
      lineItems: [],
      flags: payload.flags,
    });

    const hydratedItem = useVisualBuilderStore.getState().canvasState.items[0];
    expect(hydratedItem?.rotation).toBeCloseTo(72, 4);
    expect(hydratedItem?.scale).toBeCloseTo(1.85, 4);
    expect(hydratedItem?.transform.rotation[1]).toBeCloseTo((72 * Math.PI) / 180, 4);
    expect(hydratedItem?.transform.scale).toEqual([1.85, 1.85, 1.85]);
  });
});
