import type { inferRouterOutputs } from "@trpc/server";
import type { ComponentProps } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/components/TRPCProvider";
import { BuildMetadataPanel } from "@/components/builder/visual/BuildMetadataPanel";
import { BuildStepNavigator } from "@/components/builder/visual/BuildStepNavigator";
import type { BuilderWorkspaceProps } from "@/components/builder/visual/BuilderWorkspace";
import { CameraDiagnosticsPanel } from "@/components/builder/visual/CameraDiagnosticsPanel";
import { evaluateVisualCompatibility } from "@/components/builder/visual/compatibility";
import { exportVisualLayoutPng } from "@/components/builder/visual/export";
import {
  buildBomLines,
  CANVAS_CATEGORIES,
  clampRotationDeg,
  exportCanvasPng,
  STEP_META,
  STEP_ORDER,
  stepAllowsAsset,
  toCompatibilityRule,
  toLineItemsForSave,
  type BuilderStepId,
} from "@/components/builder/visual/builder-page-utils";
import {
  buildSubstratePreset,
  type SubstrateBrushMode,
} from "@/components/builder/visual/scene-utils";
import type { VisualAsset } from "@/components/builder/visual/types";
import type {
  BuilderSceneQualityTier,
  BuilderSceneToolMode,
} from "@/components/builder/visual/VisualBuilderScene";
import { useCameraEvidence } from "@/hooks/useCameraEvidence";
import { trackEvent } from "@/lib/analytics";
import {
  estimateSubstrateBags,
  estimateSubstrateVolume,
  substrateContourPercentages,
} from "@/lib/visual/substrate";
import type { AppRouter } from "@/server/trpc/router";
import { useVisualBuilderStore } from "@/stores/visual-builder-store";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type InitialBuildResponse = RouterOutputs["visualBuilder"]["getByShareSlug"];

const MAX_THUMBNAIL_WIDTH = 960;

