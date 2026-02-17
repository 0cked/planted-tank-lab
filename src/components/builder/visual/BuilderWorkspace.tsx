import { BuilderLeftSidebar } from "@/components/builder/visual/BuilderLeftSidebar";
import { BuilderRightSidebar } from "@/components/builder/visual/BuilderRightSidebar";
import { BuilderSceneToolbar } from "@/components/builder/visual/BuilderSceneToolbar";
import { BuilderViewportLayout } from "@/components/builder/visual/BuilderViewportLayout";
import type { BomLine, BuilderStepId } from "@/components/builder/visual/builder-page-utils";
import type { SubstrateBrushMode } from "@/components/builder/visual/scene-utils";
import type {
  SubstrateHeightfield,
  VisualAsset,
  VisualCanvasItem,
  VisualCanvasState,
  VisualSceneSettings,
  VisualTank,
} from "@/components/builder/visual/types";
import {
  VisualBuilderScene,
  type BuilderSceneQualityTier,
  type BuilderSceneToolMode,
} from "@/components/builder/visual/VisualBuilderScene";
import type { Severity } from "@/engine/types";
import type { CameraDiagnosticEvent } from "@/hooks/useCameraEvidence";

export type BuilderWorkspaceProps = {
  selectedTank: VisualTank | null;
  canvasState: VisualCanvasState;
  assetsById: Map<string, VisualAsset>;
  selectedItemId: string | null;
  currentStep: BuilderStepId;
  toolMode: BuilderSceneToolMode;
  placementAsset: VisualAsset | null;
  placementAssetId: string | null;
  placementRotationDeg: number;
  clusterBrushCount: number;
  qualityTier: BuilderSceneQualityTier;
  sculptMode: SubstrateBrushMode;
  sculptBrushSize: number;
  sculptStrength: number;
  equipmentSceneAssets: VisualAsset[];
  cameraIntent: { type: "reframe" | "reset"; seq: number } | null;
  canSceneTools: boolean;
  autoQualityTier: BuilderSceneQualityTier;
  selectedItem: VisualCanvasItem | null;
  selectedAsset: VisualAsset | null;
  hoveredItemId: string | null;
  hardscapeCount: number;
  plantCount: number;
  totalCents: number;
  bomLines: BomLine[];
  compatibilityEnabled: boolean;
  lowTechNoCo2: boolean;
  hasShrimp: boolean;
  compatibilityEvaluations: Array<{
    ruleCode: string;
    severity: Severity;
    message: string;
    fixSuggestion?: string | null;
  }>;
  hardscapeVolumeRatio: number | null;
  tanks: VisualTank[];
  onSelectTank: (tankId: string) => void;
  equipmentCategories: string[];
  activeEquipmentCategory: string;
  onEquipmentCategoryChange: (categorySlug: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filteredAssets: VisualAsset[];
  selectedProductByCategory: Record<string, string | undefined>;
  onChooseAsset: (asset: VisualAsset) => void;
  substrateSelectionLabel: string;
  substrateControls: {
    sculptMode: SubstrateBrushMode;
    sculptBrushSize: number;
    sculptStrength: number;
    substrateVolumeLiters: number;
    hasSelectedSubstrate: boolean;
    substrateBagEstimate: {
      bagsRequired: number;
      bagVolumeLiters: number;
    };
    onPresetSelect: (preset: "flat" | "island" | "slope" | "valley") => void;
    onSculptModeChange: (mode: SubstrateBrushMode) => void;
    onSculptBrushSizeChange: (next: number) => void;
    onSculptStrengthChange: (next: number) => void;
  };
  onSceneSettingsChange: (patch: Partial<VisualSceneSettings>) => void;
  onReframe: () => void;
  onResetView: () => void;
  onUpdateCanvasItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onMoveCanvasItemLayer: (itemId: string, direction: "up" | "down" | "top" | "bottom") => void;
  onDuplicateCanvasItem: (itemId: string) => void;
  onRemoveCanvasItem: (itemId: string) => void;
  onCompatibilityEnabledChange: (value: boolean) => void;
  onLowTechNoCo2Change: (value: boolean) => void;
  onHasShrimpChange: (value: boolean) => void;
  onToolModeChange: (mode: BuilderSceneToolMode) => void;
  onPlacementRotationChange: (value: number) => void;
  onClusterBrushCountChange: (value: number) => void;
  onToggleGuides: () => void;
  onSelectSceneItem: (itemId: string | null) => void;
  onHoverSceneItem: (itemId: string | null) => void;
  onPlaceSceneItem: (request: {
    asset: VisualAsset;
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: number;
    anchorType: VisualCanvasItem["anchorType"];
    depthZone: VisualCanvasItem["depthZone"];
    transform: VisualCanvasItem["transform"];
  }) => void;
  onMoveSceneItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onDeleteSceneItem: (itemId: string) => void;
  onRotateSceneItem: (itemId: string, deltaDeg: number) => void;
  onSubstrateHeightfield: (next: SubstrateHeightfield) => void;
  onSubstrateStrokeStart: () => void;
  onSubstrateStrokeEnd: () => void;
  onCaptureSceneCanvas: (canvas: HTMLCanvasElement | null) => void;
  onCameraPresetModeChange: (mode: "step" | "free") => void;
  onCameraDiagnostic: (event: CameraDiagnosticEvent) => void;
};

export function BuilderWorkspace(props: BuilderWorkspaceProps) {
  const leftSidebar = (
    <BuilderLeftSidebar
      currentStep={props.currentStep}
      selectedTank={props.selectedTank}
      tanks={props.tanks}
      onSelectTank={props.onSelectTank}
      equipmentCategories={props.equipmentCategories}
      activeEquipmentCategory={props.activeEquipmentCategory}
      onEquipmentCategoryChange={props.onEquipmentCategoryChange}
      search={props.search}
      onSearchChange={props.onSearchChange}
      filteredAssets={props.filteredAssets}
      selectedProductByCategory={props.selectedProductByCategory}
      placementAssetId={props.placementAssetId}
      onChooseAsset={props.onChooseAsset}
      hardscapeCount={props.hardscapeCount}
      plantCount={props.plantCount}
      totalCents={props.totalCents}
      substrateSelectionLabel={props.substrateSelectionLabel}
      substrateControls={props.substrateControls}
    />
  );

  const rightSidebar = (
    <BuilderRightSidebar
      sceneSettings={props.canvasState.sceneSettings}
      autoQualityTier={props.autoQualityTier}
      onSceneSettingsChange={props.onSceneSettingsChange}
      onReframe={props.onReframe}
      onResetView={props.onResetView}
      selectedItem={props.selectedItem}
      selectedAsset={props.selectedAsset}
      hoveredItemId={props.hoveredItemId}
      onUpdateCanvasItem={props.onUpdateCanvasItem}
      onMoveCanvasItemLayer={props.onMoveCanvasItemLayer}
      onDuplicateCanvasItem={props.onDuplicateCanvasItem}
      onRemoveCanvasItem={props.onRemoveCanvasItem}
      bomLines={props.bomLines}
      totalCents={props.totalCents}
      sceneItemCount={props.canvasState.items.length}
      compatibilityEnabled={props.compatibilityEnabled}
      lowTechNoCo2={props.lowTechNoCo2}
      hasShrimp={props.hasShrimp}
      compatibilityEvaluations={props.compatibilityEvaluations}
      hardscapeVolumeRatio={props.hardscapeVolumeRatio}
      onCompatibilityEnabledChange={props.onCompatibilityEnabledChange}
      onLowTechNoCo2Change={props.onLowTechNoCo2Change}
      onHasShrimpChange={props.onHasShrimpChange}
    />
  );

  const toolbar = (
    <BuilderSceneToolbar
      currentStep={props.currentStep}
      toolMode={props.toolMode}
      canSceneTools={props.canSceneTools}
      placementAssetArmed={Boolean(props.placementAsset)}
      placementRotationDeg={props.placementRotationDeg}
      clusterBrushCount={props.clusterBrushCount}
      guidesVisible={props.canvasState.sceneSettings.guidesVisible}
      onToolModeChange={props.onToolModeChange}
      onPlacementRotationChange={props.onPlacementRotationChange}
      onClusterBrushCountChange={props.onClusterBrushCountChange}
      onToggleGuides={props.onToggleGuides}
    />
  );

  const scene = (
    <VisualBuilderScene
      tank={props.selectedTank}
      canvasState={props.canvasState}
      assetsById={props.assetsById}
      selectedItemId={props.selectedItemId}
      currentStep={props.currentStep}
      toolMode={props.toolMode}
      placementAsset={props.placementAsset}
      placementRotationDeg={props.placementRotationDeg}
      placementClusterCount={props.clusterBrushCount}
      showDepthGuides={props.canvasState.sceneSettings.guidesVisible}
      qualityTier={props.qualityTier}
      postprocessingEnabled={props.canvasState.sceneSettings.postprocessingEnabled}
      glassWallsEnabled={props.canvasState.sceneSettings.glassWallsEnabled}
      sculptMode={props.sculptMode}
      sculptBrushSize={props.sculptBrushSize}
      sculptStrength={props.sculptStrength}
      idleOrbit={props.currentStep === "review"}
      cameraPresetMode={props.canvasState.sceneSettings.cameraPreset}
      equipmentAssets={props.equipmentSceneAssets}
      onSelectItem={props.onSelectSceneItem}
      onHoverItem={props.onHoverSceneItem}
      onPlaceItem={props.onPlaceSceneItem}
      onMoveItem={props.onMoveSceneItem}
      onDeleteItem={props.onDeleteSceneItem}
      onRotateItem={props.onRotateSceneItem}
      onSubstrateHeightfield={props.onSubstrateHeightfield}
      onSubstrateStrokeStart={props.onSubstrateStrokeStart}
      onSubstrateStrokeEnd={props.onSubstrateStrokeEnd}
      onCaptureCanvas={props.onCaptureSceneCanvas}
      onCameraPresetModeChange={props.onCameraPresetModeChange}
      onCameraDiagnostic={props.onCameraDiagnostic}
      cameraIntent={props.cameraIntent}
    />
  );

  return <BuilderViewportLayout leftSidebar={leftSidebar} rightSidebar={rightSidebar} scene={scene} toolbar={toolbar} />;
}
