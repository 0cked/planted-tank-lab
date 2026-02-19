import { useMemo, useState } from "react";

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
import { resolveVisualAsset } from "@/components/builder/visual/useAsset";
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
  onSetTankDimensions: (next: {
    widthIn: number;
    heightIn: number;
    depthIn: number;
  }) => void;
  tankDimensionPresets: ReadonlyArray<{
    id: "10g" | "20g-long" | "29g" | "40b" | "55g" | "75g";
    label: string;
    widthIn: number;
    heightIn: number;
    depthIn: number;
  }>;
  onApplyTankDimensionPreset: (
    presetId: "10g" | "20g-long" | "29g" | "40b" | "55g" | "75g",
  ) => void;
  templates: VisualBuildTemplateCatalogCard[];
  onApplyTemplate: (templateId: VisualBuildTemplateId) => void;
  equipmentCategories: string[];
  activeEquipmentCategory: string;
  recommendedEquipmentByCategory: Record<string, VisualAsset | null>;
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
    controlPointGrid: { cols: number; rows: number };
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
  stepCompletion: Record<BuilderStepId, boolean>;
  canNavigateToStep: (step: BuilderStepId) => boolean;
  onStepChange: (step: BuilderStepId) => void;
  onSaveDraft: () => void;
  saving: boolean;
};

const STEP_ICONS: Record<BuilderStepId, string> = {
  tank: "\u2B21",
  substrate: "\u25A4",
  hardscape: "\u25C6",
  plants: "\u273B",
  equipment: "\u2699",
  review: "\u2713",
};

function RailBtn(props: {
  label: string;
  title: string;
  active?: boolean;
  done?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const size = props.compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
  const variant = props.disabled
    ? "text-neutral-300 cursor-not-allowed"
    : props.active
      ? "bg-[var(--ptl-accent)]/10 text-[var(--ptl-accent)] shadow-[0_0_12px_rgba(27,127,90,0.15)]"
      : props.done
        ? "text-emerald-600 hover:bg-black/[0.06] hover:text-emerald-700"
        : "text-neutral-500 hover:bg-black/[0.06] hover:text-[var(--ptl-ink)]";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title}
      className={`flex ${size} items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ptl-accent)]/50 ${variant}`}
    >
      {props.label}
    </button>
  );
}

function toDisplayDimension(inches: number, unit: "in" | "cm"): number {
  const raw = unit === "cm" ? inches * 2.54 : inches;
  return Math.round(raw * 10) / 10;
}

function toInchesFromDisplay(value: number, unit: "in" | "cm"): number {
  if (unit === "cm") return value / 2.54;
  return value;
}

function formatTankPresetDimensions(
  preset: { widthIn: number; heightIn: number; depthIn: number },
  unit: "in" | "cm",
): string {
  const w = toDisplayDimension(preset.widthIn, unit);
  const d = toDisplayDimension(preset.depthIn, unit);
  const h = toDisplayDimension(preset.heightIn, unit);
  return `${w}\u00D7${d}\u00D7${h} ${unit}`;
}

function isTankPresetActive(
  preset: { widthIn: number; heightIn: number; depthIn: number },
  dims: { widthIn: number; heightIn: number; depthIn: number },
): boolean {
  const t = 0.01;
  return (
    Math.abs(preset.widthIn - dims.widthIn) <= t &&
    Math.abs(preset.heightIn - dims.heightIn) <= t &&
    Math.abs(preset.depthIn - dims.depthIn) <= t
  );
}

function severityChip(severity: Severity): string {
  switch (severity) {
    case "error":
      return "border-red-400/40 bg-red-400/10 text-red-700";
    case "warning":
      return "border-amber-400/40 bg-amber-400/10 text-amber-700";
    case "recommendation":
      return "border-sky-400/40 bg-sky-400/10 text-sky-700";
    case "completeness":
      return "border-[var(--ptl-border)] bg-black/5 text-neutral-500";
  }
}

