import { useEffect, useRef, useState, type PointerEvent } from "react";

import { CanvasItemSprite, spriteSizeForVariant } from "@/components/builder2d/CanvasItemSprite";
import { assetById, fallbackAssetForGroup } from "@/components/builder2d/data";
import { clamp, dimsLabel, itemName } from "@/components/builder2d/state";
import type {
  Builder2DState,
  LibraryAsset,
  StageItem,
  TankPreset,
} from "@/components/builder2d/types";

export type ComposeLayerRow = {
  item: StageItem;
  index: number;
};

type ComposeScreenProps = {
  state: Builder2DState;
  selectedTank: TankPreset;
  groupedAssets: [string, LibraryAsset[]][];
  layerRows: ComposeLayerRow[];
  selectedItem: StageItem | null;
  selectedAsset: LibraryAsset | null;
  onSetStep: (step: Builder2DState["step"]) => void;
  onResetLayout: () => void;
  onSetActiveGroup: (group: Builder2DState["activeGroup"]) => void;
  onSearchChange: (value: string) => void;
  onAddAsset: (asset: LibraryAsset) => void;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (itemId: string, patch: Partial<StageItem>) => void;
  onPreviewItemUpdate: (itemId: string, patch: Partial<StageItem>) => void;
  onCommitTransientUpdate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDuplicateSelected: () => void;
  onRemoveSelected: () => void;
  onMoveSelectedLayer: (direction: "forward" | "backward") => void;
  newlyAddedItemId: string | null;
};

type DragState = {
  itemId: string;
  offsetXPct: number;
  offsetYPct: number;
};

const HANDLE_POSITIONS = [
  "left-0 top-0",
  "left-1/2 top-0 -translate-x-1/2",
  "right-0 top-0",
  "left-0 top-1/2 -translate-y-1/2",
  "right-0 top-1/2 -translate-y-1/2",
  "left-0 bottom-0",
  "left-1/2 bottom-0 -translate-x-1/2",
  "right-0 bottom-0",
] as const;

type MobilePanelTab = "library" | "layers";

