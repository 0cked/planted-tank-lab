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
  controlPointGrid: {
    cols: number;
    rows: number;
  };
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

const SUBSTRATE_MATERIAL_OPTIONS: ReadonlyArray<{
  value: SubstrateMaterialType;
  label: string;
  description: string;
}> = [
  { value: "soil", label: "Aquasoil", description: "Plant-focused nutrients" },
  { value: "sand", label: "Sand", description: "Smooth, clean look" },
  { value: "gravel", label: "Gravel", description: "Stable structured bed" },
];

const SUBSTRATE_MATERIAL_LABEL: Record<SubstrateMaterialType, string> = {
  soil: "Aquasoil",
  sand: "Sand",
  gravel: "Gravel",
};

export function SubstrateToolbar(props: SubstrateToolbarProps) {
  const controlPointCount = props.controlPointGrid.cols * props.controlPointGrid.rows;

  return (
    <div
      role="region"
      aria-label="Substrate controls"
      className="space-y-3"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">
        Terrain shape
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SUBSTRATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-label={`Apply ${preset.label.toLowerCase()} terrain preset`}
            onClick={() => props.onPresetSelect(preset.value)}
            className="group flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2 py-2 text-center transition hover:border-[var(--ptl-accent)]/30 hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ptl-accent)]/50"
          >
            <span className="text-[11px] font-semibold text-[var(--ptl-ink)]">
              {preset.label}
            </span>
            <span className="text-[9px] text-[var(--ptl-ink-muted)]">
              {preset.desc}
            </span>
          </button>
        ))}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ptl-ink-muted)]">
        Material
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {SUBSTRATE_MATERIAL_OPTIONS.map((option) => {
          const selected = props.sculptMaterial === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onSculptMaterialChange(option.value)}
              className={`group flex min-h-11 touch-manipulation items-center justify-between rounded-lg border px-2.5 py-2 text-left transition ${
                selected
                  ? "border-[var(--ptl-accent)]/40 bg-[var(--ptl-accent)]/8"
                  : "border-[var(--ptl-border)] bg-black/[0.03] hover:border-[var(--ptl-accent)]/30 hover:bg-black/[0.06]"
              }`}
            >
              <span className="text-[11px] font-semibold text-[var(--ptl-ink)]">{option.label}</span>
              <span className="text-[10px] text-[var(--ptl-ink-muted)]">{option.description}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--ptl-ink-muted)]">
        Drag the dots on the substrate to fine-tune terrain height after
        choosing a preset.
      </p>

      <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-2 text-[10px] text-[var(--ptl-ink-muted)]">
        Node grid:{" "}
        <span className="font-semibold text-[var(--ptl-ink)]">
          {props.controlPointGrid.cols}×{props.controlPointGrid.rows}
        </span>{" "}
        ({controlPointCount} points)
      </div>

      <div className="rounded-lg border border-[var(--ptl-border)] bg-black/[0.03] px-2.5 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ptl-ink-muted)]">
          Volume estimate
        </div>
        <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--ptl-ink)]">
          {props.substrateVolumeLiters.toFixed(1)} L
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--ptl-ink-muted)]">
          {SUBSTRATE_MATERIAL_LABEL[props.sculptMaterial]} target: {props.substrateBagEstimate.bagsRequired} bag
          {props.substrateBagEstimate.bagsRequired !== 1 ? "s" : ""} @{" "}
          {props.substrateBagEstimate.bagVolumeLiters.toFixed(1)} L each
        </div>
        {props.hasSelectedSubstrate ? (
          <div className="mt-0.5 text-[10px] text-neutral-500">
            Product picks are auto-generated in Review from this material profile.
          </div>
        ) : null}
      </div>
    </div>
  );
}
