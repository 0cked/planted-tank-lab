import { useMemo, useState } from "react";
import Image from "next/image";

import { BuilderShortcutsOverlay } from "@/components/builder/visual/BuilderShortcutsOverlay";
import { BuilderViewportLayout } from "@/components/builder/visual/BuilderViewportLayout";
import { SubstrateToolbar } from "@/components/builder/visual/SubstrateToolbar";
import type {
  VisualBuildTemplateCatalogCard,
  VisualBuildTemplateId,
} from "@/components/builder/visual/build-templates";
import {
  categoryLabel,
  formatMoney,
  lineUnitPrice,
  type BomLine,
  type BuilderStepId,
} from "@/components/builder/visual/builder-page-utils";
import {
  estimateCollisionRadius,
  type SubstrateBrushMode,
} from "@/components/builder/visual/scene-utils";
import type {
  CabinetFinishStyle,
  SubstrateHeightfield,
  SubstrateMaterialGrid,
  SubstrateMaterialType,
  TankBackgroundStyle,
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
  buildId: string | null;
  shareSlug: string | null;
  saveState: {
    type: "idle" | "ok" | "error";
    message: string;
  };
  canLoadSavedBuilds: boolean;
  loadingSavedBuilds: boolean;
  savedBuilds: Array<{
    buildId: string;
    shareSlug: string;
    name: string;
    updatedAt: string;
    itemCount: number;
    isPublic: boolean;
  }>;
  onLoadSavedBuild: (shareSlug: string) => void;
  onCreateNewDraft: () => void;
  onWipeStartClean: () => void;
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

type HardscapeSplitMode = "rocks" | "wood";

type WorkflowRailItem = {
  id: "tank" | "substrate" | "rocks" | "wood" | "plants" | "review";
  step: BuilderStepId;
  title: string;
  iconSrc?: string;
  iconAlt?: string;
  label?: string;
  hardscapeMode?: HardscapeSplitMode;
  doneStep: BuilderStepId;
};

const WORKFLOW_RAIL_ITEMS: ReadonlyArray<WorkflowRailItem> = [
  {
    id: "tank",
    step: "tank",
    title: "Choose tank",
    iconSrc: "/visual-assets/icons/tank-select-icon.svg",
    iconAlt: "Tank",
    doneStep: "tank",
  },
  {
    id: "substrate",
    step: "substrate",
    title: "Shape substrate",
    iconSrc: "/visual-assets/icons/substrate-select-icon.svg",
    iconAlt: "Substrate",
    doneStep: "substrate",
  },
  {
    id: "rocks",
    step: "hardscape",
    title: "Place rocks",
    iconSrc: "/visual-assets/icons/rock-select-icon.svg",
    iconAlt: "Rocks",
    hardscapeMode: "rocks",
    doneStep: "hardscape",
  },
  {
    id: "wood",
    step: "hardscape",
    title: "Place wood",
    iconSrc: "/visual-assets/icons/wood-select-icon.svg",
    iconAlt: "Wood",
    hardscapeMode: "wood",
    doneStep: "hardscape",
  },
  {
    id: "plants",
    step: "plants",
    title: "Plant zones",
    iconSrc: "/visual-assets/icons/plant-select-icon.svg",
    iconAlt: "Plants",
    doneStep: "plants",
  },
  {
    id: "review",
    step: "review",
    title: "Review build",
    label: "✓",
    doneStep: "review",
  },
];

const HARDSCAPE_MODE_LABEL: Record<HardscapeSplitMode, string> = {
  rocks: "Rocks",
  wood: "Wood",
};

const TANK_BACKGROUND_OPTIONS: ReadonlyArray<{
  value: TankBackgroundStyle;
  label: string;
}> = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "frosted", label: "Frosted" },
  { value: "custom", label: "Custom" },
];

const CABINET_FINISH_OPTIONS: ReadonlyArray<{
  value: CabinetFinishStyle;
  label: string;
}> = [
  { value: "white", label: "White" },
  { value: "charcoal", label: "Charcoal" },
  { value: "oak", label: "Oak grain" },
  { value: "walnut", label: "Walnut grain" },
  { value: "custom", label: "Custom" },
];

