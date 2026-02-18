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
  gridSnapEnabled: boolean;
  measurementsVisible: boolean;
  measurementUnit: "in" | "cm";
  shortcutsOpen: boolean;
  onToolModeChange: (mode: BuilderSceneToolMode) => void;
  onPlacementRotationChange: (value: number) => void;
  onClusterBrushCountChange: (value: number) => void;
  onToggleGuides: () => void;
  onToggleGridSnap: () => void;
  onToggleMeasurements: () => void;
  onToggleMeasurementUnit: () => void;
  onToggleShortcuts: () => void;
};

const TOOL_MODES: Array<{ mode: BuilderSceneToolMode; label: string }> = [
  { mode: "place", label: "Place" },
  { mode: "move", label: "Move" },
  { mode: "rotate", label: "Rotate" },
  { mode: "delete", label: "Delete" },
];

export function BuilderSceneToolbar(props: BuilderSceneToolbarProps) {
  return (
    <div role="toolbar" aria-label="Builder scene controls" className="flex flex-wrap items-center gap-1.5">
      {TOOL_MODES.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => props.onToolModeChange(mode)}
          aria-label={`${label} tool`}
          aria-pressed={props.toolMode === mode}
          disabled={!props.canSceneTools}
          className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
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
          type="button"
          onClick={() => props.onToolModeChange("sculpt")}
          aria-label="Sculpt tool"
          aria-pressed={props.toolMode === "sculpt"}
          className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
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
          <label className="ml-1 text-[11px] text-slate-200">
            Rotation ({Math.round(props.placementRotationDeg)}°)
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={props.placementRotationDeg}
              aria-label="Placement rotation"
              aria-valuetext={`${Math.round(props.placementRotationDeg)} degrees`}
              onChange={(event) => props.onPlacementRotationChange(Number(event.target.value))}
              className="ml-2 w-24 align-middle"
            />
          </label>

          {props.currentStep === "plants" ? (
            <label className="text-[11px] text-slate-200">
              Cluster
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={props.clusterBrushCount}
                aria-label="Plant cluster count"
                aria-valuetext={`${props.clusterBrushCount} plants`}
                onChange={(event) => props.onClusterBrushCountChange(Number(event.target.value))}
                className="ml-2 w-20 align-middle"
              />
            </label>
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        onClick={props.onToggleGuides}
        aria-label={props.guidesVisible ? "Hide depth guides" : "Show depth guides"}
        aria-pressed={props.guidesVisible}
        className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {props.guidesVisible ? "Hide guides" : "Show guides"}
      </button>

      <button
        type="button"
        onClick={props.onToggleGridSnap}
        aria-label={props.gridSnapEnabled ? "Disable grid snap" : "Enable grid snap"}
        aria-pressed={props.gridSnapEnabled}
        className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          props.gridSnapEnabled
            ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
            : "border-white/20 bg-slate-950/70 text-slate-200"
        }`}
      >
        {props.gridSnapEnabled ? "Grid snap on" : "Grid snap off"}
      </button>

      <button
        type="button"
        onClick={props.onToggleMeasurements}
        aria-label={props.measurementsVisible ? "Hide measurement overlay" : "Show measurement overlay"}
        aria-pressed={props.measurementsVisible}
        className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          props.measurementsVisible
            ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
            : "border-white/20 bg-slate-950/70 text-slate-200"
        }`}
      >
        {props.measurementsVisible ? "Measurements on" : "Measurements off"}
      </button>

      {props.measurementsVisible ? (
        <button
          type="button"
          onClick={props.onToggleMeasurementUnit}
          aria-label={`Switch measurement units. Current unit ${props.measurementUnit.toUpperCase()}`}
          className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Units: {props.measurementUnit.toUpperCase()}
        </button>
      ) : null}

      <button
        type="button"
        onClick={props.onToggleShortcuts}
        aria-label={props.shortcutsOpen ? "Hide keyboard shortcuts" : "Show keyboard shortcuts"}
        aria-pressed={props.shortcutsOpen}
        title="Keyboard shortcuts"
        className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          props.shortcutsOpen
            ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
            : "border-white/20 bg-slate-950/70 text-slate-200"
        }`}
      >
        ?
      </button>
    </div>
  );
}
