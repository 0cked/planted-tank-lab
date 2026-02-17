import { useMemo, useState } from "react";

import type { VisualAsset, VisualCanvasItem } from "@/components/builder/visual/types";

type InventorySort = "recent" | "alpha";

type InventoryEntry = {
  asset: VisualAsset;
  quantity: number;
  latestLayer: number;
  latestItemId: string;
  itemIds: string[];
};

type ItemInventorySidebarProps = {
  items: VisualCanvasItem[];
  assetsById: Map<string, VisualAsset>;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
};

function fallbackGlyphForAsset(asset: VisualAsset): string {
  if (asset.categorySlug === "plants") return "🌿";
  if (asset.categorySlug === "hardscape") return "🪨";
  return "⚙️";
}

export function ItemInventorySidebar(props: ItemInventorySidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sort, setSort] = useState<InventorySort>("recent");

  const entries = useMemo(() => {
    const grouped = new Map<string, InventoryEntry>();

    for (const item of props.items) {
      const asset = props.assetsById.get(item.assetId);
      if (!asset) continue;

      const existing = grouped.get(asset.id);
      if (!existing) {
        grouped.set(asset.id, {
          asset,
          quantity: 1,
          latestLayer: item.layer,
          latestItemId: item.id,
          itemIds: [item.id],
        });
        continue;
      }

      existing.quantity += 1;
      existing.itemIds.push(item.id);
      if (item.layer >= existing.latestLayer) {
        existing.latestLayer = item.layer;
        existing.latestItemId = item.id;
      }
    }

    const next = Array.from(grouped.values());
    next.sort((a, b) => {
      if (sort === "alpha") {
        return a.asset.name.localeCompare(b.asset.name);
      }

      if (a.latestLayer !== b.latestLayer) {
        return b.latestLayer - a.latestLayer;
      }

      return a.asset.name.localeCompare(b.asset.name);
    });

    return next;
  }, [props.assetsById, props.items, sort]);

  return (
    <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
      <button
        onClick={() => setCollapsed((previous) => !previous)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Item inventory</h3>
          <p className="mt-0.5 text-[11px] text-slate-300">
            {props.items.length} placed · {entries.length} species
          </p>
        </div>
        <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
          {collapsed ? "Show" : "Hide"}
        </span>
      </button>

      {collapsed ? null : (
        <>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-300">
            <label htmlFor="item-inventory-sort" className="font-semibold uppercase tracking-[0.12em]">
              Sort
            </label>
            <select
              id="item-inventory-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as InventorySort)}
              className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>

          <div className="mt-2 max-h-[24vh] space-y-1.5 overflow-auto pr-1">
            {entries.map((entry) => {
              const isSelected = props.selectedItemId != null && entry.itemIds.includes(props.selectedItemId);

              return (
                <div
                  key={`inventory:${entry.asset.id}`}
                  className={`flex items-center gap-2 rounded-xl border p-2 ${
                    isSelected
                      ? "border-cyan-300/85 bg-cyan-400/15"
                      : "border-white/15 bg-slate-950/65"
                  }`}
                >
                  <button
                    onClick={() => props.onSelectItem(entry.latestItemId)}
                    className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center gap-2 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-slate-900/70">
                      {entry.asset.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.asset.imageUrl}
                          alt={entry.asset.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-sm" aria-hidden>
                          {fallbackGlyphForAsset(entry.asset)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-xs font-semibold text-slate-100">{entry.asset.name}</span>
                        {entry.quantity > 1 ? (
                          <span className="rounded-full border border-cyan-200/70 bg-cyan-300/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100">
                            ×{entry.quantity}
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[10px] text-slate-400">{entry.asset.categoryName}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => props.onRemoveItem(entry.latestItemId)}
                    className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md border border-red-300/70 bg-red-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-100"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {entries.length === 0 ? (
              <div className="rounded-lg border border-white/15 bg-slate-950/55 px-2.5 py-2 text-xs text-slate-300">
                Place plants or hardscape to populate this inventory.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
