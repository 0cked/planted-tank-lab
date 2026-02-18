import { useState } from "react";

import { BuilderShortcutsOverlay } from "@/components/builder/visual/BuilderShortcutsOverlay";
import { BuilderViewportLayout } from "@/components/builder/visual/BuilderViewportLayout";
import { SubstrateToolbar } from "@/components/builder/visual/SubstrateToolbar";
import type {
  VisualBuildTemplateCatalogCard,
  VisualBuildTemplateId,
} from "@/components/builder/visual/build-templates";
import {
  STEP_META,
  STEP_ORDER,
  categoryLabel,
  formatMoney,
  lineUnitPrice,
  type BomLine,
  type BuilderStepId,
} from "@/components/builder/visual/builder-page-utils";
import {
  GROWTH_TIMELINE_MONTH_OPTIONS,
  growthTimelineFromSliderIndex,
  growthTimelineSliderIndex,
  type GrowthTimelineMonths,
} from "@/components/builder/visual/plant-growth";
import type { SubstrateBrushMode } from "@/components/builder/visual/scene-utils";
import type {
  SubstrateHeightfield,
  SubstrateMaterialGrid,
  SubstrateMaterialType,
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
  | { type: "reframe" | "reset"; seq: number }
  | { type: "focus-item"; itemId: string; seq: number };

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
  sculptMaterial: SubstrateMaterialType;
  equipmentSceneAssets: VisualAsset[];
  selectedLightAsset: VisualAsset | null;
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
    sculptMaterial: SubstrateMaterialType;
    substrateVolumeLiters: number;
    hasSelectedSubstrate: boolean;
    substrateBagEstimate: { bagsRequired: number; bagVolumeLiters: number };
    onPresetSelect: (preset: "flat" | "island" | "slope" | "valley") => void;
    onSculptModeChange: (mode: SubstrateBrushMode) => void;
    onSculptBrushSizeChange: (next: number) => void;
    onSculptStrengthChange: (next: number) => void;
    onSculptMaterialChange: (material: SubstrateMaterialType) => void;
  };
  onSceneSettingsChange: (patch: Partial<VisualSceneSettings>) => void;
  growthTimelineMonths: GrowthTimelineMonths;
  onGrowthTimelineMonthsChange: (months: GrowthTimelineMonths) => void;
  onReframe: () => void;
  onResetView: () => void;
  onFocusSceneItem: (itemId: string) => void;
  onUpdateCanvasItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onMoveCanvasItemLayer: (
    itemId: string,
    direction: "up" | "down" | "top" | "bottom",
  ) => void;
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
  onSelectSceneItem: (
    itemId: string | null,
    selectionMode?: "replace" | "toggle",
  ) => void;
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
  onSubstrateMaterialGrid: (next: SubstrateMaterialGrid) => void;
  onSubstrateStrokeStart: () => void;
  onSubstrateStrokeEnd: () => void;
  onCaptureSceneCanvas: (canvas: HTMLCanvasElement | null) => void;
  onCameraPresetModeChange: (mode: "step" | "free") => void;
  onCameraDiagnostic: (event: CameraDiagnosticEvent) => void;
  // Step navigation
  stepCompletion: Record<BuilderStepId, boolean>;
  canNavigateToStep: (step: BuilderStepId) => boolean;
  onStepChange: (step: BuilderStepId) => void;
  // Metadata actions
  onSaveDraft: () => void;
  saving: boolean;
};

/* ── Step icon glyphs ── */
const STEP_ICONS: Record<BuilderStepId, string> = {
  tank: "\u2B21",
  substrate: "\u25A4",
  hardscape: "\u25C6",
  plants: "\u273B",
  equipment: "\u2699",
  review: "\u2713",
};

