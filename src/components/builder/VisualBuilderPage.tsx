"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/components/TRPCProvider";
import { SmartImage } from "@/components/SmartImage";
import { evaluateVisualCompatibility } from "@/components/builder/visual/compatibility";
import { exportVisualLayoutPng } from "@/components/builder/visual/export";
import {
  VisualBuilderScene,
  type BuilderSceneQualityTier,
  type BuilderSceneStep,
  type BuilderSceneToolMode,
} from "@/components/builder/visual/VisualBuilderScene";
import {
  buildSubstratePreset,
  type SubstrateBrushMode,
} from "@/components/builder/visual/scene-utils";
import type {
  VisualAsset,
  VisualCanvasItem,
  VisualLineItem,
  VisualRetailerLink,
  VisualTank,
} from "@/components/builder/visual/types";
import type { CompatibilityRule, Severity } from "@/engine/types";
import { trackEvent } from "@/lib/analytics";
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

type BuilderStepId = BuilderSceneStep;

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
    summary: "Pick dimensions and framing first. It drives scene scale and compatibility.",
  },
  substrate: {
    id: "substrate",
    title: "Sculpt substrate",
    summary: "Shape terrain with presets and brush controls. This is your composition foundation.",
  },
  hardscape: {
    id: "hardscape",
    title: "Place hardscape",
    summary: "Set structural rhythm with rock/wood massing before planting.",
  },
  plants: {
    id: "plants",
    title: "Plant zones",
    summary: "Build foreground, midground, and background depth with cluster placement.",
  },
  equipment: {
    id: "equipment",
    title: "Add equipment",
    summary: "Place practical gear while keeping visual hierarchy focused on the aquascape.",
  },
  review: {
    id: "review",
    title: "Review and publish",
    summary: "Finalize BOM, compatibility checks, and share/export output.",
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
      return "border-red-300 bg-red-50/95 text-red-800";
    case "warning":
      return "border-amber-300 bg-amber-50/95 text-amber-800";
    case "recommendation":
      return "border-sky-300 bg-sky-50/95 text-sky-800";
    case "completeness":
      return "border-neutral-300 bg-neutral-100/95 text-neutral-700";
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

function clampRotationDeg(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < -180) return -180;
  if (value > 180) return 180;
  return value;
}

