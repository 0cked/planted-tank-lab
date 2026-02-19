import {
  assetById,
  LIBRARY_ASSETS,
  TANK_PRESETS,
  fallbackAssetForGroup,
  findClosestTankPreset,
} from "@/components/builder2d/data";
import type {
  AssetGroup,
  Builder2DInitialBuild,
  Builder2DSharedLineItem,
  Builder2DState,
  LibraryAsset,
  StageItem,
  TankPreset,
} from "@/components/builder2d/types";

export const STORAGE_KEY_BASE = "ptl-builder-2d-v1";
const HISTORY_LIMIT = 50;

export type SaveStatus = "idle" | "saving" | "saved";
export type StateUpdater = (prev: Builder2DState) => Builder2DState;
export type Builder2DHistoryState = {
  past: Builder2DState[];
  present: Builder2DState;
  future: Builder2DState[];
};

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function storageKey(initialBuild: Builder2DInitialBuild | null | undefined): string {
  if (!initialBuild?.shareSlug) return STORAGE_KEY_BASE;
  return `${STORAGE_KEY_BASE}:${initialBuild.shareSlug}`;
}

export function dimsLabel(preset: TankPreset): string {
  return `${preset.widthCm} x ${preset.depthCm} x ${preset.heightCm} cm`;
}

export function createDefaultState(): Builder2DState {
  return {
    step: "tank",
    selectedTankId: TANK_PRESETS[0]!.id,
    activeGroup: "plants",
    search: "",
    items: [],
    selectedItemId: null,
  };
}

function itemsEqual(a: StageItem, b: StageItem): boolean {
  return (
    a.id === b.id &&
    a.assetId === b.assetId &&
    a.xPct === b.xPct &&
    a.yPct === b.yPct &&
    a.scale === b.scale &&
    a.rotationDeg === b.rotationDeg &&
    a.visible === b.visible &&
    a.locked === b.locked
  );
}

export function statesEqual(a: Builder2DState, b: Builder2DState): boolean {
  if (a === b) return true;
  if (
    a.step !== b.step ||
    a.selectedTankId !== b.selectedTankId ||
    a.activeGroup !== b.activeGroup ||
    a.search !== b.search ||
    a.selectedItemId !== b.selectedItemId ||
    a.items.length !== b.items.length
  ) {
    return false;
  }

  for (let index = 0; index < a.items.length; index += 1) {
    const itemA = a.items[index];
    const itemB = b.items[index];
    if (!itemA || !itemB || !itemsEqual(itemA, itemB)) return false;
  }
  return true;
}

export function createHistoryState(initial: Builder2DState): Builder2DHistoryState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

function pushPastState(
  past: Builder2DState[],
  state: Builder2DState,
): Builder2DState[] {
  const nextPast = [...past, state];
  if (nextPast.length > HISTORY_LIMIT) {
    nextPast.shift();
  }
  return nextPast;
}

export function applyHistoryUpdate(
  history: Builder2DHistoryState,
  updater: StateUpdater,
): Builder2DHistoryState {
  const nextPresent = normalizeState(updater(history.present));
  if (statesEqual(history.present, nextPresent)) {
    return history;
  }

  return {
    past: pushPastState(history.past, history.present),
    present: nextPresent,
    future: [],
  };
}

export function replaceHistoryPresent(
  history: Builder2DHistoryState,
  updater: StateUpdater,
): Builder2DHistoryState {
  const nextPresent = normalizeState(updater(history.present));
  if (statesEqual(history.present, nextPresent)) {
    return history;
  }

  return {
    ...history,
    present: nextPresent,
    future: [],
  };
}

export function commitTransientHistoryState(
  history: Builder2DHistoryState,
  baseline: Builder2DState,
): Builder2DHistoryState {
  const normalizedBaseline = normalizeState(baseline);
  const normalizedPresent = normalizeState(history.present);

  if (statesEqual(normalizedBaseline, normalizedPresent)) {
    return {
      ...history,
      present: normalizedPresent,
    };
  }

  return {
    past: pushPastState(history.past, normalizedBaseline),
    present: normalizedPresent,
    future: [],
  };
}

export function hydrateHistoryState(
  history: Builder2DHistoryState,
  nextPresent: Builder2DState,
): Builder2DHistoryState {
  const normalizedNext = normalizeState(nextPresent);
  if (statesEqual(history.present, normalizedNext)) {
    return history;
  }

  return createHistoryState(normalizedNext);
}

