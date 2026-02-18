import { BuilderLeftSidebar } from "@/components/builder/visual/BuilderLeftSidebar";
import { BuilderRightSidebar } from "@/components/builder/visual/BuilderRightSidebar";
import { BuilderSceneToolbar } from "@/components/builder/visual/BuilderSceneToolbar";
import { BuilderShortcutsOverlay } from "@/components/builder/visual/BuilderShortcutsOverlay";
import { BuilderViewportLayout } from "@/components/builder/visual/BuilderViewportLayout";
import type {
  VisualBuildTemplateCatalogCard,
  VisualBuildTemplateId,
} from "@/components/builder/visual/build-templates";
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
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { Severity } from "@/engine/types";
import type { CameraDiagnosticEvent } from "@/hooks/useCameraEvidence";

export type BuilderWorkspaceCameraIntent =
  | {
      type: "reframe" | "reset";
      seq: number;
    }
  | {
      type: "focus-item";
      itemId: string;
      seq: number;
    };

export type BuilderWorkspaceProps = {
  selectedTank: VisualTank | null;
  canvasState: VisualCanvasState;
  assetsById: Map<string, VisualAsset>;
  selectedItemId: string | null;
  selectedItemIds: string[];
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
  cameraIntent: BuilderWorkspaceCameraIntent | null;
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
  templates: VisualBuildTemplateCatalogCard[];
  onApplyTemplate: (templateId: VisualBuildTemplateId) => void;
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
  onFocusSceneItem: (itemId: string) => void;
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
  onToggleGridSnap: () => void;
  onToggleMeasurements: () => void;
  onToggleMeasurementUnit: () => void;
  shortcutsOverlayOpen: boolean;
  onToggleShortcutsOverlay: () => void;
  onCloseShortcutsOverlay: () => void;
  onSelectSceneItem: (itemId: string | null, selectionMode?: "replace" | "toggle") => void;
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
      templates={props.templates}
      onApplyTemplate={props.onApplyTemplate}
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
      selectedItemId={props.selectedItemId}
      selectedAsset={props.selectedAsset}
      hoveredItemId={props.hoveredItemId}
      canvasItems={props.canvasState.items}
      assetsById={props.assetsById}
      onUpdateCanvasItem={props.onUpdateCanvasItem}
      onMoveCanvasItemLayer={props.onMoveCanvasItemLayer}
      onDuplicateCanvasItem={props.onDuplicateCanvasItem}
      onRemoveCanvasItem={props.onRemoveCanvasItem}
      onFocusSceneItem={props.onFocusSceneItem}
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
      gridSnapEnabled={props.canvasState.sceneSettings.gridSnapEnabled}
      measurementsVisible={props.canvasState.sceneSettings.measurementsVisible}
      measurementUnit={props.canvasState.sceneSettings.measurementUnit}
      shortcutsOpen={props.shortcutsOverlayOpen}
      onToolModeChange={props.onToolModeChange}
      onPlacementRotationChange={props.onPlacementRotationChange}
      onClusterBrushCountChange={props.onClusterBrushCountChange}
      onToggleGuides={props.onToggleGuides}
      onToggleGridSnap={props.onToggleGridSnap}
      onToggleMeasurements={props.onToggleMeasurements}
      onToggleMeasurementUnit={props.onToggleMeasurementUnit}
      onToggleShortcuts={props.onToggleShortcutsOverlay}
    />
  );

  const scene = (
    <ErrorBoundary
      fallback={({ retry }) => (
        <div className="flex h-full w-full items-center justify-center bg-[#06101c]/95 px-4 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-rose-200/45 bg-slate-950/88 p-5 text-center shadow-2xl">
            <h3 className="text-lg font-semibold">Scene failed to load</h3>
            <p className="mt-2 text-sm text-slate-300">
              The 3D scene crashed. Your toolbar and side panels are still available.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200/75 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-50"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    >
      <VisualBuilderScene
        tank={props.selectedTank}
        canvasState={props.canvasState}
        assetsById={props.assetsById}
        selectedItemId={props.selectedItemId}
        selectedItemIds={props.selectedItemIds}
        currentStep={props.currentStep}
        toolMode={props.toolMode}
        placementAsset={props.placementAsset}
        placementRotationDeg={props.placementRotationDeg}
        placementClusterCount={props.clusterBrushCount}
        showDepthGuides={props.canvasState.sceneSettings.guidesVisible}
        gridSnapEnabled={props.canvasState.sceneSettings.gridSnapEnabled}
        showMeasurements={props.canvasState.sceneSettings.measurementsVisible}
        measurementUnit={props.canvasState.sceneSettings.measurementUnit}
        qualityTier={props.qualityTier}
        postprocessingEnabled={props.canvasState.sceneSettings.postprocessingEnabled}
        glassWallsEnabled={props.canvasState.sceneSettings.glassWallsEnabled}
        ambientParticlesEnabled={props.canvasState.sceneSettings.ambientParticlesEnabled}
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
    </ErrorBoundary>
  );

  return (
    <>
      <BuilderViewportLayout leftSidebar={leftSidebar} rightSidebar={rightSidebar} scene={scene} toolbar={toolbar} />
      <BuilderShortcutsOverlay open={props.shortcutsOverlayOpen} onClose={props.onCloseShortcutsOverlay} />
    </>
  );
}
