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
  VisualRetailerLink,
  VisualTank,
} from "@/components/builder/visual/types";
import type { CompatibilityRule, Severity } from "@/engine/types";
import {
  estimateSubstrateBags,
  estimateSubstrateVolume,
  substrateContourPercentages,
} from "@/lib/visual/substrate";
import type { AppRouter } from "@/server/trpc/router";
import { useVisualBuilderStore } from "@/stores/visual-builder-store";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InitialBuildResponse = RouterOutputs["visualBuilder"]["getByShareSlug"];

type BomLine = {
  key: string;
  categorySlug: string;
  categoryName: string;
  quantity: number;
  notes?: string;
  saveEligible?: boolean;
  retailerLinks?: VisualRetailerLink[];
  asset: VisualAsset | VisualTank;
  type: "product" | "plant" | "tank" | "design";
};

type BuilderStepId = "tank" | "substrate" | "hardscape" | "plants" | "equipment" | "review";

type StepMeta = {
  id: BuilderStepId;
  title: string;
  summary: string;
};

const STEP_ORDER: BuilderStepId[] = [
  "tank",
  "substrate",
  "hardscape",
  "plants",
  "equipment",
  "review",
];

const STEP_META: Record<BuilderStepId, StepMeta> = {
  tank: {
    id: "tank",
    title: "Choose tank",
    summary: "Pick the physical dimensions first. Everything else is constrained around this.",
  },
  substrate: {
    id: "substrate",
    title: "Select substrate",
    summary: "Set your substrate to guide plant/rooting and compatibility assumptions.",
  },
  hardscape: {
    id: "hardscape",
    title: "Place hardscape",
    summary: "Arrange rocks/wood to establish layout structure and swimming lanes.",
  },
  plants: {
    id: "plants",
    title: "Add plants",
    summary: "Layer foreground/midground/background plants and tune density.",
  },
  equipment: {
    id: "equipment",
    title: "Finish equipment",
    summary: "Pick light/filter/CO2 and related gear to complete a workable setup.",
  },
  review: {
    id: "review",
    title: "Review and publish",
    summary: "Check BOM, compatibility warnings, and save or share your build.",
  },
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
      return "border-red-300 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "recommendation":
      return "border-sky-300 bg-sky-50 text-sky-800";
    case "completeness":
      return "border-neutral-300 bg-neutral-100 text-neutral-700";
  }
}

