import { formatMoney, lineUnitPrice, type BomLine } from "@/components/builder/visual/builder-page-utils";

type BOMSidebarProps = {
  lines: BomLine[];
  totalCents: number;
  sceneItemCount: number;
};

export function BOMSidebar(props: BOMSidebarProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-slate-900/55 p-3">
      <h2 className="text-sm font-semibold text-slate-100">Bill of Materials</h2>
      <div className="mt-1 text-[11px] text-slate-300">Live pricing is best-effort from current offers.</div>

      <div className="mt-2 max-h-[28vh] space-y-2 overflow-auto pr-1">
        {props.lines.map((line) => {
          const canBuy = line.asset.goUrl || line.asset.purchaseUrl || line.retailerLinks?.length;
          const buyUrl = line.asset.goUrl ?? line.asset.purchaseUrl ?? null;
          const unitPrice = lineUnitPrice(line.asset);
          const totalLinePrice = unitPrice * line.quantity;

          return (
            <div key={line.key} className="rounded-xl border border-white/15 bg-slate-950/55 p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{line.categoryName}</div>
                  <div className="text-xs font-semibold text-slate-100">{line.asset.name}</div>
                  <div className="text-[11px] text-slate-300">
                    Qty {line.quantity} · Unit {formatMoney(unitPrice)}
                    {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                      ? " est."
                      : ""}
                  </div>
                  {line.notes ? <div className="text-[10px] text-slate-400">{line.notes}</div> : null}
                </div>
                <div className="text-xs font-semibold text-slate-100">{formatMoney(totalLinePrice)}</div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
                <div className="text-[10px] text-slate-400">
                  {"sourceMode" in line.asset && line.asset.sourceMode === "design_archetype"
                    ? `Material ${line.asset.materialType ?? "generic"}`
                    : `SKU ${line.asset.sku ?? "n/a"}`}
                </div>
                <div className="flex flex-wrap gap-1">
                  {buyUrl ? (
                    <a
                      href={buyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-emerald-300/70 bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100"
                    >
                      Buy
                    </a>
                  ) : null}

                  {(line.retailerLinks ?? []).slice(0, 2).map((link) => (
                    <a
                      key={`${line.key}:${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-white/20 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200"
                    >
                      {link.label}
                    </a>
                  ))}

                  {!canBuy ? (
                    <span className="rounded-md border border-white/20 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                      No offer
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {props.lines.length === 0 ? (
          <div className="rounded-xl border border-white/15 bg-slate-950/50 p-3 text-xs text-slate-300">
            Add assets to begin building your BOM.
          </div>
        ) : null}
      </div>

      <div className="mt-2 rounded-xl border border-white/15 bg-slate-950/55 p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Estimated total</span>
          <span className="font-semibold text-slate-100">{formatMoney(props.totalCents)}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {props.lines.length} line item(s), {props.sceneItemCount} scene object(s)
        </div>
      </div>
    </div>
  );
}