async function exportCanvasPng(canvas: HTMLCanvasElement, fileName?: string): Promise<void> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Unable to capture scene PNG."));
        return;
      }
      resolve(nextBlob);
    }, "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `plantedtanklab-build-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
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
  const [toolMode, setToolMode] = useState<BuilderSceneToolMode>("move");
  const [placementAssetId, setPlacementAssetId] = useState<string | null>(null);
  const [placementRotationDeg, setPlacementRotationDeg] = useState(0);
  const [clusterBrushCount, setClusterBrushCount] = useState(4);
  const [sculptMode, setSculptMode] = useState<SubstrateBrushMode>("raise");
  const [sculptBrushSize, setSculptBrushSize] = useState(0.25);
  const [sculptStrength, setSculptStrength] = useState(0.42);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [cameraDiagnostics, setCameraDiagnostics] = useState({
    unexpectedPoseDeltas: 0,
    lastStep: null as BuilderStepId | null,
    intentCount: 0,
    lastIntent: null as "reframe" | "reset" | null,
    lastIntentStep: null as BuilderStepId | null,
    interactionStarts: 0,
    freeStepTransitions: 0,
    restoreChecks: 0,
    lastPoseDelta: null as { step: BuilderStepId; positionDelta: number; targetDelta: number } | null,
  });
  const [cameraIntent, setCameraIntent] = useState<{ type: "reframe" | "reset"; seq: number } | null>(null);
  const [cameraEvidenceCopyStatus, setCameraEvidenceCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [showExpandedCameraEvidence, setShowExpandedCameraEvidence] = useState(false);
  const cameraEvidenceCopyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const setSubstrateHeightfield = useVisualBuilderStore((s) => s.setSubstrateHeightfield);
  const setSceneSettings = useVisualBuilderStore((s) => s.setSceneSettings);
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

  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
  }, [
    hardscapeCount,
    plantCount,
    selectedProductByCategory.filter,
    selectedProductByCategory.light,
    selectedProductByCategory.substrate,
    selectedTank,
  ]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < STEP_ORDER.length - 1
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

  const placementAsset = useMemo(() => {
    if (!placementAssetId) return null;
    return assetsById.get(placementAssetId) ?? null;
  }, [assetsById, placementAssetId]);

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
      heightfield: canvasState.substrateHeightfield,
    });
  }, [
    canvasState.depthIn,
    canvasState.heightIn,
    canvasState.substrateHeightfield,
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

  const autoQualityTier = useMemo<BuilderSceneQualityTier>(() => {
    if (typeof navigator === "undefined") return "medium";
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = navigator.hardwareConcurrency ?? 6;
    const memory = nav.deviceMemory ?? 8;
    if (cores <= 4 || memory <= 4) return "low";
    if (cores <= 8 || memory <= 8) return "medium";
    return "high";
  }, []);

  const qualityTier: BuilderSceneQualityTier =
    canvasState.sceneSettings.qualityTier === "auto"
      ? autoQualityTier
      : canvasState.sceneSettings.qualityTier;

  const equipmentSceneAssets = useMemo(() => {
    const next: VisualAsset[] = [];
    for (const [categorySlug, productId] of Object.entries(selectedProductByCategory)) {
      if (!productId) continue;
      if (CANVAS_CATEGORIES.has(categorySlug)) continue;
      if (categorySlug === "substrate" || categorySlug === "tank") continue;
      const asset = assetsById.get(productId);
      if (!asset) continue;
      next.push(asset);
    }
    return next;
  }, [assetsById, selectedProductByCategory]);

  const applyStepChange = (nextStep: BuilderStepId) => {
    if (nextStep !== currentStep && canvasState.sceneSettings.cameraPreset === "free") {
      setCameraDiagnostics((prev) => ({
        ...prev,
        freeStepTransitions: prev.freeStepTransitions + 1,
      }));
    }

    setCurrentStep(nextStep);
    if (nextStep === "substrate") {
      setToolMode("sculpt");
      return;
    }
    if (nextStep === "hardscape" || nextStep === "plants") {
      setToolMode("place");
      return;
    }
    setToolMode("move");
    setPlacementAssetId(null);
  };

  const triggerCameraIntent = (type: "reframe" | "reset") => {
    const nextSeq = (cameraIntent?.seq ?? 0) + 1;
    setSceneSettings({ cameraPreset: "step" });
    setCameraIntent({ type, seq: nextSeq });
    setCameraDiagnostics((prev) => ({
      ...prev,
      intentCount: prev.intentCount + 1,
      lastIntent: type,
      lastIntentStep: currentStep,
    }));

    void trackEvent("camera_command_invoked", {
      buildId: buildId ?? undefined,
      meta: {
        command: type === "reframe" ? "frame_tank" : "reset",
        step_id: currentStep,
        trigger_source: "user",
      },
    });
  };

  const handleChooseAsset = (asset: VisualAsset) => {
    if (!stepAllowsAsset(currentStep, asset, activeEquipmentCategory)) {
      setSaveState({
        type: "error",
        message: `You are currently on ${STEP_META[currentStep].title}.`,
      });
      return;
    }

    if (CANVAS_CATEGORIES.has(asset.categorySlug)) {
      setPlacementAssetId(asset.id);
      setToolMode("place");
      setSelectedItem(null);
      setSaveState({ type: "ok", message: `Placement mode armed for ${asset.name}.` });
      return;
    }

    if (asset.type === "product") {
      setSelectedProduct(asset.categorySlug, asset.id);
      setSaveState({ type: "ok", message: `${asset.name} selected.` });
    }
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
      if (sceneCanvasRef.current) {
        await exportCanvasPng(sceneCanvasRef.current);
      } else {
        await exportVisualLayoutPng({
          tank: selectedTank,
          assetsById,
          items: canvasState.items,
        });
      }
      setSaveState({ type: "ok", message: "PNG export created." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export PNG.";
      setSaveState({ type: "error", message });
    }
  };

  const handleScenePlace = (request: {
    asset: VisualAsset;
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: number;
    anchorType: VisualCanvasItem["anchorType"];
    depthZone: VisualCanvasItem["depthZone"];
    transform: VisualCanvasItem["transform"];
  }) => {
    addCanvasItemFromAsset(request.asset, {
      x: request.x,
      y: request.y,
      z: request.z,
      scale: request.scale,
      rotation: request.rotation,
      anchorType: request.anchorType,
      depthZone: request.depthZone,
      transform: request.transform,
    });

    if (currentStep === "hardscape" && hardscapeCount === 0) {
      setSaveState({ type: "ok", message: "Hardscape placed. Continue layering composition." });
    }
  };

  const handleSceneRotate = (itemId: string, deltaDeg: number) => {
    const item = canvasState.items.find((nextItem) => nextItem.id === itemId);
    if (!item) return;
    updateCanvasItem(itemId, {
      rotation: clampRotationDeg(item.rotation + deltaDeg),
    });
  };

  const handleApplySubstratePreset = (preset: "flat" | "island" | "slope" | "valley") => {
    const heightfield = buildSubstratePreset({
      preset,
      tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
    });
    setSubstrateHeightfield(heightfield);
  };

  const handleContinue = () => {
    if (!nextStep) return;
    applyStepChange(nextStep);
  };

  const buildLink =
    shareSlug && typeof window !== "undefined" ? `${window.location.origin}/builder/${shareSlug}` : null;

  const substrateContour = substrateContourPercentages({
    heightfield: canvasState.substrateHeightfield,
    tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
  });

  const cameraScenarioStatus = {
    s01:
      cameraDiagnostics.interactionStarts >= 1 && cameraDiagnostics.unexpectedPoseDeltas === 0
        ? "pass-ready"
        : cameraDiagnostics.unexpectedPoseDeltas > 0
          ? "fail-risk"
          : "pending",
    s02:
      cameraDiagnostics.freeStepTransitions >= 2 && cameraDiagnostics.unexpectedPoseDeltas === 0
        ? "pass-ready"
        : cameraDiagnostics.unexpectedPoseDeltas > 0
          ? "fail-risk"
          : "pending",
    s03: cameraDiagnostics.restoreChecks > 0 ? "pass-ready" : "pending",
  } as const;

  const cameraEvidenceCapturedAtIso = useMemo(
    () => new Date().toISOString(),
    [cameraDiagnostics, cameraScenarioStatus, canvasState.sceneSettings.cameraPreset, currentStep],
  );

  const cameraEvidenceCapturedAtLabel = useMemo(
    () =>
      new Date(cameraEvidenceCapturedAtIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [cameraEvidenceCapturedAtIso],
  );

  const cameraEvidenceSnapshot = useMemo(
    () =>
      JSON.stringify(
        {
          schema: "ptl.camera-gate-evidence",
          schemaVersion: 1,
          capturedAt: cameraEvidenceCapturedAtIso,
          step: currentStep,
          cameraMode: canvasState.sceneSettings.cameraPreset,
          scenarioStatus: {
            s01: cameraScenarioStatus.s01,
            s02: cameraScenarioStatus.s02,
            s03: cameraScenarioStatus.s03,
          },
          counters: {
            interactionStarts: cameraDiagnostics.interactionStarts,
            freeStepTransitions: cameraDiagnostics.freeStepTransitions,
            restoreChecks: cameraDiagnostics.restoreChecks,
            intentCount: cameraDiagnostics.intentCount,
            unexpectedPoseDeltas: cameraDiagnostics.unexpectedPoseDeltas,
          },
          lastIntent: cameraDiagnostics.lastIntent
            ? {
                type: cameraDiagnostics.lastIntent,
                step: cameraDiagnostics.lastIntentStep,
              }
            : null,
          lastPoseDelta: cameraDiagnostics.lastPoseDelta
            ? {
                step: cameraDiagnostics.lastPoseDelta.step,
                positionDelta: cameraDiagnostics.lastPoseDelta.positionDelta,
                targetDelta: cameraDiagnostics.lastPoseDelta.targetDelta,
              }
            : null,
        },
        null,
        2,
      ),
    [cameraDiagnostics, cameraScenarioStatus, canvasState.sceneSettings.cameraPreset, currentStep, cameraEvidenceCapturedAtIso],
  );

  const cameraEvidenceSummary = useMemo(
    () => ({
      step: currentStep,
      mode: canvasState.sceneSettings.cameraPreset,
      s01: cameraScenarioStatus.s01,
      s02: cameraScenarioStatus.s02,
      s03: cameraScenarioStatus.s03,
      unexpectedPoseDeltas: cameraDiagnostics.unexpectedPoseDeltas,
      intentCount: cameraDiagnostics.intentCount,
      lastIntent: cameraDiagnostics.lastIntent
        ? `${cameraDiagnostics.lastIntent} (${cameraDiagnostics.lastIntentStep ?? "unknown"})`
        : "none",
      lastPoseDelta: cameraDiagnostics.lastPoseDelta
        ? `${cameraDiagnostics.lastPoseDelta.step} · pos ${cameraDiagnostics.lastPoseDelta.positionDelta.toFixed(2)} · target ${cameraDiagnostics.lastPoseDelta.targetDelta.toFixed(2)}`
        : "none",
    }),
    [cameraDiagnostics, cameraScenarioStatus, canvasState.sceneSettings.cameraPreset, currentStep],
  );

  const copyCameraEvidenceSnapshot = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCameraEvidenceCopyStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(cameraEvidenceSnapshot);
      setCameraEvidenceCopyStatus("copied");
    } catch {
      setCameraEvidenceCopyStatus("error");
    }
  };

  useEffect(() => {
    if (cameraEvidenceCopyStatus === "idle") {
      return;
    }

    if (cameraEvidenceCopyResetTimerRef.current) {
      clearTimeout(cameraEvidenceCopyResetTimerRef.current);
    }

    cameraEvidenceCopyResetTimerRef.current = setTimeout(() => {
      setCameraEvidenceCopyStatus("idle");
      cameraEvidenceCopyResetTimerRef.current = null;
    }, 2200);

    return () => {
      if (cameraEvidenceCopyResetTimerRef.current) {
        clearTimeout(cameraEvidenceCopyResetTimerRef.current);
        cameraEvidenceCopyResetTimerRef.current = null;
      }
    };
  }, [cameraEvidenceCopyStatus]);

  const leftPanel = (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
          {STEP_META[currentStep].title}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-200/85">{STEP_META[currentStep].summary}</p>
      </div>

      {currentStep === "tank" ? (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Rimless tank model
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
            className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {(tanks ?? []).map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name} ({tank.widthIn} x {tank.depthIn} x {tank.heightIn} in)
              </option>
            ))}
          </select>

          {selectedTank ? (
            <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-2.5">
              {selectedTank.imageUrl ? (
                <div className="mb-2 overflow-hidden rounded-xl border border-white/10">
                  <SmartImage
                    src={selectedTank.imageUrl}
                    alt={selectedTank.name}
                    width={680}
                    height={360}
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="text-sm font-semibold text-slate-100">{selectedTank.name}</div>
              <div className="mt-1 text-xs text-slate-300">
                {selectedTank.widthIn} x {selectedTank.depthIn} x {selectedTank.heightIn} in
              </div>
              <div className="text-xs text-slate-300">Best price: {formatMoney(selectedTank.priceCents)}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {["substrate", "hardscape", "plants", "equipment"].includes(currentStep) ? (
        <div className="space-y-2.5">
          {currentStep === "equipment" ? (
            <div className="flex flex-wrap gap-1.5">
              {equipmentCategories.map((slug) => (
                <button
                  key={slug}
                  onClick={() => setEquipmentCategoryFilter(slug)}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    activeEquipmentCategory === slug
                      ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                      : "border-white/20 bg-slate-900/50 text-slate-300"
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
            className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
          />

          {currentStep === "substrate" ? (
            <div className="space-y-2 rounded-2xl border border-white/20 bg-slate-900/55 p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Terrain presets
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ["flat", "Flat"],
                  ["island", "Island"],
                  ["slope", "Slope"],
                  ["valley", "Valley"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => handleApplySubstratePreset(value)}
                    className="rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-300">
                  Tool
                  <select
                    value={sculptMode}
                    onChange={(event) => setSculptMode(event.target.value as SubstrateBrushMode)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100"
                  >
                    <option value="raise">Raise</option>
                    <option value="lower">Lower</option>
                    <option value="smooth">Smooth</option>
                    <option value="erode">Erode</option>
                  </select>
                </label>

                <label className="text-[11px] text-slate-300">
                  Brush size ({(sculptBrushSize * 100).toFixed(0)}%)
                  <input
                    type="range"
                    min={0.06}
                    max={0.56}
                    step={0.01}
                    value={sculptBrushSize}
                    onChange={(event) => setSculptBrushSize(Number(event.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>

              <label className="block text-[11px] text-slate-300">
                Brush strength ({(sculptStrength * 100).toFixed(0)}%)
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={sculptStrength}
                  onChange={(event) => setSculptStrength(Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>


              <div className="rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300">
                Fill target: {substrateVolume.volumeLiters.toFixed(1)} L
                {selectedSubstrateAsset ? (
                  <span>
                    {" "}
                    · {substrateBags.bagsRequired} bag(s) @ {substrateBags.bagVolumeLiters.toFixed(1)} L
                  </span>
                ) : (
                  <span> · Pick a substrate product to estimate bag count.</span>
                )}
              </div>
            </div>
          ) : null}

          <div className="max-h-[42vh] space-y-1.5 overflow-auto pr-1">
            {filteredAssets.map((asset) => {
              const selectedProductId = selectedProductByCategory[asset.categorySlug] ?? null;
              const isSelectedEquipment =
                asset.type === "product" &&
                !CANVAS_CATEGORIES.has(asset.categorySlug) &&
                selectedProductId === asset.id;
              const isCanvasAsset = CANVAS_CATEGORIES.has(asset.categorySlug);
              const armed = isCanvasAsset && placementAssetId === asset.id;

              return (
                <div
                  key={`${asset.type}:${asset.id}:${asset.categorySlug}`}
                  className="rounded-xl border border-white/15 bg-slate-900/55 p-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-slate-950/70">
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
                        <div className="text-[10px] text-slate-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-100">{asset.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-300">
                        {asset.sourceMode === "design_archetype" ? "Design archetype" : "Catalog item"} ·{" "}
                        {formatMoney(lineUnitPrice(asset))}
                        {asset.sourceMode === "design_archetype" ? " est." : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleChooseAsset(asset)}
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                        armed || isSelectedEquipment
                          ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                          : "border-emerald-400 bg-emerald-400/20 text-emerald-100"
                      }`}
                    >
                      {isCanvasAsset ? (armed ? "Armed" : "Place") : isSelectedEquipment ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredAssets.length === 0 ? (
              <div className="rounded-xl border border-white/15 bg-slate-900/45 p-3 text-xs text-slate-300">
                No assets match this step/filter right now.
              </div>
            ) : null}
          </div>

          {currentStep === "hardscape" ? (
            <div className="rounded-xl border border-white/15 bg-slate-900/45 p-2 text-xs text-slate-300">
              Hardscape placed: <span className="font-semibold text-slate-100">{hardscapeCount}</span>
            </div>
          ) : null}

          {currentStep === "plants" ? (
            <div className="rounded-xl border border-white/15 bg-slate-900/45 p-2 text-xs text-slate-300">
              Plants placed: <span className="font-semibold text-slate-100">{plantCount}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {currentStep === "review" ? (
        <div className="space-y-1.5 rounded-2xl border border-white/20 bg-slate-900/55 p-3 text-xs text-slate-200">
          <div>
            Tank: <span className="font-semibold">{selectedTank?.name ?? "None"}</span>
          </div>
          <div>
            Substrate: {selectedProductByCategory.substrate ? `${substrateBags.bagsRequired} bag(s)` : "Not selected"}
          </div>
          <div>Hardscape items: {hardscapeCount}</div>
          <div>Plant items: {plantCount}</div>
          <div>
            Estimated total: <span className="font-semibold">{formatMoney(totalCents)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );

  const rightPanel = (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Scene quality</div>
          <div className="text-[10px] text-slate-400">Auto picks {autoQualityTier}</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(["auto", "high", "medium", "low"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSceneSettings({ qualityTier: tier })}
              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                canvasState.sceneSettings.qualityTier === tier
                  ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                  : "border-white/20 bg-slate-950/60 text-slate-300"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={canvasState.sceneSettings.postprocessingEnabled}
              onChange={(event) =>
                setSceneSettings({ postprocessingEnabled: event.target.checked })
              }
            />
            Post FX
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={canvasState.sceneSettings.guidesVisible}
              onChange={(event) => setSceneSettings({ guidesVisible: event.target.checked })}
            />
            Guides
          </label>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">Camera mode</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["step", "free"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSceneSettings({ cameraPreset: mode })}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                  canvasState.sceneSettings.cameraPreset === mode
                    ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                    : "border-white/20 bg-slate-950/60 text-slate-300"
                }`}
              >
                {mode === "step" ? "Step-owned" : "Free"}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => triggerCameraIntent("reframe")}
              className="rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              Reframe
            </button>
            <button
              onClick={() => triggerCameraIntent("reset")}
              className="rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              Reset view
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
        {selectedItem && selectedAsset ? (
          <div className="space-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-300">Selected object</div>
              <div className="text-sm font-semibold text-slate-100">{selectedAsset.name}</div>
              <div className="text-[11px] text-slate-400">
                {selectedAsset.categoryName} · {selectedItem.anchorType} · zone {selectedItem.depthZone ?? "—"}
              </div>
            </div>

            <label className="block text-[11px] text-slate-300">
              Scale ({selectedItem.scale.toFixed(2)})
              <input
                type="range"
                min={0.1}
                max={2.5}
                step={0.01}
                value={selectedItem.scale}
                onChange={(event) => updateCanvasItem(selectedItem.id, { scale: Number(event.target.value) })}
                className="mt-1 w-full"
              />
            </label>

            <label className="block text-[11px] text-slate-300">
              Depth ({Math.round(selectedItem.z * 100)}%)
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selectedItem.z}
                onChange={(event) => updateCanvasItem(selectedItem.id, { z: Number(event.target.value) })}
                className="mt-1 w-full"
              />
            </label>

            <label className="block text-[11px] text-slate-300">
              Rotation ({Math.round(selectedItem.rotation)}°)
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

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => moveCanvasItemLayer(selectedItem.id, "up")}
                className="rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
              >
                Layer +
              </button>
              <button
                onClick={() => moveCanvasItemLayer(selectedItem.id, "down")}
                className="rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
              >
                Layer -
              </button>
              <button
                onClick={() => duplicateCanvasItem(selectedItem.id)}
                className="rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
              >
                Duplicate
              </button>
              <button
                onClick={() => removeCanvasItem(selectedItem.id)}
                className="rounded-lg border border-red-300/60 bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-300">
            Select an object in the scene to edit transform and placement metadata.
            {hoveredItemId ? <div className="mt-1 text-[11px] text-slate-400">Hover: {hoveredItemId}</div> : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
        <h2 className="text-sm font-semibold text-slate-100">Bill of Materials</h2>
        <div className="mt-1 text-[11px] text-slate-300">Live pricing is best-effort from current offers.</div>

        <div className="mt-2 max-h-[28vh] space-y-2 overflow-auto pr-1">
          {bomLines.map((line) => {
            const canBuy = line.asset.goUrl || line.asset.purchaseUrl || line.retailerLinks?.length;
            const buyUrl = line.asset.goUrl ?? line.asset.purchaseUrl ?? null;
            const unitPrice = lineUnitPrice(line.asset);
            const totalLinePrice = unitPrice * line.quantity;
            return (
              <div key={line.key} className="rounded-xl border border-white/15 bg-slate-950/55 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{line.categoryName}</div>
                    <div className="text-xs font-semibold text-slate-100">{line.asset.name}</div>
                    <div className="text-[11px] text-slate-300">
                      Qty {line.quantity} · Unit {formatMoney(unitPrice)}
                      {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                        ? " est."
                        : ""}
                    </div>
                    {line.notes ? <div className="text-[10px] text-slate-400">{line.notes}</div> : null}
                  </div>
                  <div className="text-xs font-semibold text-slate-100">{formatMoney(totalLinePrice)}</div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="text-[10px] text-slate-400">
                    {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                      ? `Material ${line.asset.materialType ?? "generic"}`
                      : `SKU ${line.asset.sku ?? "n/a"}`}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {buyUrl ? (
                      <a
                        href={buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-emerald-300/70 bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100"
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
                        className="rounded-md border border-white/20 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200"
                      >
                        {link.label}
                      </a>
                    ))}
                    {!canBuy ? (
                      <span className="rounded-md border border-white/20 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                        No offer
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {bomLines.length === 0 ? (
            <div className="rounded-xl border border-white/15 bg-slate-950/50 p-3 text-xs text-slate-300">
              Add assets to begin building your BOM.
            </div>
          ) : null}
        </div>

        <div className="mt-2 rounded-xl border border-white/15 bg-slate-950/55 p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Estimated total</span>
            <span className="font-semibold text-slate-100">{formatMoney(totalCents)}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {bomLines.length} line item(s), {canvasState.items.length} scene object(s)
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Compatibility</h3>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={compatibilityEnabled}
              onChange={(event) => setCompatibilityEnabled(event.target.checked)}
            />
            Enabled
          </label>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
          <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={flags.lowTechNoCo2}
              onChange={(event) => setLowTechNoCo2(event.target.checked)}
            />
            Low-tech
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={flags.hasShrimp}
              onChange={(event) => setHasShrimp(event.target.checked)}
            />
            Shrimp tank
          </label>
        </div>

        <div className="max-h-[24vh] space-y-2 overflow-auto pr-1">
          {compatibility.evaluations.map((evaluation, index) => (
            <div
              key={`${evaluation.ruleCode}:${index}`}
              className={`rounded-lg border px-2.5 py-2 text-xs ${severityClasses(evaluation.severity)}`}
            >
              <div className="font-semibold uppercase tracking-[0.12em]">{evaluation.severity}</div>
              <div className="mt-1 leading-relaxed">{evaluation.message}</div>
              {evaluation.fixSuggestion ? (
                <div className="mt-1 text-[11px] opacity-90">Fix: {evaluation.fixSuggestion}</div>
              ) : null}
            </div>
          ))}

          {compatibility.evaluations.length === 0 ? (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/95 px-2.5 py-2 text-xs text-emerald-800">
              No compatibility issues detected.
            </div>
          ) : null}

          {compatibility.hardscapeVolumeRatio != null ? (
            <div className="text-[11px] text-slate-300">
              Hardscape volume estimate: {(compatibility.hardscapeVolumeRatio * 100).toFixed(1)}%
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const canSceneTools = currentStep === "substrate" || currentStep === "hardscape" || currentStep === "plants";

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      {([
        ["place", "Place"],
        ["move", "Move"],
        ["rotate", "Rotate"],
        ["delete", "Delete"],
      ] as const).map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => setToolMode(mode)}
          disabled={!canSceneTools}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            toolMode === mode
              ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
              : "border-white/20 bg-slate-950/70 text-slate-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {label}
        </button>
      ))}

      {currentStep === "substrate" ? (
        <button
          onClick={() => setToolMode("sculpt")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            toolMode === "sculpt"
              ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
              : "border-white/20 bg-slate-950/70 text-slate-200"
          }`}
        >
          Sculpt
        </button>
      ) : null}

      {placementAsset ? (
        <>
          <label className="ml-1 text-[11px] text-slate-300">
            Rotation ({Math.round(placementRotationDeg)}°)
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={placementRotationDeg}
              onChange={(event) => setPlacementRotationDeg(Number(event.target.value))}
              className="ml-2 w-24 align-middle"
            />
          </label>
          {currentStep === "plants" ? (
            <label className="text-[11px] text-slate-300">
              Cluster
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={clusterBrushCount}
                onChange={(event) => setClusterBrushCount(Number(event.target.value))}
                className="ml-2 w-20 align-middle"
              />
            </label>
          ) : null}
        </>
      ) : null}

      <button
        onClick={() => setSceneSettings({ guidesVisible: !canvasState.sceneSettings.guidesVisible })}
        className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200"
      >
        {canvasState.sceneSettings.guidesVisible ? "Hide guides" : "Show guides"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#040810] pb-8 text-slate-100">
      <div className="mx-auto w-full max-w-[1780px] px-4 pt-5 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/15 bg-slate-900/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px] flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
                Guided Visual Builder
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
                Game-like 3D aquascaping planner
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">
                Cinematic viewport first. Planner outputs preserved: BOM, compatibility checks, save/share, and
                deterministic scene reconstruction.
              </p>
            </div>

            <div className="min-w-[240px] flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Build name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Visual Build"
              />
            </div>

            <div className="min-w-[240px] flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Description
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Low-tech jungle with cinematic hardscape composition"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => saveBuild(false)}
              disabled={saveMutation.isPending}
              className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-wait disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              onClick={handleDuplicate}
              className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Duplicate
            </button>
            <button
              onClick={() => saveBuild(true)}
              disabled={saveMutation.isPending}
              className="rounded-full border border-emerald-300/70 bg-emerald-400/25 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              Share
            </button>
            <button
              onClick={handleExport}
              className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Export PNG
            </button>
            <button
              onClick={() => {
                resetAll();
                applyStepChange("tank");
                setPlacementAssetId(null);
                setToolMode("move");
              }}
              className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Reset
            </button>

            {buildLink ? (
              <a
                className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200"
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
                    ? "border-emerald-200/80 bg-emerald-100/90 text-emerald-900"
                    : saveState.type === "error"
                      ? "border-red-200/80 bg-red-100/95 text-red-900"
                      : "border-white/20 bg-slate-900/70 text-slate-200"
                }`}
              >
                {saveState.message}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <span>
              Build ID: <span className="font-mono text-slate-100">{buildId ?? "draft"}</span>
            </span>
            <span>
              Share: <span className="font-mono text-slate-100">{shareSlug ?? "not published"}</span>
            </span>
          </div>
        </header>

        <section className="mt-4 rounded-3xl border border-white/15 bg-slate-900/60 p-3">
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
                    applyStepChange(stepId);
                  }}
                  disabled={blocked}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                      : done
                        ? "border-emerald-200/70 bg-emerald-300/15 text-emerald-100"
                        : "border-white/20 bg-slate-950/70 text-slate-300"
                  } ${blocked ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  {index + 1}. {meta.title}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-slate-950/55 p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Step {currentStepIndex + 1} of {STEP_ORDER.length}
              </div>
              <div className="text-sm font-semibold text-slate-100">{STEP_META[currentStep].title}</div>
              <div className="text-xs text-slate-300">{STEP_META[currentStep].summary}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!previousStep) return;
                  applyStepChange(previousStep);
                }}
                disabled={!previousStep}
                className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-1.5 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {currentStep === "equipment" && !stepCompletion.equipment ? (
                <button
                  onClick={() => applyStepChange("review")}
                  className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-1.5 text-xs font-semibold text-slate-200"
                >
                  Skip for now
                </button>
              ) : null}
              <button
                onClick={handleContinue}
                disabled={!nextStep || !canContinueCurrentStep}
                className="rounded-full border border-cyan-200/70 bg-cyan-200/20 px-4 py-1.5 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentStep === "review" ? "Ready to publish" : "Continue"}
              </button>
            </div>
          </div>
        </section>

        <section className="relative mt-4 min-h-[74dvh] overflow-hidden rounded-3xl border border-white/15 bg-[#060d16] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0">
            <VisualBuilderScene
              tank={selectedTank}
              canvasState={canvasState}
              assetsById={assetsById}
              selectedItemId={selectedItemId}
              currentStep={currentStep}
              toolMode={toolMode}
              placementAsset={placementAsset}
              placementRotationDeg={placementRotationDeg}
              placementClusterCount={clusterBrushCount}
              showDepthGuides={canvasState.sceneSettings.guidesVisible}
              qualityTier={qualityTier}
              postprocessingEnabled={canvasState.sceneSettings.postprocessingEnabled}
              sculptMode={sculptMode}
              sculptBrushSize={sculptBrushSize}
              sculptStrength={sculptStrength}
              idleOrbit={currentStep === "review"}
              cameraPresetMode={canvasState.sceneSettings.cameraPreset}
              equipmentAssets={equipmentSceneAssets}
              onSelectItem={setSelectedItem}
              onHoverItem={setHoveredItemId}
              onPlaceItem={handleScenePlace}
              onMoveItem={updateCanvasItem}
              onDeleteItem={removeCanvasItem}
              onRotateItem={handleSceneRotate}
              onSubstrateHeightfield={setSubstrateHeightfield}
              onCaptureCanvas={(canvas) => {
                sceneCanvasRef.current = canvas;
              }}
              onCameraPresetModeChange={(mode) => {
                setSceneSettings({ cameraPreset: mode });
                if (mode === "free") {
                  setCameraDiagnostics((prev) => ({
                    ...prev,
                    interactionStarts: prev.interactionStarts + 1,
                  }));
                }
              }}
              onCameraDiagnostic={(event) => {
                if (event.type !== "unexpected_pose_delta_detected") return;
                setCameraDiagnostics((prev) => ({
                  ...prev,
                  unexpectedPoseDeltas: prev.unexpectedPoseDeltas + 1,
                  lastStep: event.step,
                  lastPoseDelta: {
                    step: event.step,
                    positionDelta: event.positionDelta,
                    targetDelta: event.targetDelta,
                  },
                }));

                void trackEvent("camera_unexpected_pose_delta_detected", {
                  buildId: buildId ?? undefined,
                  meta: {
                    step_id: event.step,
                    position_delta: event.positionDelta,
                    target_delta: event.targetDelta,
                    pose_delta: Math.max(event.positionDelta, event.targetDelta),
                    trigger_source: "system",
                  },
                });
              }}
              cameraIntent={cameraIntent}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_8%,rgba(255,255,255,0.22),rgba(255,255,255,0)_40%),radial-gradient(circle_at_20%_100%,rgba(74,115,145,0.26),rgba(74,115,145,0)_48%)]" />

          <div className="pointer-events-none absolute left-0 top-0 h-[22%] w-full bg-gradient-to-b from-slate-950/28 to-transparent" />

          <aside className="pointer-events-auto absolute left-4 top-4 hidden h-[calc(100%-7rem)] w-[292px] overflow-auto rounded-2xl border border-white/15 bg-slate-900/58 p-3 shadow-2xl backdrop-blur-md lg:block">
            {leftPanel}
          </aside>

          <aside className="pointer-events-auto absolute right-4 top-4 hidden h-[calc(100%-7rem)] w-[368px] overflow-auto rounded-2xl border border-white/15 bg-slate-900/58 p-3 shadow-2xl backdrop-blur-md lg:block">
            {rightPanel}
          </aside>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div className="pointer-events-auto rounded-2xl border border-white/15 bg-slate-900/75 p-2 shadow-2xl backdrop-blur-md">
              {toolbar}
            </div>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:hidden">
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-2.5">{toolbar}</section>
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-3">{leftPanel}</section>
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-3">{rightPanel}</section>
        </div>

        {process.env.NODE_ENV === "development" && (
        <section className="mt-4 rounded-2xl border border-white/15 bg-slate-900/50 p-3 text-xs text-slate-300">
          <div className="font-semibold text-slate-100">Scene diagnostics</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Free camera preserves your pose across step changes; Step-owned camera auto-frames on step change.
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              Objects: <span className="font-semibold text-slate-100">{canvasState.items.length}</span>
            </div>
            <div>
              Hardscape: <span className="font-semibold text-slate-100">{hardscapeCount}</span>
            </div>
            <div>
              Plants: <span className="font-semibold text-slate-100">{plantCount}</span>
            </div>
            <div>
              Quality: <span className="font-semibold text-slate-100">{qualityTier}</span>
            </div>
            <div>
              Substrate front top: <span className="font-semibold text-slate-100">{substrateContour.frontTopPct.toFixed(1)}%</span>
            </div>
            <div>
              Substrate mound top: <span className="font-semibold text-slate-100">{substrateContour.moundTopPct.toFixed(1)}%</span>
            </div>
            <div>
              Tool mode: <span className="font-semibold text-slate-100">{toolMode}</span>
            </div>
            <div>
              Hovered: <span className="font-semibold text-slate-100">{hoveredItemId ?? "—"}</span>
            </div>
            <div>
              Camera mode: <span className="font-semibold text-slate-100">{canvasState.sceneSettings.cameraPreset}</span>
            </div>
            <div>
              Unexpected pose deltas: <span className="font-semibold text-slate-100">{cameraDiagnostics.unexpectedPoseDeltas}</span>
              {cameraDiagnostics.lastStep ? (
                <span className="text-slate-400"> ({cameraDiagnostics.lastStep})</span>
              ) : null}
            </div>
            <div>
              Camera intents: <span className="font-semibold text-slate-100">{cameraDiagnostics.intentCount}</span>
              {cameraDiagnostics.lastIntent ? (
                <span className="text-slate-400"> (last: {cameraDiagnostics.lastIntent})</span>
              ) : null}
            </div>
            <div>
              Free-step transitions: <span className="font-semibold text-slate-100">{cameraDiagnostics.freeStepTransitions}</span>
            </div>
            <div>
              Interaction starts: <span className="font-semibold text-slate-100">{cameraDiagnostics.interactionStarts}</span>
            </div>
            <div>
              Restore checks: <span className="font-semibold text-slate-100">{cameraDiagnostics.restoreChecks}</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-slate-950/45 p-2.5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Camera validation helpers (S01-S03)
            </div>

            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2 text-[11px] text-slate-300">
                <div className="font-semibold text-slate-100">Last camera intent</div>
                <div className="mt-1">
                  {cameraDiagnostics.lastIntent
                    ? `${cameraDiagnostics.lastIntent} (${cameraDiagnostics.lastIntentStep ?? "unknown step"})`
                    : "No intent command yet"}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2 text-[11px] text-slate-300">
                <div className="font-semibold text-slate-100">Last pose-delta event</div>
                <div className="mt-1">
                  {cameraDiagnostics.lastPoseDelta
                    ? `${cameraDiagnostics.lastPoseDelta.step} · pos ${cameraDiagnostics.lastPoseDelta.positionDelta.toFixed(2)} · target ${cameraDiagnostics.lastPoseDelta.targetDelta.toFixed(2)}`
                    : "None detected"}
                </div>
              </div>
            </div>

            <div className="mb-2 rounded-lg border border-white/10 bg-slate-950/40 p-2 text-[10px] text-slate-300">
              <span className="font-semibold text-slate-100">Badge legend:</span> Pass-ready = evidence complete, Fail-risk = unexpected camera behavior detected, Pending = gather more checks.
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
                <div className="text-[11px] font-semibold text-slate-100">S01 Orbit/Pan/Zoom stability</div>
                <div className="mt-1">
                  {cameraDiagnostics.interactionStarts >= 1 && cameraDiagnostics.unexpectedPoseDeltas === 0 ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Pass-ready</span>
                  ) : cameraDiagnostics.unexpectedPoseDeltas > 0 ? (
                    <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">Fail-risk</span>
                  ) : (
                    <span className="rounded-full border border-white/25 bg-slate-800/65 px-2 py-0.5 text-[10px] font-semibold text-slate-200">Pending</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
                <div className="text-[11px] font-semibold text-slate-100">S02 Step transition stability</div>
                <div className="mt-1">
                  {cameraDiagnostics.freeStepTransitions >= 2 && cameraDiagnostics.unexpectedPoseDeltas === 0 ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Pass-ready</span>
                  ) : cameraDiagnostics.unexpectedPoseDeltas > 0 ? (
                    <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">Fail-risk</span>
                  ) : (
                    <span className="rounded-full border border-white/25 bg-slate-800/65 px-2 py-0.5 text-[10px] font-semibold text-slate-200">Pending</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
                <div className="text-[11px] font-semibold text-slate-100">S03 Save/reload persistence</div>
                <div className="mt-1">
                  {cameraDiagnostics.restoreChecks > 0 ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Pass-ready</span>
                  ) : (
                    <span className="rounded-full border border-white/25 bg-slate-800/65 px-2 py-0.5 text-[10px] font-semibold text-slate-200">Pending</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCameraDiagnostics((prev) => ({
                      ...prev,
                      restoreChecks: prev.restoreChecks + 1,
                    }))
                  }
                  className="mt-2 rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
                >
                  Mark S03 verified
                </button>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-white/15 bg-slate-900/50 p-2">
              <div className="mb-1 text-[11px] font-semibold text-slate-100">Gate snapshot</div>
              <div className="mb-2 text-[10px] text-slate-400">Captured: {cameraEvidenceCapturedAtLabel}</div>

              <div className="space-y-1.5">
                <div className="rounded border border-cyan-300/20 bg-slate-950/80 p-2 text-[10px] text-slate-300">
                  <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-100/75">Summary</div>
                  <div className="overflow-x-auto whitespace-nowrap">
                    Step <span className="font-semibold text-slate-100">{cameraEvidenceSummary.step}</span> · Mode <span className="font-semibold text-slate-100">{cameraEvidenceSummary.mode}</span> · S01 <span className="font-semibold text-slate-100">{cameraEvidenceSummary.s01}</span> · S02 <span className="font-semibold text-slate-100">{cameraEvidenceSummary.s02}</span> · S03 <span className="font-semibold text-slate-100">{cameraEvidenceSummary.s03}</span> · Intents <span className="font-semibold text-slate-100">{cameraEvidenceSummary.intentCount}</span> · Deltas <span className="font-semibold text-slate-100">{cameraEvidenceSummary.unexpectedPoseDeltas}</span>
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-slate-900/55 p-2 text-[10px] text-slate-300">
                  <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">Last events</div>
                  <div className="text-[10px] leading-tight text-slate-300">
                    <span className="mr-1 text-slate-400">Last intent:</span>
                    <span
                      className="font-semibold text-slate-100"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {cameraEvidenceSummary.lastIntent}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] leading-tight text-slate-300">
                    <span className="mr-1 text-slate-400">Last delta:</span>
                    <span
                      className="font-semibold text-slate-100"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {cameraEvidenceSummary.lastPoseDelta}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowExpandedCameraEvidence((prev) => !prev)}
                  className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
                >
                  {showExpandedCameraEvidence ? "Hide JSON" : "Show JSON"}
                </button>
              </div>

              {showExpandedCameraEvidence ? (
                <pre className="mt-2 max-h-[40vh] overflow-x-auto overflow-y-auto overscroll-contain rounded bg-slate-950/70 p-2 pr-3 text-[10px] leading-relaxed text-slate-300 sm:max-h-72">{cameraEvidenceSnapshot}</pre>
              ) : null}

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyCameraEvidenceSnapshot();
                  }}
                  className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
                >
                  Copy snapshot JSON
                </button>

                <div className="min-h-[18px] text-right">
                  {cameraEvidenceCopyStatus === "copied" ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Copied</span>
                  ) : null}
                  {cameraEvidenceCopyStatus === "error" ? (
                    <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">Copy failed</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() =>
                  setCameraDiagnostics((prev) => ({
                    ...prev,
                    unexpectedPoseDeltas: 0,
                    lastStep: null,
                    interactionStarts: 0,
                    freeStepTransitions: 0,
                    restoreChecks: 0,
                    lastPoseDelta: null,
                  }))
                }
                className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
              >
                Reset camera checks
              </button>
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
