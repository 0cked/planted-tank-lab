import type { SubstrateBrushMode } from "@/components/builder/visual/scene-utils";

type SubstratePreset = "flat" | "island" | "slope" | "valley";

type SubstrateToolbarProps = {
  sculptMode: SubstrateBrushMode;
  sculptBrushSize: number;
  sculptStrength: number;
  substrateVolumeLiters: number;
  hasSelectedSubstrate: boolean;
  substrateBagEstimate: {
    bagsRequired: number;
    bagVolumeLiters: number;
  };
  onPresetSelect: (preset: SubstratePreset) => void;
  onSculptModeChange: (mode: SubstrateBrushMode) => void;
  onSculptBrushSizeChange: (next: number) => void;
  onSculptStrengthChange: (next: number) => void;
};

const SUBSTRATE_PRESETS: Array<{ value: SubstratePreset; label: string }> = [
  { value: "flat", label: "Flat" },
  { value: "island", label: "Island" },
  { value: "slope", label: "Slope" },
  { value: "valley", label: "Valley" },
];

export function SubstrateToolbar(props: SubstrateToolbarProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/20 bg-slate-900/55 p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        Terrain presets
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SUBSTRATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => props.onPresetSelect(preset.value)}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-300">
          Tool
          <select
            value={props.sculptMode}
            onChange={(event) => props.onSculptModeChange(event.target.value as SubstrateBrushMode)}
            className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100"
          >
            <option value="raise">Raise</option>
            <option value="lower">Lower</option>
            <option value="smooth">Smooth</option>
            <option value="erode">Erode</option>
          </select>
        </label>

        <label className="text-[11px] text-slate-300">
          Brush size ({(props.sculptBrushSize * 100).toFixed(0)}%)
          <input
            type="range"
            min={0.06}
            max={0.56}
            step={0.01}
            value={props.sculptBrushSize}
            onChange={(event) => props.onSculptBrushSizeChange(Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <label className="block text-[11px] text-slate-300">
        Brush strength ({(props.sculptStrength * 100).toFixed(0)}%)
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={props.sculptStrength}
          onChange={(event) => props.onSculptStrengthChange(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <div className="rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300">
        Fill target: {props.substrateVolumeLiters.toFixed(1)} L
        {props.hasSelectedSubstrate ? (
          <span>
            {" "}· {props.substrateBagEstimate.bagsRequired} bag(s) @ {" "}
            {props.substrateBagEstimate.bagVolumeLiters.toFixed(1)} L
          </span>
        ) : (
          <span> · Pick a substrate product to estimate bag count.</span>
        )}
      </div>
    </div>
  );
}