function RailBtn(props: {
  label?: string;
  iconSrc?: string;
  iconAlt?: string;
  title: string;
  active?: boolean;
  done?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const size = props.compact ? "h-8 w-8 text-xs" : "h-11 w-11";
  const variant = props.disabled
    ? "cursor-not-allowed text-neutral-300"
    : props.active
      ? "border-[var(--ptl-accent)]/50 bg-[var(--ptl-accent)]/14 text-[var(--ptl-accent)] shadow-[0_8px_22px_rgba(27,127,90,0.2)]"
      : props.done
        ? "border-emerald-300/45 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50/70"
        : "border-[var(--ptl-border)] bg-white/75 text-neutral-500 hover:bg-white/95 hover:text-[var(--ptl-ink)]";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title}
      className={`flex ${size} items-center justify-center rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ptl-accent)]/50 ${variant}`}
    >
      {props.iconSrc ? (
        <Image
          src={props.iconSrc}
          alt={props.iconAlt ?? props.title}
          width={props.compact ? 16 : 28}
          height={props.compact ? 16 : 28}
          className={`h-auto w-auto object-contain ${props.disabled ? "opacity-35" : props.active ? "opacity-100" : "opacity-80"}`}
        />
      ) : (
        <span className="font-semibold">{props.label}</span>
      )}
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

function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#[\da-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

function formatSavedBuildTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Updated recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BuildActionsCard(props: BuilderWorkspaceProps) {
  const [selectedShareSlug, setSelectedShareSlug] = useState("");
  const activeShareSlug =
    selectedShareSlug && props.savedBuilds.some((build) => build.shareSlug === selectedShareSlug)
      ? selectedShareSlug
      : props.savedBuilds[0]?.shareSlug ?? "";

  const saveTone =
    props.saveState.type === "error"
      ? "border-red-300/60 bg-red-50/80 text-red-700"
      : props.saveState.type === "ok"
        ? "border-emerald-300/60 bg-emerald-50/80 text-emerald-700"
        : "border-[var(--ptl-border)] bg-black/[0.02] text-[var(--ptl-ink-muted)]";

  return (
    <div className="space-y-2 rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
          Build actions
        </div>
        <div className="text-[10px] text-[var(--ptl-ink-muted)]">
          {props.buildId ? "Saved build" : "Unsaved draft"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={props.onSaveDraft}
          disabled={props.saving}
          className="rounded-lg border border-[var(--ptl-accent)]/35 bg-[var(--ptl-accent)]/10 px-2 py-1.5 text-[11px] font-semibold text-[var(--ptl-accent)] transition hover:bg-[var(--ptl-accent)]/15 disabled:cursor-wait disabled:opacity-60"
        >
          {props.saving ? "Saving..." : "Save build"}
        </button>
        <button
          type="button"
          onClick={props.onCreateNewDraft}
          className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-1.5 text-[11px] font-semibold text-[var(--ptl-ink)] transition hover:bg-black/[0.06]"
        >
          New draft
        </button>
        <button
          type="button"
          onClick={props.onWipeStartClean}
          className="rounded-lg border border-amber-300/35 bg-amber-50/45 px-2 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50/65"
        >
          Wipe clean
        </button>
        <button
          type="button"
          onClick={() => {
            if (!activeShareSlug) return;
            props.onLoadSavedBuild(activeShareSlug);
          }}
          disabled={props.loadingSavedBuilds || !activeShareSlug || !props.canLoadSavedBuilds}
          className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-1.5 text-[11px] font-semibold text-[var(--ptl-ink)] transition hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load selected
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
          Saved builds
        </div>
        {!props.canLoadSavedBuilds ? (
          <div className="rounded-md border border-[var(--ptl-border)] bg-black/[0.02] px-2 py-1.5 text-[10px] text-[var(--ptl-ink-muted)]">
            Sign in to load your saved builds.
          </div>
        ) : props.loadingSavedBuilds ? (
          <div className="rounded-md border border-[var(--ptl-border)] bg-black/[0.02] px-2 py-1.5 text-[10px] text-[var(--ptl-ink-muted)]">
            Loading saved builds...
          </div>
        ) : props.savedBuilds.length === 0 ? (
          <div className="rounded-md border border-[var(--ptl-border)] bg-black/[0.02] px-2 py-1.5 text-[10px] text-[var(--ptl-ink-muted)]">
            No saved builds yet. Save this draft first.
          </div>
        ) : (
          <>
            <select
              value={activeShareSlug}
              onChange={(event) => setSelectedShareSlug(event.target.value)}
              className="w-full rounded-md border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-1.5 text-[11px] text-[var(--ptl-ink)] outline-none focus:border-[var(--ptl-accent)]/40"
            >
              {props.savedBuilds.map((build) => (
                <option key={build.buildId} value={build.shareSlug}>
                  {build.name} ({build.itemCount} items)
                </option>
              ))}
            </select>
            <div className="rounded-md border border-[var(--ptl-border)] bg-black/[0.02] px-2 py-1.5 text-[10px] text-[var(--ptl-ink-muted)]">
              {(() => {
                const selected = props.savedBuilds.find((build) => build.shareSlug === activeShareSlug);
                if (!selected) return "Choose a saved build to load.";
                return `${formatSavedBuildTimestamp(selected.updatedAt)} • ${selected.isPublic ? "Public" : "Private"} • /builder/${selected.shareSlug}`;
              })()}
            </div>
          </>
        )}
      </div>

      {props.saveState.message ? (
        <div className={`rounded-md border px-2 py-1.5 text-[10px] font-medium ${saveTone}`}>
          {props.saveState.message}
        </div>
      ) : null}
    </div>
  );
}

function normalizeInset(sizeIn: number, radiusIn: number): number {
  if (!Number.isFinite(sizeIn) || sizeIn <= 0) return 0.5;
  if (!Number.isFinite(radiusIn) || radiusIn <= 0) return 0;
  return Math.min(0.5, Math.max(0, radiusIn / sizeIn));
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

type StepPanelProps = BuilderWorkspaceProps & {
  hardscapeMode: HardscapeSplitMode;
  onHardscapeModeChange: (mode: HardscapeSplitMode) => void;
  filteredAssetsForStep: VisualAsset[];
};

function StepPanel(props: StepPanelProps) {
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
    const tankBackgroundStyle = props.canvasState.sceneSettings.tankBackgroundStyle;
    const tankBackgroundColor = props.canvasState.sceneSettings.tankBackgroundColor;
    const cabinetFinishStyle = props.canvasState.sceneSettings.cabinetFinishStyle;
    const cabinetColor = props.canvasState.sceneSettings.cabinetColor;

    return (
      <div className="space-y-3">
        <BuildActionsCard {...props} />
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

        <div className="space-y-2 rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
            Background
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TANK_BACKGROUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => props.onSceneSettingsChange({ tankBackgroundStyle: option.value })}
                className={`rounded-lg border px-2 py-1.5 text-left text-[10px] font-semibold transition ${
                  tankBackgroundStyle === option.value
                    ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8 text-[var(--ptl-accent)]"
                    : "border-[var(--ptl-border)] bg-black/[0.03] text-[var(--ptl-ink)] hover:bg-black/[0.06]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {tankBackgroundStyle === "custom" ? (
            <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-1.5">
              <label className="flex items-center justify-between gap-2 text-[10px] text-[var(--ptl-ink-muted)]">
                <span>Color</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{tankBackgroundColor}</span>
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={tankBackgroundColor}
                  aria-label="Tank background color"
                  onChange={(event) => {
                    props.onSceneSettingsChange({
                      tankBackgroundColor: normalizeHexColor(event.target.value, tankBackgroundColor),
                    });
                  }}
                  className="h-8 w-10 cursor-pointer rounded border border-[var(--ptl-border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={tankBackgroundColor}
                  onChange={(event) => {
                    props.onSceneSettingsChange({
                      tankBackgroundColor: normalizeHexColor(event.target.value, tankBackgroundColor),
                    });
                  }}
                  className="h-8 w-full rounded-md border border-[var(--ptl-border)] bg-black/5 px-2 py-1 text-xs font-medium uppercase tracking-[0.04em] text-[var(--ptl-ink)] outline-none focus:border-[var(--ptl-accent)]/40"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
            Cabinet
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CABINET_FINISH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => props.onSceneSettingsChange({ cabinetFinishStyle: option.value })}
                className={`rounded-lg border px-2 py-1.5 text-left text-[10px] font-semibold transition ${
                  cabinetFinishStyle === option.value
                    ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8 text-[var(--ptl-accent)]"
                    : "border-[var(--ptl-border)] bg-black/[0.03] text-[var(--ptl-ink)] hover:bg-black/[0.06]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {cabinetFinishStyle === "custom" ? (
            <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-1.5">
              <label className="flex items-center justify-between gap-2 text-[10px] text-[var(--ptl-ink-muted)]">
                <span>Color</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{cabinetColor}</span>
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={cabinetColor}
                  aria-label="Cabinet color"
                  onChange={(event) => {
                    props.onSceneSettingsChange({
                      cabinetColor: normalizeHexColor(event.target.value, cabinetColor),
                    });
                  }}
                  className="h-8 w-10 cursor-pointer rounded border border-[var(--ptl-border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={cabinetColor}
                  onChange={(event) => {
                    props.onSceneSettingsChange({
                      cabinetColor: normalizeHexColor(event.target.value, cabinetColor),
                    });
                  }}
                  className="h-8 w-full rounded-md border border-[var(--ptl-border)] bg-black/5 px-2 py-1 text-xs font-medium uppercase tracking-[0.04em] text-[var(--ptl-ink)] outline-none focus:border-[var(--ptl-accent)]/40"
                />
              </div>
            </div>
          ) : null}
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
        <BuildActionsCard {...props} />
        <SectionLabel>Substrate</SectionLabel>
        <SubstrateToolbar {...props.substrateControls} />
      </div>
    );
  }

  if (step === "equipment") {
    return (
      <div className="space-y-3">
        <BuildActionsCard {...props} />
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
        <BuildActionsCard {...props} />
        <SectionLabel>
          {step === "hardscape"
            ? `Hardscape - ${HARDSCAPE_MODE_LABEL[props.hardscapeMode]}`
            : "Plants"}
        </SectionLabel>
        {step === "hardscape" ? (
          <div className="grid grid-cols-2 gap-1">
            {(["rocks", "wood"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={props.hardscapeMode === mode}
                onClick={() => props.onHardscapeModeChange(mode)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                  props.hardscapeMode === mode
                    ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/10 text-[var(--ptl-accent)]"
                    : "border-[var(--ptl-border)] bg-black/[0.03] text-[var(--ptl-ink-muted)] hover:text-[var(--ptl-ink)]"
                }`}
              >
                {HARDSCAPE_MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        ) : null}
        <AssetList
          search={props.search}
          onSearchChange={props.onSearchChange}
          filteredAssets={props.filteredAssetsForStep}
          selectedProductByCategory={props.selectedProductByCategory}
          placementAssetId={props.placementAssetId}
          onChooseAsset={props.onChooseAsset}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BuildActionsCard {...props} />
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
  const selectedCollisionRadius =
    props.selectedItem && props.selectedAsset
      ? estimateCollisionRadius({
          item: props.selectedItem,
          assetWidthIn: props.selectedAsset.widthIn,
          assetDepthIn: props.selectedAsset.depthIn,
        })
      : 0;
  const depthInset = normalizeInset(dims.depthIn, selectedCollisionRadius);
  const depthMin = depthInset >= 0.5 ? 0.5 : depthInset;
  const depthMax = depthInset >= 0.5 ? 0.5 : 1 - depthInset;
  const selectedDepthValue = props.selectedItem
    ? Math.min(depthMax, Math.max(depthMin, props.selectedItem.z))
    : 0.5;
  const selectedDepth = Math.round(selectedDepthValue * 100);
  const selectedHeightIn = props.selectedItem
    ? (Math.round(props.selectedItem.y * dims.heightIn * 10) / 10).toFixed(1)
    : "0.0";

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

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
                <span>Depth</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{selectedDepth}%</span>
              </div>
              <input
                type="range"
                min={depthMin}
                max={depthMax}
                step={0.001}
                value={selectedDepthValue}
                onChange={(event) =>
                  props.onUpdateCanvasItem(props.selectedItem!.id, {
                    z: Math.min(depthMax, Math.max(depthMin, Number.parseFloat(event.target.value))),
                  })
                }
                className="h-1.5 w-full accent-[var(--ptl-accent)]"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
                <span>Height</span>
                <span className="tabular-nums text-[var(--ptl-ink)]">{selectedHeightIn} in</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={props.selectedItem.y}
                onChange={(event) =>
                  props.onUpdateCanvasItem(props.selectedItem!.id, {
                    y: Number.parseFloat(event.target.value),
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
  const [hardscapeMode, setHardscapeMode] = useState<HardscapeSplitMode>("rocks");

  const filteredAssetsForStep = useMemo(() => {
    if (props.currentStep !== "hardscape") {
      return props.filteredAssets;
    }

    return props.filteredAssets.filter((asset) => {
      if (asset.categorySlug !== "hardscape") return false;
      const kind = resolveVisualAsset(asset).fallbackKind;
      return hardscapeMode === "rocks" ? kind === "rock" : kind === "wood";
    });
  }, [hardscapeMode, props.currentStep, props.filteredAssets]);

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
        showDepthGuides={props.canvasState.sceneSettings.guidesVisible}
        gridSnapEnabled={props.canvasState.sceneSettings.gridSnapEnabled}
        showMeasurements={props.canvasState.sceneSettings.measurementsVisible}
        measurementUnit={props.canvasState.sceneSettings.measurementUnit}
        qualityTier={props.qualityTier}
        postprocessingEnabled={props.canvasState.sceneSettings.postprocessingEnabled}
        glassWallsEnabled={props.canvasState.sceneSettings.glassWallsEnabled}
        tankBackgroundStyle={props.canvasState.sceneSettings.tankBackgroundStyle}
        tankBackgroundColor={props.canvasState.sceneSettings.tankBackgroundColor}
        cabinetFinishStyle={props.canvasState.sceneSettings.cabinetFinishStyle}
        cabinetColor={props.canvasState.sceneSettings.cabinetColor}
        ambientParticlesEnabled={props.canvasState.sceneSettings.ambientParticlesEnabled}
        lightingSimulationEnabled={props.canvasState.sceneSettings.lightingSimulationEnabled}
        lightMountHeightIn={props.canvasState.sceneSettings.lightMountHeightIn}
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
      {WORKFLOW_RAIL_ITEMS.map((item) => (
        <RailBtn
          key={item.id}
          iconSrc={item.iconSrc}
          iconAlt={item.iconAlt}
          label={item.label}
          title={item.title}
          active={
            props.currentStep === item.step &&
            (item.step !== "hardscape" || item.hardscapeMode === hardscapeMode)
          }
          done={props.stepCompletion[item.doneStep]}
          disabled={!props.canNavigateToStep(item.step)}
          onClick={() => {
            if (item.hardscapeMode) {
              setHardscapeMode(item.hardscapeMode);
            }
            props.onStepChange(item.step);
            setPanelOpen(true);
          }}
        />
      ))}

      <div className="my-1 h-px w-8 bg-black/10" />

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

  return (
    <>
      <BuilderViewportLayout
        scene={scene}
        iconRail={iconRail}
        floatingPanel={
          panelOpen ? (
            <StepPanel
              {...props}
              hardscapeMode={hardscapeMode}
              onHardscapeModeChange={setHardscapeMode}
              filteredAssetsForStep={filteredAssetsForStep}
            />
          ) : null
        }
        floatingRight={<RightPanel {...props} />}
      />
      <BuilderShortcutsOverlay
        open={props.shortcutsOverlayOpen}
        onClose={props.onCloseShortcutsOverlay}
      />
    </>
  );
}
