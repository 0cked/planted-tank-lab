"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/components/TRPCProvider";
import { evaluateVisualCompatibility } from "@/components/builder/visual/compatibility";
import { exportVisualLayoutPng } from "@/components/builder/visual/export";
import type {
  VisualAsset,
  VisualCanvasItem,
  VisualLineItem,
  VisualTank,
} from "@/components/builder/visual/types";
import type { CompatibilityRule, Severity } from "@/engine/types";
import type { AppRouter } from "@/server/trpc/router";
import { useVisualBuilderStore } from "@/stores/visual-builder-store";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InitialBuildResponse = RouterOutputs["visualBuilder"]["getByShareSlug"];

type BomLine = {
  key: string;
  categorySlug: string;
  categoryName: string;
  quantity: number;
  asset: VisualAsset | VisualTank;
  type: "product" | "plant" | "tank";
};

const CANVAS_CATEGORIES = new Set(["hardscape", "plants"]);

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function toCompatibilityRule(
  row: RouterOutputs["rules"]["listActive"][number],
): CompatibilityRule {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    severity: row.severity as Severity,
    categoriesInvolved: row.categoriesInvolved,
    conditionLogic:
      typeof row.conditionLogic === "object" && row.conditionLogic && !Array.isArray(row.conditionLogic)
        ? (row.conditionLogic as Record<string, unknown>)
        : {},
    messageTemplate: row.messageTemplate,
    fixSuggestion: row.fixSuggestion,
    active: row.active,
    version: row.version,
  };
}

