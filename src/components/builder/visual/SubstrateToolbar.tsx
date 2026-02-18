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
    <div
      role="region"
      aria-label="Substrate sculpting controls"
      className="space-y-2 rounded-2xl border border-white/20 bg-slate-900/55 p-2.5"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
        Terrain presets
      </div>

      <div role="toolbar" aria-label="Substrate terrain presets" className="grid grid-cols-2 gap-1.5">
        {SUBSTRATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-label={`Apply ${preset.label.toLowerCase()} terrain preset`}
            onClick={() => props.onPresetSelect(preset.value)}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-2 text-[10px] leading-relaxed text-slate-300">
        Drag the dots on the substrate up or down to shape your terrain.
      </div>

      <div className="rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-200">
        Fill target: {props.substrateVolumeLiters.toFixed(1)} L
        {props.hasSelectedSubstrate ? (
          <span>
            {" "}· {props.substrateBagEstimate.bagsRequired} bag(s) @{" "}
            {props.substrateBagEstimate.bagVolumeLiters.toFixed(1)} L
          </span>
        ) : (
          <span> · Pick a substrate product to estimate bag count.</span>
        )}
      </div>
    </div>
  );
}
