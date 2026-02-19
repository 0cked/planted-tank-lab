"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ComposeScreen, type ComposeLayerRow } from "@/components/builder2d/ComposeScreen";
import { LIBRARY_ASSETS, assetById, fallbackAssetForGroup } from "@/components/builder2d/data";
import {
  applyHistoryUpdate,
  clamp,
  commitTransientHistoryState,
  createHistoryState,
  createDefaultState,
  createStateFromInitialBuild,
  displaySaveStatus,
  hydrateHistoryState,
  loadStoredState,
  normalizeState,
  redoHistoryState,
  replaceHistoryPresent,
  selectedTankFromState,
  storageKey,
  type StateUpdater,
  undoHistoryState,
  uid,
} from "@/components/builder2d/state";
import { TankSetupScreen } from "@/components/builder2d/TankSetupScreen";
import type { Builder2DInitialBuild, Builder2DState, LibraryAsset, StageItem } from "@/components/builder2d/types";

type Builder2DPageProps = {
  initialBuild?: Builder2DInitialBuild | null;
};

function baseStateFromInitialBuild(
  initialBuild: Builder2DInitialBuild | null | undefined,
): Builder2DState {
  if (initialBuild) return normalizeState(createStateFromInitialBuild(initialBuild));
  return normalizeState(createDefaultState());
}

type HistoryAction =
  | { type: "hydrate"; nextState: Builder2DState }
  | { type: "apply"; updater: StateUpdater }
  | { type: "replace"; updater: StateUpdater }
  | { type: "commitTransient"; baseline: Builder2DState }
  | { type: "undo" }
  | { type: "redo" };

function historyReducer(
  history: ReturnType<typeof createHistoryState>,
  action: HistoryAction,
): ReturnType<typeof createHistoryState> {
  switch (action.type) {
    case "hydrate":
      return hydrateHistoryState(history, action.nextState);
    case "apply":
      return applyHistoryUpdate(history, action.updater);
    case "replace":
      return replaceHistoryPresent(history, action.updater);
    case "commitTransient":
      return commitTransientHistoryState(history, action.baseline);
    case "undo":
      return undoHistoryState(history);
    case "redo":
      return redoHistoryState(history);
  }
}

type UpdateOptions = {
  commit?: boolean;
};

