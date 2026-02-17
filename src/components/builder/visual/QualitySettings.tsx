import { resolveScenePostprocessingPipeline } from "@/components/builder/visual/postprocessing";
import type { VisualSceneSettings } from "@/components/builder/visual/types";
import type { BuilderSceneQualityTier } from "@/components/builder/visual/VisualBuilderScene";

type QualitySettingsProps = {
  sceneSettings: VisualSceneSettings;
  autoQualityTier: BuilderSceneQualityTier;
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

  return (
    <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Scene quality</div>
        <div className="text-[10px] text-slate-400">Auto picks {props.autoQualityTier}</div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {QUALITY_TIERS.map((tier) => (
          <button
            key={tier}
            onClick={() => props.onSceneSettingsChange({ qualityTier: tier })}
            className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold ${
              props.sceneSettings.qualityTier === tier
                ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                : "border-white/20 bg-slate-950/60 text-slate-300"
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="mt-2 grid gap-2 text-[11px] text-slate-300">
        <label className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={props.sceneSettings.postprocessingEnabled}
              onChange={(event) =>
                props.onSceneSettingsChange({ postprocessingEnabled: event.target.checked })
              }
            />
            Post FX
          </span>
          <span className="text-[10px] text-slate-400">{postprocessingHint}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
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
            checked={glassWallsDisabled ? false : props.sceneSettings.glassWallsEnabled}
            disabled={glassWallsDisabled}
            onChange={(event) => props.onSceneSettingsChange({ glassWallsEnabled: event.target.checked })}
          />
          Glass walls {glassWallsDisabled ? "(low tier)" : ""}
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">Camera mode</div>
        <div className="grid grid-cols-2 gap-1.5">
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => props.onSceneSettingsChange({ cameraPreset: mode })}
              className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                props.sceneSettings.cameraPreset === mode
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
            onClick={props.onReframe}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Reframe
          </button>
          <button
            onClick={props.onResetView}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
