import { describe, expect, it } from "vitest";

import type { VisualCanvasItem } from "@/components/builder/visual/types";
import { applyItemDiff, createItemDiff } from "@/stores/item-undo";

describe("Item Undo/Redo Stacks", () => {
    it("creates an empty diff when items match perfectly", () => {
        const itemA: VisualCanvasItem = { id: "a", assetId: "asset-1", layer: 0 } as unknown as VisualCanvasItem;
        const diff = createItemDiff({ previous: [itemA], next: [itemA] });
        expect(diff).toBeNull();
    });

    it("calculates an insert diff correctly", () => {
        const itemA: VisualCanvasItem = { id: "a", assetId: "asset-1", layer: 0 } as unknown as VisualCanvasItem;
        const itemB: VisualCanvasItem = { id: "b", assetId: "asset-2", layer: 1 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA], next: [itemA, itemB] });
        expect(diff?.added).toEqual([itemB]);
        expect(diff?.removed).toEqual([]);
        expect(diff?.updated).toEqual([]);
    });

    it("calculates a delete diff correctly", () => {
        const itemA: VisualCanvasItem = { id: "a", assetId: "asset-1", layer: 0 } as unknown as VisualCanvasItem;
        const itemB: VisualCanvasItem = { id: "b", assetId: "asset-2", layer: 1 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA, itemB], next: [itemA] });
        expect(diff?.added).toEqual([]);
        expect(diff?.removed).toEqual([itemB]);
        expect(diff?.updated).toEqual([]);
    });

    it("calculates an update diff correctly", () => {
        const itemA: VisualCanvasItem = { id: "a", x: 0.5, layer: 0 } as unknown as VisualCanvasItem;
        const itemANext: VisualCanvasItem = { id: "a", x: 0.6, layer: 0 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA], next: [itemANext] });
        expect(diff?.added).toEqual([]);
        expect(diff?.removed).toEqual([]);
        expect(diff?.updated).toEqual([{ previous: itemA, next: itemANext }]);
    });

    it("applies a diff as 'undo' to revert an addition", () => {
        const itemA: VisualCanvasItem = { id: "a", assetId: "asset-1", layer: 0 } as unknown as VisualCanvasItem;
        const itemB: VisualCanvasItem = { id: "b", assetId: "asset-2", layer: 1 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA], next: [itemA, itemB] });
        const undone = applyItemDiff([itemA, itemB], diff!, "undo");
        expect(undone.map((i) => i.id)).toEqual(["a"]);
    });

    it("applies a diff as 'undo' to revert an update", () => {
        const itemA: VisualCanvasItem = { id: "a", x: 0.5, layer: 0 } as unknown as VisualCanvasItem;
        const itemANext: VisualCanvasItem = { id: "a", x: 0.6, layer: 0 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA], next: [itemANext] });
        const undone = applyItemDiff([itemANext], diff!, "undo");
        expect(undone[0]!.x).toBe(0.5);
    });

    it("applies a diff as 'redo' to re-apply an update", () => {
        const itemA: VisualCanvasItem = { id: "a", x: 0.5, layer: 0 } as unknown as VisualCanvasItem;
        const itemANext: VisualCanvasItem = { id: "a", x: 0.6, layer: 0 } as unknown as VisualCanvasItem;

        const diff = createItemDiff({ previous: [itemA], next: [itemANext] });
        const redone = applyItemDiff([itemA], diff!, "redo");
        expect(redone[0]!.x).toBe(0.6);
    });
});
