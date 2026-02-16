import type {
  BuilderSceneStep,
  BuilderSceneToolMode,
} from "@/components/builder/visual/VisualBuilderScene";

type BuilderSceneToolbarProps = {
  currentStep: BuilderSceneStep;
  toolMode: BuilderSceneToolMode;
  canSceneTools: boolean;
  placementAssetArmed: boolean;
  placementRotationDeg: number;
  clusterBrushCount: number;
  guidesVisible: boolean;
  onToolModeChange: (mode: BuilderSceneToolMode) => void;
  onPlacementRotationChange: (value: number) => void;
  onClusterBrushCountChange: (value: number) => void;
  onToggleGuides: () => void;
};

const TOOL_MODES: Array<{ mode: BuilderSceneToolMode; label: string }> = [
  { mode: "place", label: "Place" },
  { mode: "move", label: "Move" },
  { mode: "rotate", label: "Rotate" },
  { mode: "delete", label: "Delete" },
];

export function BuilderSceneToolbar(props: BuilderSceneToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TOOL_MODES.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => props.onToolModeChange(mode)}
          disabled={!props.canSceneTools}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            props.toolMode === mode
              ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
              : "border-white/20 bg-slate-950/70 text-slate-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {label}
        </button>
      ))}

      {props.currentStep === "substrate" ? (
        <button
          onClick={() => props.onToolModeChange("sculpt")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            props.toolMode === "sculpt"
              ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
              : "border-white/20 bg-slate-950/70 text-slate-200"
          }`}
        >
          Sculpt
        </button>
      ) : null}

      {props.placementAssetArmed ? (
        <>
          <label className="ml-1 text-[11px] text-slate-300">
            Rotation ({Math.round(props.placementRotationDeg)}°)
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={props.placementRotationDeg}
              onChange={(event) => props.onPlacementRotationChange(Number(event.target.value))}
              className="ml-2 w-24 align-middle"
            />
          </label>

          {props.currentStep === "plants" ? (
            <label className="text-[11px] text-slate-300">
              Cluster
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={props.clusterBrushCount}
                onChange={(event) => props.onClusterBrushCountChange(Number(event.target.value))}
                className="ml-2 w-20 align-middle"
              />
            </label>
          ) : null}
        </>
      ) : null}

      <button
        onClick={props.onToggleGuides}
        className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200"
      >
        {props.guidesVisible ? "Hide guides" : "Show guides"}
      </button>
    </div>
  );
}
