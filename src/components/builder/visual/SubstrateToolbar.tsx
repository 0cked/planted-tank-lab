import type {
  SubstrateMaterialType,
} from "@/components/builder/visual/types";
import type { SubstrateBrushMode } from "@/components/builder/visual/scene-utils";

type SubstratePreset = "flat" | "island" | "slope" | "valley";

type SubstrateToolbarProps = {
  sculptMode: SubstrateBrushMode;
  sculptBrushSize: number;
  sculptStrength: number;
  sculptMaterial: SubstrateMaterialType;
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
  onSculptMaterialChange: (material: SubstrateMaterialType) => void;
};

const SUBSTRATE_PRESETS: Array<{ value: SubstratePreset; label: string }> = [
  { value: "flat", label: "Flat" },
  { value: "island", label: "Island" },
  { value: "slope", label: "Slope" },
  { value: "valley", label: "Valley" },
];

const SCULPT_MODES: Array<{ value: SubstrateBrushMode; label: string }> = [
  { value: "raise", label: "Raise" },
  { value: "lower", label: "Lower" },
  { value: "smooth", label: "Smooth" },
  { value: "erode", label: "Erode" },
  { value: "material", label: "Material" },
];

const MATERIAL_OPTIONS: Array<{
  value: SubstrateMaterialType;
  label: string;
  swatch: string;
}> = [
  { value: "soil", label: "Soil", swatch: "#5f452c" },
  { value: "sand", label: "Sand", swatch: "#c4ae85" },
  { value: "gravel", label: "Gravel", swatch: "#7b8082" },
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

      <div className="space-y-1.5 rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          Brush mode
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SCULPT_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={props.sculptMode === mode.value}
              onClick={() => props.onSculptModeChange(mode.value)}
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                props.sculptMode === mode.value
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-slate-300 hover:text-slate-100"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <label className="block text-[10px] text-slate-300">
          Brush size ({Math.round(props.sculptBrushSize * 100)}%)
          <input
            type="range"
            min={0.05}
            max={0.6}
            step={0.01}
            value={props.sculptBrushSize}
            aria-label="Substrate brush size"
            onChange={(event) => props.onSculptBrushSizeChange(Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block text-[10px] text-slate-300">
          Strength ({Math.round(props.sculptStrength * 100)}%)
          <input
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            value={props.sculptStrength}
            aria-label="Substrate brush strength"
            onChange={(event) => props.onSculptStrengthChange(Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>

        {props.sculptMode === "material" ? (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Material
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MATERIAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={props.sculptMaterial === option.value}
                  onClick={() => props.onSculptMaterialChange(option.value)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                    props.sculptMaterial === option.value
                      ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 text-slate-300 hover:text-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: option.swatch }}
                    />
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