function captureSceneThumbnailDataUrl(canvas: HTMLCanvasElement | null): string | undefined {
  if (!canvas) return undefined;

  try {
    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) return undefined;

    const scale = Math.min(1, MAX_THUMBNAIL_WIDTH / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = width;
    targetCanvas.height = height;

    const context = targetCanvas.getContext("2d");
    if (!context) return undefined;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(canvas, 0, 0, width, height);

    return targetCanvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

type VisualBuilderPageController = {
  metadataPanelProps: ComponentProps<typeof BuildMetadataPanel>;
  stepNavigatorProps: ComponentProps<typeof BuildStepNavigator>;
  workspaceProps: BuilderWorkspaceProps;
  diagnosticsPanelProps: ComponentProps<typeof CameraDiagnosticsPanel> | null;
};

export function useVisualBuilderPageController(
  initialBuild?: InitialBuildResponse | null,
): VisualBuilderPageController {
  const router = useRouter();
  const { status } = useSession();

  const [search, setSearch] = useState("");
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState("light");
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
  const [cameraIntent, setCameraIntent] = useState<{ type: "reframe" | "reset"; seq: number } | null>(null);
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);

  const buildId = useVisualBuilderStore((state) => state.buildId);
  const shareSlug = useVisualBuilderStore((state) => state.shareSlug);
  const name = useVisualBuilderStore((state) => state.name);
  const description = useVisualBuilderStore((state) => state.description);
  const tags = useVisualBuilderStore((state) => state.tags);
  const isPublic = useVisualBuilderStore((state) => state.isPublic);
  const tankId = useVisualBuilderStore((state) => state.tankId);
  const canvasState = useVisualBuilderStore((state) => state.canvasState);
  const selectedItemId = useVisualBuilderStore((state) => state.selectedItemId);
  const selectedItemIds = useVisualBuilderStore((state) => state.selectedItemIds);
  const selectedProductByCategory = useVisualBuilderStore((state) => state.selectedProductByCategory);
  const compatibilityEnabled = useVisualBuilderStore((state) => state.compatibilityEnabled);
  const flags = useVisualBuilderStore((state) => state.flags);

  const setBuildIdentity = useVisualBuilderStore((state) => state.setBuildIdentity);
  const setName = useVisualBuilderStore((state) => state.setName);
  const setDescription = useVisualBuilderStore((state) => state.setDescription);
  const toggleTag = useVisualBuilderStore((state) => state.toggleTag);
  const setPublic = useVisualBuilderStore((state) => state.setPublic);
  const setTank = useVisualBuilderStore((state) => state.setTank);
  const setSubstrateHeightfield = useVisualBuilderStore((state) => state.setSubstrateHeightfield);
  const beginSubstrateStroke = useVisualBuilderStore((state) => state.beginSubstrateStroke);
  const endSubstrateStroke = useVisualBuilderStore((state) => state.endSubstrateStroke);
  const undoSubstrateStroke = useVisualBuilderStore((state) => state.undoSubstrateStroke);
  const redoSubstrateStroke = useVisualBuilderStore((state) => state.redoSubstrateStroke);
  const setSceneSettings = useVisualBuilderStore((state) => state.setSceneSettings);
  const setSelectedProduct = useVisualBuilderStore((state) => state.setSelectedProduct);
  const setCompatibilityEnabled = useVisualBuilderStore((state) => state.setCompatibilityEnabled);
  const setLowTechNoCo2 = useVisualBuilderStore((state) => state.setLowTechNoCo2);
  const setHasShrimp = useVisualBuilderStore((state) => state.setHasShrimp);
  const addCanvasItemFromAsset = useVisualBuilderStore((state) => state.addCanvasItemFromAsset);
  const updateCanvasItem = useVisualBuilderStore((state) => state.updateCanvasItem);
  const removeCanvasItem = useVisualBuilderStore((state) => state.removeCanvasItem);
  const duplicateCanvasItem = useVisualBuilderStore((state) => state.duplicateCanvasItem);
  const moveCanvasItemLayer = useVisualBuilderStore((state) => state.moveCanvasItemLayer);
  const setSelectedItem = useVisualBuilderStore((state) => state.setSelectedItem);
  const toggleSelectedItem = useVisualBuilderStore((state) => state.toggleSelectedItem);
  const selectAllCanvasItems = useVisualBuilderStore((state) => state.selectAllCanvasItems);
  const clearSelectedItems = useVisualBuilderStore((state) => state.clearSelectedItems);
  const hydrateFromBuild = useVisualBuilderStore((state) => state.hydrateFromBuild);
  const resetAll = useVisualBuilderStore((state) => state.resetAll);
  const toBuildPayload = useVisualBuilderStore((state) => state.toBuildPayload);

  const cameraEvidence = useCameraEvidence({
    currentStep,
    cameraMode: canvasState.sceneSettings.cameraPreset,
  });

  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hydratedShareRef = useRef<string | null>(null);

  const catalogQuery = trpc.visualBuilder.catalog.useQuery(undefined, {
    staleTime: 60_000,
  });
  const rulesQuery = trpc.rules.listActive.useQuery();

  const saveMutation = trpc.visualBuilder.save.useMutation();
  const duplicateMutation = trpc.visualBuilder.duplicatePublic.useMutation();

  useEffect(() => {
    if (!initialBuild || hydratedShareRef.current === initialBuild.build.shareSlug) return;

    hydrateFromBuild({
      buildId: initialBuild.initialState.buildId,
      shareSlug: initialBuild.initialState.shareSlug,
      name: initialBuild.initialState.name,
      description: initialBuild.initialState.description,
      isPublic: initialBuild.initialState.isPublic,
      tankId: initialBuild.initialState.tankId,
      canvasState: initialBuild.initialState.canvasState,
      lineItems: initialBuild.initialState.lineItems,
      tags: initialBuild.initialState.tags,
      flags: initialBuild.initialState.flags,
    });

    hydratedShareRef.current = initialBuild.build.shareSlug;
  }, [hydrateFromBuild, initialBuild]);

  const isSharedSnapshot =
    initialBuild != null &&
    buildId === initialBuild.build.id &&
    shareSlug === initialBuild.build.shareSlug;

  const categoriesBySlug = useMemo(() => {
    return new Map((catalogQuery.data?.categories ?? []).map((category) => [category.slug, category.name] as const));
  }, [catalogQuery.data?.categories]);

  const assetsById = useMemo(() => {
    return new Map((catalogQuery.data?.assets ?? []).map((asset) => [asset.id, asset] as const));
  }, [catalogQuery.data?.assets]);

  const tanksById = useMemo(() => {
    return new Map((catalogQuery.data?.tanks ?? []).map((tank) => [tank.id, tank] as const));
  }, [catalogQuery.data?.tanks]);

  const selectedTank = useMemo(() => {
    if (tankId) return tanksById.get(tankId) ?? null;
    return (catalogQuery.data?.tanks ?? [])[0] ?? null;
  }, [catalogQuery.data?.tanks, tankId, tanksById]);

  useEffect(() => {
    if (!selectedTank || tankId === selectedTank.id) return;

    setTank(selectedTank.id, {
      widthIn: selectedTank.widthIn,
      heightIn: selectedTank.heightIn,
      depthIn: selectedTank.depthIn,
    });
  }, [selectedTank, setTank, tankId]);

  const equipmentCategories = useMemo(() => {
    const next = new Set<string>();

    for (const asset of catalogQuery.data?.assets ?? []) {
      if (asset.type !== "product") continue;
      if (CANVAS_CATEGORIES.has(asset.categorySlug)) continue;
      if (asset.categorySlug === "substrate" || asset.categorySlug === "tank") continue;
      next.add(asset.categorySlug);
    }

    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [catalogQuery.data?.assets]);

  const activeEquipmentCategory = equipmentCategories.includes(equipmentCategoryFilter)
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
  }, [hardscapeCount, plantCount, selectedProductByCategory, selectedTank]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < STEP_ORDER.length - 1
      ? STEP_ORDER[currentStepIndex + 1]
      : null;
  const previousStep = currentStepIndex > 0 ? STEP_ORDER[currentStepIndex - 1] : null;

  const canContinueCurrentStep =
    currentStep === "equipment" ? true : currentStep === "review" ? false : stepCompletion[currentStep];

  const canNavigateToStep = useCallback(
    (target: BuilderStepId): boolean => {
      const targetIndex = STEP_ORDER.indexOf(target);
      if (targetIndex <= currentStepIndex) return true;

      for (let index = 0; index < targetIndex; index += 1) {
        const step = STEP_ORDER[index]!;
        if (step === "review") continue;
        if (!stepCompletion[step]) return false;
      }

      return true;
    },
    [currentStepIndex, stepCompletion],
  );

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sourceRank: Record<string, number> = {
      design_archetype: 0,
      catalog_plant: 1,
      catalog_product: 2,
    };

    return (catalogQuery.data?.assets ?? [])
      .filter((asset) => {
        if (!stepAllowsAsset(currentStep, asset, activeEquipmentCategory)) return false;
        if (!query) return true;

        const assetTags = asset.tags?.join(" ") ?? "";
        const haystack = `${asset.name} ${asset.slug} ${asset.categoryName} ${assetTags}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aRank = sourceRank[a.sourceMode] ?? 99;
        const bRank = sourceRank[b.sourceMode] ?? 99;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      });
  }, [activeEquipmentCategory, catalogQuery.data?.assets, currentStep, search]);

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

  const bomLines = useMemo(() => {
    return buildBomLines({
      tank: selectedTank,
      assetsById,
      selectedProductByCategory,
      canvasItems: canvasState.items,
      categoriesBySlug,
      substrateBagCount: selectedProductByCategory.substrate ? substrateBags.bagsRequired : 1,
      substrateNote: selectedProductByCategory.substrate
        ? `${substrateVolume.volumeLiters.toFixed(1)} L target fill (${substrateBags.bagVolumeLiters.toFixed(1)} L per bag)`
        : undefined,
    });
  }, [
    assetsById,
    canvasState.items,
    categoriesBySlug,
    selectedProductByCategory,
    selectedTank,
    substrateBags.bagVolumeLiters,
    substrateBags.bagsRequired,
    substrateVolume.volumeLiters,
  ]);

  const bomForSave = useMemo(() => toLineItemsForSave(bomLines), [bomLines]);

  const totalCents = useMemo(() => {
    return bomLines.reduce((sum, line) => {
      const unitPrice =
        "estimatedUnitPriceCents" in line.asset && line.asset.estimatedUnitPriceCents != null
          ? (line.asset.priceCents ?? line.asset.estimatedUnitPriceCents)
          : (line.asset.priceCents ?? 0);

      return sum + unitPrice * line.quantity;
    }, 0);
  }, [bomLines]);

  const rules = useMemo(() => {
    return (rulesQuery.data ?? []).map(toCompatibilityRule);
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
    canvasState.sceneSettings.qualityTier === "auto" ? autoQualityTier : canvasState.sceneSettings.qualityTier;

  const equipmentSceneAssets = useMemo(() => {
    const next: VisualAsset[] = [];

    for (const [categorySlug, productId] of Object.entries(selectedProductByCategory)) {
      if (!productId || CANVAS_CATEGORIES.has(categorySlug)) continue;
      if (categorySlug === "substrate" || categorySlug === "tank") continue;

      const asset = assetsById.get(productId);
      if (asset) next.push(asset);
    }

    return next;
  }, [assetsById, selectedProductByCategory]);

  const applyStepChange = useCallback(
    (nextStep: BuilderStepId) => {
      cameraEvidence.recordStepTransition(nextStep);

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
    },
    [cameraEvidence],
  );

  const triggerCameraIntent = (type: "reframe" | "reset") => {
    const nextSeq = (cameraIntent?.seq ?? 0) + 1;
    setSceneSettings({ cameraPreset: "step" });
    setCameraIntent({ type, seq: nextSeq });
    cameraEvidence.recordIntent(type);

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
      setSaveState({ type: "error", message: `You are currently on ${STEP_META[currentStep].title}.` });
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
      const thumbnailDataUrl = captureSceneThumbnailDataUrl(sceneCanvasRef.current);

      const result = await saveMutation.mutateAsync({
        buildId: payload.buildId ?? undefined,
        shareSlug: payload.shareSlug ?? undefined,
        name: payload.name,
        description: payload.description || undefined,
        tankId: payload.tankId ?? selectedTank.id,
        canvasState: payload.canvasState,
        lineItems: payload.lineItems,
        isPublic: publish,
        tags: payload.tags,
        flags: payload.flags,
        thumbnailDataUrl,
      });

      setBuildIdentity({ buildId: result.buildId, shareSlug: result.shareSlug });
      setPublic(result.isPublic);

      const liveUrl = `${window.location.origin}/builder/${result.shareSlug}`;
      if (publish) {
        await navigator.clipboard.writeText(liveUrl);
        setSaveState({ type: "ok", message: "Public share link copied to clipboard." });
      } else {
        setSaveState({ type: "ok", message: "Build saved successfully." });
      }

      if (publish && window.location.pathname !== `/builder/${result.shareSlug}`) {
        router.replace(`/builder/${result.shareSlug}`);
      }
    } catch (error) {
      const defaultMessage = error instanceof Error ? error.message : "Failed to save build.";
      const message =
        isSharedSnapshot && defaultMessage.toLowerCase().includes("forbidden")
          ? "This shared build is read-only. Click Remix to save your own copy."
          : defaultMessage;
      setSaveState({ type: "error", message });
    }
  };

  const handleRemix = () => {
    const sourceName = name.trim() || "Visual Build";
    const remixName = /\b(remix|copy)\b/i.test(sourceName)
      ? sourceName
      : `${sourceName} Remix`;

    setBuildIdentity({ buildId: null, shareSlug: null });
    setPublic(false);
    setName(remixName);
    setSaveState({
      type: "ok",
      message: "Remix ready. You're editing an unsaved copy.",
    });

    if (typeof window !== "undefined" && window.location.pathname !== "/builder") {
      router.replace("/builder");
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

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return;

      const hasCommandModifier = event.metaKey || event.ctrlKey;
      const hasBlockedModifier = event.altKey;
      const keyLower = event.key.toLowerCase();
      const isHelpKey = event.key === "?" || (event.key === "/" && event.shiftKey);

      if (hasCommandModifier && !hasBlockedModifier && keyLower === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoSubstrateStroke();
          return;
        }

        undoSubstrateStroke();
        return;
      }

      if (hasCommandModifier && !hasBlockedModifier && keyLower === "a") {
        event.preventDefault();
        selectAllCanvasItems();
        return;
      }

      if (!hasCommandModifier && !hasBlockedModifier && isHelpKey) {
        event.preventDefault();
        setShowShortcutsOverlay(true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowShortcutsOverlay(false);
        if (selectedItemIds.length > 0) {
          clearSelectedItems();
        }
        return;
      }

      if (showShortcutsOverlay || hasCommandModifier || hasBlockedModifier) return;

      if (!event.shiftKey) {
        const stepIndex = Number.parseInt(event.key, 10);
        if (Number.isInteger(stepIndex) && stepIndex >= 1 && stepIndex <= 5) {
          event.preventDefault();

          const targetStep = STEP_ORDER[stepIndex - 1];
          if (!targetStep) return;

          if (!canNavigateToStep(targetStep)) {
            setSaveState({
              type: "error",
              message: `Finish the previous workflow steps before jumping to ${STEP_META[targetStep].title.toLowerCase()}.`,
            });
            return;
          }

          applyStepChange(targetStep);
          return;
        }
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedItemIds.length > 0) {
        event.preventDefault();
        removeCanvasItem(selectedItemIds);
        return;
      }

      if (keyLower === "d" && selectedItemIds.length > 0) {
        event.preventDefault();
        duplicateCanvasItem(selectedItemIds);
        return;
      }

      if (keyLower === "r" && selectedItemId) {
        const activeItem = canvasState.items.find((item) => item.id === selectedItemId);
        if (!activeItem) return;

        event.preventDefault();
        updateCanvasItem(selectedItemId, {
          rotation: clampRotationDeg(activeItem.rotation + 45),
        });
        return;
      }

      if (keyLower === "b" && currentStep === "substrate") {
        event.preventDefault();
        setToolMode((previous) => (previous === "sculpt" ? "move" : "sculpt"));
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [
    applyStepChange,
    canNavigateToStep,
    canvasState.items,
    clearSelectedItems,
    currentStep,
    duplicateCanvasItem,
    redoSubstrateStroke,
    removeCanvasItem,
    selectAllCanvasItems,
    selectedItemId,
    selectedItemIds,
    showShortcutsOverlay,
    undoSubstrateStroke,
    updateCanvasItem,
  ]);

  const buildLink = shareSlug && typeof window !== "undefined" ? `${window.location.origin}/builder/${shareSlug}` : null;

  const substrateContour = substrateContourPercentages({
    heightfield: canvasState.substrateHeightfield,
    tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
  });

  const canSceneTools = currentStep === "substrate" || currentStep === "hardscape" || currentStep === "plants";

  const handleSelectTank = (nextTankId: string) => {
    const tank = tanksById.get(nextTankId);
    if (!tank) return;

    setTank(tank.id, {
      widthIn: tank.widthIn,
      heightIn: tank.heightIn,
      depthIn: tank.depthIn,
    });
  };

  const handleApplySubstratePreset = (preset: "flat" | "island" | "slope" | "valley") => {
    const heightfield = buildSubstratePreset({
      preset,
      tankHeightIn: selectedTank?.heightIn ?? canvasState.heightIn,
    });
    setSubstrateHeightfield(heightfield);
  };

  const handleSceneSelectionChange: BuilderWorkspaceProps["onSelectSceneItem"] = (itemId, selectionMode) => {
    if (!itemId) {
      clearSelectedItems();
      return;
    }

    if (selectionMode === "toggle") {
      toggleSelectedItem(itemId);
      return;
    }

    setSelectedItem(itemId);
  };

  const metadataPanelProps: ComponentProps<typeof BuildMetadataPanel> = {
    name,
    description,
    selectedTags: tags,
    buildId,
    shareSlug,
    buildLink,
    saveState,
    saving: saveMutation.isPending,
    isSharedSnapshot,
    onNameChange: setName,
    onDescriptionChange: setDescription,
    onTagToggle: toggleTag,
    onSaveDraft: () => {
      void saveBuild(false);
    },
    onDuplicate: () => {
      void handleDuplicate();
    },
    onRemix: isSharedSnapshot ? handleRemix : undefined,
    onShare: () => {
      void saveBuild(true);
    },
    onExport: () => {
      void handleExport();
    },
    onReset: () => {
      resetAll();
      applyStepChange("tank");
      setPlacementAssetId(null);
      setToolMode("move");
    },
  };

  const stepNavigatorProps: ComponentProps<typeof BuildStepNavigator> = {
    currentStep,
    currentStepIndex,
    previousStep,
    nextStep,
    canContinueCurrentStep,
    stepCompletion,
    canNavigateToStep,
    onStepChange: applyStepChange,
    onContinue: () => {
      if (nextStep) applyStepChange(nextStep);
    },
  };

  const workspaceProps: BuilderWorkspaceProps = {
    selectedTank,
    canvasState,
    assetsById,
    selectedItemId,
    selectedItemIds,
    currentStep,
    toolMode,
    placementAsset,
    placementAssetId,
    placementRotationDeg,
    clusterBrushCount,
    qualityTier,
    sculptMode,
    sculptBrushSize,
    sculptStrength,
    equipmentSceneAssets,
    cameraIntent,
    canSceneTools,
    autoQualityTier,
    selectedItem,
    selectedAsset,
    hoveredItemId,
    hardscapeCount,
    plantCount,
    totalCents,
    bomLines,
    compatibilityEnabled,
    lowTechNoCo2: flags.lowTechNoCo2,
    hasShrimp: flags.hasShrimp,
    compatibilityEvaluations: compatibility.evaluations,
    hardscapeVolumeRatio: compatibility.hardscapeVolumeRatio,
    tanks: catalogQuery.data?.tanks ?? [],
    onSelectTank: handleSelectTank,
    equipmentCategories,
    activeEquipmentCategory,
    onEquipmentCategoryChange: setEquipmentCategoryFilter,
    search,
    onSearchChange: setSearch,
    filteredAssets,
    selectedProductByCategory,
    onChooseAsset: handleChooseAsset,
    substrateSelectionLabel: selectedProductByCategory.substrate
      ? `${substrateBags.bagsRequired} bag(s)`
      : "Not selected",
    substrateControls: {
      sculptMode,
      sculptBrushSize,
      sculptStrength,
      substrateVolumeLiters: substrateVolume.volumeLiters,
      hasSelectedSubstrate: Boolean(selectedSubstrateAsset),
      substrateBagEstimate: substrateBags,
      onPresetSelect: handleApplySubstratePreset,
      onSculptModeChange: setSculptMode,
      onSculptBrushSizeChange: setSculptBrushSize,
      onSculptStrengthChange: setSculptStrength,
    },
    onSceneSettingsChange: setSceneSettings,
    onReframe: () => triggerCameraIntent("reframe"),
    onResetView: () => triggerCameraIntent("reset"),
    onUpdateCanvasItem: updateCanvasItem,
    onMoveCanvasItemLayer: moveCanvasItemLayer,
    onDuplicateCanvasItem: duplicateCanvasItem,
    onRemoveCanvasItem: removeCanvasItem,
    onCompatibilityEnabledChange: setCompatibilityEnabled,
    onLowTechNoCo2Change: setLowTechNoCo2,
    onHasShrimpChange: setHasShrimp,
    onToolModeChange: setToolMode,
    onPlacementRotationChange: setPlacementRotationDeg,
    onClusterBrushCountChange: setClusterBrushCount,
    onToggleGuides: () => {
      setSceneSettings({ guidesVisible: !canvasState.sceneSettings.guidesVisible });
    },
    shortcutsOverlayOpen: showShortcutsOverlay,
    onToggleShortcutsOverlay: () => {
      setShowShortcutsOverlay((previous) => !previous);
    },
    onCloseShortcutsOverlay: () => {
      setShowShortcutsOverlay(false);
    },
    onSelectSceneItem: handleSceneSelectionChange,
    onHoverSceneItem: setHoveredItemId,
    onPlaceSceneItem: (request) => {
      addCanvasItemFromAsset(request.asset, request);
      if (currentStep === "hardscape" && hardscapeCount === 0) {
        setSaveState({ type: "ok", message: "Hardscape placed. Continue layering composition." });
      }
    },
    onMoveSceneItem: updateCanvasItem,
    onDeleteSceneItem: removeCanvasItem,
    onRotateSceneItem: (itemId, deltaDeg) => {
      const item = canvasState.items.find((nextItem) => nextItem.id === itemId);
      if (!item) return;

      updateCanvasItem(itemId, {
        rotation: clampRotationDeg(item.rotation + deltaDeg),
      });
    },
    onSubstrateHeightfield: setSubstrateHeightfield,
    onSubstrateStrokeStart: beginSubstrateStroke,
    onSubstrateStrokeEnd: endSubstrateStroke,
    onCaptureSceneCanvas: (canvas) => {
      sceneCanvasRef.current = canvas;
    },
    onCameraPresetModeChange: (mode) => {
      setSceneSettings({ cameraPreset: mode });
      if (mode === "free") {
        cameraEvidence.recordInteractionStart();
      }
    },
    onCameraDiagnostic: (event) => {
      cameraEvidence.recordUnexpectedPoseDelta(event);

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
    },
  };

  const diagnosticsPanelProps: ComponentProps<typeof CameraDiagnosticsPanel> | null =
    cameraEvidence.isDevelopment
      ? {
          sceneObjectCount: canvasState.items.length,
          hardscapeCount,
          plantCount,
          qualityTier,
          substrateContour,
          toolMode,
          hoveredItemId,
          cameraMode: canvasState.sceneSettings.cameraPreset,
          diagnostics: cameraEvidence.cameraDiagnostics,
          scenarioStatus: cameraEvidence.cameraScenarioStatus,
          evidenceCapturedAtLabel: cameraEvidence.cameraEvidenceCapturedAtLabel,
          evidenceSummary: cameraEvidence.cameraEvidenceSummary,
          evidenceSnapshot: cameraEvidence.cameraEvidenceSnapshot,
          showExpandedEvidence: cameraEvidence.showExpandedCameraEvidence,
          copyStatus: cameraEvidence.cameraEvidenceCopyStatus,
          onToggleExpandedEvidence: () => {
            cameraEvidence.setShowExpandedCameraEvidence((previous) => !previous);
          },
          onCopyEvidenceSnapshot: () => {
            void cameraEvidence.copyCameraEvidenceSnapshot();
          },
          onMarkRestoreCheckVerified: cameraEvidence.markRestoreCheckVerified,
          onResetCameraChecks: cameraEvidence.resetCameraChecks,
        }
      : null;

  return {
    metadataPanelProps,
    stepNavigatorProps,
    workspaceProps,
    diagnosticsPanelProps,
  };
}
