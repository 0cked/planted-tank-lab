import type { Severity } from "@/engine/types";

import { BOMSidebar } from "@/components/builder/visual/BOMSidebar";
import { QualitySettings } from "@/components/builder/visual/QualitySettings";
import { severityClasses, type BomLine } from "@/components/builder/visual/builder-page-utils";
import type { VisualAsset, VisualCanvasItem, VisualSceneSettings } from "@/components/builder/visual/types";
import type { BuilderSceneQualityTier } from "@/components/builder/visual/VisualBuilderScene";

type CompatibilityEvaluation = {
  ruleCode: string;
  severity: Severity;
  message: string;
  fixSuggestion?: string | null;
};

type BuilderRightSidebarProps = {
  sceneSettings: VisualSceneSettings;
  autoQualityTier: BuilderSceneQualityTier;
  onSceneSettingsChange: (patch: Partial<VisualSceneSettings>) => void;
  onReframe: () => void;
  onResetView: () => void;
  selectedItem: VisualCanvasItem | null;
  selectedAsset: VisualAsset | null;
  hoveredItemId: string | null;
  onUpdateCanvasItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  onMoveCanvasItemLayer: (itemId: string, direction: "up" | "down" | "top" | "bottom") => void;
  onDuplicateCanvasItem: (itemId: string) => void;
  onRemoveCanvasItem: (itemId: string) => void;
  bomLines: BomLine[];
  totalCents: number;
  sceneItemCount: number;
  compatibilityEnabled: boolean;
  lowTechNoCo2: boolean;
  hasShrimp: boolean;
  compatibilityEvaluations: CompatibilityEvaluation[];
  hardscapeVolumeRatio: number | null;
  onCompatibilityEnabledChange: (value: boolean) => void;
  onLowTechNoCo2Change: (value: boolean) => void;
  onHasShrimpChange: (value: boolean) => void;
};

export function BuilderRightSidebar(props: BuilderRightSidebarProps) {
  const selectedObjectPanel = (() => {
    if (!props.selectedItem || !props.selectedAsset) {
      return (
        <div className="text-xs text-slate-300">
          Select an object in the scene to edit transform and placement metadata.
          {props.hoveredItemId ? (
            <div className="mt-1 text-[11px] text-slate-400">Hover: {props.hoveredItemId}</div>
          ) : null}
        </div>
      );
    }

    const selectedItem = props.selectedItem;
    const selectedAsset = props.selectedAsset;

    return (
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
            onChange={(event) => {
              props.onUpdateCanvasItem(selectedItem.id, {
                scale: Number(event.target.value),
              });
            }}
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
            onChange={(event) => {
              props.onUpdateCanvasItem(selectedItem.id, {
                z: Number(event.target.value),
              });
            }}
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
            onChange={(event) => {
              props.onUpdateCanvasItem(selectedItem.id, {
                rotation: Number(event.target.value),
              });
            }}
            className="mt-1 w-full"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => props.onMoveCanvasItemLayer(selectedItem.id, "up")}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Layer +
          </button>
          <button
            onClick={() => props.onMoveCanvasItemLayer(selectedItem.id, "down")}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Layer -
          </button>
          <button
            onClick={() => props.onDuplicateCanvasItem(selectedItem.id)}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Duplicate
          </button>
          <button
            onClick={() => props.onRemoveCanvasItem(selectedItem.id)}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-red-300/60 bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-3">
      <QualitySettings
        sceneSettings={props.sceneSettings}
        autoQualityTier={props.autoQualityTier}
        onSceneSettingsChange={props.onSceneSettingsChange}
        onReframe={props.onReframe}
        onResetView={props.onResetView}
      />

      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">{selectedObjectPanel}</div>

      <BOMSidebar lines={props.bomLines} totalCents={props.totalCents} sceneItemCount={props.sceneItemCount} />

      <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Compatibility</h3>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={props.compatibilityEnabled}
              onChange={(event) => props.onCompatibilityEnabledChange(event.target.checked)}
            />
            Enabled
          </label>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
          <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={props.lowTechNoCo2}
              onChange={(event) => props.onLowTechNoCo2Change(event.target.checked)}
            />
            Low-tech
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={props.hasShrimp}
              onChange={(event) => props.onHasShrimpChange(event.target.checked)}
            />
            Shrimp tank
          </label>
        </div>

        <div className="max-h-[24vh] space-y-2 overflow-auto pr-1">
          {props.compatibilityEvaluations.map((evaluation, index) => (
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

          {props.compatibilityEvaluations.length === 0 ? (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/95 px-2.5 py-2 text-xs text-emerald-800">
              No compatibility issues detected.
            </div>
          ) : null}

          {props.hardscapeVolumeRatio != null ? (
            <div className="text-[11px] text-slate-300">
              Hardscape volume estimate: {(props.hardscapeVolumeRatio * 100).toFixed(1)}%
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
