"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo, useState } from "react";

import { trpc } from "@/components/TRPCProvider";
import { evaluateBuild } from "@/engine/evaluate";
import type {
  BuildFlags,
  BuildSnapshot,
  CompatibilityRule,
  Evaluation,
  PlantSnapshot,
  ProductSnapshot,
  Severity,
} from "@/engine/types";
import type { AppRouter } from "@/server/trpc/router";
import { useBuilderStore } from "@/stores/builder-store";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CategoryRow = RouterOutputs["products"]["categoriesList"][number];
type RuleRow = RouterOutputs["rules"]["listActive"][number];
type ProductRow = RouterOutputs["products"]["listByCategorySlug"][number];
type PlantRow = RouterOutputs["plants"]["list"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numOrNull(value: string | number | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function severityLabel(sev: Severity): string {
  switch (sev) {
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    case "recommendation":
      return "Recommendation";
    case "completeness":
      return "Note";
  }
}

function severityClasses(sev: Severity): string {
  switch (sev) {
    case "error":
      return "border-red-200 bg-red-50 text-red-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "recommendation":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "completeness":
      return "border-neutral-200 bg-neutral-50 text-neutral-900";
  }
}

function toSeverity(value: string): Severity {
  switch (value) {
    case "error":
    case "warning":
    case "recommendation":
    case "completeness":
      return value;
    default:
      return "completeness";
  }
}

function toCompatibilityRule(r: RuleRow): CompatibilityRule {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    severity: toSeverity(r.severity),
    categoriesInvolved: r.categoriesInvolved,
    conditionLogic: isRecord(r.conditionLogic) ? r.conditionLogic : {},
    messageTemplate: r.messageTemplate,
    fixSuggestion: r.fixSuggestion,
    active: r.active,
    version: r.version,
  };
}

function toPlantSnapshot(p: PlantRow): PlantSnapshot {
  return {
    id: p.id,
    commonName: p.commonName,
    slug: p.slug,
    difficulty: p.difficulty,
    lightDemand: p.lightDemand,
    co2Demand: p.co2Demand,
    growthRate: p.growthRate ?? null,
    placement: p.placement,
    tempMinF: numOrNull(p.tempMinF),
    tempMaxF: numOrNull(p.tempMaxF),
    phMin: numOrNull(p.phMin),
    phMax: numOrNull(p.phMax),
    ghMin: p.ghMin ?? null,
    ghMax: p.ghMax ?? null,
    khMin: p.khMin ?? null,
    khMax: p.khMax ?? null,
    maxHeightIn: numOrNull(p.maxHeightIn),
  };
}

function toProductSnapshot(categorySlug: string, row: ProductRow): ProductSnapshot {
  const brandName = row.brand?.name ?? null;
  const name = brandName ? `${brandName} ${row.name}` : row.name;
  return {
    id: row.id,
    name,
    slug: row.slug,
    categorySlug,
    specs: isRecord(row.specs) ? row.specs : {},
  };
}

function buildSnapshot(params: {
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  flags: BuildFlags;
}): BuildSnapshot {
  return {
    productsByCategory: params.productsByCategory,
    plants: params.plants,
    flags: params.flags,
  };
}

function groupByCategory(evals: Evaluation[]): Record<string, Evaluation[]> {
  const out: Record<string, Evaluation[]> = {};
  for (const e of evals) {
    for (const c of e.categoriesInvolved) {
      out[c] ??= [];
      out[c].push(e);
    }
  }
  return out;
}

function countsBySeverity(evals: Evaluation[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    recommendation: 0,
    completeness: 0,
  };
  for (const e of evals) counts[e.severity] += 1;
  return counts;
}

function CategoryRowView(props: {
  categoryName: string;
  required: boolean;
  selectionLabel: string;
  priceLabel: string;
  evals: Evaluation[];
  onChoose: () => void;
  onRemove?: () => void;
}) {
  const topEval = props.evals[0] ?? null;

  return (
    <div className="grid grid-cols-[1fr_1.7fr_0.8fr_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium">{props.categoryName}</div>
          {props.required ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
              Required
            </span>
          ) : null}
        </div>
        {topEval ? (
          <div className="mt-1 text-xs text-neutral-600">
            <span className="font-medium">{severityLabel(topEval.severity)}:</span>{" "}
            {topEval.message}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm text-neutral-700">{props.selectionLabel}</div>
      </div>

      <div className="text-right text-sm text-neutral-700">{props.priceLabel}</div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onChoose}
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {props.selectionLabel.startsWith("+") ? "Choose" : "Swap"}
        </button>
        {props.onRemove ? (
          <button
            type="button"
            onClick={props.onRemove}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PickerDialog(props: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                {props.title}
              </Dialog.Title>
              {props.description ? (
                <Dialog.Description className="mt-1 text-sm text-neutral-600">
                  {props.description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Close
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4">{props.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProductPicker(props: {
  categorySlug: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (p: ProductSnapshot) => void;
}) {
  const q = trpc.products.listByCategorySlug.useQuery({
    categorySlug: props.categorySlug,
    limit: 200,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    const t = query.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const brandName = (r.brand?.name ?? "").toLowerCase();
      const name = r.name.toLowerCase();
      return name.includes(t) || brandName.includes(t);
    });
  }, [q.data, query]);

  return (
    <PickerDialog
      title={`Choose a ${props.categoryName}`}
      description="Data is currently seeded (limited list)."
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
        {q.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-600">
            No products seeded for this category yet.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {filtered.map((r) => {
              const label = r.brand?.name ? `${r.brand.name} ${r.name}` : r.name;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-neutral-600">{r.slug}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      props.onPick(toProductSnapshot(props.categorySlug, r));
                      props.onOpenChange(false);
                    }}
                    className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Add
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PickerDialog>
  );
}

function PlantPicker(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (p: PlantSnapshot) => void;
}) {
  const q = trpc.plants.list.useQuery({ limit: 100 });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    const t = query.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((p) => {
      const common = p.commonName.toLowerCase();
      const sci = (p.scientificName ?? "").toLowerCase();
      return common.includes(t) || sci.includes(t);
    });
  }, [q.data, query]);

  return (
    <PickerDialog
      title="Add Plants"
      description="Plants are multi-select. Add as many as you want."
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants..."
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
        {q.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-600">No plants found.</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {filtered.map((p) => {
              const label = p.scientificName
                ? `${p.commonName} (${p.scientificName})`
                : p.commonName;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-neutral-600">
                      {p.difficulty} · {p.lightDemand} light · {p.co2Demand} CO2 ·{" "}
                      {p.placement}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onAdd(toPlantSnapshot(p))}
                    className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Add
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PickerDialog>
  );
}

export function BuilderPage() {
  const productsByCategory = useBuilderStore((s) => s.productsByCategory);
  const plants = useBuilderStore((s) => s.plants);
  const flags = useBuilderStore((s) => s.flags);

  const setProduct = useBuilderStore((s) => s.setProduct);
  const addPlant = useBuilderStore((s) => s.addPlant);
  const removePlantById = useBuilderStore((s) => s.removePlantById);
  const clearPlants = useBuilderStore((s) => s.clearPlants);
  const setHasShrimp = useBuilderStore((s) => s.setHasShrimp);
  const reset = useBuilderStore((s) => s.reset);

  const categoriesQ = trpc.products.categoriesList.useQuery();
  const rulesQ = trpc.rules.listActive.useQuery({ limit: 200 });

  const [activePicker, setActivePicker] = useState<
    | { type: "product"; categorySlug: string; categoryName: string }
    | { type: "plants" }
    | null
  >(null);

  const rules: CompatibilityRule[] = useMemo(
    () => (rulesQ.data ?? []).map(toCompatibilityRule),
    [rulesQ.data],
  );

  const snapshot: BuildSnapshot = useMemo(
    () =>
      buildSnapshot({
        productsByCategory,
        plants,
        flags,
      }),
    [productsByCategory, plants, flags],
  );

  const evals = useMemo(() => evaluateBuild(rules, snapshot), [rules, snapshot]);
  const evalsByCat = useMemo(() => groupByCategory(evals), [evals]);
  const counts = useMemo(() => countsBySeverity(evals), [evals]);

  const selectedProductIds = useMemo(() => {
    const ids = Object.values(productsByCategory)
      .map((p) => p?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return Array.from(new Set(ids));
  }, [productsByCategory]);

  const pricesQ = trpc.offers.lowestByProductIds.useQuery(
    { productIds: selectedProductIds },
    { enabled: selectedProductIds.length > 0 },
  );

  const minPriceByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of pricesQ.data ?? []) {
      if (row.minPriceCents != null) map.set(row.productId, row.minPriceCents);
    }
    return map;
  }, [pricesQ.data]);

  const totalCents = useMemo(() => {
    let total = 0;
    for (const p of Object.values(productsByCategory)) {
      if (!p) continue;
      const cents = minPriceByProductId.get(p.id);
      if (cents != null) total += cents;
    }
    return total;
  }, [productsByCategory, minPriceByProductId]);

  const categories: CategoryRow[] = categoriesQ.data ?? [];

  const topBannerEval = evals[0] ?? null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Builder</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Choose parts category-by-category. Warnings update instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            onClick={() => reset()}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={true}
            title="Sharing is implemented in the next milestone."
          >
            Share
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-neutral-600">Total</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">
              {formatMoney(totalCents)}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Prices are best-effort (offers may be unseeded).
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-600">Errors</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{counts.error}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-600">Warnings</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{counts.warning}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-600">Shrimp</div>
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={flags.hasShrimp}
                onChange={(e) => setHasShrimp(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Shrimp tank
            </label>
          </div>
        </div>

        {topBannerEval ? (
          <div
            className={"rounded-xl border p-4 " + severityClasses(topBannerEval.severity)}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium">
                {counts.error ? `${counts.error} error(s)` : null}
                {counts.error && counts.warning ? " · " : null}
                {counts.warning ? `${counts.warning} warning(s)` : null}
                {!counts.error && !counts.warning
                  ? `${counts.recommendation} recommendation(s)`
                  : null}
              </div>
              <div className="text-xs opacity-80">Top issue: {topBannerEval.message}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            No compatibility issues detected yet. Start selecting items.
          </div>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {categoriesQ.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading categories...</div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {categories
              .filter((c) => c.slug !== "plants")
              .map((c) => {
                const selected = productsByCategory[c.slug];
                const priceCents = selected ? minPriceByProductId.get(selected.id) : null;

                const selectionLabel = selected ? selected.name : `+ Choose a ${c.name}`;
                const catEvals = evalsByCat[c.slug] ?? [];

                return (
                  <CategoryRowView
                    key={c.id}
                    categoryName={c.name}
                    required={c.builderRequired}
                    selectionLabel={selectionLabel}
                    priceLabel={formatMoney(priceCents)}
                    evals={catEvals}
                    onChoose={() =>
                      setActivePicker({
                        type: "product",
                        categorySlug: c.slug,
                        categoryName: c.name,
                      })
                    }
                    onRemove={selected ? () => setProduct(c.slug, null) : undefined}
                  />
                );
              })}

            <div className="grid grid-cols-[1fr_1.7fr_0.8fr_auto] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">Plants</div>
                {(evalsByCat["plants"] ?? [])[0] ? (
                  <div className="mt-1 text-xs text-neutral-600">
                    <span className="font-medium">
                      {severityLabel((evalsByCat["plants"] ?? [])[0]!.severity)}:
                    </span>{" "}
                    {(evalsByCat["plants"] ?? [])[0]!.message}
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                {plants.length === 0 ? (
                  <div className="text-sm text-neutral-700">+ Add plants</div>
                ) : (
                  <div className="text-sm text-neutral-700">
                    {plants.length} plant(s):{" "}
                    <span className="text-neutral-600">
                      {plants
                        .slice(0, 3)
                        .map((p) => p.commonName)
                        .join(", ")}
                      {plants.length > 3 ? ", ..." : null}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right text-sm text-neutral-700">—</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePicker({ type: "plants" })}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  {plants.length === 0 ? "Add" : "Manage"}
                </button>
                {plants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearPlants()}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {plants.length > 0 ? (
              <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {plants.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => removePlantById(p.id)}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-800 hover:bg-neutral-100"
                      title="Remove"
                    >
                      {p.commonName} x
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {activePicker?.type === "product" ? (
        <ProductPicker
          categorySlug={activePicker.categorySlug}
          categoryName={activePicker.categoryName}
          open={true}
          onOpenChange={(open) => {
            if (!open) setActivePicker(null);
          }}
          onPick={(p) => setProduct(activePicker.categorySlug, p)}
        />
      ) : null}

      {activePicker?.type === "plants" ? (
        <PlantPicker
          open={true}
          onOpenChange={(open) => {
            if (!open) setActivePicker(null);
          }}
          onAdd={(p) => addPlant(p)}
        />
      ) : null}

      {rulesQ.isLoading ? (
        <div className="mt-6 text-xs text-neutral-500">Loading rules...</div>
      ) : null}
      {rulesQ.isError ? (
        <div className="mt-6 text-xs text-red-700">Failed to load rules.</div>
      ) : null}
      {categoriesQ.isError ? (
        <div className="mt-2 text-xs text-red-700">Failed to load categories.</div>
      ) : null}
      {pricesQ.isError ? (
        <div className="mt-2 text-xs text-red-700">Failed to load prices.</div>
      ) : null}
    </main>
  );
}