function normalizePreviewCandidate(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDrawerPreviewCandidates(asset: VisualAsset): string[] {
  const resolvedAsset = resolveVisualAsset(asset);
  const orderedCandidates = [resolvedAsset.previewImagePath, asset.imageUrl];
  const seen = new Set<string>();
  const next: string[] = [];

  for (const candidate of orderedCandidates) {
    const normalized = normalizePreviewCandidate(candidate);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
  }

  return next;
}

function AssetThumbnail(props: { asset: VisualAsset }) {
  const previewCandidates = useMemo(
    () => resolveDrawerPreviewCandidates(props.asset),
    [props.asset],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  if (candidateIndex >= previewCandidates.length) {
    return <span className="text-[8px] text-neutral-400">{"\u2014"}</span>;
  }

  const src = previewCandidates[candidateIndex];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={props.asset.name}
      className="h-full w-full object-cover"
      loading="lazy"
      draggable={false}
      onError={() => {
        setCandidateIndex((current) => Math.min(current + 1, previewCandidates.length));
      }}
    />
  );
}

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
        className="w-full rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--ptl-ink)] outline-none placeholder:text-neutral-400 focus:border-[var(--ptl-border)]"
      />
      <div className="max-h-[50vh] space-y-1 overflow-auto">
        {props.filteredAssets.map((asset) => {
          const isCanvas =
            asset.categorySlug === "hardscape" || asset.categorySlug === "plants";
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
                  ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8"
                  : "border-[var(--ptl-border)] bg-black/[0.03] hover:bg-black/[0.06]"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--ptl-border)] bg-black/5">
                <AssetThumbnail asset={asset} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-[var(--ptl-ink)]">
                  {asset.name}
                </div>
                <div className="text-[10px] text-[var(--ptl-ink-muted)]">{categoryLabel(asset.categorySlug)}</div>
              </div>
              {isArmed ? (
                <span className="rounded-full border border-[var(--ptl-accent)]/30 bg-[var(--ptl-accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ptl-accent)]">
                  Armed
                </span>
              ) : null}
            </button>
          );
        })}
        {props.filteredAssets.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-neutral-400">
            No assets match
          </div>
        ) : null}
      </div>
    </>
  );
}

function SectionLabel(props: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">
      {props.children}
    </div>
  );
}

