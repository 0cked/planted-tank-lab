import { SmartImage } from "@/components/SmartImage";
import {
  STEP_META,
  categoryLabel,
  formatMoney,
  lineUnitPrice,
  type BuilderStepId,
} from "@/components/builder/visual/builder-page-utils";
import type { SubstrateBrushMode } from "@/components/builder/visual/scene-utils";
import { SubstrateToolbar } from "@/components/builder/visual/SubstrateToolbar";
import type { VisualAsset, VisualTank } from "@/components/builder/visual/types";

type BuilderLeftSidebarProps = {
  currentStep: BuilderStepId;
  selectedTank: VisualTank | null;
  tanks: VisualTank[];
  onSelectTank: (tankId: string) => void;
  equipmentCategories: string[];
  activeEquipmentCategory: string;
  onEquipmentCategoryChange: (categorySlug: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filteredAssets: VisualAsset[];
  selectedProductByCategory: Record<string, string | undefined>;
  placementAssetId: string | null;
  onChooseAsset: (asset: VisualAsset) => void;
  hardscapeCount: number;
  plantCount: number;
  totalCents: number;
  substrateSelectionLabel: string;
  substrateControls: {
    sculptMode: SubstrateBrushMode;
    sculptBrushSize: number;
    sculptStrength: number;
    substrateVolumeLiters: number;
    hasSelectedSubstrate: boolean;
    substrateBagEstimate: {
      bagsRequired: number;
      bagVolumeLiters: number;
    };
    onPresetSelect: (preset: "flat" | "island" | "slope" | "valley") => void;
    onSculptModeChange: (mode: SubstrateBrushMode) => void;
    onSculptBrushSizeChange: (next: number) => void;
    onSculptStrengthChange: (next: number) => void;
  };
};

function hasAssetWorkflow(step: BuilderStepId): boolean {
  return ["substrate", "hardscape", "plants", "equipment"].includes(step);
}

export function BuilderLeftSidebar(props: BuilderLeftSidebarProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
          {STEP_META[props.currentStep].title}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-200/85">{STEP_META[props.currentStep].summary}</p>
      </div>

      {props.currentStep === "tank" ? (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Rimless tank model
          </label>
          <select
            value={props.selectedTank?.id ?? ""}
            onChange={(event) => props.onSelectTank(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {props.tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name} ({tank.widthIn} x {tank.depthIn} x {tank.heightIn} in)
              </option>
            ))}
          </select>

          {props.selectedTank ? (
            <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-2.5">
              {props.selectedTank.imageUrl ? (
                <div className="mb-2 overflow-hidden rounded-xl border border-white/10">
                  <SmartImage
                    src={props.selectedTank.imageUrl}
                    alt={props.selectedTank.name}
                    width={680}
                    height={360}
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="text-sm font-semibold text-slate-100">{props.selectedTank.name}</div>
              <div className="mt-1 text-xs text-slate-300">
                {props.selectedTank.widthIn} x {props.selectedTank.depthIn} x {props.selectedTank.heightIn} in
              </div>
              <div className="text-xs text-slate-300">
                Best price: {formatMoney(props.selectedTank.priceCents)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasAssetWorkflow(props.currentStep) ? (
        <div className="space-y-2.5">
          {props.currentStep === "equipment" ? (
            <div className="flex flex-wrap gap-1.5">
              {props.equipmentCategories.map((slug) => (
                <button
                  key={slug}
                  onClick={() => props.onEquipmentCategoryChange(slug)}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    props.activeEquipmentCategory === slug
                      ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                      : "border-white/20 bg-slate-900/50 text-slate-300"
                  }`}
                >
                  {categoryLabel(slug)}
                </button>
              ))}
            </div>
          ) : null}

          <input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="Search assets..."
            className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
          />

          {props.currentStep === "substrate" ? <SubstrateToolbar {...props.substrateControls} /> : null}

          <div className="max-h-[42vh] space-y-1.5 overflow-auto pr-1">
            {props.filteredAssets.map((asset) => {
              const selectedProductId = props.selectedProductByCategory[asset.categorySlug] ?? null;
              const isSelectedEquipment =
                asset.type === "product" &&
                asset.categorySlug !== "hardscape" &&
                asset.categorySlug !== "plants" &&
                selectedProductId === asset.id;

              const isCanvasAsset = asset.categorySlug === "hardscape" || asset.categorySlug === "plants";
              const isPlacementArmed = isCanvasAsset && props.placementAssetId === asset.id;

              return (
                <div
                  key={`${asset.type}:${asset.id}:${asset.categorySlug}`}
                  className="rounded-xl border border-white/15 bg-slate-900/55 p-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-slate-950/70">
                      {asset.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.imageUrl}
                          alt={asset.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400">No image</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-100">{asset.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-300">
                        {asset.sourceMode === "design_archetype" ? "Design archetype" : "Catalog item"} · {" "}
                        {formatMoney(lineUnitPrice(asset))}
                        {asset.sourceMode === "design_archetype" ? " est." : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => props.onChooseAsset(asset)}
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                        isPlacementArmed || isSelectedEquipment
                          ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                          : "border-emerald-400 bg-emerald-400/20 text-emerald-100"
                      }`}
                    >
                      {isCanvasAsset
                        ? isPlacementArmed
                          ? "Armed"
                          : "Place"
                        : isSelectedEquipment
                          ? "Selected"
                          : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}

            {props.filteredAssets.length === 0 ? (
              <div className="rounded-xl border border-white/15 bg-slate-900/45 p-3 text-xs text-slate-300">
                No assets match this step/filter right now.
              </div>
            ) : null}
          </div>

          {props.currentStep === "hardscape" ? (
            <div className="rounded-xl border border-white/15 bg-slate-900/45 p-2 text-xs text-slate-300">
              Hardscape placed: <span className="font-semibold text-slate-100">{props.hardscapeCount}</span>
            </div>
          ) : null}

          {props.currentStep === "plants" ? (
            <div className="rounded-xl border border-white/15 bg-slate-900/45 p-2 text-xs text-slate-300">
              Plants placed: <span className="font-semibold text-slate-100">{props.plantCount}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.currentStep === "review" ? (
        <div className="space-y-1.5 rounded-2xl border border-white/20 bg-slate-900/55 p-3 text-xs text-slate-200">
          <div>
            Tank: <span className="font-semibold">{props.selectedTank?.name ?? "None"}</span>
          </div>
          <div>Substrate: {props.substrateSelectionLabel}</div>
          <div>Hardscape items: {props.hardscapeCount}</div>
          <div>Plant items: {props.plantCount}</div>
          <div>
            Estimated total: <span className="font-semibold">{formatMoney(props.totalCents)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