/* ── Rail icon button ── */
function RailBtn(props: {
  label: string;
  title: string;
  active?: boolean;
  done?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
  const variant = props.disabled
    ? "text-white/20 cursor-not-allowed"
    : props.active
      ? "bg-white/15 text-white shadow-[0_0_8px_rgba(140,230,255,0.25)]"
      : props.done
        ? "text-emerald-300/80 hover:bg-white/10"
        : "text-white/50 hover:bg-white/10 hover:text-white/80";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title}
      className={`${base} ${variant}`}
    >
      {props.label}
    </button>
  );
}

/* ── Asset list (shared) ── */
function AssetList(props: {
  search: string;
  onSearchChange: (v: string) => void;
  filteredAssets: VisualAsset[];
  selectedProductByCategory: Record<string, string | undefined>;
  placementAssetId: string | null;
  onChooseAsset: (asset: VisualAsset) => void;
}) {
  return (
    <>
      <input
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        placeholder="Search\u2026"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
      />
      <div className="max-h-[50vh] space-y-1 overflow-auto">
        {props.filteredAssets.map((asset) => {
          const isCanvas =
            asset.categorySlug === "hardscape" ||
            asset.categorySlug === "plants";
          const isArmed = isCanvas && props.placementAssetId === asset.id;
          const sel = props.selectedProductByCategory[asset.categorySlug];
          const isSel = !isCanvas && sel === asset.id;
          return (
            <button
              key={`${asset.type}:${asset.id}:${asset.categorySlug}`}
              type="button"
              onClick={() => props.onChooseAsset(asset)}
              className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition ${
                isArmed || isSel
                  ? "border-cyan-300/40 bg-cyan-300/10"
                  : "border-white/8 bg-white/3 hover:bg-white/8"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40">
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
                  <span className="text-[8px] text-white/30">{"\u2014"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-white/90">
                  {asset.name}
                </div>
                <div className="text-[10px] text-white/40">
                  {formatMoney(lineUnitPrice(asset))}
                </div>
              </div>
              {isArmed ? (
                <span className="text-[9px] text-cyan-300">Armed</span>
              ) : null}
            </button>
          );
        })}
        {props.filteredAssets.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-white/30">
            No assets match
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ── Floating step panel ── */
function StepPanel(props: BuilderWorkspaceProps) {
  const step = props.currentStep;

  if (step === "tank") {
    return (
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Tank
        </div>
        <select
          value={props.selectedTank?.id ?? ""}
          onChange={(e) => props.onSelectTank(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm text-white outline-none"
        >
          {props.tanks.map((tank) => (
            <option key={tank.id} value={tank.id}>
              {tank.name} ({tank.widthIn}&times;{tank.depthIn}&times;
              {tank.heightIn})
            </option>
          ))}
        </select>
        {props.templates.length > 0 ? (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Templates
            </div>
            <div className="space-y-1.5">
              {props.templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => props.onApplyTemplate(t.id)}
                  disabled={!t.available}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-[10px] text-white/50">
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  if (step === "substrate") {
    return (
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Substrate
        </div>
        <SubstrateToolbar {...props.substrateControls} />
        <AssetList
          search={props.search}
          onSearchChange={props.onSearchChange}
          filteredAssets={props.filteredAssets}
          selectedProductByCategory={props.selectedProductByCategory}
          placementAssetId={props.placementAssetId}
          onChooseAsset={props.onChooseAsset}
        />
      </div>
    );
  }

  if (step === "equipment") {
    return (
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Equipment
        </div>
        <div className="flex flex-wrap gap-1">
          {props.equipmentCategories.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => props.onEquipmentCategoryChange(slug)}
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                props.activeEquipmentCategory === slug
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                  : "border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {categoryLabel(slug)}
            </button>
          ))}
        </div>
        <AssetList
          search={props.search}
          onSearchChange={props.onSearchChange}
          filteredAssets={props.filteredAssets}
          selectedProductByCategory={props.selectedProductByCategory}
          placementAssetId={props.placementAssetId}
          onChooseAsset={props.onChooseAsset}
        />
      </div>
    );
  }

  if (step === "hardscape" || step === "plants") {
    return (
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          {step === "hardscape" ? "Hardscape" : "Plants"}
        </div>
        <AssetList
          search={props.search}
          onSearchChange={props.onSearchChange}
          filteredAssets={props.filteredAssets}
          selectedProductByCategory={props.selectedProductByCategory}
          placementAssetId={props.placementAssetId}
          onChooseAsset={props.onChooseAsset}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
        Review
      </div>
      <div className="space-y-1.5 text-xs text-white/70">
        <div>
          Tank:{" "}
          <span className="text-white">
            {props.selectedTank?.name ?? "None"}
          </span>
        </div>
        <div>Substrate: {props.substrateSelectionLabel}</div>
        <div>Hardscape: {props.hardscapeCount}</div>
        <div>Plants: {props.plantCount}</div>
        <div>
          Total:{" "}
          <span className="font-semibold text-white">
            {formatMoney(props.totalCents)}
          </span>
        </div>
      </div>
      {props.bomLines.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            BOM
          </div>
          {props.bomLines.map((line, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[11px] text-white/60"
            >
              <span className="truncate pr-2">
                {line.asset.name}
                {line.quantity > 1 ? ` x${line.quantity}` : ""}
              </span>
              <span className="shrink-0 text-white/80">
                {formatMoney(lineUnitPrice(line.asset) * line.quantity)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Right floating panel ── */
function RightPanel(props: BuilderWorkspaceProps) {
  const tank = props.selectedTank;
  if (!tank) return null;

  return (
    <div className="w-[160px] space-y-3">
      <div className="space-y-2">
        <DimRow label="Width" value={tank.widthIn} />
        <DimRow label="Height" value={tank.heightIn} />
        <DimRow label="Depth" value={tank.depthIn} />
      </div>
      <div className="border-t border-white/10 pt-2 text-center">
        <div className="text-2xl font-bold tracking-tight text-white">
          {Math.round(
            tank.widthIn * tank.depthIn * tank.heightIn * 0.004329 * 10,
          ) / 10}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Liters
        </div>
      </div>

      {props.selectedItem && props.selectedAsset ? (
        <div className="border-t border-white/10 pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Selected
          </div>
          <div className="mt-1 text-xs font-medium text-white/90">
            {props.selectedAsset.name}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() =>
                props.onDuplicateCanvasItem(props.selectedItem!.id)
              }
              className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/60 hover:text-white"
            >
              Dup
            </button>
            <button
              type="button"
              onClick={() => props.onRemoveCanvasItem(props.selectedItem!.id)}
              className="rounded border border-red-400/30 px-1.5 py-0.5 text-[10px] text-red-300/70 hover:text-red-200"
            >
              Del
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DimRow(props: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/40">{props.label}</span>
      <span className="font-medium text-white/90">
        {props.value}{" "}
        <span className="text-white/40">in</span>
      </span>
    </div>
  );
}

/* ── Main component ── */
export function BuilderWorkspace(props: BuilderWorkspaceProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  const scene = (
    <ErrorBoundary
      fallback={({ retry }) => (
        <div className="flex h-full w-full items-center justify-center bg-[#06101c]/95 px-4 text-white">
          <div className="w-full max-w-md rounded-2xl border border-rose-200/45 bg-slate-950/88 p-5 text-center shadow-2xl">
            <h3 className="text-lg font-semibold">Scene failed to load</h3>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-xl border border-rose-200/75 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900"
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
        lightingSimulationEnabled={props.canvasState.sceneSettings.lightingSimulationEnabled}
        lightMountHeightIn={props.canvasState.sceneSettings.lightMountHeightIn}
        growthTimelineMonths={props.growthTimelineMonths}
        selectedLightAsset={props.selectedLightAsset}
        sculptMode={props.sculptMode}
        sculptBrushSize={props.sculptBrushSize}
        sculptStrength={props.sculptStrength}
        sculptMaterial={props.sculptMaterial}
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
        onSubstrateMaterialGrid={props.onSubstrateMaterialGrid}
        onSubstrateStrokeStart={props.onSubstrateStrokeStart}
        onSubstrateStrokeEnd={props.onSubstrateStrokeEnd}
        onCaptureCanvas={props.onCaptureSceneCanvas}
        onCameraPresetModeChange={props.onCameraPresetModeChange}
        onCameraDiagnostic={props.onCameraDiagnostic}
        cameraIntent={props.cameraIntent}
      />
    </ErrorBoundary>
  );

  const iconRail = (
    <>
      {STEP_ORDER.map((stepId) => (
        <RailBtn
          key={stepId}
          label={STEP_ICONS[stepId]}
          title={STEP_META[stepId].title}
          active={props.currentStep === stepId}
          done={props.stepCompletion[stepId]}
          disabled={!props.canNavigateToStep(stepId)}
          onClick={() => {
            props.onStepChange(stepId);
            setPanelOpen(true);
          }}
        />
      ))}

      <div className="my-1 h-px w-5 bg-white/10" />

      <RailBtn
        label={"\u2630"}
        title={panelOpen ? "Close panel" : "Open panel"}
        active={panelOpen}
        onClick={() => setPanelOpen((prev) => !prev)}
      />
      <RailBtn
        label={"\u229E"}
        title={
          props.canvasState.sceneSettings.gridSnapEnabled
            ? "Grid snap on"
            : "Grid snap off"
        }
        active={props.canvasState.sceneSettings.gridSnapEnabled}
        onClick={props.onToggleGridSnap}
      />
      <RailBtn
        label={"\u2317"}
        title={
          props.canvasState.sceneSettings.measurementsVisible
            ? "Hide measurements"
            : "Show measurements"
        }
        active={props.canvasState.sceneSettings.measurementsVisible}
        onClick={props.onToggleMeasurements}
      />

      <div className="flex-1" />

      <RailBtn
        label={"\uD83D\uDCBE"}
        title="Save draft"
        disabled={props.saving}
        onClick={props.onSaveDraft}
      />
      <RailBtn
        label="?"
        title="Keyboard shortcuts"
        active={props.shortcutsOverlayOpen}
        onClick={props.onToggleShortcutsOverlay}
      />
    </>
  );

  const growthTimelineIndex = growthTimelineSliderIndex(props.growthTimelineMonths);

  const growthTimelineToolbar = (
    <div
      role="toolbar"
      aria-label="Plant growth timeline"
      className="flex min-w-[250px] items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
        Growth
      </span>
      <input
        type="range"
        min={0}
        max={GROWTH_TIMELINE_MONTH_OPTIONS.length - 1}
        step={1}
        value={growthTimelineIndex}
        aria-label="Plant growth timeline"
        aria-valuetext={`${props.growthTimelineMonths} months`}
        onChange={(event) => {
          const nextIndex = Number.parseInt(event.target.value, 10);
          props.onGrowthTimelineMonthsChange(growthTimelineFromSliderIndex(nextIndex));
        }}
        className="h-1 flex-1 accent-cyan-300"
      />
      <div className="flex min-w-[76px] items-center justify-between text-[10px] text-white/70">
        {GROWTH_TIMELINE_MONTH_OPTIONS.map((months) => (
          <button
            key={months}
            type="button"
            onClick={() => props.onGrowthTimelineMonthsChange(months)}
            className={`rounded px-1 transition ${
              props.growthTimelineMonths === months
                ? "bg-cyan-200/20 text-cyan-100"
                : "text-white/60 hover:text-white/85"
            }`}
            aria-pressed={props.growthTimelineMonths === months}
          >
            {months}m
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <BuilderViewportLayout
        scene={scene}
        iconRail={iconRail}
        floatingPanel={panelOpen ? <StepPanel {...props} /> : null}
        floatingRight={<RightPanel {...props} />}
        bottomToolbar={growthTimelineToolbar}
      />
      <BuilderShortcutsOverlay
        open={props.shortcutsOverlayOpen}
        onClose={props.onCloseShortcutsOverlay}
      />
    </>
  );
}