function categoryLabel(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityClasses(sev: Severity): string {
  switch (sev) {
    case "error":
      return "border-red-500/40 bg-red-500/10 text-red-100";
    case "warning":
      return "border-amber-400/40 bg-amber-400/10 text-amber-100";
    case "recommendation":
      return "border-blue-400/40 bg-blue-400/10 text-blue-100";
    case "completeness":
      return "border-white/20 bg-white/5 text-neutral-200";
  }
}

function buildBomLines(params: {
  tank: VisualTank | null;
  assetsById: Map<string, VisualAsset>;
  selectedProductByCategory: Record<string, string | undefined>;
  canvasItems: VisualCanvasItem[];
  categoriesBySlug: Map<string, string>;
}): BomLine[] {
  const lines: BomLine[] = [];

  if (params.tank) {
    lines.push({
      key: `tank:${params.tank.id}`,
      categorySlug: "tank",
      categoryName: "Tank",
      quantity: 1,
      asset: params.tank,
      type: "tank",
    });
  }

  for (const [categorySlug, productId] of Object.entries(params.selectedProductByCategory)) {
    if (!productId) continue;
    if (CANVAS_CATEGORIES.has(categorySlug)) continue;

    const asset = params.assetsById.get(productId);
    if (!asset || asset.type !== "product") continue;

    lines.push({
      key: `product:${asset.id}:${categorySlug}`,
      categorySlug,
      categoryName: params.categoriesBySlug.get(categorySlug) ?? categoryLabel(categorySlug),
      quantity: 1,
      asset,
      type: "product",
    });
  }

  const counts = new Map<string, number>();
  for (const item of params.canvasItems) {
    const asset = params.assetsById.get(item.assetId);
    if (!asset) continue;
    const key = `${asset.type}:${asset.id}:${item.categorySlug}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, quantity] of counts.entries()) {
    const [, assetId, categorySlug] = key.split(":");
    if (!assetId || !categorySlug) continue;
    const asset = params.assetsById.get(assetId);
    if (!asset) continue;

    lines.push({
      key,
      categorySlug,
      categoryName: params.categoriesBySlug.get(categorySlug) ?? categoryLabel(categorySlug),
      quantity,
      asset,
      type: asset.type,
    });
  }

  return lines.sort((a, b) => {
    if (a.categorySlug !== b.categorySlug) return a.categorySlug.localeCompare(b.categorySlug);
    return a.asset.name.localeCompare(b.asset.name);
  });
}

function toLineItemsForSave(lines: BomLine[]): VisualLineItem[] {
  return lines.map((line) => {
    if (line.type === "tank") {
      return {
        categorySlug: "tank",
        productId: line.asset.id,
        quantity: line.quantity,
        selectedOfferId: line.asset.offerId ?? undefined,
      };
    }
    if (line.type === "product") {
      return {
        categorySlug: line.categorySlug,
        productId: line.asset.id,
        quantity: line.quantity,
        selectedOfferId: line.asset.offerId ?? undefined,
      };
    }
    return {
      categorySlug: "plants",
      plantId: line.asset.id,
      quantity: line.quantity,
    };
  });
}

function lineUnitPrice(asset: VisualAsset | VisualTank): number {
  return asset.priceCents ?? 0;
}

export function VisualBuilderPage(props: { initialBuild?: InitialBuildResponse | null }) {
  const router = useRouter();
  const { status } = useSession();

  const [search, setSearch] = useState("");
  const [libraryMode, setLibraryMode] = useState<"hardscape" | "plants" | "equipment">(
    "hardscape",
  );
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>("light");
  const [saveState, setSaveState] = useState<{ type: "idle" | "ok" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  const buildId = useVisualBuilderStore((s) => s.buildId);
  const shareSlug = useVisualBuilderStore((s) => s.shareSlug);
  const name = useVisualBuilderStore((s) => s.name);
  const description = useVisualBuilderStore((s) => s.description);
  const isPublic = useVisualBuilderStore((s) => s.isPublic);
  const tankId = useVisualBuilderStore((s) => s.tankId);
  const canvasState = useVisualBuilderStore((s) => s.canvasState);
  const selectedItemId = useVisualBuilderStore((s) => s.selectedItemId);
  const selectedProductByCategory = useVisualBuilderStore((s) => s.selectedProductByCategory);
  const compatibilityEnabled = useVisualBuilderStore((s) => s.compatibilityEnabled);
  const flags = useVisualBuilderStore((s) => s.flags);

  const setBuildIdentity = useVisualBuilderStore((s) => s.setBuildIdentity);
  const setName = useVisualBuilderStore((s) => s.setName);
  const setDescription = useVisualBuilderStore((s) => s.setDescription);
  const setPublic = useVisualBuilderStore((s) => s.setPublic);
  const setTank = useVisualBuilderStore((s) => s.setTank);
  const setSelectedProduct = useVisualBuilderStore((s) => s.setSelectedProduct);
  const setCompatibilityEnabled = useVisualBuilderStore((s) => s.setCompatibilityEnabled);
  const setLowTechNoCo2 = useVisualBuilderStore((s) => s.setLowTechNoCo2);
  const setHasShrimp = useVisualBuilderStore((s) => s.setHasShrimp);
  const addCanvasItemFromAsset = useVisualBuilderStore((s) => s.addCanvasItemFromAsset);
  const updateCanvasItem = useVisualBuilderStore((s) => s.updateCanvasItem);
  const removeCanvasItem = useVisualBuilderStore((s) => s.removeCanvasItem);
  const duplicateCanvasItem = useVisualBuilderStore((s) => s.duplicateCanvasItem);
  const moveCanvasItemLayer = useVisualBuilderStore((s) => s.moveCanvasItemLayer);
  const setSelectedItem = useVisualBuilderStore((s) => s.setSelectedItem);
  const hydrateFromBuild = useVisualBuilderStore((s) => s.hydrateFromBuild);
  const resetAll = useVisualBuilderStore((s) => s.resetAll);
  const toBuildPayload = useVisualBuilderStore((s) => s.toBuildPayload);

  const catalogQuery = trpc.visualBuilder.catalog.useQuery(undefined, {
    staleTime: 60_000,
  });
  const rulesQuery = trpc.rules.listActive.useQuery();

  const saveMutation = trpc.visualBuilder.save.useMutation();
  const duplicateMutation = trpc.visualBuilder.duplicatePublic.useMutation();

  const hydratedShareRef = useRef<string | null>(null);
  useEffect(() => {
    const initialBuild = props.initialBuild;
    if (!initialBuild) return;
    if (hydratedShareRef.current === initialBuild.build.shareSlug) return;

    hydrateFromBuild({
      buildId: initialBuild.initialState.buildId,
      shareSlug: initialBuild.initialState.shareSlug,
      name: initialBuild.initialState.name,
      description: initialBuild.initialState.description,
      isPublic: initialBuild.initialState.isPublic,
      tankId: initialBuild.initialState.tankId,
      canvasState: initialBuild.initialState.canvasState,
      lineItems: initialBuild.initialState.lineItems,
      flags: initialBuild.initialState.flags,
    });

    hydratedShareRef.current = initialBuild.build.shareSlug;
  }, [hydrateFromBuild, props.initialBuild]);

  const categories = catalogQuery.data?.categories;
  const categoriesBySlug = useMemo(() => {
    return new Map((categories ?? []).map((category) => [category.slug, category.name] as const));
  }, [categories]);

  const tanks = catalogQuery.data?.tanks;
  const assets = catalogQuery.data?.assets;

  const assetsById = useMemo(() => {
    return new Map((assets ?? []).map((asset) => [asset.id, asset] as const));
  }, [assets]);
  const tanksById = useMemo(() => {
    return new Map((tanks ?? []).map((tank) => [tank.id, tank] as const));
  }, [tanks]);

  const selectedTank = useMemo(() => {
    if (tankId) return tanksById.get(tankId) ?? null;
    return (tanks ?? [])[0] ?? null;
  }, [tankId, tanksById, tanks]);

  useEffect(() => {
    if (!selectedTank) return;
    if (tankId === selectedTank.id) return;
    setTank(selectedTank.id, {
      widthIn: selectedTank.widthIn,
      heightIn: selectedTank.heightIn,
      depthIn: selectedTank.depthIn,
    });
  }, [selectedTank, setTank, tankId]);

  const equipmentCategories = useMemo(() => {
    const set = new Set<string>();
    for (const asset of assets ?? []) {
      if (asset.type !== "product") continue;
      if (CANVAS_CATEGORIES.has(asset.categorySlug)) continue;
      set.add(asset.categorySlug);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const activeEquipmentCategory =
    equipmentCategories.includes(equipmentCategoryFilter)
      ? equipmentCategoryFilter
      : (equipmentCategories[0] ?? "");

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (assets ?? []).filter((asset) => {
      if (libraryMode === "hardscape" && asset.categorySlug !== "hardscape") return false;
      if (libraryMode === "plants" && asset.categorySlug !== "plants") return false;
      if (libraryMode === "equipment") {
        if (asset.type !== "product") return false;
        if (CANVAS_CATEGORIES.has(asset.categorySlug)) return false;
        if (asset.categorySlug !== activeEquipmentCategory) return false;
      }

      if (!q) return true;
      const haystack = `${asset.name} ${asset.slug} ${asset.categoryName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [activeEquipmentCategory, assets, libraryMode, search]);

  const bomLines = useMemo(
    () =>
      buildBomLines({
        tank: selectedTank,
        assetsById,
        selectedProductByCategory,
        canvasItems: canvasState.items,
        categoriesBySlug,
      }),
    [assetsById, canvasState.items, categoriesBySlug, selectedProductByCategory, selectedTank],
  );

  const bomForSave = useMemo(() => toLineItemsForSave(bomLines), [bomLines]);

  const totalCents = useMemo(() => {
    return bomLines.reduce((sum, line) => sum + lineUnitPrice(line.asset) * line.quantity, 0);
  }, [bomLines]);

  const rules = useMemo(() => {
    const rows = rulesQuery.data ?? [];
    return rows.map(toCompatibilityRule);
  }, [rulesQuery.data]);

  const compatibility = useMemo(() => {
    return evaluateVisualCompatibility({
      tank: selectedTank,
      assetsById,
      canvasItems: canvasState.items,
      selectedProductByCategory,
      rules,
      lowTechNoCo2: flags.lowTechNoCo2,
      hasShrimp: flags.hasShrimp,
      compatibilityEnabled,
    });
  }, [
    assetsById,
    canvasState.items,
    compatibilityEnabled,
    flags.hasShrimp,
    flags.lowTechNoCo2,
    rules,
    selectedProductByCategory,
    selectedTank,
  ]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return canvasState.items.find((item) => item.id === selectedItemId) ?? null;
  }, [canvasState.items, selectedItemId]);

  const selectedAsset = selectedItem ? assetsById.get(selectedItem.assetId) ?? null : null;

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    itemId: string;
    pointerId: number;
    element: HTMLDivElement | null;
  } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragQueuedRef = useRef<{ itemId: string; x: number; y: number } | null>(null);

  const flushQueuedDrag = () => {
    const queued = dragQueuedRef.current;
    dragQueuedRef.current = null;
    dragRafRef.current = null;
    if (!queued) return;
    updateCanvasItem(queued.itemId, { x: queued.x, y: queued.y });
  };

  const queueDragUpdate = (itemId: string, x: number, y: number) => {
    dragQueuedRef.current = { itemId, x, y };
    if (dragRafRef.current != null) return;
    dragRafRef.current = window.requestAnimationFrame(flushQueuedDrag);
  };

  const onPointerMoveCanvasItem = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    queueDragUpdate(drag.itemId, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.element && drag.element.hasPointerCapture(event.pointerId)) {
      drag.element.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  const onPointerDownCanvasItem = (itemId: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    setSelectedItem(itemId);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      itemId,
      pointerId: event.pointerId,
      element: event.currentTarget,
    };
  };

  useEffect(() => {
    return () => {
      if (dragRafRef.current != null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, []);

  const onDropAsset = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData("text/asset-id");
    if (!assetId) return;
    const asset = assetsById.get(assetId);
    if (!asset) return;

    if (!CANVAS_CATEGORIES.has(asset.categorySlug)) {
      if (asset.type === "product") {
        setSelectedProduct(asset.categorySlug, asset.id);
      }
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    addCanvasItemFromAsset(asset, { x, y });
  };

  const saveBuild = async (publish: boolean) => {
    if (!selectedTank) {
      setSaveState({ type: "error", message: "Pick a tank before saving." });
      return;
    }

    try {
      const payload = toBuildPayload({ bomLineItems: bomForSave });
      const result = await saveMutation.mutateAsync({
        buildId: payload.buildId ?? undefined,
        shareSlug: payload.shareSlug ?? undefined,
        name: payload.name,
        description: payload.description || undefined,
        tankId: payload.tankId ?? selectedTank.id,
        canvasState: payload.canvasState,
        lineItems: payload.lineItems,
        isPublic: publish,
        flags: payload.flags,
      });

      setBuildIdentity({ buildId: result.buildId, shareSlug: result.shareSlug });
      setPublic(result.isPublic);

      const liveUrl = `${window.location.origin}/builder/${result.shareSlug}`;
      if (publish) {
        await navigator.clipboard.writeText(liveUrl);
        setSaveState({
          type: "ok",
          message: "Public share link copied to clipboard.",
        });
      } else {
        setSaveState({
          type: "ok",
          message: "Build saved successfully.",
        });
      }

      if (publish && window.location.pathname !== `/builder/${result.shareSlug}`) {
        router.replace(`/builder/${result.shareSlug}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save build.";
      setSaveState({ type: "error", message });
    }
  };

  const handleDuplicate = async () => {
    if (shareSlug && isPublic && status === "authenticated") {
      try {
        const result = await duplicateMutation.mutateAsync({ shareSlug });
        setBuildIdentity({ buildId: result.buildId, shareSlug: result.shareSlug });
        setPublic(false);
        setName(`${name} Copy`);
        setSaveState({ type: "ok", message: "Build duplicated to your account draft." });
        router.push(`/builder/${result.shareSlug}`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to duplicate build.";
        setSaveState({ type: "error", message });
      }
    }

    setBuildIdentity({ buildId: null, shareSlug: null });
    setPublic(false);
    setName(`${name} Copy`);
    setSaveState({ type: "ok", message: "Created an editable duplicate draft." });
  };

  const handleExport = async () => {
    if (!selectedTank) {
      setSaveState({ type: "error", message: "Pick a tank before exporting." });
      return;
    }
    try {
      await exportVisualLayoutPng({
        tank: selectedTank,
        assetsById,
        items: canvasState.items,
      });
      setSaveState({ type: "ok", message: "PNG export created." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export PNG.";
      setSaveState({ type: "error", message });
    }
  };

  const buildLink = shareSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/builder/${shareSlug}` : null;

  return (
    <div className="min-h-screen bg-[#0a0f13] text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-white/60">Build name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#111923] px-3 py-2 text-sm text-white outline-none ring-emerald-400/0 transition focus:border-emerald-400/70 focus:ring-2"
                placeholder="Visual Build"
              />
            </div>
            <div className="min-w-[240px] flex-[1.2]">
              <label className="text-[11px] uppercase tracking-[0.16em] text-white/60">Description</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#111923] px-3 py-2 text-sm text-white outline-none ring-emerald-400/0 transition focus:border-emerald-400/70 focus:ring-2"
                placeholder="Minimal low-tech jungle with easy maintenance"
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => saveBuild(false)}
                disabled={saveMutation.isPending}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={handleDuplicate}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Duplicate
              </button>
              <button
                onClick={() => saveBuild(true)}
                disabled={saveMutation.isPending}
                className="cursor-pointer rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-wait disabled:opacity-60"
              >
                Share
              </button>
              <button
                onClick={handleExport}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Export PNG
              </button>
              <button
                onClick={resetAll}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span>
              Build ID: <span className="font-mono text-white/85">{buildId ?? "draft"}</span>
            </span>
            <span>
              Share: <span className="font-mono text-white/85">{shareSlug ?? "not published"}</span>
            </span>
            {buildLink ? (
              <a
                className="cursor-pointer rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/85 transition hover:bg-white/10"
                href={buildLink}
                target="_blank"
                rel="noreferrer"
              >
                Open public link
              </a>
            ) : null}
            {saveState.message ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  saveState.type === "ok"
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                    : saveState.type === "error"
                      ? "border-red-400/40 bg-red-400/15 text-red-100"
                      : "border-white/20 bg-white/10 text-white/70"
                }`}
              >
                {saveState.message}
              </span>
            ) : null}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold tracking-wide text-white">Tank</h2>
            <select
              value={selectedTank?.id ?? ""}
              onChange={(event) => {
                const tank = tanksById.get(event.target.value);
                if (!tank) return;
                setTank(tank.id, {
                  widthIn: tank.widthIn,
                  heightIn: tank.heightIn,
                  depthIn: tank.depthIn,
                });
              }}
              className="mt-2 w-full cursor-pointer rounded-xl border border-white/15 bg-[#111923] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/70"
            >
              {(tanks ?? []).map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name} ({tank.widthIn} in × {tank.depthIn} in × {tank.heightIn} in)
                </option>
              ))}
            </select>

            <div className="mt-4 flex flex-wrap gap-2">
              {([
                ["hardscape", "Hardscape"],
                ["plants", "Plants"],
                ["equipment", "Equipment"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setLibraryMode(mode)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    libraryMode === mode
                      ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {libraryMode === "equipment" ? (
              <select
                value={activeEquipmentCategory}
                onChange={(event) => setEquipmentCategoryFilter(event.target.value)}
                className="mt-3 w-full cursor-pointer rounded-xl border border-white/15 bg-[#111923] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/70"
              >
                {equipmentCategories.map((slug) => (
                  <option key={slug} value={slug}>
                    {categoryLabel(slug)}
                  </option>
                ))}
              </select>
            ) : null}

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets..."
              className="mt-3 w-full rounded-xl border border-white/15 bg-[#111923] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/70"
            />

            <div className="mt-3 max-h-[58vh] space-y-2 overflow-auto pr-1">
              {filteredAssets.map((asset) => {
                const isCanvasAsset = CANVAS_CATEGORIES.has(asset.categorySlug);
                const selectedProductId = selectedProductByCategory[asset.categorySlug] ?? null;
                const isSelectedEquipment = !isCanvasAsset && selectedProductId === asset.id;

                return (
                  <div
                    key={`${asset.type}:${asset.id}:${asset.categorySlug}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/asset-id", asset.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className="rounded-xl border border-white/10 bg-[#101820] p-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#0b1116]">
                        {asset.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <div className="text-[10px] text-white/40">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">{asset.name}</div>
                        <div className="mt-0.5 text-[11px] text-white/60">{asset.categoryName}</div>
                        <div className="mt-0.5 text-[11px] text-white/70">
                          {asset.widthIn.toFixed(1)} in × {asset.depthIn.toFixed(1)} in ×{" "}
                          {asset.heightIn.toFixed(1)} in
                        </div>
                        <div className="mt-0.5 text-[11px] text-white/70">{formatMoney(asset.priceCents)}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex gap-2">
                      {isCanvasAsset ? (
                        <button
                          onClick={() => addCanvasItemFromAsset(asset)}
                          className="cursor-pointer rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                        >
                          Add to canvas
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedProduct(asset.categorySlug, asset.id)}
                          className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            isSelectedEquipment
                              ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                              : "border-white/15 bg-white/10 text-white/80 hover:bg-white/20"
                          }`}
                        >
                          {isSelectedEquipment ? "Selected" : "Select"}
                        </button>
                      )}
                      {asset.purchaseUrl ? (
                        <a
                          href={asset.purchaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {filteredAssets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#101820] p-3 text-xs text-white/60">
                  No assets match this filter.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-[#0b1116] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Visual Canvas</h2>
                <p className="text-xs text-white/60">
                  Drag assets into the tank, then drag items directly to place and refine composition.
                </p>
              </div>
              {selectedTank ? (
                <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {selectedTank.widthIn} in × {selectedTank.depthIn} in × {selectedTank.heightIn} in
                </div>
              ) : null}
            </div>

            <div
              ref={canvasRef}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onDropAsset}
              className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#0d1723] via-[#0b141d] to-[#0a1117]"
              style={{
                aspectRatio: selectedTank
                  ? `${selectedTank.widthIn} / ${selectedTank.heightIn}`
                  : `${canvasState.widthIn} / ${canvasState.heightIn}`,
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-emerald-300/15 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-[#1a2830]/75 to-transparent" />

              {canvasState.items
                .slice()
                .sort((a, b) => a.layer - b.layer)
                .map((item) => {
                  const asset = assetsById.get(item.assetId);
                  if (!asset) return null;

                  const tankWidth = selectedTank?.widthIn ?? canvasState.widthIn;
                  const tankHeight = selectedTank?.heightIn ?? canvasState.heightIn;
                  const widthPct = ((asset.widthIn / tankWidth) * 100) * item.scale;
                  const heightPct = ((asset.heightIn / tankHeight) * 100) * item.scale;

                  return (
                    <div
                      key={item.id}
                      className={`absolute select-none ${selectedItemId === item.id ? "z-30" : "z-10"}`}
                      style={{
                        left: `${item.x * 100}%`,
                        top: `${item.y * 100}%`,
                        width: `${Math.max(widthPct, 1.8)}%`,
                        height: `${Math.max(heightPct, 1.8)}%`,
                        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(event) => onPointerDownCanvasItem(item.id, event)}
                      onPointerMove={onPointerMoveCanvasItem}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    >
                      <div
                        className={`relative h-full w-full rounded-md border transition ${
                          selectedItemId === item.id
                            ? "border-emerald-300/80 shadow-[0_0_0_1px_rgba(16,185,129,0.5)]"
                            : "border-white/10"
                        }`}
                      >
                        {asset.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            draggable={false}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/45">
                            {asset.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {selectedItem && selectedAsset ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-white/50">Selected item</div>
                    <div className="text-sm font-semibold text-white">{selectedAsset.name}</div>
                    <div className="text-xs text-white/60">
                      {selectedAsset.categoryName} · layer {selectedItem.layer + 1}
                    </div>
                  </div>

                  <label className="text-xs text-white/70">
                    Scale
                    <input
                      type="range"
                      min={0.1}
                      max={2.5}
                      step={0.01}
                      value={selectedItem.scale}
                      onChange={(event) =>
                        updateCanvasItem(selectedItem.id, { scale: Number(event.target.value) })
                      }
                      className="mt-1 w-full cursor-pointer"
                    />
                  </label>

                  <label className="text-xs text-white/70">
                    Rotation
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedItem.rotation}
                      onChange={(event) =>
                        updateCanvasItem(selectedItem.id, {
                          rotation: Number(event.target.value),
                        })
                      }
                      className="mt-1 w-full cursor-pointer"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => moveCanvasItemLayer(selectedItem.id, "up")}
                      className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                    >
                      Layer +
                    </button>
                    <button
                      onClick={() => moveCanvasItemLayer(selectedItem.id, "down")}
                      className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                    >
                      Layer -
                    </button>
                    <button
                      onClick={() => duplicateCanvasItem(selectedItem.id)}
                      className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => removeCanvasItem(selectedItem.id)}
                      className="cursor-pointer rounded-lg border border-red-400/40 bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-white/60">
                  Select an object on the canvas to adjust scale, rotation, layering, duplicate, or delete.
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-white">Bill of Materials</h2>
            <div className="mt-1 text-xs text-white/60">
              Live pricing is best-effort from current in-stock offers.
            </div>

            <div className="mt-3 space-y-2">
              {bomLines.map((line) => {
                const canBuy = line.asset.goUrl || line.asset.purchaseUrl;
                const buyUrl = line.asset.goUrl ?? line.asset.purchaseUrl ?? null;
                return (
                  <div key={line.key} className="rounded-xl border border-white/10 bg-[#111923] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                          {line.categoryName}
                        </div>
                        <div className="text-sm font-semibold text-white">{line.asset.name}</div>
                        <div className="text-xs text-white/60">
                          Qty {line.quantity} · Unit {formatMoney(line.asset.priceCents)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {formatMoney((line.asset.priceCents ?? 0) * line.quantity)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[11px] text-white/55">SKU {line.asset.sku ?? "n/a"}</div>
                      {canBuy && buyUrl ? (
                        <a
                          href={buyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                        >
                          Buy
                        </a>
                      ) : (
                        <span className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/65">
                          No offer
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {bomLines.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#111923] p-3 text-xs text-white/60">
                  Add assets to begin building your bill of materials.
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#111923] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Estimated total</span>
                <span className="font-semibold text-white">{formatMoney(totalCents)}</span>
              </div>
              <div className="mt-1 text-xs text-white/55">
                {bomLines.length} line item(s), {canvasState.items.length} canvas object(s)
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#111923] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Compatibility</h3>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={compatibilityEnabled}
                    onChange={(event) => setCompatibilityEnabled(event.target.checked)}
                    className="cursor-pointer"
                  />
                  Enabled
                </label>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white/75">
                  <input
                    type="checkbox"
                    checked={flags.lowTechNoCo2}
                    onChange={(event) => setLowTechNoCo2(event.target.checked)}
                    className="cursor-pointer"
                  />
                  Low-tech
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white/75">
                  <input
                    type="checkbox"
                    checked={flags.hasShrimp}
                    onChange={(event) => setHasShrimp(event.target.checked)}
                    className="cursor-pointer"
                  />
                  Shrimp tank
                </label>
              </div>

              <div className="space-y-2">
                {compatibility.evaluations.map((evaluation, index) => (
                  <div
                    key={`${evaluation.ruleCode}:${index}`}
                    className={`rounded-lg border px-2.5 py-2 text-xs ${severityClasses(
                      evaluation.severity,
                    )}`}
                  >
                    <div className="font-semibold uppercase tracking-[0.12em]">
                      {evaluation.severity}
                    </div>
                    <div className="mt-1 leading-relaxed">{evaluation.message}</div>
                    {evaluation.fixSuggestion ? (
                      <div className="mt-1 text-[11px] opacity-90">Fix: {evaluation.fixSuggestion}</div>
                    ) : null}
                  </div>
                ))}

                {compatibility.evaluations.length === 0 ? (
                  <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100">
                    No compatibility issues detected.
                  </div>
                ) : null}

                {compatibility.hardscapeVolumeRatio != null ? (
                  <div className="text-[11px] text-white/55">
                    Hardscape volume estimate: {(compatibility.hardscapeVolumeRatio * 100).toFixed(1)}%
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
