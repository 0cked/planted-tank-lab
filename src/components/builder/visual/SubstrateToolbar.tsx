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

const SUBSTRATE_PRESETS: Array<{
  value: SubstratePreset;
  label: string;
  desc: string;
}> = [
  { value: "flat", label: "Flat", desc: "Even layer" },
  { value: "island", label: "Island", desc: "Center mound" },
  { value: "slope", label: "Slope", desc: "Back to front" },
  { value: "valley", label: "Valley", desc: "U-shaped" },
];

export function SubstrateToolbar(props: SubstrateToolbarProps) {
  return (
    <div
      role="region"
      aria-label="Substrate controls"
      className="space-y-3"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        Terrain shape
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SUBSTRATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-label={`Apply ${preset.label.toLowerCase()} terrain preset`}
            onClick={() => props.onPresetSelect(preset.value)}
            className="group flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            <span className="text-[11px] font-semibold text-white/90">
              {preset.label}
            </span>
            <span className="text-[9px] text-white/40">
              {preset.desc}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-white/35">
        Drag the dots on the substrate to fine-tune terrain height after
        choosing a preset.
      </p>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Volume estimate
        </div>
        <div className="mt-1 text-sm font-semibold tabular-nums text-white/90">
          {props.substrateVolumeLiters.toFixed(1)} L
        </div>
        {props.hasSelectedSubstrate ? (
          <div className="mt-0.5 text-[10px] text-white/50">
            {props.substrateBagEstimate.bagsRequired} bag
            {props.substrateBagEstimate.bagsRequired !== 1 ? "s" : ""} @{" "}
            {props.substrateBagEstimate.bagVolumeLiters.toFixed(1)} L each
          </div>
        ) : (
          <div className="mt-0.5 text-[10px] text-white/35">
            Select a substrate product below for bag estimate.
          </div>
        )}
      </div>
    </div>
  );
}