function StepPanel(props: BuilderWorkspaceProps) {
  const step = props.currentStep;
  const unit = props.canvasState.sceneSettings.measurementUnit;
  const tankDims = {
    widthIn: props.canvasState.widthIn,
    heightIn: props.canvasState.heightIn,
    depthIn: props.canvasState.depthIn,
  };

  const handleDimInput = (key: "widthIn" | "heightIn" | "depthIn", v: string) => {
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return;
    props.onSetTankDimensions({ ...tankDims, [key]: toInchesFromDisplay(n, unit) });
  };

  if (step === "tank") {
    return (
      <div className="space-y-3">
        <SectionLabel>Tank</SectionLabel>
        <div className="space-y-2 rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
              Dimensions
            </div>
            <div className="inline-flex rounded-md border border-[var(--ptl-border)] bg-black/5 p-0.5 text-[10px]">
              <button
                type="button"
                aria-pressed={unit === "in"}
                onClick={() => { if (unit === "cm") props.onToggleMeasurementUnit(); }}
                className={`rounded px-1.5 py-0.5 transition ${unit === "in" ? "bg-[var(--ptl-accent)]/10 text-[var(--ptl-accent)]" : "text-neutral-500"}`}
              >
                in
              </button>
              <button
                type="button"
                aria-pressed={unit === "cm"}
                onClick={() => { if (unit === "in") props.onToggleMeasurementUnit(); }}
                className={`rounded px-1.5 py-0.5 transition ${unit === "cm" ? "bg-[var(--ptl-accent)]/10 text-[var(--ptl-accent)]" : "text-neutral-500"}`}
              >
                cm
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: "widthIn" as const, short: "W", maxCm: 244, maxIn: 96 },
              { key: "depthIn" as const, short: "D", maxCm: 92, maxIn: 36 },
              { key: "heightIn" as const, short: "H", maxCm: 102, maxIn: 40 },
            ] as const).map(({ key, short, maxCm, maxIn }) => (
              <label key={key} className="space-y-1 text-[10px] text-neutral-500">
                <span>{short}</span>
                <input
                  type="number"
                  min={unit === "cm" ? 20 : 8}
                  max={unit === "cm" ? maxCm : maxIn}
                  step={0.5}
                  value={toDisplayDimension(tankDims[key], unit)}
                  onChange={(e) => handleDimInput(key, e.target.value)}
                  className="w-full rounded-md border border-[var(--ptl-border)] bg-black/5 px-2 py-1 text-xs tabular-nums text-[var(--ptl-ink)] outline-none focus:border-[var(--ptl-accent)]/40"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <SectionLabel>Common sizes</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {props.tankDimensionPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => props.onApplyTankDimensionPreset(preset.id)}
                className={`rounded-lg border px-2 py-1.5 text-left text-[10px] transition ${
                  isTankPresetActive(preset, tankDims)
                    ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8 text-[var(--ptl-accent)]"
                    : "border-[var(--ptl-border)] bg-black/[0.03] text-[var(--ptl-ink)] hover:bg-black/[0.06]"
                }`}
              >
                <div className="font-semibold">{preset.label}</div>
                <div className="text-[9px] text-[var(--ptl-ink-muted)]">
                  {formatTankPresetDimensions(preset, unit)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {props.templates.length > 0 ? (
          <>
            <SectionLabel>Templates</SectionLabel>
            <div className="space-y-1.5">
              {props.templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => props.onApplyTemplate(t.id)}
                  disabled={!t.available}
                  className="w-full rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-2 text-left text-xs text-[var(--ptl-ink)] transition hover:bg-black/[0.06] disabled:opacity-40"
                >
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-[10px] text-neutral-500">{t.description}</div>
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
        <SectionLabel>Substrate</SectionLabel>
        <SubstrateToolbar {...props.substrateControls} />
      </div>
    );
  }

  if (step === "equipment") {
    return (
      <div className="space-y-3">
        <SectionLabel>Equipment</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {props.equipmentCategories.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => props.onEquipmentCategoryChange(slug)}
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                props.activeEquipmentCategory === slug
                  ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8 text-[var(--ptl-accent)]"
                  : "border-[var(--ptl-border)] text-neutral-500 hover:text-[var(--ptl-ink)]"
              }`}
            >
              {categoryLabel(slug)}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {props.equipmentCategories.map((slug) => {
            const recommended = props.recommendedEquipmentByCategory[slug] ?? null;
            const selectedId = props.selectedProductByCategory[slug];
            const isEnabled = Boolean(selectedId);

            return (
              <div
                key={slug}
                className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--ptl-ink)]">
                      {categoryLabel(slug)}
                    </div>
                    <div className="text-[10px] text-[var(--ptl-ink-muted)]">
                      {isEnabled ? "Auto recommendation enabled" : "Not included yet"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!recommended}
                    onClick={() => {
                      if (!recommended) return;
                      props.onChooseAsset(recommended);
                    }}
                    className="rounded-md border border-[var(--ptl-border)] px-2 py-1 text-[10px] font-semibold text-[var(--ptl-ink)] transition hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isEnabled ? "Refresh" : "Enable"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--ptl-ink-muted)]">
          Specific product picks are generated automatically from your build state and applied in Review.
        </div>
      </div>
    );
  }

  if (step === "hardscape" || step === "plants") {
    return (
      <div className="space-y-3">
        <SectionLabel>{step === "hardscape" ? "Hardscape" : "Plants"}</SectionLabel>
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
      <SectionLabel>Review</SectionLabel>

      <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] p-2.5">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Tank</span>
            <span className="tabular-nums text-[var(--ptl-ink)]">
              {Math.round(props.canvasState.widthIn * 10) / 10}{"\u00D7"}
              {Math.round(props.canvasState.depthIn * 10) / 10}{"\u00D7"}
              {Math.round(props.canvasState.heightIn * 10) / 10} in
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Substrate</span>
            <span className="text-[var(--ptl-ink)]">{props.substrateSelectionLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Hardscape</span>
            <span className="tabular-nums text-[var(--ptl-ink)]">{props.hardscapeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Plants</span>
            <span className="tabular-nums text-[var(--ptl-ink)]">{props.plantCount}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--ptl-border)] pt-1.5">
            <span className="font-semibold text-neutral-500">Total</span>
            <span className="font-semibold tabular-nums text-[var(--ptl-ink)]">
              {formatMoney(props.totalCents)}
            </span>
          </div>
        </div>
      </div>

      {props.compatibilityEvaluations.length > 0 ? (
        <div className="space-y-1.5">
          <SectionLabel>Compatibility</SectionLabel>
          {props.compatibilityEvaluations.map((ev) => (
            <div
              key={ev.ruleCode}
              className={`rounded-lg border px-2.5 py-2 text-[11px] ${severityChip(ev.severity)}`}
            >
              <div className="font-medium">{ev.message}</div>
              {ev.fixSuggestion ? (
                <div className="mt-0.5 text-[10px] opacity-70">{ev.fixSuggestion}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {props.bomLines.length > 0 ? (
        <div className="space-y-1.5">
          <SectionLabel>Bill of materials</SectionLabel>
          {props.bomLines.map((line) => (
            <div
              key={line.key}
              className="flex items-center justify-between rounded-md border border-[var(--ptl-border)] bg-black/[0.02] px-2 py-1.5 text-[11px]"
            >
              <span className="truncate pr-2 text-[var(--ptl-ink)]">
                {line.asset.name}
                {line.quantity > 1 ? (
                  <span className="ml-1 text-[var(--ptl-ink-muted)]">{"\u00D7"}{line.quantity}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--ptl-ink)]">
                {formatMoney(lineUnitPrice(line.asset) * line.quantity)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RightPanel(props: BuilderWorkspaceProps) {
  const dims = {
    widthIn: props.canvasState.widthIn,
    heightIn: props.canvasState.heightIn,
    depthIn: props.canvasState.depthIn,
  };
  const volumeL =
    Math.round(dims.widthIn * dims.depthIn * dims.heightIn * 0.004329 * 10) / 10;
  const selectedScale = props.selectedItem ? Math.round(props.selectedItem.scale * 100) / 100 : 1;
  const selectedRotation = props.selectedItem ? Math.round(props.selectedItem.rotation) : 0;

  return (
    <div className="w-[190px] space-y-3">
      <div className="space-y-1.5">
        {([
          { label: "W", value: dims.widthIn },
          { label: "D", value: dims.depthIn },
          { label: "H", value: dims.heightIn },
        ] as const).map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <span className="text-[var(--ptl-ink-muted)]">{d.label}</span>
            <span className="tabular-nums text-[var(--ptl-ink)]">
              {Math.round(d.value * 10) / 10}{" "}
              <span className="text-[var(--ptl-ink-muted)]">in</span>
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-2 text-center">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-[var(--ptl-ink)]">
          {volumeL}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">
          Liters
        </div>
      </div>

      {props.selectedItem && props.selectedAsset ? (
        <div className="rounded-lg border border-[var(--ptl-accent)]/25 bg-[var(--ptl-accent)]/[0.04] p-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
            Selected
          </div>
          <div className="mt-1 text-xs font-medium text-[var(--ptl-ink)]">
            {props.selectedAsset.name}
          </div>
          <div className="mt-2 space-y-2.5">
            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
                <span>Scale</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{selectedScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={6}
                step={0.01}
                value={props.selectedItem.scale}
                onChange={(event) =>
                  props.onUpdateCanvasItem(props.selectedItem!.id, {
                    scale: Number.parseFloat(event.target.value),
                  })
                }
                className="h-1.5 w-full accent-[var(--ptl-accent)]"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
                <span>Rotate</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{selectedRotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={props.selectedItem.rotation}
                onChange={(event) =>
                  props.onUpdateCanvasItem(props.selectedItem!.id, {
                    rotation: Number.parseFloat(event.target.value),
                  })
                }
                className="h-1.5 w-full accent-[var(--ptl-accent)]"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() =>
                props.onUpdateCanvasItem(props.selectedItem!.id, { scale: 1, rotation: 0 })
              }
              className="rounded border border-[var(--ptl-border)] px-1.5 py-0.5 text-[10px] text-neutral-500 transition hover:bg-black/[0.06] hover:text-[var(--ptl-ink)]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => props.onDuplicateCanvasItem(props.selectedItem!.id)}
              className="rounded border border-[var(--ptl-border)] px-1.5 py-0.5 text-[10px] text-neutral-500 transition hover:bg-black/[0.06] hover:text-[var(--ptl-ink)]"
            >
              Dup
            </button>
            <button
              type="button"
              onClick={() => props.onRemoveCanvasItem(props.selectedItem!.id)}
              className="rounded border border-red-400/25 px-1.5 py-0.5 text-[10px] text-red-600/70 transition hover:bg-red-400/10 hover:text-red-700"
            >
              Del
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BuilderWorkspace(props: BuilderWorkspaceProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  const scene = (
    <ErrorBoundary
      fallback={({ retry }) => (
        <div className="flex h-full w-full items-center justify-center bg-white/80 px-4 text-[var(--ptl-ink)]">
          <div className="w-full max-w-md rounded-2xl border border-rose-200/45 bg-white/90 p-5 text-center shadow-2xl">
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
          onClick={() => { props.onStepChange(stepId); setPanelOpen(true); }}
        />
      ))}

      <div className="my-1 h-px w-5 bg-black/8" />

      <RailBtn
        label={"\u2630"}
        title={panelOpen ? "Close panel" : "Open panel"}
        active={panelOpen}
        compact
        onClick={() => setPanelOpen((p) => !p)}
      />
      <RailBtn
        label={"\u229E"}
        title={props.canvasState.sceneSettings.gridSnapEnabled ? "Grid snap on" : "Grid snap off"}
        active={props.canvasState.sceneSettings.gridSnapEnabled}
        compact
        onClick={props.onToggleGridSnap}
      />
      <RailBtn
        label={"\u2317"}
        title={props.canvasState.sceneSettings.measurementsVisible ? "Hide measurements" : "Show measurements"}
        active={props.canvasState.sceneSettings.measurementsVisible}
        compact
        onClick={props.onToggleMeasurements}
      />

      <div className="flex-1" />

      <RailBtn
        label={props.saving ? "\u23F3" : "\u2913"}
        title="Save draft"
        disabled={props.saving}
        compact
        onClick={props.onSaveDraft}
      />
      <RailBtn
        label="?"
        title="Keyboard shortcuts"
        active={props.shortcutsOverlayOpen}
        compact
        onClick={props.onToggleShortcutsOverlay}
      />
    </>
  );

  const gti = growthTimelineSliderIndex(props.growthTimelineMonths);

  const growthToolbar = (
    <div
      role="toolbar"
      aria-label="Plant growth timeline"
      className="flex min-w-[250px] items-center gap-2.5 rounded-xl border border-[var(--ptl-border)] bg-white/60 px-3 py-2 backdrop-blur-xl"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ptl-ink-muted)]">
        Growth
      </span>
      <input
        type="range"
        min={0}
        max={GROWTH_TIMELINE_MONTH_OPTIONS.length - 1}
        step={1}
        value={gti}
        aria-label="Plant growth timeline"
        aria-valuetext={`${props.growthTimelineMonths} months`}
        onChange={(e) => {
          props.onGrowthTimelineMonthsChange(
            growthTimelineFromSliderIndex(Number.parseInt(e.target.value, 10)),
          );
        }}
        className="h-1 flex-1 accent-[var(--ptl-accent)]"
      />
      <div className="flex min-w-[76px] items-center justify-between text-[10px]">
        {GROWTH_TIMELINE_MONTH_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => props.onGrowthTimelineMonthsChange(m)}
            className={`rounded px-1 transition ${
              props.growthTimelineMonths === m
                ? "bg-[var(--ptl-accent)]/10 text-[var(--ptl-accent)]"
                : "text-neutral-500 hover:text-[var(--ptl-ink)]"
            }`}
            aria-pressed={props.growthTimelineMonths === m}
          >
            {m}m
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
        bottomToolbar={growthToolbar}
      />
      <BuilderShortcutsOverlay
        open={props.shortcutsOverlayOpen}
        onClose={props.onCloseShortcutsOverlay}
      />
    </>
  );
}
