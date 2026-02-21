import { useMemo } from "react";

import {
  clampLightMountHeightIn,
  describeLightSimulationSource,
  resolveLightSimulationSource,
} from "@/components/builder/visual/light-simulation";
import { resolveScenePostprocessingPipeline } from "@/components/builder/visual/postprocessing";
import type { VisualAsset, VisualSceneSettings } from "@/components/builder/visual/types";
import type { BuilderSceneQualityTier } from "@/components/builder/visual/VisualBuilderScene";

type QualitySettingsProps = {
  sceneSettings: VisualSceneSettings;
  autoQualityTier: BuilderSceneQualityTier;
  selectedLightAsset: VisualAsset | null;
  onSceneSettingsChange: (patch: Partial<VisualSceneSettings>) => void;
  onReframe: () => void;
  onResetView: () => void;
};

const QUALITY_TIERS: Array<VisualSceneSettings["qualityTier"]> = ["auto", "high", "medium", "low"];
const CAMERA_MODES: Array<VisualSceneSettings["cameraPreset"]> = ["step", "free"];

export function QualitySettings(props: QualitySettingsProps) {
  const resolvedQualityTier =
    props.sceneSettings.qualityTier === "auto"
      ? props.autoQualityTier
      : props.sceneSettings.qualityTier;
  const glassWallsDisabled = resolvedQualityTier === "low";
  const ambientParticlesDisabled = resolvedQualityTier === "low";
  const postprocessingPipeline = resolveScenePostprocessingPipeline({
    enabled: props.sceneSettings.postprocessingEnabled,
    qualityTier: resolvedQualityTier,
  });
  const postprocessingHint =
    postprocessingPipeline === "full"
      ? "Bloom + ACES tone mapping + vignette"
      : postprocessingPipeline === "bloom"
        ? "Bloom only (medium tier)"
        : resolvedQualityTier === "low"
          ? "Unavailable on low tier"
          : "Off";

  const lightSimulationSource = useMemo(
    () => resolveLightSimulationSource(props.selectedLightAsset),
    [props.selectedLightAsset],
  );
  const hasCompatibleLight = Boolean(lightSimulationSource);
  const normalizedLightMountHeightIn = clampLightMountHeightIn(
    props.sceneSettings.lightMountHeightIn,
  );
  const lightSimulationSummary = describeLightSimulationSource(lightSimulationSource);

  const tierBtnBase =
    "inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ptl-accent)]/50";
  const tierBtnActive = "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8 text-[var(--ptl-accent)]";
  const tierBtnInactive = "border-[var(--ptl-border)] bg-black/[0.03] text-[var(--ptl-ink)] hover:bg-black/[0.06]";

  return (
    <div className="rounded-2xl border border-[var(--ptl-border)] bg-black/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">Scene quality</div>
        <div className="text-[10px] text-[var(--ptl-ink-muted)]">Auto picks {props.autoQualityTier}</div>
      </div>

      <div role="toolbar" aria-label="Scene quality tier" className="grid grid-cols-4 gap-1.5">
        {QUALITY_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            aria-label={`Set quality to ${tier}`}
            aria-pressed={props.sceneSettings.qualityTier === tier}
            onClick={() => props.onSceneSettingsChange({ qualityTier: tier })}
            className={`${tierBtnBase} ${props.sceneSettings.qualityTier === tier ? tierBtnActive : tierBtnInactive}`}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="mt-2 grid gap-2 text-[11px] text-[var(--ptl-ink)]">
        <label className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <input
              type="checkbox"
              aria-label="Enable post-processing effects"
              checked={props.sceneSettings.postprocessingEnabled}
              onChange={(event) =>
                props.onSceneSettingsChange({ postprocessingEnabled: event.target.checked })
              }
            />
            Post FX
          </span>
          <span className="text-[10px] text-[var(--ptl-ink-muted)]">{postprocessingHint}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            aria-label="Show depth guides"
            checked={props.sceneSettings.guidesVisible}
            onChange={(event) => props.onSceneSettingsChange({ guidesVisible: event.target.checked })}
          />
          Guides
        </label>

        <label
          className={`flex items-center gap-1.5 ${glassWallsDisabled ? "opacity-65" : ""}`}
          title={glassWallsDisabled ? "Glass walls are disabled on low quality for performance." : undefined}
        >
          <input
            type="checkbox"
            aria-label="Show glass tank walls"
            checked={glassWallsDisabled ? false : props.sceneSettings.glassWallsEnabled}
            disabled={glassWallsDisabled}
            onChange={(event) => props.onSceneSettingsChange({ glassWallsEnabled: event.target.checked })}
          />
          Glass walls {glassWallsDisabled ? "(low tier)" : ""}
        </label>

        <label
          className={`flex items-center gap-1.5 ${ambientParticlesDisabled ? "opacity-65" : ""}`}
          title={
            ambientParticlesDisabled
              ? "Ambient particles are disabled on low quality for performance."
              : undefined
          }
        >
          <input
            type="checkbox"
            aria-label="Enable ambient particles"
            checked={ambientParticlesDisabled ? false : props.sceneSettings.ambientParticlesEnabled}
            disabled={ambientParticlesDisabled}
            onChange={(event) =>
              props.onSceneSettingsChange({ ambientParticlesEnabled: event.target.checked })
            }
          />
          Ambient particles {ambientParticlesDisabled ? "(low tier)" : ""}
        </label>

        <label
          className={`flex items-center justify-between gap-2 ${!hasCompatibleLight ? "opacity-65" : ""}`}
          title={
            hasCompatibleLight
              ? undefined
              : "Select a compatible light product with wattage to run PAR simulation."
          }
        >
          <span className="flex items-center gap-1.5">
            <input
              type="checkbox"
              aria-label="Enable light simulation heatmap"
              checked={hasCompatibleLight ? props.sceneSettings.lightingSimulationEnabled : false}
              disabled={!hasCompatibleLight}
              onChange={(event) =>
                props.onSceneSettingsChange({
                  lightingSimulationEnabled: event.target.checked,
                })
              }
            />
            Light simulation
          </span>
          <span className="text-[10px] text-[var(--ptl-ink-muted)]">{lightSimulationSummary}</span>
        </label>

        <label className={`block ${!hasCompatibleLight ? "opacity-65" : ""}`}>
          <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--ptl-ink)]">
            <span>Mount height</span>
            <span className="text-[10px] tabular-nums text-[var(--ptl-ink-muted)]">
              {normalizedLightMountHeightIn.toFixed(1)} in
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.5}
            value={normalizedLightMountHeightIn}
            aria-label="Light fixture mounting height above water"
            aria-valuetext={`${normalizedLightMountHeightIn.toFixed(1)} inches`}
            disabled={!hasCompatibleLight}
            onChange={(event) => {
              props.onSceneSettingsChange({
                lightMountHeightIn: clampLightMountHeightIn(Number(event.target.value)),
              });
            }}
            className="w-full accent-[var(--ptl-accent)]"
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">Camera mode</div>
        <div role="toolbar" aria-label="Camera mode" className="grid grid-cols-2 gap-1.5">
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-label={mode === "step" ? "Use step-owned camera mode" : "Use free camera mode"}
              aria-pressed={props.sceneSettings.cameraPreset === mode}
              onClick={() => props.onSceneSettingsChange({ cameraPreset: mode })}
              className={`${tierBtnBase} ${props.sceneSettings.cameraPreset === mode ? tierBtnActive : tierBtnInactive}`}
            >
              {mode === "step" ? "Step-owned" : "Free"}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={props.onReframe}
            aria-label="Reframe camera to tank"
            className={`${tierBtnBase} ${tierBtnInactive}`}
          >
            Reframe
          </button>
          <button
            type="button"
            onClick={props.onResetView}
            aria-label="Reset camera view"
            className={`${tierBtnBase} ${tierBtnInactive}`}
          >
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
