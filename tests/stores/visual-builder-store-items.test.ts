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

function stateAfterToggleGrid(source: Uint8Array): Uint8Array {
  const next = source.slice();
  next[0] = 2;
  next[32] = 1;
  return next;
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

  it("duplicates multi-selection with a consistent offset and preserved spacing", () => {
    const store = useVisualBuilderStore.getState();

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.22,
      y: 0,
      z: 0.18,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "foreground",
    });

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.44,
      y: 0,
      z: 0.47,
      scale: 1,
      rotation: 15,
      anchorType: "substrate",
      depthZone: "midground",
    });

    const originals = useVisualBuilderStore.getState().canvasState.items;
    expect(originals).toHaveLength(2);

    const firstOriginal = originals[0];
    const secondOriginal = originals[1];
    expect(firstOriginal).toBeDefined();
    expect(secondOriginal).toBeDefined();

    store.setSelectedItems([firstOriginal!.id, secondOriginal!.id]);
    store.duplicateCanvasItem([firstOriginal!.id, secondOriginal!.id]);

    const stateAfterDuplicate = useVisualBuilderStore.getState();
    expect(stateAfterDuplicate.canvasState.items).toHaveLength(4);
    expect(stateAfterDuplicate.selectedItemIds).toHaveLength(2);

    const [duplicateFirstId, duplicateSecondId] = stateAfterDuplicate.selectedItemIds;
    const duplicateFirst = stateAfterDuplicate.canvasState.items.find((item) => item.id === duplicateFirstId);
    const duplicateSecond = stateAfterDuplicate.canvasState.items.find((item) => item.id === duplicateSecondId);

    expect(duplicateFirst).toBeDefined();
    expect(duplicateSecond).toBeDefined();

    const firstOffsetX = (duplicateFirst?.x ?? 0) - (firstOriginal?.x ?? 0);
    const firstOffsetZ = (duplicateFirst?.z ?? 0) - (firstOriginal?.z ?? 0);
    const secondOffsetX = (duplicateSecond?.x ?? 0) - (secondOriginal?.x ?? 0);
    const secondOffsetZ = (duplicateSecond?.z ?? 0) - (secondOriginal?.z ?? 0);

    expect(firstOffsetX).toBeCloseTo(secondOffsetX, 4);
    expect(firstOffsetZ).toBeCloseTo(secondOffsetZ, 4);
    expect((duplicateSecond?.x ?? 0) - (duplicateFirst?.x ?? 0)).toBeCloseTo(
      (secondOriginal?.x ?? 0) - (firstOriginal?.x ?? 0),
      4,
    );
    expect((duplicateSecond?.z ?? 0) - (duplicateFirst?.z ?? 0)).toBeCloseTo(
      (secondOriginal?.z ?? 0) - (firstOriginal?.z ?? 0),
      4,
    );
  });

  it("removes all selected items when deleting a multi-selection", () => {
    const store = useVisualBuilderStore.getState();

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.2,
      y: 0,
      z: 0.2,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "foreground",
    });

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.35,
      y: 0,
      z: 0.35,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "midground",
    });

    store.addCanvasItemFromAsset(TEST_ASSET, {
      x: 0.7,
      y: 0,
      z: 0.7,
      scale: 1,
      rotation: 0,
      anchorType: "substrate",
      depthZone: "background",
    });

    const initialItems = useVisualBuilderStore.getState().canvasState.items;
    const [firstItem, secondItem, thirdItem] = initialItems;

    expect(firstItem).toBeDefined();
    expect(secondItem).toBeDefined();
    expect(thirdItem).toBeDefined();

    store.setSelectedItems([firstItem!.id, secondItem!.id]);
    store.removeCanvasItem(useVisualBuilderStore.getState().selectedItemIds);

    const afterDelete = useVisualBuilderStore.getState();
    expect(afterDelete.canvasState.items).toHaveLength(1);
    expect(afterDelete.canvasState.items[0]?.id).toBe(thirdItem?.id);
    expect(afterDelete.selectedItemIds).toEqual([]);
    expect(afterDelete.selectedItemId).toBeNull();
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

  it("defaults grid snap + measurement overlay off and preserves scene setting toggles", () => {
    const store = useVisualBuilderStore.getState();

    expect(store.canvasState.sceneSettings.gridSnapEnabled).toBe(false);
    expect(store.canvasState.sceneSettings.measurementsVisible).toBe(false);
    expect(store.canvasState.sceneSettings.measurementUnit).toBe("in");
    expect(store.canvasState.sceneSettings.tankBackgroundStyle).toBe("frosted");
    expect(store.canvasState.sceneSettings.tankBackgroundColor).toBe("#88a9be");
    expect(store.canvasState.sceneSettings.cabinetFinishStyle).toBe("oak");
    expect(store.canvasState.sceneSettings.cabinetColor).toBe("#b38b61");
    expect(store.canvasState.sceneSettings.lightingSimulationEnabled).toBe(false);
    expect(store.canvasState.sceneSettings.lightMountHeightIn).toBe(4);
    expect(store.canvasState.sceneSettings.growthTimelineMonths).toBe(1);
    expect(store.canvasState.substrateMaterialGrid).toBeInstanceOf(Uint8Array);
    expect(store.canvasState.substrateMaterialGrid.length).toBe(32 * 32);
    expect(store.canvasState.substrateMaterialGrid[0]).toBe(0);

    store.setSceneSettings({
      gridSnapEnabled: true,
      measurementsVisible: true,
      measurementUnit: "cm",
      tankBackgroundStyle: "custom",
      tankBackgroundColor: "#336699",
      cabinetFinishStyle: "custom",
      cabinetColor: "#674b35",
      lightingSimulationEnabled: true,
      lightMountHeightIn: 9.5,
      growthTimelineMonths: 6,
    });

    const paintedMaterials = stateAfterToggleGrid(
      useVisualBuilderStore.getState().canvasState.substrateMaterialGrid,
    );
    store.setSubstrateMaterialGrid(paintedMaterials);

    const stateAfterToggle = useVisualBuilderStore.getState();
    expect(stateAfterToggle.canvasState.sceneSettings.gridSnapEnabled).toBe(true);
    expect(stateAfterToggle.canvasState.sceneSettings.measurementsVisible).toBe(true);
    expect(stateAfterToggle.canvasState.sceneSettings.measurementUnit).toBe("cm");
    expect(stateAfterToggle.canvasState.sceneSettings.tankBackgroundStyle).toBe("custom");
    expect(stateAfterToggle.canvasState.sceneSettings.tankBackgroundColor).toBe("#336699");
    expect(stateAfterToggle.canvasState.sceneSettings.cabinetFinishStyle).toBe("custom");
    expect(stateAfterToggle.canvasState.sceneSettings.cabinetColor).toBe("#674b35");
    expect(stateAfterToggle.canvasState.sceneSettings.lightingSimulationEnabled).toBe(true);
    expect(stateAfterToggle.canvasState.sceneSettings.lightMountHeightIn).toBe(9.5);
    expect(stateAfterToggle.canvasState.sceneSettings.growthTimelineMonths).toBe(6);
    expect(stateAfterToggle.canvasState.substrateMaterialGrid[0]).toBe(2);
    expect(stateAfterToggle.canvasState.substrateMaterialGrid[32]).toBe(1);

    const payload = stateAfterToggle.toBuildPayload({ bomLineItems: [] });
    expect(payload.canvasState.sceneSettings.gridSnapEnabled).toBe(true);
    expect(payload.canvasState.sceneSettings.measurementsVisible).toBe(true);
    expect(payload.canvasState.sceneSettings.measurementUnit).toBe("cm");
    expect(payload.canvasState.sceneSettings.tankBackgroundStyle).toBe("custom");
    expect(payload.canvasState.sceneSettings.tankBackgroundColor).toBe("#336699");
    expect(payload.canvasState.sceneSettings.cabinetFinishStyle).toBe("custom");
    expect(payload.canvasState.sceneSettings.cabinetColor).toBe("#674b35");
    expect(payload.canvasState.sceneSettings.lightingSimulationEnabled).toBe(true);
    expect(payload.canvasState.sceneSettings.lightMountHeightIn).toBe(9.5);
    expect(payload.canvasState.sceneSettings.growthTimelineMonths).toBe(6);
    expect(payload.canvasState.substrateMaterialGrid[0]).toBe(2);
    expect(payload.canvasState.substrateMaterialGrid[32]).toBe(1);

    store.setCanvasDimensions({
      widthIn: 40,
      heightIn: 16,
      depthIn: 20,
    });

    const stateAfterDimensionChange = useVisualBuilderStore.getState();
    expect(stateAfterDimensionChange.canvasState.widthIn).toBe(40);
    expect(stateAfterDimensionChange.canvasState.heightIn).toBe(16);
    expect(stateAfterDimensionChange.canvasState.depthIn).toBe(20);

    const payloadAfterDimensionChange = stateAfterDimensionChange.toBuildPayload({
      bomLineItems: [],
    });
    expect(payloadAfterDimensionChange.canvasState.widthIn).toBe(40);
    expect(payloadAfterDimensionChange.canvasState.heightIn).toBe(16);
    expect(payloadAfterDimensionChange.canvasState.depthIn).toBe(20);

    store.resetAll();

    store.hydrateFromBuild({
      buildId: "build-dimensions-1",
      shareSlug: null,
      name: payloadAfterDimensionChange.name,
      description: payloadAfterDimensionChange.description,
      tags: payloadAfterDimensionChange.tags,
      isPublic: payloadAfterDimensionChange.isPublic,
      tankId: payloadAfterDimensionChange.tankId,
      canvasState: payloadAfterDimensionChange.canvasState,
      lineItems: [],
      flags: payloadAfterDimensionChange.flags,
    });

    const hydratedState = useVisualBuilderStore.getState();
    expect(hydratedState.canvasState.widthIn).toBe(40);
    expect(hydratedState.canvasState.heightIn).toBe(16);
    expect(hydratedState.canvasState.depthIn).toBe(20);
  });
});
