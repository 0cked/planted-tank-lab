"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SmartImage } from "@/components/SmartImage";
import { trpc } from "@/components/TRPCProvider";
import {
  buildWorkflow,
  coreProgress,
  isStepComplete,
  nextRecommendedCoreStep,
} from "@/components/builder/builder-workflow";
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

export type BuilderInitialState = {
  buildId: string | null;
  shareSlug: string | null;
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  flags?: Partial<BuildFlags>;
};

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
      return "border-neutral-200 bg-white/60 text-neutral-900";
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

function isBlockingForPicker(rule: CompatibilityRule): boolean {
  if (rule.severity === "error") return true;
  const logic = rule.conditionLogic;
  if (!isRecord(logic)) return false;
  return logic["blocks_selection"] === true;
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

function curatedRank(row: ProductRow): number | null {
  const meta = row.meta;
  if (!isRecord(meta)) return null;
  const v = meta["curated_rank"];
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

function firstImageUrl(params: { imageUrl: string | null; imageUrls: unknown }): string | null {
  if (params.imageUrl) return params.imageUrl;
  if (Array.isArray(params.imageUrls) && typeof params.imageUrls[0] === "string") {
    return params.imageUrls[0];
  }
  return null;
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
  priceSubLabel?: string | null;
  buyHref?: string | null;
  evals: Evaluation[];
  active?: boolean;
  onChoose: () => void;
  onRemove?: () => void;
}) {
  const topEval = props.evals[0] ?? null;

  return (
    <div
      className={
        "grid grid-cols-[1fr_1.7fr_0.8fr_auto] items-center gap-3 px-4 py-3 hover:bg-white/35 " +
        (props.active ? "bg-white/40" : "")
      }
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium">{props.categoryName}</div>
          {props.required ? (
            <span className="ptl-pill">
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

      <div className="text-right">
        <div className="text-sm font-medium text-neutral-900">{props.priceLabel}</div>
        {props.priceSubLabel ? (
          <div className="text-xs text-neutral-600">{props.priceSubLabel}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onChoose}
          className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          {props.selectionLabel.startsWith("+") ? "Choose" : "Swap"}
        </button>
        {props.buyHref ? (
          <a
            href={props.buyHref}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95"
            style={{ background: "var(--ptl-accent)" }}
          >
            Buy
          </a>
        ) : null}
        {props.onRemove ? (
          <button
            type="button"
            onClick={props.onRemove}
            className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
            style={{ borderColor: "var(--ptl-border)" }}
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
        <Dialog.Content
          className="fixed left-1/2 top-1/2 flex max-h-[85dvh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-white/90 p-5 shadow-xl backdrop-blur-md"
          style={{ borderColor: "var(--ptl-border)" }}
        >
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
                className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                Close
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 min-h-0 overflow-y-auto pr-1">{props.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProductPicker(props: {
  categorySlug: string;
  categoryName: string;
  mode: "choose" | "swap";
  currentSelection: ProductSnapshot | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (p: ProductSnapshot) => void;
  compatibilityEnabled: boolean;
  curatedOnly: boolean;
  currentProductsByCategory: Record<string, ProductSnapshot | undefined>;
  currentPlants: PlantSnapshot[];
  currentFlags: BuildFlags;
  rules: CompatibilityRule[];
}) {
  const q = trpc.products.listByCategorySlug.useQuery({
    categorySlug: props.categorySlug,
    limit: 200,
  });
  const [query, setQuery] = useState("");
  const [showIncompatible, setShowIncompatible] = useState(false);

  const blockingRules = useMemo(
    () => props.rules.filter((r) => isBlockingForPicker(r)),
    [props.rules],
  );

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

  const { items, hiddenCount } = useMemo(() => {
    // Optionally show only curated picks to reduce choice overload.
    const curated = props.curatedOnly
      ? filtered
          .map((r) => ({ r, rank: curatedRank(r) }))
          .filter((x) => x.rank != null)
          .sort((a, b) => (a.rank ?? 9_999) - (b.rank ?? 9_999))
          .map((x) => x.r)
      : [];

    const baseRows = curated.length > 0 ? curated : filtered.slice();

    // Stable sort when not curated (keep alphabetical).
    if (!props.curatedOnly && baseRows.length > 1) {
      baseRows.sort((a, b) => {
        const an = `${a.brand?.name ?? ""} ${a.name}`.trim();
        const bn = `${b.brand?.name ?? ""} ${b.name}`.trim();
        return an.localeCompare(bn);
      });
    }

    if (!props.compatibilityEnabled || blockingRules.length === 0) {
      return {
        items: baseRows.map((row) => ({ row, blocked: false, reasons: [] })),
        hiddenCount: 0,
      };
    }

    const out: Array<{
      row: ProductRow;
      blocked: boolean;
      reasons: Array<{ message: string; fixSuggestion: string | null }>;
    }> = [];

    for (const r of baseRows) {
      const candidate = toProductSnapshot(props.categorySlug, r);
      const snapshotCandidate = buildSnapshot({
        productsByCategory: {
          ...props.currentProductsByCategory,
          [props.categorySlug]: candidate,
        },
        plants: props.currentPlants,
        flags: props.currentFlags,
      });

      const evals = evaluateBuild(blockingRules, snapshotCandidate);
      const relevant = evals.filter((e) => e.categoriesInvolved.includes(props.categorySlug));
      const blocks = relevant.length > 0;
      out.push({
        row: r,
        blocked: blocks,
        reasons: relevant.slice(0, 2).map((e) => ({
          message: e.message,
          fixSuggestion: e.fixSuggestion ?? null,
        })),
      });
    }

    const hiddenCount = out.filter((x) => x.blocked).length;
    return { items: out, hiddenCount };
  }, [
    blockingRules,
    filtered,
    props.categorySlug,
    props.compatibilityEnabled,
    props.curatedOnly,
    props.currentFlags,
    props.currentPlants,
    props.currentProductsByCategory,
  ]);

  const visibleItems = useMemo(() => items.filter((x) => !x.blocked), [items]);
  const effectiveItems = showIncompatible ? items : visibleItems;

  const bestMatches = useMemo(() => {
    if (props.mode !== "swap") return [];
    if (!props.currentSelection) return [];
    if (visibleItems.length === 0) return [];

    const keysByCategory: Record<string, string[]> = {
      tank: ["length_in", "volume_gal", "filled_weight_lbs"],
      light: ["min_tank_length_in", "max_tank_length_in", "par_at_substrate"],
      filter: ["flow_rate_gph"],
      heater: ["wattage"],
      stand: ["weight_capacity_lbs"],
    };

    const keys = keysByCategory[props.categorySlug] ?? [];

    const num = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    const score = (candidate: ProductSnapshot): number => {
      // Lower score is "closer".
      let s = 0;
      let compared = 0;
      for (const k of keys) {
        const a = num(props.currentSelection!.specs[k]);
        const b = num(candidate.specs[k]);
        if (a == null || b == null) continue;
        const denom = Math.abs(a) + 1;
        s += Math.abs(a - b) / denom;
        compared += 1;
      }
      return compared > 0 ? s : Number.POSITIVE_INFINITY;
    };

    const rows = visibleItems
      .map((x) => ({ row: x.row, snap: toProductSnapshot(props.categorySlug, x.row) }))
      .filter((x) => x.snap.id !== props.currentSelection!.id);

    const anyComparableKey = keys.some((k) => num(props.currentSelection?.specs[k]) != null);

    rows.sort((a, b) => {
      if (anyComparableKey) {
        const sa = score(a.snap);
        const sb = score(b.snap);
        if (sa !== sb) return sa - sb;
      }

      const ra = curatedRank(a.row) ?? 9_999;
      const rb = curatedRank(b.row) ?? 9_999;
      if (ra !== rb) return ra - rb;

      return a.snap.name.localeCompare(b.snap.name);
    });

    return rows.map((x) => x.snap).slice(0, 10);
  }, [props.categorySlug, props.currentSelection, props.mode, visibleItems]);

  return (
    <PickerDialog
      title={`Choose a ${props.categoryName}`}
      description={
        hiddenCount > 0
          ? `${hiddenCount} option(s) hidden by compatibility.`
          : "A limited catalog is available right now."
      }
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        />
        {props.compatibilityEnabled && hiddenCount > 0 ? (
          <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-800">
            <input
              type="checkbox"
              checked={showIncompatible}
              onChange={(e) => setShowIncompatible(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span>Show incompatible</span>
          </label>
        ) : null}
      </div>

      {props.mode === "swap" && props.currentSelection ? (
        <div className="mt-4 rounded-xl border bg-white/65 p-4" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-600">Current</div>
              <div className="truncate text-sm font-semibold text-neutral-900">
                {props.currentSelection.name}
              </div>
            </div>
            <button
              type="button"
              className="ptl-btn-secondary"
              onClick={() => props.onOpenChange(false)}
            >
              Keep this
            </button>
          </div>

          {bestMatches.length > 0 ? (
            <div className="mt-3">
              <div className="text-xs font-medium text-neutral-600">Best matches</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {bestMatches.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-full border bg-white/75 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
                    style={{ borderColor: "var(--ptl-border)" }}
                    onClick={() => {
                      props.onPick(p);
                      props.onOpenChange(false);
                    }}
                    title="Swap to this"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                Showing close alternatives based on size/output specs (when available).
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-neutral-600">
              Tip: turn off Curated picks to see more alternatives.
            </div>
          )}
        </div>
      ) : null}

      <div
        className="mt-4 overflow-hidden rounded-xl border bg-white/70"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        {q.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading...</div>
        ) : effectiveItems.length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-600">
            {filtered.length === 0
              ? "No products available for this category yet."
              : "No compatible results. Turn off Compatibility to see all options."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {effectiveItems.map((x) => {
              const r = x.row;
              const label = r.brand?.name ? `${r.brand.name} ${r.name}` : r.name;
              return (
                <li
                  key={r.id}
                  className={
                    "flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/40 " +
                    (x.blocked ? "opacity-80" : "")
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-11 w-11 overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_30%_20%,rgba(21,128,61,.22),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(13,148,136,.18),transparent_55%),linear-gradient(135deg,rgba(255,255,255,.7),rgba(255,255,255,.35))]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      {(() => {
                        const img = firstImageUrl({
                          imageUrl: r.imageUrl ?? null,
                          imageUrls: r.imageUrls,
                        });
                        return img ? (
                          <SmartImage
                            src={img}
                            alt=""
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                          />
                        ) : null;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{label}</div>
                      <div className="truncate text-xs text-neutral-600">
                        {x.blocked ? (
                          <span className="font-semibold text-red-700">
                            Incompatible:
                          </span>
                        ) : null}{" "}
                        <span className="text-neutral-600">
                          {x.blocked
                            ? x.reasons[0]?.message ?? "Doesn’t fit the current setup."
                            : r.slug}
                        </span>
                      </div>
                      {x.blocked && x.reasons[0]?.fixSuggestion ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-neutral-600">
                          <span className="font-semibold">Fix:</span>{" "}
                          {x.reasons[0].fixSuggestion}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      props.onPick(toProductSnapshot(props.categorySlug, r));
                      props.onOpenChange(false);
                    }}
                    className={
                      "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 " +
                      (x.blocked ? "bg-neutral-700" : "")
                    }
                    style={x.blocked ? undefined : { background: "var(--ptl-accent)" }}
                  >
                    {x.blocked ? "Add anyway" : "Add"}
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
  compatibilityEnabled: boolean;
  currentProductsByCategory: Record<string, ProductSnapshot | undefined>;
  currentPlants: PlantSnapshot[];
  currentFlags: BuildFlags;
  rules: CompatibilityRule[];
}) {
  const q = trpc.plants.list.useQuery({ limit: 200 });
  const [query, setQuery] = useState("");
  const [showIncompatible, setShowIncompatible] = useState(false);

  const blockingRules = useMemo(
    () => props.rules.filter((r) => isBlockingForPicker(r)),
    [props.rules],
  );

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

  const { items, hiddenCount } = useMemo(() => {
    if (!props.compatibilityEnabled || blockingRules.length === 0) {
      return {
        items: filtered.map((row) => ({ row, blocked: false, reasons: [] })),
        hiddenCount: 0,
      };
    }

    const out: Array<{
      row: PlantRow;
      blocked: boolean;
      reasons: Array<{ message: string; fixSuggestion: string | null }>;
    }> = [];

    for (const p of filtered) {
      const candidate = toPlantSnapshot(p);
      const snapshotCandidate = buildSnapshot({
        productsByCategory: props.currentProductsByCategory,
        plants: [...props.currentPlants, candidate],
        flags: props.currentFlags,
      });

      const evals = evaluateBuild(blockingRules, snapshotCandidate);
      const relevant = evals.filter((e) => e.categoriesInvolved.includes("plants"));
      const blocks = relevant.length > 0;
      out.push({
        row: p,
        blocked: blocks,
        reasons: relevant.slice(0, 2).map((e) => ({
          message: e.message,
          fixSuggestion: e.fixSuggestion ?? null,
        })),
      });
    }

    const hiddenCount = out.filter((x) => x.blocked).length;
    return { items: out, hiddenCount };
  }, [
    blockingRules,
    filtered,
    props.compatibilityEnabled,
    props.currentFlags,
    props.currentPlants,
    props.currentProductsByCategory,
  ]);

  const visibleItems = useMemo(() => items.filter((x) => !x.blocked), [items]);
  const effectiveItems = showIncompatible ? items : visibleItems;

  return (
    <PickerDialog
      title="Add Plants"
      description={
        hiddenCount > 0
          ? `${hiddenCount} plant(s) hidden by compatibility.`
          : "Plants are multi-select. Add as many as you want."
      }
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants..."
          className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        />
        {props.compatibilityEnabled && hiddenCount > 0 ? (
          <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-800">
            <input
              type="checkbox"
              checked={showIncompatible}
              onChange={(e) => setShowIncompatible(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span>Show incompatible</span>
          </label>
        ) : null}
      </div>

      <div
        className="mt-4 overflow-hidden rounded-xl border bg-white/70"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        {q.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading...</div>
        ) : effectiveItems.length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-600">
            {filtered.length === 0
              ? "No plants found."
              : "No compatible results. Turn off Compatibility to see all plants."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {effectiveItems.map((x) => {
              const p = x.row;
              const label = p.scientificName
                ? `${p.commonName} (${p.scientificName})`
                : p.commonName;
              return (
                <li
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/40 " +
                    (x.blocked ? "opacity-80" : "")
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-11 w-11 overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_30%_20%,rgba(21,128,61,.22),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(13,148,136,.18),transparent_55%),linear-gradient(135deg,rgba(255,255,255,.7),rgba(255,255,255,.35))]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      {(() => {
                        const img = firstImageUrl({
                          imageUrl: p.imageUrl ?? null,
                          imageUrls: p.imageUrls,
                        });
                        return img ? (
                          <SmartImage
                            src={img}
                            alt=""
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                          />
                        ) : null;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{label}</div>
                      <div className="truncate text-xs text-neutral-600">
                        {x.blocked ? (
                          <span className="font-semibold text-red-700">
                            Incompatible:
                          </span>
                        ) : null}{" "}
                        <span className="text-neutral-600">
                          {x.blocked
                            ? x.reasons[0]?.message ?? "Doesn’t fit the current setup."
                            : `${p.difficulty} · ${p.lightDemand} light · ${p.co2Demand} CO2 · ${p.placement}`}
                        </span>
                      </div>
                      {x.blocked && x.reasons[0]?.fixSuggestion ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-neutral-600">
                          <span className="font-semibold">Fix:</span>{" "}
                          {x.reasons[0].fixSuggestion}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onAdd(toPlantSnapshot(p))}
                    className={
                      "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 " +
                      (x.blocked ? "bg-neutral-700" : "")
                    }
                    style={x.blocked ? undefined : { background: "var(--ptl-accent)" }}
                  >
                    {x.blocked ? "Add anyway" : "Add"}
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

export function BuilderPage(props: { initialState?: BuilderInitialState }) {
  const router = useRouter();
  const initialHydrated = useRef(false);

  const buildId = useBuilderStore((s) => s.buildId);
  const shareSlug = useBuilderStore((s) => s.shareSlug);
  const productsByCategory = useBuilderStore((s) => s.productsByCategory);
  const plants = useBuilderStore((s) => s.plants);
  const flags = useBuilderStore((s) => s.flags);
  const compatibilityEnabled = useBuilderStore((s) => s.compatibilityEnabled);
  const lowTechNoCo2 = useBuilderStore((s) => s.lowTechNoCo2);
  const curatedOnly = useBuilderStore((s) => s.curatedOnly);

  const setProduct = useBuilderStore((s) => s.setProduct);
  const addPlant = useBuilderStore((s) => s.addPlant);
  const removePlantById = useBuilderStore((s) => s.removePlantById);
  const clearPlants = useBuilderStore((s) => s.clearPlants);
  const setHasShrimp = useBuilderStore((s) => s.setHasShrimp);
  const setCompatibilityEnabled = useBuilderStore((s) => s.setCompatibilityEnabled);
  const setLowTechNoCo2 = useBuilderStore((s) => s.setLowTechNoCo2);
  const setCuratedOnly = useBuilderStore((s) => s.setCuratedOnly);
  const reset = useBuilderStore((s) => s.reset);
  const hydrate = useBuilderStore((s) => s.hydrate);

  useEffect(() => {
    if (!props.initialState) return;
    if (initialHydrated.current) return;
    initialHydrated.current = true;
    hydrate(props.initialState);
  }, [hydrate, props.initialState]);

  const categoriesQ = trpc.products.categoriesList.useQuery();
  const rulesQ = trpc.rules.listActive.useQuery({ limit: 200 });

  const [activePicker, setActivePicker] = useState<
    | { type: "product"; categorySlug: string; categoryName: string }
    | { type: "plants" }
    | null
  >(null);

  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

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

  const evals = useMemo(() => {
    if (!compatibilityEnabled) return [];
    return evaluateBuild(rules, snapshot);
  }, [compatibilityEnabled, rules, snapshot]);
  const evalsByCat = useMemo(() => groupByCategory(evals), [evals]);
  const counts = useMemo(() => countsBySeverity(evals), [evals]);

  const selectedProductIds = useMemo(() => {
    const ids = Object.values(productsByCategory)
      .map((p) => p?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return Array.from(new Set(ids));
  }, [productsByCategory]);

  const bestOffersQ = trpc.offers.bestByProductIds.useQuery(
    { productIds: selectedProductIds },
    { enabled: selectedProductIds.length > 0 },
  );

  const bestOfferByProductId = useMemo(() => {
    const map = new Map<
      string,
      {
        offerId: string;
        priceCents: number;
        retailerName: string;
        goUrl: string;
      }
    >();
    for (const row of bestOffersQ.data ?? []) {
      if (row.priceCents == null) continue;
      map.set(row.productId, {
        offerId: row.offerId,
        priceCents: row.priceCents,
        retailerName: row.retailer?.name ?? "Retailer",
        goUrl: row.goUrl,
      });
    }
    return map;
  }, [bestOffersQ.data]);

  const totalCents = useMemo(() => {
    let total = 0;
    for (const p of Object.values(productsByCategory)) {
      if (!p) continue;
      const cents = bestOfferByProductId.get(p.id)?.priceCents;
      if (cents != null) total += cents;
    }
    return total;
  }, [bestOfferByProductId, productsByCategory]);

  const selectedCount = selectedProductIds.length;
  const pricedCount = bestOfferByProductId.size;
  const totalLabel = selectedCount > 0 && pricedCount === selectedCount ? "Total" : "Estimated total";
  const totalDisplay = pricedCount > 0 ? formatMoney(totalCents) : "—";

  const categoriesData = categoriesQ.data;
  const categories: CategoryRow[] = categoriesData ?? [];
  const shareMutation = trpc.builds.upsertAnonymous.useMutation();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const workflow = useMemo(() => {
    return buildWorkflow({
      categories: (categoriesData ?? []).map((c) => ({
        slug: c.slug,
        name: c.name,
        builderRequired: c.builderRequired,
      })),
    });
  }, [categoriesData]);

  const workflowState = useMemo(
    () => ({
      productsByCategory,
      plants,
      flags,
      lowTechNoCo2,
    }),
    [flags, lowTechNoCo2, plants, productsByCategory],
  );

  const nextCoreStep = useMemo(
    () => nextRecommendedCoreStep(workflow.core, workflowState),
    [workflow.core, workflowState],
  );

  const progress = useMemo(
    () => coreProgress(workflow.core, workflowState),
    [workflow.core, workflowState],
  );

  const effectiveFocusedStepId = focusedStepId ?? nextCoreStep?.id ?? null;

  const openWorkflowStep = (stepId: string): void => {
    const step =
      workflow.core.find((s) => s.id === stepId) ??
      workflow.extras.find((s) => s.id === stepId) ??
      null;
    if (!step) return;

    setFocusedStepId(step.id);

    if (step.kind === "plants") {
      setActivePicker({ type: "plants" });
      return;
    }

    if (step.categorySlug === "co2" && lowTechNoCo2) setLowTechNoCo2(false);

    const c = categories.find((x) => x.slug === step.categorySlug);
    setActivePicker({
      type: "product",
      categorySlug: step.categorySlug,
      categoryName: c?.name ?? step.label,
    });
  };

  const onShare = async (): Promise<void> => {
    setShareStatus(null);
    setShareUrl(null);

    const productsPayload: Record<string, string> = {};
    for (const [categorySlug, p] of Object.entries(productsByCategory)) {
      if (p?.id) productsPayload[categorySlug] = p.id;
    }

    const plantIds = plants.map((p) => p.id);

    let res: { buildId: string; shareSlug: string; itemCount: number };
    try {
      res = await shareMutation.mutateAsync({
        buildId: buildId ?? undefined,
        shareSlug: shareSlug ?? undefined,
        productsByCategory: productsPayload,
        plantIds,
      });
    } catch {
      setShareStatus("Failed to save build for sharing.");
      return;
    }

    hydrate({
      buildId: res.buildId,
      shareSlug: res.shareSlug,
      productsByCategory,
      plants,
      flags,
    });

    const url = `${window.location.origin}/builder/${res.shareSlug}`;
    setShareUrl(url);

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Copied share link to clipboard.");
    } catch {
      setShareStatus("Share link ready. Copy it from the field below.");
    }

    router.push(`/builder/${res.shareSlug}`);
  };

  const topBannerEval = evals[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Builder
          </h1>
          <p className="mt-3 text-sm text-neutral-700">
            Choose parts category-by-category. Warnings update instantly.
          </p>
          {shareStatus ? (
            <div className="mt-2 text-sm text-neutral-700">{shareStatus}</div>
          ) : null}
          {shareUrl ? (
            <div className="mt-2">
              <input
                readOnly
                value={shareUrl}
                className="w-full max-w-[520px] rounded-xl border bg-white/70 px-3 py-2 text-sm text-neutral-800"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="ptl-btn-secondary"
            onClick={() => reset()}
          >
            Reset
          </button>
          <button
            type="button"
            className="ptl-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void onShare()}
            disabled={shareMutation.isPending}
          >
            {shareMutation.isPending ? "Saving..." : "Share"}
          </button>
        </div>
      </div>

      <div className="mt-6 ptl-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-neutral-600">Progress</div>
            <div className="mt-1 text-sm font-semibold text-neutral-900">
              {progress.done} of {progress.total} steps complete
            </div>
            <div
              className="mt-2 h-2 w-full max-w-[520px] overflow-hidden rounded-full border bg-white/60"
              style={{ borderColor: "var(--ptl-border)" }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width:
                    progress.total > 0
                      ? `${Math.round((progress.done / progress.total) * 100)}%`
                      : "0%",
                  background: "linear-gradient(90deg, var(--ptl-accent), rgba(13,148,136,.85))",
                }}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {nextCoreStep ? (
              <>
                <div className="text-xs font-medium text-neutral-600">
                  Next recommended
                </div>
                <button
                  type="button"
                  onClick={() => openWorkflowStep(nextCoreStep.id)}
                  className="ptl-btn-primary"
                >
                  {isStepComplete(nextCoreStep, workflowState)
                    ? `Review ${nextCoreStep.label}`
                    : `Choose ${nextCoreStep.label}`}
                </button>
              </>
            ) : (
              <>
                <div className="text-xs font-medium text-neutral-600">Core setup</div>
                <div className="text-sm font-semibold text-neutral-900">
                  Complete. Add extras or share.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {workflow.core.map((s, idx) => {
            const done = isStepComplete(s, workflowState);
            const active = effectiveFocusedStepId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openWorkflowStep(s.id)}
                className={
                  "group flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition " +
                  (active
                    ? "bg-white/85"
                    : "bg-white/60 hover:bg-white/80") +
                  " cursor-pointer"
                }
                style={{ borderColor: "var(--ptl-border)" }}
                aria-current={active ? "step" : undefined}
                title={done ? "Selected" : "Not selected yet"}
              >
                <span
                  className={
                    "grid h-6 w-6 place-items-center rounded-full border text-xs font-bold " +
                    (done
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-white text-neutral-700")
                  }
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  {done ? "✓" : idx + 1}
                </span>
                <span className="text-neutral-900">{s.label}</span>
              </button>
            );
          })}
        </div>

        {workflow.extras.length > 0 ? (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-xs font-medium text-neutral-600">Extras</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {workflow.extras.map((s) => {
                const done = isStepComplete(s, workflowState);
                const active = effectiveFocusedStepId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openWorkflowStep(s.id)}
                    className={
                      "group flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition " +
                      (active
                        ? "bg-white/85"
                        : "bg-white/50 hover:bg-white/75") +
                      " cursor-pointer"
                    }
                    style={{ borderColor: "var(--ptl-border)" }}
                    aria-current={active ? "step" : undefined}
                    title={done ? "Selected" : "Optional"}
                  >
                    <span
                      className={
                        "grid h-6 w-6 place-items-center rounded-full border text-xs font-bold " +
                        (done
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-white text-neutral-700")
                      }
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      {done ? "✓" : "+"}
                    </span>
                    <span className="text-neutral-900">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        <div className="ptl-surface grid grid-cols-1 gap-3 p-5 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-neutral-600">{totalLabel}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">
              {totalDisplay}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {selectedCount === 0
                ? "Pick items to see pricing from in-stock offers."
                : pricedCount === selectedCount
                  ? "Best in-stock offer found for each selected item."
                  : `Best in-stock offers found for ${pricedCount} of ${selectedCount} selected item(s).`}
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
            <div className="text-xs font-medium text-neutral-600">Options</div>
            <div className="mt-2 space-y-2">
              <label className="flex items-center justify-between gap-3 text-sm text-neutral-800">
                <span className="font-medium">Compatibility</span>
                <input
                  type="checkbox"
                  checked={compatibilityEnabled}
                  onChange={(e) => setCompatibilityEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-neutral-800">
                <span className="font-medium">Curated picks</span>
                <input
                  type="checkbox"
                  checked={curatedOnly}
                  onChange={(e) => setCuratedOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-neutral-800">
                <span className="font-medium">Low-tech (no CO2)</span>
                <input
                  type="checkbox"
                  checked={lowTechNoCo2}
                  onChange={(e) => setLowTechNoCo2(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-neutral-800">
                <span className="font-medium">Shrimp tank</span>
                <input
                  type="checkbox"
                  checked={flags.hasShrimp}
                  onChange={(e) => setHasShrimp(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </label>
            </div>
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
          <div className="ptl-surface p-4 text-sm text-neutral-700">
            {compatibilityEnabled
              ? "No compatibility issues detected yet. Start selecting items."
              : "Compatibility engine is off. Turn it on to see checks and warnings."}
          </div>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border bg-white/70 shadow-sm backdrop-blur-sm" style={{ borderColor: "var(--ptl-border)" }}>
        {categoriesQ.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading categories...</div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {categories
              .filter((c) => c.slug !== "plants")
              .map((c) => {
                const selected = productsByCategory[c.slug];
                const isCo2Category = c.slug === "co2";
                const effectiveSelected =
                  isCo2Category && lowTechNoCo2 ? undefined : selected;
                const offer = effectiveSelected
                  ? bestOfferByProductId.get(effectiveSelected.id)
                  : null;
                const priceCents = offer?.priceCents ?? null;

                const selectionLabel = isCo2Category
                  ? lowTechNoCo2
                    ? "No CO2 (low-tech)"
                    : effectiveSelected
                      ? effectiveSelected.name
                      : `+ Choose a ${c.name}`
                  : effectiveSelected
                    ? effectiveSelected.name
                    : `+ Choose a ${c.name}`;
                const catEvals = evalsByCat[c.slug] ?? [];

                return (
                  <CategoryRowView
                    key={c.id}
                    categoryName={c.name}
                    required={c.builderRequired}
                    selectionLabel={selectionLabel}
                    priceLabel={formatMoney(priceCents)}
                    priceSubLabel={offer ? offer.retailerName : effectiveSelected ? "No in-stock offers yet" : null}
                    buyHref={offer ? offer.goUrl : null}
                    evals={catEvals}
                    active={effectiveFocusedStepId === c.slug}
                    onChoose={() => {
                      setFocusedStepId(c.slug);
                      if (isCo2Category && lowTechNoCo2) setLowTechNoCo2(false);
                      setActivePicker({
                        type: "product",
                        categorySlug: c.slug,
                        categoryName: c.name,
                      });
                    }}
                    onRemove={
                      effectiveSelected ? () => setProduct(c.slug, null) : undefined
                    }
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
                  onClick={() => {
                    setFocusedStepId("plants");
                    setActivePicker({ type: "plants" });
                  }}
                  className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  {plants.length === 0 ? "Add" : "Manage"}
                </button>
                {plants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearPlants()}
                    className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {plants.length > 0 ? (
              <div className="border-t bg-white/55 px-4 py-3" style={{ borderColor: "var(--ptl-border)" }}>
                <div className="flex flex-wrap gap-2">
                  {plants.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => removePlantById(p.id)}
                      className="rounded-full border bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-900 transition hover:bg-white"
                      style={{ borderColor: "var(--ptl-border)" }}
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
          mode={productsByCategory[activePicker.categorySlug] ? "swap" : "choose"}
          currentSelection={productsByCategory[activePicker.categorySlug]}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActivePicker(null);
              setFocusedStepId(null);
            }
          }}
          onPick={(p) => {
            if (activePicker.categorySlug === "co2") setLowTechNoCo2(false);
            setProduct(activePicker.categorySlug, p);
            setFocusedStepId(null);
          }}
          compatibilityEnabled={compatibilityEnabled}
          curatedOnly={curatedOnly}
          currentProductsByCategory={productsByCategory}
          currentPlants={plants}
          currentFlags={flags}
          rules={rules}
        />
      ) : null}

      {activePicker?.type === "plants" ? (
        <PlantPicker
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActivePicker(null);
              setFocusedStepId(null);
            }
          }}
          onAdd={(p) => addPlant(p)}
          compatibilityEnabled={compatibilityEnabled}
          currentProductsByCategory={productsByCategory}
          currentPlants={plants}
          currentFlags={flags}
          rules={rules}
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
      {bestOffersQ.isError ? (
        <div className="mt-2 text-xs text-red-700">Failed to load prices.</div>
      ) : null}
    </main>
  );
}