export function Builder2DPage(props: Builder2DPageProps) {
  const key = storageKey(props.initialBuild ?? null);
  const initialState = baseStateFromInitialBuild(props.initialBuild);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null);
  const didHydrateStorageRef = useRef(false);
  const [history, dispatch] = useReducer(historyReducer, initialState, createHistoryState);
  const state = history.present;
  const stateRef = useRef(state);
  const transientBaselineRef = useRef<Builder2DState | null>(null);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stored = loadStoredState(key);
    const fallbackState = baseStateFromInitialBuild(props.initialBuild);
    const nextState = stored ? normalizeState(stored) : fallbackState;
    const nextSaveStatus: "idle" | "saved" = stored ? "saved" : "idle";

    didHydrateStorageRef.current = false;
    const timer = window.setTimeout(() => {
      transientBaselineRef.current = null;
      setNewlyAddedItemId(null);
      dispatch({ type: "hydrate", nextState });
      setSaveStatus(nextSaveStatus);
      didHydrateStorageRef.current = true;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [key, props.initialBuild]);

  useEffect(() => {
    if (typeof window === "undefined" || !didHydrateStorageRef.current) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(key, JSON.stringify(state));
      setSaveStatus("saved");
    }, 160);

    return () => window.clearTimeout(timer);
  }, [key, state]);

  useEffect(() => {
    if (saveStatus !== "saving") return;
    const timer = window.setTimeout(() => {
      setSaveStatus((current) => (current === "saving" ? "idle" : current));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  useEffect(() => {
    if (!newlyAddedItemId) return;
    const timer = window.setTimeout(() => setNewlyAddedItemId(null), 420);
    return () => window.clearTimeout(timer);
  }, [newlyAddedItemId]);

  const selectedTank = useMemo(() => selectedTankFromState(state), [state]);

  const filteredAssets = useMemo(() => {
    const query = state.search.trim().toLowerCase();
    return LIBRARY_ASSETS.filter((asset) => {
      if (asset.group !== state.activeGroup) return false;
      if (!query) return true;
      return asset.name.toLowerCase().includes(query);
    });
  }, [state.activeGroup, state.search]);

  const groupedAssets = useMemo<[string, LibraryAsset[]][]>(() => {
    const byLetter = new Map<string, LibraryAsset[]>();

    for (const asset of filteredAssets) {
      const letter = asset.name[0]?.toUpperCase() ?? "#";
      const letterAssets = byLetter.get(letter) ?? [];
      letterAssets.push(asset);
      byLetter.set(letter, letterAssets);
    }

    return Array.from(byLetter.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAssets]);

  const selectedItem = useMemo(
    () => state.items.find((item) => item.id === state.selectedItemId) ?? null,
    [state.items, state.selectedItemId],
  );

  const selectedAsset = useMemo(() => {
    if (!selectedItem) return null;
    return assetById(selectedItem.assetId) ?? fallbackAssetForGroup("plants");
  }, [selectedItem]);

  const layerRows = useMemo<ComposeLayerRow[]>(
    () => state.items.map((item, index) => ({ item, index })).reverse(),
    [state.items],
  );

  const updateState = useCallback((updater: StateUpdater, options?: UpdateOptions) => {
    const commit = options?.commit ?? true;
    setSaveStatus("saving");

    if (!commit) {
      if (!transientBaselineRef.current) {
        transientBaselineRef.current = stateRef.current;
      }
      dispatch({ type: "replace", updater });
      return;
    }

    transientBaselineRef.current = null;
    dispatch({ type: "apply", updater });
  }, []);

  const commitTransientUpdate = useCallback(() => {
    const baseline = transientBaselineRef.current;
    if (!baseline) return;

    transientBaselineRef.current = null;
    setSaveStatus("saving");
    dispatch({ type: "commitTransient", baseline });
  }, []);

  const setStep = (nextStep: Builder2DState["step"]) => {
    updateState((prev) => ({ ...prev, step: nextStep }));
  };

  const selectTank = (tankId: string) => {
    updateState((prev) => ({ ...prev, selectedTankId: tankId }));
  };

  const setActiveGroup = (nextGroup: Builder2DState["activeGroup"]) => {
    updateState((prev) => ({ ...prev, activeGroup: nextGroup }));
  };

  const setSearch = (nextSearch: string) => {
    updateState((prev) => ({ ...prev, search: nextSearch }));
  };

  const addAssetToStage = (asset: LibraryAsset) => {
    const newItemId = uid();
    updateState((prev) => {
      const groupCount = prev.items.filter((item) => {
        const existing = assetById(item.assetId);
        return existing?.group === asset.group;
      }).length;

      const xPct = clamp(0.5 + ((groupCount % 5) - 2) * 0.1, 0.08, 0.92);
      const yPct = asset.group === "hardscape" ? 0.86 : 0.82 - (groupCount % 3) * 0.05;

      const item: StageItem = {
        id: newItemId,
        assetId: asset.id,
        xPct,
        yPct,
        scale: asset.group === "hardscape" ? 1.05 : 0.92,
        rotationDeg: 0,
        visible: true,
        locked: false,
      };

      return {
        ...prev,
        items: [...prev.items, item],
        selectedItemId: item.id,
      };
    });
    setNewlyAddedItemId(newItemId);
  };

  const updateItem = (
    itemId: string,
    patch: Partial<StageItem>,
    options?: UpdateOptions,
  ) => {
    updateState((prev) => {
      const nextPatch: Partial<StageItem> = {
        ...patch,
      };

      if (typeof nextPatch.xPct === "number") nextPatch.xPct = clamp(nextPatch.xPct, 0.06, 0.94);
      if (typeof nextPatch.yPct === "number") nextPatch.yPct = clamp(nextPatch.yPct, 0.34, 0.94);
      if (typeof nextPatch.scale === "number") nextPatch.scale = clamp(nextPatch.scale, 0.4, 2.4);
      if (typeof nextPatch.rotationDeg === "number") {
        nextPatch.rotationDeg = clamp(nextPatch.rotationDeg, -60, 60);
      }

      return {
        ...prev,
        items: prev.items.map((item) => (item.id === itemId ? { ...item, ...nextPatch } : item)),
      };
    }, options);
  };

  const previewItemUpdate = (itemId: string, patch: Partial<StageItem>) => {
    updateItem(itemId, patch, { commit: false });
  };

  const selectItem = (itemId: string | null) => {
    updateState((prev) => ({ ...prev, selectedItemId: itemId }));
  };

  const removeSelected = useCallback(() => {
    if (!selectedItem) return;
    updateState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== selectedItem.id),
      selectedItemId: null,
    }));
  }, [selectedItem, updateState]);

  const duplicateSelected = useCallback(() => {
    if (!selectedItem) return;

    const copyId = uid();
    const copy: StageItem = {
      ...selectedItem,
      id: copyId,
      xPct: clamp(selectedItem.xPct + 0.06, 0.08, 0.92),
      yPct: clamp(selectedItem.yPct - 0.03, 0.34, 0.94),
      visible: true,
      locked: false,
    };

    updateState((prev) => ({
      ...prev,
      items: [...prev.items, copy],
      selectedItemId: copy.id,
    }));
    setNewlyAddedItemId(copyId);
  }, [selectedItem, updateState]);

  const moveSelectedLayer = (direction: "forward" | "backward") => {
    if (!selectedItem) return;

    updateState((prev) => {
      const index = prev.items.findIndex((item) => item.id === selectedItem.id);
      if (index < 0) return prev;

      const delta = direction === "forward" ? 1 : -1;
      const nextIndex = clamp(index + delta, 0, prev.items.length - 1);
      if (nextIndex === index) return prev;

      const nextItems = [...prev.items];
      const [moved] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, moved!);

      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const resetLayout = () => {
    setNewlyAddedItemId(null);
    updateState((prev) => ({
      ...prev,
      step: "tank",
      activeGroup: "plants",
      search: "",
      items: [],
      selectedItemId: null,
    }));
  };

  const undo = useCallback(() => {
    if (!canUndo) return;
    transientBaselineRef.current = null;
    setSaveStatus("saving");
    dispatch({ type: "undo" });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    transientBaselineRef.current = null;
    setSaveStatus("saving");
    dispatch({ type: "redo" });
  }, [canRedo]);

  useEffect(() => {
    if (state.step !== "compose") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isField =
        !!target &&
        (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select");
      if (isField) return;

      const hasModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (hasModifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (hasModifier && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedItem) return;
        event.preventDefault();
        removeSelected();
        return;
      }

      if (hasModifier && key === "d") {
        if (!selectedItem) return;
        event.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [duplicateSelected, redo, removeSelected, selectedItem, state.step, undo]);

  return (
    <main className="ptl-builder-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col px-2 py-2 sm:px-4 sm:py-4">
        <div className="ptl-builder-shell flex min-h-[calc(100dvh-1rem)] flex-1 flex-col sm:min-h-[calc(100dvh-2rem)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="ptl-btn-secondary !bg-white/85 !px-3 !py-1"
              >
                Main Menu
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-white">
                  {state.step === "tank" ? "New Scape" : "Compose Scape"}
                </h1>
                <p className="text-xs text-white/65">
                  Build a planted layout with drag-and-drop 2D layers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white/88">
                {displaySaveStatus(saveStatus)}
              </span>
              {props.initialBuild ? (
                <span className="hidden rounded-full border border-white/20 bg-white/8 px-3 py-1 text-white/76 sm:inline-flex">
                  Remixing: {props.initialBuild.name}
                </span>
              ) : null}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {state.step === "tank" ? (
              <TankSetupScreen
                selectedTank={selectedTank}
                onSelectTank={selectTank}
                onNext={() => setStep("compose")}
              />
            ) : (
              <ComposeScreen
                state={state}
                selectedTank={selectedTank}
                groupedAssets={groupedAssets}
                layerRows={layerRows}
                selectedItem={selectedItem}
                selectedAsset={selectedAsset}
                onSetStep={setStep}
                onResetLayout={resetLayout}
                onSetActiveGroup={setActiveGroup}
                onSearchChange={setSearch}
                onAddAsset={addAssetToStage}
                onSelectItem={selectItem}
                onUpdateItem={updateItem}
                onPreviewItemUpdate={previewItemUpdate}
                onCommitTransientUpdate={commitTransientUpdate}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onDuplicateSelected={duplicateSelected}
                onRemoveSelected={removeSelected}
                onMoveSelectedLayer={moveSelectedLayer}
                newlyAddedItemId={newlyAddedItemId}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