function buildBomLines(params: {
  tank: VisualTank | null;
  assetsById: Map<string, VisualAsset>;
  selectedProductByCategory: Record<string, string | undefined>;
  canvasItems: VisualCanvasItem[];
  categoriesBySlug: Map<string, string>;
  substrateBagCount: number;
  substrateNote?: string;
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

    const quantity = categorySlug === "substrate" ? params.substrateBagCount : 1;
    const notes = categorySlug === "substrate" ? params.substrateNote : undefined;

    lines.push({
      key: `product:${asset.id}:${categorySlug}`,
      categorySlug,
      categoryName: params.categoriesBySlug.get(categorySlug) ?? categoryLabel(categorySlug),
      quantity: Math.max(1, quantity),
      notes,
      saveEligible: true,
      retailerLinks: asset.retailerLinks ?? [],
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
      saveEligible: asset.type !== "design",
      retailerLinks: asset.retailerLinks ?? [],
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
  return lines
    .filter((line) => line.saveEligible !== false)
    .map((line) => {
      if (line.type === "tank") {
        return {
          categorySlug: "tank",
          productId: line.asset.id,
          quantity: line.quantity,
          notes: line.notes,
          selectedOfferId: line.asset.offerId ?? undefined,
        };
      }
      if (line.type === "product") {
        return {
          categorySlug: line.categorySlug,
          productId: line.asset.id,
          quantity: line.quantity,
          notes: line.notes,
          selectedOfferId: line.asset.offerId ?? undefined,
        };
      }
      return {
        categorySlug: "plants",
        plantId: line.asset.id,
        quantity: line.quantity,
        notes: line.notes,
      };
    });
}

function lineUnitPrice(asset: VisualAsset | VisualTank): number {
  if ("estimatedUnitPriceCents" in asset && asset.estimatedUnitPriceCents != null) {
    return asset.priceCents ?? asset.estimatedUnitPriceCents;
  }
  return asset.priceCents ?? 0;
}

function stepAllowsAsset(step: BuilderStepId, asset: VisualAsset, equipmentCategory: string): boolean {
  if (step === "substrate") return asset.type === "product" && asset.categorySlug === "substrate";
  if (step === "hardscape") return asset.categorySlug === "hardscape";
  if (step === "plants") return asset.categorySlug === "plants";
  if (step === "equipment") {
    return (
      asset.type === "product" &&
      !CANVAS_CATEGORIES.has(asset.categorySlug) &&
      asset.categorySlug !== "substrate" &&
      asset.categorySlug !== "tank" &&
      asset.categorySlug === equipmentCategory
    );
  }
  return false;
}

export function VisualBuilderPage(props: { initialBuild?: InitialBuildResponse | null }) {
  const router = useRouter();
  const { status } = useSession();

  const [search, setSearch] = useState("");
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>("light");
  const [currentStep, setCurrentStep] = useState<BuilderStepId>("tank");
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
  const setSubstrateProfile = useVisualBuilderStore((s) => s.setSubstrateProfile);
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
      if (asset.categorySlug === "substrate" || asset.categorySlug === "tank") continue;
      set.add(asset.categorySlug);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const activeEquipmentCategory =
    equipmentCategories.includes(equipmentCategoryFilter)
      ? equipmentCategoryFilter
      : (equipmentCategories[0] ?? "light");

  const hardscapeCount = useMemo(() => {
    return canvasState.items.filter((item) => item.categorySlug === "hardscape").length;
  }, [canvasState.items]);

  const plantCount = useMemo(() => {
    return canvasState.items.filter((item) => item.categorySlug === "plants").length;
  }, [canvasState.items]);

  const stepCompletion = useMemo(() => {
    return {
      tank: Boolean(selectedTank),
      substrate: Boolean(selectedProductByCategory.substrate),
      hardscape: hardscapeCount > 0,
      plants: plantCount > 0,
      equipment: Boolean(selectedProductByCategory.light) && Boolean(selectedProductByCategory.filter),
      review: false,
    } satisfies Record<BuilderStepId, boolean>;
  }, [hardscapeCount, plantCount, selectedProductByCategory.filter, selectedProductByCategory.light, selectedProductByCategory.substrate, selectedTank]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const nextStep = currentStepIndex >= 0 && currentStepIndex < STEP_ORDER.length - 1
    ? STEP_ORDER[currentStepIndex + 1]
    : null;
  const previousStep = currentStepIndex > 0 ? STEP_ORDER[currentStepIndex - 1] : null;

  const canContinueCurrentStep =
    currentStep === "equipment"
      ? true
      : currentStep === "review"
        ? false
        : stepCompletion[currentStep];

  const canNavigateToStep = (target: BuilderStepId): boolean => {
    const targetIndex = STEP_ORDER.indexOf(target);
    if (targetIndex <= currentStepIndex) return true;
    for (let i = 0; i < targetIndex; i += 1) {
      const id = STEP_ORDER[i]!;
      if (id === "review") continue;
      if (!stepCompletion[id]) return false;
    }
    return true;
  };

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();

    const sourceRank: Record<string, number> = {
      design_archetype: 0,
      catalog_plant: 1,
      catalog_product: 2,
    };

    return (assets ?? [])
      .filter((asset) => {
        if (!stepAllowsAsset(currentStep, asset, activeEquipmentCategory)) return false;

        if (!q) return true;
        const tags = asset.tags?.join(" ") ?? "";
        const haystack = `${asset.name} ${asset.slug} ${asset.categoryName} ${tags}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const aRank = sourceRank[a.sourceMode] ?? 99;
        const bRank = sourceRank[b.sourceMode] ?? 99;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      });
  }, [activeEquipmentCategory, assets, currentStep, search]);

  const selectedSubstrateAsset = useMemo(() => {
    const substrateId = selectedProductByCategory.substrate;
    if (!substrateId) return null;
    const asset = assetsById.get(substrateId);
    if (!asset || asset.type !== "product" || asset.categorySlug !== "substrate") return null;
    return asset;
  }, [assetsById, selectedProductByCategory.substrate]);

  const substrateVolume = useMemo(() => {
    return estimateSubstrateVolume({
      tankWidthIn: selectedTank?.widthIn ?? canvasState.widthIn,
      tankDepthIn: selectedTank?.depthIn ?? canvasState.depthIn,
      tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
      profile: canvasState.substrateProfile,
    });
  }, [
    canvasState.depthIn,
    canvasState.heightIn,
    canvasState.substrateProfile,
    canvasState.widthIn,
    selectedTank?.depthIn,
    selectedTank?.heightIn,
    selectedTank?.widthIn,
  ]);

  const substrateBagVolumeLiters = selectedSubstrateAsset?.bagVolumeLiters ?? 8;
  const substrateBags = useMemo(() => {
    return estimateSubstrateBags({
      volumeLiters: substrateVolume.volumeLiters,
      bagVolumeLiters: substrateBagVolumeLiters,
    });
  }, [substrateBagVolumeLiters, substrateVolume.volumeLiters]);

  const bomLines = useMemo(
    () =>
      buildBomLines({
        tank: selectedTank,
        assetsById,
        selectedProductByCategory,
        canvasItems: canvasState.items,
        categoriesBySlug,
        substrateBagCount:
          selectedProductByCategory.substrate != null ? substrateBags.bagsRequired : 1,
        substrateNote:
          selectedProductByCategory.substrate != null
            ? `${substrateVolume.volumeLiters.toFixed(1)} L target fill (${substrateBags.bagVolumeLiters.toFixed(1)} L per bag)`
            : undefined,
      }),
    [
      assetsById,
      canvasState.items,
      categoriesBySlug,
      selectedProductByCategory,
      selectedTank,
      substrateBags.bagVolumeLiters,
      substrateBags.bagsRequired,
      substrateVolume.volumeLiters,
    ],
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

  const handleChooseAsset = (asset: VisualAsset) => {
    if (!stepAllowsAsset(currentStep, asset, activeEquipmentCategory)) {
      setSaveState({
        type: "error",
        message: `Complete the current step first: ${STEP_META[currentStep].title}.`,
      });
      return;
    }

    if (CANVAS_CATEGORIES.has(asset.categorySlug)) {
      addCanvasItemFromAsset(asset);
      if (currentStep === "hardscape" && hardscapeCount === 0) setCurrentStep("plants");
      return;
    }

    if (asset.type === "product") {
      setSelectedProduct(asset.categorySlug, asset.id);
      if (currentStep === "substrate") setCurrentStep("hardscape");
    }
  };

  const onDropAsset = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData("text/asset-id");
    if (!assetId) return;
    const asset = assetsById.get(assetId);
    if (!asset) return;

    if (!stepAllowsAsset(currentStep, asset, activeEquipmentCategory)) {
      setSaveState({
        type: "error",
        message: `You are on \"${STEP_META[currentStep].title}\". Move to the matching step to place this item.`,
      });
      return;
    }

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

  const tankDepthPanePercent = selectedTank
    ? Math.min(20, Math.max(8, (selectedTank.depthIn / selectedTank.widthIn) * 34))
    : 12;
  const substrateContour = substrateContourPercentages({
    profile: substrateVolume.normalizedProfile,
    tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
  });

  const handleContinue = () => {
    if (!nextStep) return;
    setCurrentStep(nextStep);
  };

  const buildLink =
    shareSlug && typeof window !== "undefined" ? `${window.location.origin}/builder/${shareSlug}` : null;

  return (
    <div className="ptl-builder-bg min-h-screen pb-10">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
        <header className="ptl-surface-strong p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[240px] flex-1">
              <div className="ptl-kicker">Guided visual builder</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Build your tank step by step
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-neutral-700 sm:text-base">
                Follow the sequence: tank, substrate, hardscape, plants, then equipment. The canvas and
                compatibility update live as you make each choice.
              </p>
            </div>

            <div className="min-w-[260px] flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Build name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                style={{ borderColor: "var(--ptl-border)" }}
                placeholder="Visual Build"
              />
            </div>

            <div className="min-w-[260px] flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Description
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                style={{ borderColor: "var(--ptl-border)" }}
                placeholder="Low-tech jungle with easy maintenance"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => saveBuild(false)}
              disabled={saveMutation.isPending}
              className="ptl-btn-secondary disabled:cursor-wait disabled:opacity-60"
            >
              Save draft
            </button>
            <button onClick={handleDuplicate} className="ptl-btn-secondary">
              Duplicate
            </button>
            <button
              onClick={() => saveBuild(true)}
              disabled={saveMutation.isPending}
              className="ptl-btn-primary disabled:cursor-wait disabled:opacity-60"
            >
              Share
            </button>
            <button onClick={handleExport} className="ptl-btn-secondary">
              Export PNG
            </button>
            <button
              onClick={() => {
                resetAll();
                setCurrentStep("tank");
              }}
              className="ptl-btn-secondary"
            >
              Reset
            </button>

            {buildLink ? (
              <a
                className="ptl-pill"
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
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : saveState.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-neutral-200 bg-neutral-100 text-neutral-700"
                }`}
              >
                {saveState.message}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
            <span>
              Build ID: <span className="font-mono text-neutral-800">{buildId ?? "draft"}</span>
            </span>
            <span>
              Share: <span className="font-mono text-neutral-800">{shareSlug ?? "not published"}</span>
            </span>
          </div>
        </header>

        <section className="ptl-surface mt-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {STEP_ORDER.map((stepId, index) => {
              const meta = STEP_META[stepId];
              const active = currentStep === stepId;
              const done = stepCompletion[stepId];
              const blocked = !canNavigateToStep(stepId);
              return (
                <button
                  key={stepId}
                  onClick={() => {
                    if (blocked) return;
                    setCurrentStep(stepId);
                  }}
                  disabled={blocked}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-neutral-300 bg-white text-neutral-700"
                  } ${blocked ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  {index + 1}. {meta.title}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/70 p-3" style={{ borderColor: "var(--ptl-border)" }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Step {currentStepIndex + 1} of {STEP_ORDER.length}
              </div>
              <div className="mt-0.5 text-base font-semibold text-neutral-900">{STEP_META[currentStep].title}</div>
              <div className="mt-0.5 text-sm text-neutral-700">{STEP_META[currentStep].summary}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!previousStep) return;
                  setCurrentStep(previousStep);
                }}
                disabled={!previousStep}
                className="ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {currentStep === "equipment" && !stepCompletion.equipment ? (
                <button onClick={() => setCurrentStep("review")} className="ptl-btn-secondary">
                  Skip for now
                </button>
              ) : null}
              <button
                onClick={handleContinue}
                disabled={!nextStep || !canContinueCurrentStep}
                className="ptl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentStep === "review" ? "Ready to publish" : "Continue"}
              </button>
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="ptl-surface p-4">
            <h2 className="ptl-card-title text-neutral-900">{STEP_META[currentStep].title}</h2>
            <p className="mt-1 text-sm text-neutral-700">{STEP_META[currentStep].summary}</p>

            {currentStep === "tank" ? (
              <div className="mt-3 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                  Rimless tank
                </label>
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
                  className="w-full rounded-xl border bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  {(tanks ?? []).map((tank) => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name} ({tank.widthIn} in x {tank.depthIn} in x {tank.heightIn} in)
                    </option>
                  ))}
                </select>

                {selectedTank ? (
                  <div className="rounded-xl border bg-white/70 p-3 text-sm" style={{ borderColor: "var(--ptl-border)" }}>
                    <div className="font-semibold text-neutral-900">{selectedTank.name}</div>
                    <div className="mt-1 text-neutral-700">
                      Dimensions: {selectedTank.widthIn} x {selectedTank.depthIn} x {selectedTank.heightIn} in
                    </div>
                    <div className="mt-0.5 text-neutral-700">Best price: {formatMoney(selectedTank.priceCents)}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {["substrate", "hardscape", "plants", "equipment"].includes(currentStep) ? (
              <div className="mt-3 space-y-3">
                {currentStep === "equipment" ? (
                  <div className="flex flex-wrap gap-2">
                    {equipmentCategories.map((slug) => (
                      <button
                        key={slug}
                        onClick={() => setEquipmentCategoryFilter(slug)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          activeEquipmentCategory === slug
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-neutral-300 bg-white text-neutral-700"
                        }`}
                      >
                        {categoryLabel(slug)}
                      </button>
                    ))}
                  </div>
                ) : null}

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assets..."
                  className="w-full rounded-xl border bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  style={{ borderColor: "var(--ptl-border)" }}
                />

                {currentStep === "substrate" ? (
                  <div
                    className="space-y-2 rounded-xl border bg-white/70 p-3"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                      Substrate profile
                    </div>
                    <label className="block text-[11px] text-neutral-700">
                      Left depth ({substrateVolume.normalizedProfile.leftDepthIn.toFixed(1)} in)
                      <input
                        type="range"
                        min={0.2}
                        max={Math.max(2, (selectedTank?.heightIn ?? canvasState.heightIn) * 0.62)}
                        step={0.1}
                        value={substrateVolume.normalizedProfile.leftDepthIn}
                        onChange={(event) =>
                          setSubstrateProfile({ leftDepthIn: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[11px] text-neutral-700">
                      Center depth ({substrateVolume.normalizedProfile.centerDepthIn.toFixed(1)} in)
                      <input
                        type="range"
                        min={0.2}
                        max={Math.max(2, (selectedTank?.heightIn ?? canvasState.heightIn) * 0.62)}
                        step={0.1}
                        value={substrateVolume.normalizedProfile.centerDepthIn}
                        onChange={(event) =>
                          setSubstrateProfile({ centerDepthIn: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[11px] text-neutral-700">
                      Right depth ({substrateVolume.normalizedProfile.rightDepthIn.toFixed(1)} in)
                      <input
                        type="range"
                        min={0.2}
                        max={Math.max(2, (selectedTank?.heightIn ?? canvasState.heightIn) * 0.62)}
                        step={0.1}
                        value={substrateVolume.normalizedProfile.rightDepthIn}
                        onChange={(event) =>
                          setSubstrateProfile({ rightDepthIn: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[11px] text-neutral-700">
                      Mound height ({substrateVolume.normalizedProfile.moundHeightIn.toFixed(1)} in)
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, (selectedTank?.heightIn ?? canvasState.heightIn) * 0.38)}
                        step={0.1}
                        value={substrateVolume.normalizedProfile.moundHeightIn}
                        onChange={(event) =>
                          setSubstrateProfile({ moundHeightIn: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[11px] text-neutral-700">
                      Mound position ({Math.round(substrateVolume.normalizedProfile.moundPosition * 100)}%)
                      <input
                        type="range"
                        min={0.2}
                        max={0.8}
                        step={0.01}
                        value={substrateVolume.normalizedProfile.moundPosition}
                        onChange={(event) =>
                          setSubstrateProfile({ moundPosition: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <div className="rounded-lg border bg-white px-2 py-1.5 text-[11px] text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                      Target fill: {substrateVolume.volumeLiters.toFixed(1)} L
                      {selectedSubstrateAsset ? (
                        <span>
                          {" "}
                          · {substrateBags.bagsRequired} bag(s) of {substrateBags.bagVolumeLiters.toFixed(1)} L
                        </span>
                      ) : (
                        <span> · Pick a substrate product to compute bag count.</span>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="max-h-[56vh] space-y-2 overflow-auto pr-1">
                  {filteredAssets.map((asset) => {
                    const selectedProductId = selectedProductByCategory[asset.categorySlug] ?? null;
                    const isSelectedEquipment =
                      asset.type === "product" && !CANVAS_CATEGORIES.has(asset.categorySlug) && selectedProductId === asset.id;

                    return (
                      <div
                        key={`${asset.type}:${asset.id}:${asset.categorySlug}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/asset-id", asset.id);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        className="rounded-xl border bg-white/80 p-2"
                        style={{ borderColor: "var(--ptl-border)" }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--ptl-border)" }}>
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
                              <div className="text-[10px] text-neutral-500">No image</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-neutral-900">{asset.name}</div>
                            <div className="mt-0.5 text-[11px] text-neutral-600">{asset.categoryName}</div>
                            <div className="mt-0.5 text-[11px] text-neutral-600">
                              {asset.sourceMode === "design_archetype" ? "Design asset" : "Catalog item"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-neutral-600">
                              {asset.widthIn.toFixed(1)} in x {asset.depthIn.toFixed(1)} in x {asset.heightIn.toFixed(1)} in
                            </div>
                            <div className="mt-0.5 text-[11px] text-neutral-700">
                              {formatMoney(lineUnitPrice(asset))}
                              {asset.sourceMode === "design_archetype" ? " est." : ""}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleChooseAsset(asset)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                              isSelectedEquipment
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-emerald-600 bg-emerald-600 text-white"
                            }`}
                            style={isSelectedEquipment ? undefined : { borderColor: "#157f5a" }}
                          >
                            {CANVAS_CATEGORIES.has(asset.categorySlug)
                              ? "Add to canvas"
                              : isSelectedEquipment
                                ? "Selected"
                                : "Select"}
                          </button>

                          {asset.purchaseUrl ? (
                            <a
                              href={asset.purchaseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700"
                              style={{ borderColor: "var(--ptl-border)" }}
                            >
                              View
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {filteredAssets.length === 0 ? (
                    <div className="rounded-xl border bg-white/70 p-3 text-xs text-neutral-600" style={{ borderColor: "var(--ptl-border)" }}>
                      No assets match this step/filter yet.
                    </div>
                  ) : null}
                </div>

                {currentStep === "hardscape" ? (
                  <div className="rounded-xl border bg-white/70 p-2 text-xs text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                    Hardscape placed: <span className="font-semibold">{hardscapeCount}</span>
                  </div>
                ) : null}

                {currentStep === "plants" ? (
                  <div className="rounded-xl border bg-white/70 p-2 text-xs text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                    Plants placed: <span className="font-semibold">{plantCount}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep === "review" ? (
              <div className="mt-3 space-y-2 rounded-xl border bg-white/70 p-3 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                <div>
                  <span className="font-semibold text-neutral-900">Tank:</span> {selectedTank?.name ?? "None"}
                </div>
                <div>
                  <span className="font-semibold text-neutral-900">Substrate:</span>{" "}
                  {selectedProductByCategory.substrate
                    ? `${substrateBags.bagsRequired} bag(s) · ${substrateVolume.volumeLiters.toFixed(1)} L`
                    : "Not selected"}
                </div>
                <div>
                  <span className="font-semibold text-neutral-900">Hardscape items:</span> {hardscapeCount}
                </div>
                <div>
                  <span className="font-semibold text-neutral-900">Plant items:</span> {plantCount}
                </div>
                <div>
                  <span className="font-semibold text-neutral-900">Estimated total:</span> {formatMoney(totalCents)}
                </div>
              </div>
            ) : null}
          </aside>

          <section className="ptl-surface p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Visual canvas</h2>
                <p className="text-xs text-neutral-600">
                  Drag items into the glass tank. Layout scales to real tank dimensions.
                </p>
              </div>
              {selectedTank ? (
                <div className="rounded-full border bg-white px-3 py-1 text-xs text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                  {selectedTank.widthIn} x {selectedTank.depthIn} x {selectedTank.heightIn} in
                </div>
              ) : null}
            </div>

            <div
              className="mx-auto w-full max-w-[1020px] rounded-[28px] border p-2 sm:p-3"
              style={{
                borderColor: "rgba(84, 108, 113, 0.45)",
                background:
                  "linear-gradient(180deg, rgba(240,248,252,0.95), rgba(226,239,243,0.92))",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 32px rgba(13,33,34,0.16)",
              }}
            >
              <div
                ref={canvasRef}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={onDropAsset}
                className="relative w-full overflow-hidden rounded-[18px] border"
                style={{
                  borderColor: "rgba(109, 140, 149, 0.85)",
                  background:
                    "linear-gradient(180deg, rgba(214,240,252,0.9) 0%, rgba(191,226,241,0.88) 55%, rgba(178,218,234,0.9) 100%)",
                  aspectRatio: selectedTank
                    ? `${selectedTank.widthIn} / ${selectedTank.heightIn}`
                    : `${canvasState.widthIn} / ${canvasState.heightIn}`,
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-18" style={{ backgroundImage: "url('/images/builder-hero-960.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-white/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-[14%] h-px bg-white/90" />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    clipPath: `polygon(0% 100%, 0% ${substrateContour.leftTopPct}%, ${Math.max(
                      6,
                      substrateContour.moundPositionPct - 6,
                    )}% ${Math.min(99, substrateContour.moundTopPct + 2)}%, ${
                      substrateContour.moundPositionPct
                    }% ${substrateContour.moundTopPct}%, ${Math.min(
                      94,
                      substrateContour.moundPositionPct + 6,
                    )}% ${Math.min(99, substrateContour.centerTopPct + 1)}%, 50% ${
                      substrateContour.centerTopPct
                    }%, 100% ${substrateContour.rightTopPct}%, 100% 100%)`,
                    background:
                      "linear-gradient(180deg, rgba(217,197,157,0.92) 0%, rgba(202,175,125,0.95) 56%, rgba(174,145,96,0.96) 100%)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    clipPath: `polygon(0% 100%, 0% ${substrateContour.leftTopPct}%, ${Math.max(
                      6,
                      substrateContour.moundPositionPct - 6,
                    )}% ${Math.min(99, substrateContour.moundTopPct + 2)}%, ${
                      substrateContour.moundPositionPct
                    }% ${substrateContour.moundTopPct}%, ${Math.min(
                      94,
                      substrateContour.moundPositionPct + 6,
                    )}% ${Math.min(99, substrateContour.centerTopPct + 1)}%, 50% ${
                      substrateContour.centerTopPct
                    }%, 100% ${substrateContour.rightTopPct}%, 100% 100%)`,
                    background:
                      "repeating-linear-gradient(135deg, rgba(88,68,44,0.16) 0, rgba(88,68,44,0.16) 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 6px)",
                  }}
                />
                <div
                  className="pointer-events-none absolute left-0 right-0 h-px"
                  style={{
                    top: `${substrateContour.centerTopPct}%`,
                    background:
                      "linear-gradient(90deg, rgba(133,108,72,0.45), rgba(245,236,216,0.7), rgba(133,108,72,0.45))",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-y-[9%] right-0 border-l"
                  style={{
                    width: `${tankDepthPanePercent}%`,
                    borderColor: "rgba(255,255,255,0.55)",
                    background:
                      "linear-gradient(270deg, rgba(132,176,191,0.35), rgba(132,176,191,0.08))",
                  }}
                />

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
                              ? "border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.45)]"
                              : "border-black/10"
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
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
                              {asset.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mx-auto mt-2 h-3 w-[96%] rounded-b-2xl bg-[#6c7d85]/45" />
            </div>

            <div className="mt-3 rounded-xl border bg-white/70 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              {selectedItem && selectedAsset ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-neutral-600">Selected item</div>
                    <div className="text-sm font-semibold text-neutral-900">{selectedAsset.name}</div>
                    <div className="text-xs text-neutral-600">
                      {selectedAsset.categoryName} · layer {selectedItem.layer + 1}
                    </div>
                  </div>

                  <label className="text-xs text-neutral-700">
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
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="text-xs text-neutral-700">
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
                      className="mt-1 w-full"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => moveCanvasItemLayer(selectedItem.id, "up")}
                      className="ptl-btn-secondary !px-2 !py-1 !text-[11px]"
                    >
                      Layer +
                    </button>
                    <button
                      onClick={() => moveCanvasItemLayer(selectedItem.id, "down")}
                      className="ptl-btn-secondary !px-2 !py-1 !text-[11px]"
                    >
                      Layer -
                    </button>
                    <button
                      onClick={() => duplicateCanvasItem(selectedItem.id)}
                      className="ptl-btn-secondary !px-2 !py-1 !text-[11px]"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => removeCanvasItem(selectedItem.id)}
                      className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-600">
                  Select an object on the canvas to adjust scale, rotation, layering, duplicate, or delete.
                </div>
              )}
            </div>
          </section>

          <aside className="ptl-surface p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Bill of Materials</h2>
            <div className="mt-1 text-xs text-neutral-600">
              Live pricing is best-effort from current in-stock offers.
            </div>

            <div className="mt-3 space-y-2">
              {bomLines.map((line) => {
                const canBuy = line.asset.goUrl || line.asset.purchaseUrl || line.retailerLinks?.length;
                const buyUrl = line.asset.goUrl ?? line.asset.purchaseUrl ?? null;
                const unitPrice = lineUnitPrice(line.asset);
                const totalLinePrice = unitPrice * line.quantity;
                return (
                  <div key={line.key} className="rounded-xl border bg-white/80 p-2.5" style={{ borderColor: "var(--ptl-border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-600">
                          {line.categoryName}
                        </div>
                        <div className="text-sm font-semibold text-neutral-900">{line.asset.name}</div>
                        <div className="text-xs text-neutral-600">
                          Qty {line.quantity} · Unit {formatMoney(unitPrice)}
                          {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                            ? " est."
                            : ""}
                        </div>
                        {line.notes ? <div className="text-[11px] text-neutral-600">{line.notes}</div> : null}
                      </div>
                      <div className="text-sm font-semibold text-neutral-900">
                        {formatMoney(totalLinePrice)}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-neutral-500">
                        {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                          ? `Material ${line.asset.materialType ?? "generic"}`
                          : `SKU ${line.asset.sku ?? "n/a"}`}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {buyUrl ? (
                          <a
                            href={buyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-emerald-600 bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            Buy
                          </a>
                        ) : null}
                        {(line.retailerLinks ?? []).slice(0, 2).map((link) => (
                          <a
                            key={`${line.key}:${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700"
                            style={{ borderColor: "var(--ptl-border)" }}
                          >
                            {link.label}
                          </a>
                        ))}
                        {!canBuy ? (
                          <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
                            No offer
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {bomLines.length === 0 ? (
                <div className="rounded-xl border bg-white/70 p-3 text-xs text-neutral-600" style={{ borderColor: "var(--ptl-border)" }}>
                  Add assets to begin building your bill of materials.
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">Estimated total</span>
                <span className="font-semibold text-neutral-900">{formatMoney(totalCents)}</span>
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                {bomLines.length} line item(s), {canvasState.items.length} canvas object(s)
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Compatibility</h3>
                <label className="flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={compatibilityEnabled}
                    onChange={(event) => setCompatibilityEnabled(event.target.checked)}
                  />
                  Enabled
                </label>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                  <input
                    type="checkbox"
                    checked={flags.lowTechNoCo2}
                    onChange={(event) => setLowTechNoCo2(event.target.checked)}
                  />
                  Low-tech
                </label>
                <label className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                  <input
                    type="checkbox"
                    checked={flags.hasShrimp}
                    onChange={(event) => setHasShrimp(event.target.checked)}
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
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                    No compatibility issues detected.
                  </div>
                ) : null}

                {compatibility.hardscapeVolumeRatio != null ? (
                  <div className="text-[11px] text-neutral-600">
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
