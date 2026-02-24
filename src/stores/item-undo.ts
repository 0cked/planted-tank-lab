import type { VisualCanvasItem } from "@/components/builder/visual/types";

export const MAX_ITEM_UNDO_ENTRIES = 50;

export type CanvasItemDiff = {
    added: VisualCanvasItem[];
    removed: VisualCanvasItem[];
    updated: Array<{
        previous: VisualCanvasItem;
        next: VisualCanvasItem;
    }>;
};

export function createItemDiff(params: {
    previous: VisualCanvasItem[];
    next: VisualCanvasItem[];
}): CanvasItemDiff | null {
    const previousMap = new Map(params.previous.map((item) => [item.id, item]));
    const nextMap = new Map(params.next.map((item) => [item.id, item]));

    const added: VisualCanvasItem[] = [];
    const removed: VisualCanvasItem[] = [];
    const updated: Array<{ previous: VisualCanvasItem; next: VisualCanvasItem }> = [];

    for (const nextItem of params.next) {
        const previousItem = previousMap.get(nextItem.id);
        if (!previousItem) {
            added.push(nextItem);
        } else if (JSON.stringify(previousItem) !== JSON.stringify(nextItem)) {
            updated.push({ previous: previousItem, next: nextItem });
        }
    }

    for (const previousItem of params.previous) {
        if (!nextMap.has(previousItem.id)) {
            removed.push(previousItem);
        }
    }

    if (added.length === 0 && removed.length === 0 && updated.length === 0) {
        return null;
    }

    return { added, removed, updated };
}

export function applyItemDiff(
    items: VisualCanvasItem[],
    diff: CanvasItemDiff,
    direction: "undo" | "redo",
): VisualCanvasItem[] {
    const currentMap = new Map(items.map((item) => [item.id, item]));

    if (direction === "undo") {
        for (const add of diff.added) currentMap.delete(add.id);
        for (const remove of diff.removed) currentMap.set(remove.id, remove);
        for (const update of diff.updated) currentMap.set(update.previous.id, update.previous);
    } else {
        for (const add of diff.added) currentMap.set(add.id, add);
        for (const remove of diff.removed) currentMap.delete(remove.id);
        for (const update of diff.updated) currentMap.set(update.next.id, update.next);
    }

    return Array.from(currentMap.values()).sort((a, b) => a.layer - b.layer).map((item, index) => ({ ...item, layer: index }));
}

export function appendItemUndoEntry(
    entries: CanvasItemDiff[],
    diff: CanvasItemDiff,
): CanvasItemDiff[] {
    const nextEntries = [...entries, diff];
    if (nextEntries.length <= MAX_ITEM_UNDO_ENTRIES) {
        return nextEntries;
    }
    return nextEntries.slice(nextEntries.length - MAX_ITEM_UNDO_ENTRIES);
}