export function undoHistoryState(history: Builder2DHistoryState): Builder2DHistoryState {
  const previous = history.past.at(-1);
  if (!previous) return history;

  const nextPast = history.past.slice(0, -1);
  return {
    past: nextPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistoryState(history: Builder2DHistoryState): Builder2DHistoryState {
  const [nextPresent, ...remainingFuture] = history.future;
  if (!nextPresent) return history;

  return {
    past: pushPastState(history.past, history.present),
    present: nextPresent,
    future: remainingFuture,
  };
}

function groupForLineItem(lineItem: Builder2DSharedLineItem): AssetGroup | null {
  const slug = lineItem.categorySlug.trim().toLowerCase();
  if (slug === "hardscape") return "hardscape";
  if (lineItem.plantName || slug === "plants") return "plants";
  return null;
}

function matchAssetForLineItem(lineItem: Builder2DSharedLineItem, group: AssetGroup): LibraryAsset {
  const query = (lineItem.plantName ?? lineItem.productName ?? "").trim().toLowerCase();
  if (query) {
    const matched = LIBRARY_ASSETS.find((asset) => {
      if (asset.group !== group) return false;
      const name = asset.name.toLowerCase();
      return name.includes(query) || query.includes(name);
    });
    if (matched) return matched;
  }
  return fallbackAssetForGroup(group);
}

function seedItemsFromSharedBuild(initialBuild: Builder2DInitialBuild): StageItem[] {
  const seeded: StageItem[] = [];

  for (const lineItem of initialBuild.lineItems) {
    const group = groupForLineItem(lineItem);
    if (!group) continue;

    const asset = matchAssetForLineItem(lineItem, group);
    const copies = Math.min(6, Math.max(1, lineItem.quantity));

    for (let copy = 0; copy < copies; copy += 1) {
      const index = seeded.length;
      const xPct = clamp(0.2 + (index % 6) * 0.13, 0.08, 0.92);
      const yPct = group === "hardscape" ? clamp(0.86 - (index % 3) * 0.03, 0.72, 0.9) : clamp(0.84 - (index % 4) * 0.05, 0.64, 0.88);

      seeded.push({
        id: uid(),
        assetId: asset.id,
        xPct,
        yPct,
        scale: group === "hardscape" ? 1.02 : 0.92,
        rotationDeg: group === "hardscape" ? (copy % 2 === 0 ? -9 : 8) : 0,
        visible: true,
        locked: false,
      });
    }
  }

  return seeded;
}

export function createStateFromInitialBuild(initialBuild: Builder2DInitialBuild): Builder2DState {
  const closestPreset = findClosestTankPreset({
    widthIn: initialBuild.widthIn,
    depthIn: initialBuild.depthIn,
    heightIn: initialBuild.heightIn,
  });

  return {
    step: "compose",
    selectedTankId: closestPreset.id,
    activeGroup: "plants",
    search: "",
    items: seedItemsFromSharedBuild(initialBuild),
    selectedItemId: null,
  };
}

export function loadStoredState(key: string): Builder2DState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Builder2DState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.selectedTankId || !Array.isArray(parsed.items)) return null;

    const validItems = parsed.items
      .filter((item): item is StageItem => {
        return (
          typeof item?.id === "string" &&
          typeof item.assetId === "string" &&
          typeof item.xPct === "number" &&
          typeof item.yPct === "number" &&
          typeof item.scale === "number" &&
          typeof item.rotationDeg === "number" &&
          typeof item.visible === "boolean" &&
          typeof item.locked === "boolean"
        );
      })
      .map((item) => ({
        ...item,
        xPct: clamp(item.xPct, 0.04, 0.96),
        yPct: clamp(item.yPct, 0.34, 0.95),
        scale: clamp(item.scale, 0.4, 2.8),
        rotationDeg: clamp(item.rotationDeg, -60, 60),
      }));

    return {
      step: parsed.step === "compose" ? "compose" : "tank",
      selectedTankId: parsed.selectedTankId,
      activeGroup: parsed.activeGroup === "hardscape" ? "hardscape" : "plants",
      search: typeof parsed.search === "string" ? parsed.search : "",
      items: validItems,
      selectedItemId:
        typeof parsed.selectedItemId === "string" ? parsed.selectedItemId : null,
    };
  } catch {
    return null;
  }
}

export function displaySaveStatus(saveStatus: SaveStatus): string {
  if (saveStatus === "saving") return "Saving changes...";
  if (saveStatus === "saved") return "Changes saved";
  return "Ready";
}

export function selectedTankFromState(state: Builder2DState): TankPreset {
  return TANK_PRESETS.find((preset) => preset.id === state.selectedTankId) ?? TANK_PRESETS[0]!;
}

export function normalizeState(state: Builder2DState): Builder2DState {
  const selectedTank = selectedTankFromState(state);
  const selectedItemExists = state.items.some((item) => item.id === state.selectedItemId);
  return {
    ...state,
    selectedTankId: selectedTank.id,
    selectedItemId: selectedItemExists ? state.selectedItemId : null,
  };
}

export function itemName(item: StageItem): string {
  return assetById(item.assetId)?.name ?? "Custom Item";
}
