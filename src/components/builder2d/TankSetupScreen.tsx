import { TANK_PRESETS } from "@/components/builder2d/data";
import { dimsLabel } from "@/components/builder2d/state";
import type { TankPreset } from "@/components/builder2d/types";

type TankSetupScreenProps = {
  selectedTank: TankPreset;
  onSelectTank: (tankId: string) => void;
  onNext: () => void;
};

export function TankSetupScreen(props: TankSetupScreenProps) {
  return (
    <section className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,430px)_1fr]">
      <div className="ptl-builder-panel space-y-3 rounded-2xl p-4 text-white/90">
        <div className="rounded-xl border border-white/16 bg-white/8 px-4 py-3 text-3xl font-semibold text-white">
          Blank Scape
        </div>
        <div className="px-1 text-sm text-white/66">
          {props.selectedTank.name} | {props.selectedTank.liters} liters
        </div>
        <div className="ptl-builder-canvas relative aspect-[5/3] p-3 shadow-inner">
          <div className="absolute inset-[6%] rounded-xl border border-white/45" />
          <div className="absolute inset-x-[8%] bottom-[7%] h-[20%] rounded-sm bg-gradient-to-b from-[#3f3a37] via-[#262325] to-[#161515]" />
        </div>
        <div className="rounded-xl border border-white/14 bg-white/8 p-2">
          <div className="flex items-center justify-between border-b border-white/14 px-2 py-2">
            <span className="font-medium">Width (cm)</span>
            <span>{props.selectedTank.widthCm}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/14 px-2 py-2">
            <span className="font-medium">Depth (cm)</span>
            <span>{props.selectedTank.depthCm}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-2">
            <span className="font-medium">Height (cm)</span>
            <span>{props.selectedTank.heightCm}</span>
          </div>
        </div>
      </div>

      <div className="ptl-builder-panel space-y-3 rounded-2xl p-4 text-white/90">
        <div className="border-b border-white/14 pb-2">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Tank Sizes</h2>
          <p className="mt-1 text-sm text-white/64">Standard</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TANK_PRESETS.map((preset) => {
            const active = preset.id === props.selectedTank.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => props.onSelectTank(preset.id)}
                className={`rounded-xl border p-2 text-left transition ${
                  active
                    ? "border-white/45 bg-white/92 text-[#1d3127] shadow-[0_0_0_1px_rgba(239,248,243,0.4)]"
                    : "border-white/16 bg-white/8 text-white/84 hover:border-white/26 hover:bg-white/12"
                }`}
              >
                <div className="relative aspect-[5/3] rounded-lg border border-white/28 bg-gradient-to-b from-white/35 to-white/10">
                  <div className="absolute inset-[7%] rounded border border-white/35" />
                  <div className="absolute inset-x-[9%] bottom-[8%] h-[20%] rounded-sm bg-gradient-to-b from-[#393432] via-[#242123] to-[#141416]" />
                </div>
                <div className="mt-2 text-center text-sm font-semibold">{preset.name}</div>
                <div className={`text-center text-xs ${active ? "text-[#31473c]" : "text-white/62"}`}>{dimsLabel(preset)}</div>
                <div className={`text-center text-xs ${active ? "text-[#31473c]" : "text-white/62"}`}>{preset.liters} liters</div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={props.onNext} className="ptl-btn-primary px-6 py-2">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