function LibraryPanel(props: {
  state: Builder2DState;
  groupedAssets: [string, LibraryAsset[]][];
  onSetActiveGroup: (group: Builder2DState["activeGroup"]) => void;
  onSearchChange: (value: string) => void;
  onAddAsset: (asset: LibraryAsset) => void;
}) {
  const [readyGroup, setReadyGroup] = useState<Builder2DState["activeGroup"] | null>(null);
  const isLoadingAssets = readyGroup !== props.state.activeGroup;

  useEffect(() => {
    const activeGroup = props.state.activeGroup;
    const timer = window.setTimeout(() => setReadyGroup(activeGroup), 190);
    return () => window.clearTimeout(timer);
  }, [props.state.activeGroup]);

  return (
    <aside className="ptl-builder-panel rounded-2xl p-3 text-white/90">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Library</h2>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => props.onSetActiveGroup("plants")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            props.state.activeGroup === "plants"
              ? "border-white/45 bg-white/90 text-[#1f3429]"
              : "border-white/20 bg-white/8 text-white/74 hover:bg-white/12"
          }`}
        >
          Plants
        </button>
        <button
          type="button"
          onClick={() => props.onSetActiveGroup("hardscape")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            props.state.activeGroup === "hardscape"
              ? "border-white/45 bg-white/90 text-[#1f3429]"
              : "border-white/20 bg-white/8 text-white/74 hover:bg-white/12"
          }`}
        >
          Hardscape
        </button>
      </div>

      <input
        value={props.state.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
        placeholder={props.state.activeGroup === "plants" ? "Search plants..." : "Search hardscape..."}
        className="ptl-control mt-3 w-full !border-white/20 !bg-white/10 !text-white placeholder:!text-white/50"
      />

      <div className="mt-4 max-h-[45dvh] space-y-4 overflow-auto pr-1 xl:max-h-[64dvh]">
        {isLoadingAssets ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={`skeleton-${index}`} className="ptl-skeleton ptl-skeleton-shimmer h-16 rounded-xl" />
            ))}
          </div>
        ) : props.groupedAssets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/8 p-4 text-sm text-white/68">
            No matches. Try a different search term.
          </div>
        ) : (
          props.groupedAssets.map(([letter, assets]) => (
            <section key={letter} className="space-y-2">
              <div className="text-sm font-semibold text-white/74">{letter}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => props.onAddAsset(asset)}
                    className="flex items-center gap-2 rounded-xl border border-white/14 bg-white/8 p-2 text-left transition hover:border-white/24 hover:bg-white/14"
                  >
                    <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg border border-white/16 bg-gradient-to-b from-white/25 to-white/8">
                      <CanvasItemSprite asset={asset} scale={0.38} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white/90">{asset.name}</div>
                      <div className="text-xs text-white/62">
                        {asset.group === "plants" ? "Plant" : "Hardscape"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}

function StagePanel(props: {
  state: Builder2DState;
  selectedTank: TankPreset;
  selectedItem: StageItem | null;
  newlyAddedItemId: string | null;
  onSetStep: (step: Builder2DState["step"]) => void;
  onResetLayout: () => void;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (itemId: string, patch: Partial<StageItem>) => void;
  onPreviewItemUpdate: (itemId: string, patch: Partial<StageItem>) => void;
  onCommitTransientUpdate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDuplicateSelected: () => void;
  onRemoveSelected: () => void;
  onMoveSelectedLayer: (direction: "forward" | "backward") => void;
}) {
  const selectedItem = props.selectedItem;
  const visibleItemCount = props.state.items.filter((item) => item.visible).length;
  const hasVisibleItems = visibleItemCount > 0;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const onItemPointerDown = (event: PointerEvent<HTMLButtonElement>, item: StageItem) => {
    event.stopPropagation();

    if (item.locked) {
      props.onSelectItem(item.id);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const pointerXPct = (event.clientX - rect.left) / rect.width;
    const pointerYPct = (event.clientY - rect.top) / rect.height;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      itemId: item.id,
      offsetXPct: pointerXPct - item.xPct,
      offsetYPct: pointerYPct - item.yPct,
    };

    props.onSelectItem(item.id);
  };

  const onStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const pointerXPct = (event.clientX - rect.left) / rect.width;
    const pointerYPct = (event.clientY - rect.top) / rect.height;

    props.onPreviewItemUpdate(drag.itemId, {
      xPct: clamp(pointerXPct - drag.offsetXPct, 0.06, 0.94),
      yPct: clamp(pointerYPct - drag.offsetYPct, 0.34, 0.94),
    });
  };

  const endDrag = (event?: PointerEvent<HTMLElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    props.onCommitTransientUpdate();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-white/70">
          Tank: <span className="font-semibold text-white">{props.selectedTank.name}</span> · {dimsLabel(props.selectedTank)}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => props.onSetStep("tank")}
            className="ptl-btn-secondary !bg-white/85 !px-3 !py-1"
          >
            Tank sizes
          </button>
          <button
            type="button"
            onClick={props.onResetLayout}
            className="rounded-full border border-rose-200/35 bg-rose-300/18 px-3 py-1 text-sm text-rose-100 transition hover:bg-rose-300/24"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="ptl-builder-canvas relative aspect-[5/3] p-3 shadow-inner"
        onPointerMove={onStagePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            props.onSelectItem(null);
          }
        }}
      >
        <div className="absolute inset-[4%] overflow-hidden rounded-xl border border-white/34">
          <div className="absolute left-0 top-0 h-16 w-16 border-l border-t border-white/44" />
          <div className="absolute right-0 top-0 h-16 w-16 border-r border-t border-white/44" />
          <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-b from-[#2b282b] via-[#1f1d1f] to-[#121214]" />

          {!hasVisibleItems ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-white/30 bg-white/85 px-4 py-2 text-sm text-[color:var(--ptl-ink)]">
                {props.state.items.length === 0
                  ? "Add plants and hardscape from the library to start composing."
                  : "All layers are hidden. Use the Layers panel to show items again."}
              </div>
            </div>
          ) : null}

          {props.state.items.map((item, index) => {
            if (!item.visible) return null;

            const asset = assetById(item.assetId) ?? fallbackAssetForGroup("plants");
            const selected = item.id === props.state.selectedItemId;
            const spriteSize = spriteSizeForVariant(asset);
            const widthPx = Math.round(spriteSize.width * item.scale);
            const heightPx = Math.round(spriteSize.height * item.scale);

            return (
              <button
                key={item.id}
                type="button"
                aria-label={`${asset.name} layer on canvas`}
                onClick={() => props.onSelectItem(item.id)}
                onPointerDown={(event) => onItemPointerDown(event, item)}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`absolute -translate-x-1/2 -translate-y-full touch-none ${item.locked ? "cursor-default" : "cursor-move"} ${item.id === props.newlyAddedItemId ? "ptl-builder-new-item" : ""}`}
                style={{
                  left: `${item.xPct * 100}%`,
                  top: `${item.yPct * 100}%`,
                  transform: `translate(-50%, -100%) rotate(${item.rotationDeg}deg)`,
                  zIndex: index + 10,
                }}
              >
                <CanvasItemSprite asset={asset} scale={item.scale} />

                {selected ? (
                  <span
                    className="pointer-events-none absolute rounded-md border border-[rgba(79,124,102,0.78)]"
                    style={{
                      left: -8,
                      top: -8,
                      width: widthPx + 16,
                      height: heightPx + 16,
                    }}
                  >
                    {HANDLE_POSITIONS.map((className) => (
                      <span
                        key={`${item.id}-${className}`}
                        className={`absolute h-3 w-3 rounded-full border border-[#cad4d0] bg-white ${className}`}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ptl-builder-panel rounded-2xl px-4 py-3 text-white/88">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            className="ptl-btn-secondary !bg-white/84 !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            className="ptl-btn-secondary !bg-white/84 !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={props.onDuplicateSelected}
            disabled={!props.selectedItem}
            className="ptl-btn-secondary !bg-white/84 !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={props.onRemoveSelected}
            disabled={!props.selectedItem}
            className="rounded-full border border-rose-200/35 bg-rose-300/18 px-3 py-1 text-sm text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => props.onMoveSelectedLayer("forward")}
            disabled={!props.selectedItem}
            className="ptl-btn-secondary !bg-white/84 !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Bring Forward
          </button>
          <button
            type="button"
            onClick={() => props.onMoveSelectedLayer("backward")}
            disabled={!props.selectedItem}
            className="ptl-btn-secondary !bg-white/84 !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Send Back
          </button>
        </div>

        {selectedItem ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-white/76">
              Scale
              <input
                type="range"
                min={0.4}
                max={2.4}
                step={0.01}
                value={selectedItem.scale}
                onChange={(event) => {
                  props.onUpdateItem(selectedItem.id, {
                    scale: Number.parseFloat(event.target.value),
                  });
                }}
                className="mt-1 h-2 w-full accent-[color:var(--ptl-accent)]"
              />
            </label>

            <label className="text-sm text-white/76">
              Rotation
              <input
                type="range"
                min={-60}
                max={60}
                step={1}
                value={selectedItem.rotationDeg}
                onChange={(event) => {
                  props.onUpdateItem(selectedItem.id, {
                    rotationDeg: Number.parseFloat(event.target.value),
                  });
                }}
                className="mt-1 h-2 w-full accent-[color:var(--ptl-accent)]"
              />
            </label>
          </div>
        ) : (
          <div className="mt-3 text-sm text-white/68">
            Select an item on the stage to resize, rotate, duplicate, or remove it.
          </div>
        )}

        {selectedItem && !selectedItem.visible ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/22 bg-white/10 px-3 py-2 text-sm text-white/72">
            Selected layer is hidden.
            <button
              type="button"
              onClick={() => props.onUpdateItem(selectedItem.id, { visible: true })}
              className="ptl-btn-secondary !bg-white/90 !px-3 !py-1 text-xs"
            >
              Show layer
            </button>
          </div>
        ) : null}

        <div className="mt-3 text-xs text-white/60">
          Shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+D duplicate, Delete remove.
        </div>
      </div>
    </div>
  );
}

function LayersPanel(props: {
  state: Builder2DState;
  layerRows: ComposeLayerRow[];
  selectedItem: StageItem | null;
  selectedAsset: LibraryAsset | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (itemId: string, patch: Partial<StageItem>) => void;
}) {
  return (
    <aside className="ptl-builder-panel rounded-2xl p-3 text-white/90">
      <h2 className="text-2xl font-semibold text-white">Layers</h2>

      <div className="mt-3 max-h-[42dvh] space-y-2 overflow-auto pr-1 xl:max-h-[58dvh]">
        {props.layerRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/8 p-4 text-sm text-white/68">
            No layers yet. Add plants or hardscape from the library.
          </div>
        ) : (
          props.layerRows.map((row) => {
            const asset = assetById(row.item.assetId) ?? fallbackAssetForGroup("plants");
            const selected = row.item.id === props.state.selectedItemId;

            return (
              <div
                key={row.item.id}
                className={`rounded-xl border p-2 ${
                  selected
                    ? "border-white/40 bg-white/16"
                    : "border-white/14 bg-white/8"
                }`}
              >
                <button
                  type="button"
                  onClick={() => props.onSelectItem(row.item.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-white/16 bg-gradient-to-b from-white/24 to-white/8">
                    <CanvasItemSprite asset={asset} scale={0.27} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white/92">{itemName(row.item)}</div>
                    <div className="text-xs text-white/64">Layer {props.state.items.length - row.index}</div>
                  </div>
                </button>

                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => props.onUpdateItem(row.item.id, { locked: !row.item.locked })}
                    className="ptl-btn-secondary !bg-white/84 !px-2 !py-1 text-xs"
                  >
                    {row.item.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onUpdateItem(row.item.id, { visible: !row.item.visible })}
                    className="ptl-btn-secondary !bg-white/84 !px-2 !py-1 text-xs"
                  >
                    {row.item.visible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/14 bg-white/8 p-3 text-sm text-white/72">
        {props.selectedAsset && props.selectedItem ? (
          <>
            <div className="font-semibold text-white/92">{props.selectedAsset.name}</div>
            <div className="mt-1">
              Position: {Math.round(props.selectedItem.xPct * 100)}%, {Math.round(props.selectedItem.yPct * 100)}%
            </div>
            <div className="mt-1">Scale: {props.selectedItem.scale.toFixed(2)}x</div>
          </>
        ) : (
          "Select a layer for quick detail readout."
        )}
      </div>
    </aside>
  );
}

export function ComposeScreen(props: ComposeScreenProps) {
  const [mobilePanelTab, setMobilePanelTab] = useState<MobilePanelTab>("library");

  return (
    <section className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(240px,320px)]">
      <div className="xl:order-2">
        <StagePanel
          state={props.state}
          selectedTank={props.selectedTank}
          selectedItem={props.selectedItem}
          onSetStep={props.onSetStep}
          onResetLayout={props.onResetLayout}
          onSelectItem={props.onSelectItem}
          onUpdateItem={props.onUpdateItem}
          onPreviewItemUpdate={props.onPreviewItemUpdate}
          onCommitTransientUpdate={props.onCommitTransientUpdate}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          onDuplicateSelected={props.onDuplicateSelected}
          onRemoveSelected={props.onRemoveSelected}
          onMoveSelectedLayer={props.onMoveSelectedLayer}
          newlyAddedItemId={props.newlyAddedItemId}
        />
      </div>

      <div className="flex items-center gap-2 xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePanelTab("library")}
          className={`ptl-builder-drawer rounded-full border px-3 py-1 text-sm font-semibold ${
            mobilePanelTab === "library"
              ? "border-white/45 bg-white/90 text-[#1f3429]"
              : "border-white/20 bg-white/8 text-white/74"
          }`}
        >
          Library
        </button>
        <button
          type="button"
          onClick={() => setMobilePanelTab("layers")}
          className={`ptl-builder-drawer rounded-full border px-3 py-1 text-sm font-semibold ${
            mobilePanelTab === "layers"
              ? "border-white/45 bg-white/90 text-[#1f3429]"
              : "border-white/20 bg-white/8 text-white/74"
          }`}
        >
          Layers ({props.layerRows.length})
        </button>
      </div>

      <div
        className={`ptl-builder-drawer overflow-hidden xl:order-1 xl:block ${
          mobilePanelTab === "library"
            ? "max-h-[1200px] translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-2 opacity-0 xl:pointer-events-auto xl:max-h-none xl:translate-y-0 xl:opacity-100"
        }`}
      >
        <LibraryPanel
          state={props.state}
          groupedAssets={props.groupedAssets}
          onSetActiveGroup={props.onSetActiveGroup}
          onSearchChange={props.onSearchChange}
          onAddAsset={props.onAddAsset}
        />
      </div>

      <div
        className={`ptl-builder-drawer overflow-hidden xl:order-3 xl:block ${
          mobilePanelTab === "layers"
            ? "max-h-[1200px] translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-2 opacity-0 xl:pointer-events-auto xl:max-h-none xl:translate-y-0 xl:opacity-100"
        }`}
      >
        <LayersPanel
          state={props.state}
          layerRows={props.layerRows}
          selectedItem={props.selectedItem}
          selectedAsset={props.selectedAsset}
          onSelectItem={props.onSelectItem}
          onUpdateItem={props.onUpdateItem}
        />
      </div>
    </section>
  );
}
