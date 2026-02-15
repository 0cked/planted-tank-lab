"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { markSignupTracked, trackEvent } from "@/lib/analytics";
import {
  firstCatalogImageUrl,
  missingSourceImageCopy,
  normalizePickerDetails,
} from "@/lib/catalog-no-data";
import {
  deriveOfferSummaryState,
  formatOfferSummaryCheckedAt,
} from "@/lib/offer-summary";

import { SmartImage } from "@/components/SmartImage";
import { OfferFreshnessBadge } from "@/components/offers/OfferFreshnessBadge";
import { RetailerMark } from "@/components/RetailerMark";
import { trpc } from "@/components/TRPCProvider";
import {
  buildWorkflow,
  coreProgress,
  isStepComplete,
  nextRecommendedCoreStep,
} from "@/components/builder/builder-workflow";
import { evaluateBuild } from "@/engine/evaluate";
import { missingRequiredSpecs, requiredSpecsForCategory } from "@/engine/required-specs";
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
type OfferSummaryRow = RouterOutputs["offers"]["summaryByProductIds"][number];

export type BuilderInitialState = {
  buildId: string | null;
  shareSlug: string | null;
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  selectedOfferIdByProductId?: Record<string, string | undefined>;
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


function numSpec(specs: unknown, key: string): number | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return numOrNull(v);
  return null;
}

function boolSpec(specs: unknown, key: string): boolean | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v === "boolean") return v;
  return null;
}

function strSpec(specs: unknown, key: string): string | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function titleWords(v: string): string {
  const cleaned = v
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return v;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function productPreviewChips(params: { categorySlug: string; specs: unknown }): string[] {
  const chips: string[] = [];
  const s = params.specs;

  if (params.categorySlug === "tank") {
    const vol = numSpec(s, "volume_gal");
    const l = numSpec(s, "length_in");
    const w = numSpec(s, "width_in");
    const h = numSpec(s, "height_in");
    const rimless = boolSpec(s, "rimless");

    if (vol != null) chips.push(`${vol} gal`);
    if (l != null && w != null && h != null) chips.push(`${l}x${w}x${h} in`);
    else if (l != null) chips.push(`${l} in length`);
    if (rimless === true) chips.push("Rimless");
  }

  if (params.categorySlug === "light") {
    const par = numSpec(s, "par_at_substrate");
    const minLen = numSpec(s, "min_tank_length_in");
    const maxLen = numSpec(s, "max_tank_length_in");
    const dimmable = boolSpec(s, "dimmable");
    const app = boolSpec(s, "app_controlled");

    if (par != null) chips.push(`PAR ~${par}`);
    if (minLen != null && maxLen != null) chips.push(`${minLen}-${maxLen} in tank`);
    if (dimmable === true) chips.push("Dimmable");
    if (app === true) chips.push("App");
  }

  if (params.categorySlug === "filter") {
    const type = strSpec(s, "type");
    const flow = numSpec(s, "flow_rate_gph");
    const upTo = numSpec(s, "rated_volume_gal_max");

    if (type) chips.push(titleWords(type));
    if (flow != null) chips.push(`${flow} gph`);
    if (upTo != null) chips.push(`Up to ${upTo} gal`);
  }

  if (params.categorySlug === "co2") {
    const kind = strSpec(s, "co2_type");
    const stages = numSpec(s, "stages");
    const solenoid = boolSpec(s, "solenoid");

    if (kind) chips.push(titleWords(kind));
    if (stages === 2) chips.push("Dual-stage");
    if (solenoid === true) chips.push("Solenoid");
  }

  if (params.categorySlug === "substrate") {
    const type = strSpec(s, "substrate_type");
    const buffers = boolSpec(s, "buffers_ph");
    const grain = numSpec(s, "grain_size_mm");

    if (type) chips.push(titleWords(type));
    if (buffers === true) chips.push("Buffers pH");
    if (grain != null) chips.push(`${grain}mm`);
  }

  return chips.slice(0, 4);
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
  const type = logic["type"];
  if (typeof type === "string") {
    // Some "soft" rules are treated as picker-gating constraints because they represent
    // practical selection dead-ends (e.g., CO2-required plants without CO2).
    if (
      type === "co2_required_plants" ||
      type === "plant_light_demand_min_par" ||
      type === "carpet_needs_light_and_co2"
    ) {
      return true;
    }
  }
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
  testId?: string;
  categoryName: string;
  required: boolean;
  hasSelection: boolean;
  selectionLabel: string;
  priceLabel: string;
  priceSubLabel?: string | null;
  buyHref?: string | null;
  onOffers?: (() => void) | undefined;
  evals: Evaluation[];
  active?: boolean;
  onChoose: () => void;
  onRemove?: () => void;
}) {
  const topEval = props.evals[0] ?? null;

  return (
    <div
      data-testid={props.testId}
      className={
        "grid grid-cols-1 gap-3 px-4 py-3 hover:bg-white/35 sm:grid-cols-[1fr_1.7fr_0.8fr_auto] sm:items-center " +
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
        <div className="truncate text-sm text-neutral-700">
          {props.hasSelection ? props.selectionLabel : "Not selected"}
        </div>
      </div>

      <div className="text-left sm:text-right">
        <div className="text-sm font-medium text-neutral-900">{props.priceLabel}</div>
        {props.priceSubLabel ? (
          <div className="text-xs text-neutral-600">{props.priceSubLabel}</div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-self-end">
        <button
          type="button"
          onClick={props.onChoose}
          data-testid={props.testId ? `${props.testId}-action` : undefined}
          className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          {props.hasSelection ? "Swap" : "Choose"}
        </button>
        {props.onOffers ? (
          <button
            type="button"
            onClick={props.onOffers}
            className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            Offers
          </button>
        ) : null}
        {props.buyHref ? (
          <a
            href={props.buyHref}
            target="_blank"
            rel="noreferrer nofollow"
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
            className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 flex max-h-[92dvh] w-full translate-y-full flex-col overflow-hidden rounded-t-3xl border bg-white/92 p-5 shadow-2xl backdrop-blur-md transition-transform duration-200 ease-out data-[state=open]:translate-y-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-dvh sm:max-h-none sm:w-[min(560px,calc(100vw-1rem))] sm:rounded-l-3xl sm:rounded-t-none sm:translate-y-0 sm:translate-x-full sm:data-[state=open]:translate-x-0"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <div className="sm:hidden -mt-1 mb-3 flex justify-center" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full bg-neutral-300/70" />
          </div>

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
                className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
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

  const requiredKeys = useMemo(
    () => requiredSpecsForCategory(props.rules, props.categorySlug),
    [props.categorySlug, props.rules],
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
    type Item = {
      row: ProductRow;
      blocked: boolean;
      blockedKind: "incompatible" | "missing_data" | null;
      reasons: Array<{ message: string; fixSuggestion: string | null }>;
    };

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
        items: baseRows.map(
          (row) =>
            ({
              row,
              blocked: false,
              blockedKind: null,
              reasons: [],
            }) satisfies Item,
        ),
        hiddenCount: 0,
      };
    }

    const out: Item[] = [];

    for (const r of baseRows) {
      const candidate = toProductSnapshot(props.categorySlug, r);

      // Curated mode should "fail closed": only show items we have enough spec data to verify later.
      if (props.curatedOnly && requiredKeys.length > 0) {
        const missing = missingRequiredSpecs(candidate.specs, requiredKeys);
        if (missing.length > 0) {
          const uniq = Array.from(new Set(missing)).filter(Boolean).sort((a, b) => a.localeCompare(b));
          const shown = uniq
            .slice(0, 3)
            .map((k) => `${props.categorySlug}.${k}`)
            .join(", ");
          const more = uniq.length > 3 ? ` +${uniq.length - 3} more` : "";

          out.push({
            row: r,
            blocked: true,
            blockedKind: "missing_data",
            reasons: [
              {
                message: `We can't verify this yet (missing: ${shown}${more}).`,
                fixSuggestion:
                  "Try another option, or turn off Curated picks / Compatibility to pick anyway.",
              },
            ],
          });
          continue;
        }
      }

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

      const blockedKind: Item["blockedKind"] = !blocks
        ? null
        : relevant.some((e) => (e.kind ?? "rule_triggered") === "rule_triggered")
          ? "incompatible"
          : "missing_data";

      out.push({
        row: r,
        blocked: blocks,
        blockedKind,
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
    requiredKeys,
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

  const pickerTitle = (() => {
    const name = props.categoryName.trim();
    // Handle simple plural category names like "Accessories".
    if (name.toLowerCase().endsWith("s")) return `Choose ${name}`;

    // Handle "a" vs "an" for singular names.
    const first = name[0]?.toLowerCase() ?? "";
    const article = ["a", "e", "i", "o", "u"].includes(first) ? "an" : "a";
    return `Choose ${article} ${name}`;
  })();
  const missingProductImage = missingSourceImageCopy("product");

  return (
    <PickerDialog
      title={pickerTitle}
      description={
        hiddenCount > 0
          ? `${hiddenCount} option(s) hidden (incompatible or missing specs).`
          : "A limited catalog is available right now."
      }
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-white/85 px-1 py-1.5 backdrop-blur-md">
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
              <span>Show hidden options</span>
            </label>
          ) : null}
        </div>
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
              : "No visible results. Show hidden options, or turn off Compatibility to pick anyway."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {effectiveItems.map((x) => {
              const r = x.row;
              const label = r.brand?.name ? `${r.brand.name} ${r.name}` : r.name;
              const img = firstCatalogImageUrl({ imageUrl: r.imageUrl ?? null, imageUrls: r.imageUrls });
              const chips = productPreviewChips({ categorySlug: props.categorySlug, specs: r.specs });
              const badge = x.blocked ? (
                <span
                  className={
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                    (x.blockedKind === "missing_data"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-red-200 bg-red-50 text-red-900")
                  }
                >
                  {x.blockedKind === "missing_data" ? "Can’t verify" : "Incompatible"}
                </span>
              ) : props.compatibilityEnabled ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Fits
                </span>
              ) : null;
              return (
                <li
                  key={r.id}
                  className={
                    "flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/40 " +
                    (x.blocked ? "opacity-80" : "")
                  }
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="h-14 w-14 overflow-hidden rounded-2xl border"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      {img ? (
                        <SmartImage
                          src={img}
                          alt=""
                          width={128}
                          height={128}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="ptl-image-ph no-image flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold text-neutral-700">
                          {missingProductImage.title}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-neutral-900">
                          {label}
                        </div>
                        {badge}
                      </div>
                      {chips.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-neutral-800">
                          {chips.map((c) => (
                            <span
                              key={c}
                              className="rounded-full border bg-white/70 px-2 py-0.5"
                              style={{ borderColor: "var(--ptl-border)" }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-1 line-clamp-2 text-xs text-neutral-600">
                        {x.blocked ? (
                          x.blockedKind === "missing_data" ? (
                            <span className="font-semibold text-amber-800">Cannot verify:</span>
                          ) : (
                            <span className="font-semibold text-red-700">Incompatible:</span>
                          )
                        ) : null}{" "}
                        <span className="text-neutral-600">
                          {x.blocked
                            ? x.reasons[0]?.message ?? "Doesn’t fit the current setup."
                            : normalizePickerDetails(r.description)}
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
                    disabled={x.blocked}
                    className={
                      "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 " +
                      (x.blocked
                        ? x.blockedKind === "missing_data"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-red-200 bg-red-50 text-red-900"
                        : "text-white hover:brightness-95")
                    }
                    style={
                      x.blocked
                        ? undefined
                        : { background: "var(--ptl-accent)", borderColor: "transparent" }
                    }
                    title={
                      x.blocked
                        ? x.blockedKind === "missing_data"
                          ? "We don't have enough specs to verify this option yet. Turn off Compatibility to pick it anyway."
                          : "This option is incompatible with your current selections. Turn off Compatibility to pick it anyway."
                        : "Add"
                    }
                  >
                    {x.blocked
                      ? x.blockedKind === "missing_data"
                        ? "Cannot verify"
                        : "Incompatible"
                      : "Add"}
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
  lowTechNoCo2: boolean;
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
    type Item = {
      row: PlantRow;
      blocked: boolean;
      blockedKind: "incompatible" | "missing_data" | null;
      reasons: Array<{ message: string; fixSuggestion: string | null }>;
    };

    if (!props.compatibilityEnabled || blockingRules.length === 0) {
      return {
        items: filtered.map(
          (row) =>
            ({
              row,
              blocked: false,
              blockedKind: null,
              reasons: [],
            }) satisfies Item,
        ),
        hiddenCount: 0,
      };
    }

    const out: Item[] = [];

    for (const p of filtered) {
      // Explicit user decision: low-tech means "no CO2", so hide CO2-required plants.
      // This avoids treating "CO2 not selected yet" as a mismatch.
      if (props.lowTechNoCo2 && p.co2Demand === "required") {
        out.push({
          row: p,
          blocked: true,
          blockedKind: "incompatible",
          reasons: [
            {
              message: `Plants like ${p.commonName} require CO2 injection to thrive.`,
              fixSuggestion: "Turn off Low-tech (no CO2), or choose plants that don’t require CO2.",
            },
          ],
        });
        continue;
      }

      const candidate = toPlantSnapshot(p);
      const snapshotCandidate = buildSnapshot({
        productsByCategory: props.currentProductsByCategory,
        plants: [...props.currentPlants, candidate],
        flags: props.currentFlags,
      });

      const evals = evaluateBuild(blockingRules, snapshotCandidate);
      const relevant = evals.filter((e) => e.categoriesInvolved.includes("plants"));
      const blocks = relevant.length > 0;
      const blockedKind: Item["blockedKind"] = !blocks
        ? null
        : relevant.some((e) => (e.kind ?? "rule_triggered") === "rule_triggered")
          ? "incompatible"
          : "missing_data";
      out.push({
        row: p,
        blocked: blocks,
        blockedKind,
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
    props.lowTechNoCo2,
    props.currentFlags,
    props.currentPlants,
    props.currentProductsByCategory,
  ]);

  const visibleItems = useMemo(() => items.filter((x) => !x.blocked), [items]);
  const effectiveItems = showIncompatible ? items : visibleItems;
  const missingPlantImage = missingSourceImageCopy("plant");

  return (
    <PickerDialog
      title="Add Plants"
      description={
        hiddenCount > 0
          ? `${hiddenCount} plant(s) hidden (incompatible or missing data).`
          : "Plants are multi-select. Add as many as you want."
      }
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-white/85 px-1 py-1.5 backdrop-blur-md">
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
              <span>Show hidden plants</span>
            </label>
          ) : null}
        </div>
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
              : "No visible results. Show hidden plants, or turn off Compatibility to add anyway."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {effectiveItems.map((x) => {
              const p = x.row;
              const label = p.scientificName
                ? `${p.commonName} (${p.scientificName})`
                : p.commonName;
              const img = firstCatalogImageUrl({ imageUrl: p.imageUrl ?? null, imageUrls: p.imageUrls });
              const chips = [
                p.difficulty,
                `${p.lightDemand} light`,
                `${p.co2Demand} CO2`,
                p.placement,
              ].filter(Boolean);
              const badge = x.blocked ? (
                <span
                  className={
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                    (x.blockedKind === "missing_data"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-red-200 bg-red-50 text-red-900")
                  }
                >
                  {x.blockedKind === "missing_data" ? "Can’t verify" : "Incompatible"}
                </span>
              ) : props.compatibilityEnabled ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Fits
                </span>
              ) : null;
              return (
                <li
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/40 " +
                    (x.blocked ? "opacity-80" : "")
                  }
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="h-14 w-14 overflow-hidden rounded-2xl border"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      {img ? (
                        <SmartImage
                          src={img}
                          alt=""
                          width={128}
                          height={128}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="ptl-image-ph no-image flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold text-neutral-700">
                          {missingPlantImage.title}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-neutral-900">
                          {label}
                        </div>
                        {badge}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-neutral-800">
                        {chips.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border bg-white/70 px-2 py-0.5"
                            style={{ borderColor: "var(--ptl-border)" }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-neutral-600">
                        {x.blocked ? (
                          x.blockedKind === "missing_data" ? (
                            <span className="font-semibold text-amber-800">Cannot verify:</span>
                          ) : (
                            <span className="font-semibold text-red-700">Incompatible:</span>
                          )
                        ) : null}{" "}
                        <span className="text-neutral-600">
                          {x.blocked
                            ? x.reasons[0]?.message ?? "Doesn’t fit the current setup."
                            : "Good fit for your current setup."}
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
                    disabled={x.blocked}
                    className={
                      "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 " +
                      (x.blocked
                        ? x.blockedKind === "missing_data"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-red-200 bg-red-50 text-red-900"
                        : "text-white hover:brightness-95")
                    }
                    style={
                      x.blocked
                        ? undefined
                        : { background: "var(--ptl-accent)", borderColor: "transparent" }
                    }
                    title={
                      x.blocked
                        ? x.blockedKind === "missing_data"
                          ? "We don't have enough data to verify this plant yet. Turn off Compatibility to add it anyway."
                          : "This plant is incompatible with your current selections. Turn off Compatibility to add it anyway."
                        : "Add"
                    }
                  >
                    {x.blocked
                      ? x.blockedKind === "missing_data"
                        ? "Cannot verify"
                        : "Incompatible"
                      : "Add"}
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

function OffersDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  selectedOfferId: string | null;
  onSelectOfferId: (offerId: string | null) => void;
}) {
  const offersQ = trpc.offers.listByProductId.useQuery(
    { productId: props.productId, limit: 50 },
    { enabled: props.open },
  );

  return (
    <PickerDialog
      title={`Offers for ${props.productName}`}
      description="Pick a retailer. Default pricing uses the derived offer summary."
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-neutral-700">
          {props.selectedOfferId ? "Custom offer selected." : "Using derived offer summary."}
        </div>
        <button
          type="button"
          className="ptl-btn-secondary"
          onClick={() => props.onSelectOfferId(null)}
          disabled={!props.selectedOfferId}
        >
          Use summary price
        </button>
      </div>

      <div
        className="mt-4 overflow-hidden rounded-xl border bg-white/70"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        {offersQ.isLoading ? (
          <div className="px-4 py-3 text-sm text-neutral-600">Loading offers...</div>
        ) : (offersQ.data ?? []).length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-600">
            No offers available for this item yet.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {(offersQ.data ?? []).map((o) => {
              const selected = props.selectedOfferId === o.id;
              const price = formatMoney(o.priceCents);
              return (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/40"
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      type="radio"
                      name={`offer-${props.productId}`}
                      checked={selected}
                      onChange={() => props.onSelectOfferId(o.id)}
                      className="h-4 w-4"
	                    />
	                    <div className="min-w-0">
	                      <RetailerMark
	                        name={o.retailer.name}
	                        logoAssetPath={
	                          (o.retailer as { logoAssetPath?: string | null }).logoAssetPath ??
	                          null
	                        }
	                        logoUrl={o.retailer.logoUrl ?? null}
	                      />
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                        <span>{o.inStock ? "In stock" : "Out of stock"}</span>
                        <OfferFreshnessBadge
                          lastCheckedAt={(o as { lastCheckedAt?: unknown }).lastCheckedAt}
                          sourceLabel={o.retailer.name}
                        />
                      </div>
                    </div>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-neutral-900">{price}</div>
                    <a
                      href={o.goUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      View
                    </a>
                  </div>
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
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const buildId = useBuilderStore((s) => s.buildId);
  const shareSlug = useBuilderStore((s) => s.shareSlug);
  const productsByCategory = useBuilderStore((s) => s.productsByCategory);
  const plants = useBuilderStore((s) => s.plants);
  const flags = useBuilderStore((s) => s.flags);
  const selectedOfferIdByProductId = useBuilderStore((s) => s.selectedOfferIdByProductId);
  const compatibilityEnabled = useBuilderStore((s) => s.compatibilityEnabled);
  const lowTechNoCo2 = useBuilderStore((s) => s.lowTechNoCo2);
  const curatedOnly = useBuilderStore((s) => s.curatedOnly);

  const setProduct = useBuilderStore((s) => s.setProduct);
  const addPlant = useBuilderStore((s) => s.addPlant);
  const removePlantById = useBuilderStore((s) => s.removePlantById);
  const clearPlants = useBuilderStore((s) => s.clearPlants);
  const setSelectedOfferId = useBuilderStore((s) => s.setSelectedOfferId);
  const setHasShrimp = useBuilderStore((s) => s.setHasShrimp);
  const setCompatibilityEnabled = useBuilderStore((s) => s.setCompatibilityEnabled);
  const setLowTechNoCo2 = useBuilderStore((s) => s.setLowTechNoCo2);
  const setCuratedOnly = useBuilderStore((s) => s.setCuratedOnly);
  const lastSyncedUserId = useBuilderStore((s) => s.lastSyncedUserId);
  const setLastSyncedUserId = useBuilderStore((s) => s.setLastSyncedUserId);
  const reset = useBuilderStore((s) => s.reset);
  const hydrate = useBuilderStore((s) => s.hydrate);

  const builderStartedTracked = useRef(false);

  useEffect(() => {
    if (!props.initialState) return;
    if (initialHydrated.current) return;
    initialHydrated.current = true;
    hydrate(props.initialState);
  }, [hydrate, props.initialState]);

  useEffect(() => {
    if (builderStartedTracked.current) return;
    builderStartedTracked.current = true;
    void trackEvent("builder_started", { meta: { signedIn: isSignedIn } });
  }, [isSignedIn]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (!markSignupTracked(userId)) return;
    void trackEvent("signup_completed");
  }, [session?.user?.id]);

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
        flags: { ...flags, lowTechNoCo2 },
      }),
    [productsByCategory, plants, flags, lowTechNoCo2],
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

  const offerSummariesQ = trpc.offers.summaryByProductIds.useQuery(
    { productIds: selectedProductIds },
    { enabled: selectedProductIds.length > 0 },
  );

  const bestOffersQ = trpc.offers.bestByProductIds.useQuery(
    { productIds: selectedProductIds },
    { enabled: selectedProductIds.length > 0 },
  );

  const selectedOfferIds = useMemo(() => {
    const ids = Object.values(selectedOfferIdByProductId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return Array.from(new Set(ids));
  }, [selectedOfferIdByProductId]);

  const selectedOffersQ = trpc.offers.getByIds.useQuery(
    { offerIds: selectedOfferIds },
    { enabled: selectedOfferIds.length > 0 },
  );

  const offerSummaryByProductId = useMemo(() => {
    const map = new Map<string, OfferSummaryRow>();
    for (const row of offerSummariesQ.data ?? []) {
      map.set(row.productId, row);
    }
    return map;
  }, [offerSummariesQ.data]);

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

  const selectedOfferByProductId = useMemo(() => {
    const map = new Map<
      string,
      {
        offerId: string;
        priceCents: number | null;
        inStock: boolean;
        retailerName: string;
        goUrl: string;
      }
    >();
    for (const row of selectedOffersQ.data ?? []) {
      map.set(row.productId, {
        offerId: row.offerId,
        priceCents: row.priceCents ?? null,
        inStock: row.inStock,
        retailerName: row.retailer?.name ?? "Retailer",
        goUrl: row.goUrl,
      });
    }
    return map;
  }, [selectedOffersQ.data]);

  const chosenOfferByProductId = useMemo(() => {
    const map = new Map<
      string,
      {
        offerId: string;
        priceCents: number;
        retailerName: string;
        goUrl: string;
        source: "selected" | "best";
      }
    >();

    for (const productId of selectedProductIds) {
      const selectedOfferId = selectedOfferIdByProductId[productId] ?? null;
      const selected = selectedOfferId ? selectedOfferByProductId.get(productId) : null;
      if (selected && selected.inStock && selected.priceCents != null) {
        map.set(productId, {
          offerId: selected.offerId,
          priceCents: selected.priceCents,
          retailerName: selected.retailerName,
          goUrl: selected.goUrl,
          source: "selected",
        });
        continue;
      }

      const best = bestOfferByProductId.get(productId);
      if (best) {
        map.set(productId, { ...best, source: "best" });
      }
    }

    return map;
  }, [
    bestOfferByProductId,
    selectedOfferByProductId,
    selectedOfferIdByProductId,
    selectedProductIds,
  ]);

  const displayPriceByProductId = useMemo(() => {
    const map = new Map<
      string,
      | {
          source: "selected";
          priceCents: number;
          retailerName: string;
        }
      | {
          source: "summary";
          priceCents: number;
          staleFlag: boolean;
          checkedAt: Date | null;
        }
    >();

    for (const productId of selectedProductIds) {
      const selectedOfferId = selectedOfferIdByProductId[productId] ?? null;
      const selected = selectedOfferId ? selectedOfferByProductId.get(productId) : null;
      if (selected && selected.inStock && selected.priceCents != null) {
        map.set(productId, {
          source: "selected",
          priceCents: selected.priceCents,
          retailerName: selected.retailerName,
        });
        continue;
      }

      const summaryState = deriveOfferSummaryState(offerSummaryByProductId.get(productId));
      if (summaryState.kind !== "priced") continue;

      map.set(productId, {
        source: "summary",
        priceCents: summaryState.minPriceCents,
        staleFlag: summaryState.staleFlag,
        checkedAt: summaryState.checkedAt,
      });
    }

    return map;
  }, [
    offerSummaryByProductId,
    selectedOfferByProductId,
    selectedOfferIdByProductId,
    selectedProductIds,
  ]);

  const totalCents = useMemo(() => {
    let total = 0;
    for (const p of Object.values(productsByCategory)) {
      if (!p) continue;
      const cents = displayPriceByProductId.get(p.id)?.priceCents;
      if (cents != null) total += cents;
    }
    return total;
  }, [displayPriceByProductId, productsByCategory]);

  const pricingSourceCounts = useMemo(() => {
    let selected = 0;
    let summaryFresh = 0;
    let summaryStale = 0;

    for (const entry of displayPriceByProductId.values()) {
      if (entry.source === "selected") {
        selected += 1;
        continue;
      }
      if (entry.staleFlag) summaryStale += 1;
      else summaryFresh += 1;
    }

    return { selected, summaryFresh, summaryStale };
  }, [displayPriceByProductId]);

  const selectedCount = selectedProductIds.length;
  const pricedCount = displayPriceByProductId.size;
  const unresolvedCount = Math.max(0, selectedCount - pricedCount);
  const totalLabel =
    selectedCount > 0 && unresolvedCount === 0 && pricingSourceCounts.summaryStale === 0
      ? "Total"
      : "Estimated total";
  const totalDisplay = pricedCount > 0 ? formatMoney(totalCents) : "—";
  const totalSubLabel = useMemo(() => {
    if (selectedCount === 0) {
      return "Pick items to see pricing from derived offer summaries.";
    }
    if (offerSummariesQ.isLoading && pricedCount === 0) {
      return "Loading offer summaries for selected items.";
    }
    if (unresolvedCount > 0) {
      return `Pricing available for ${pricedCount} of ${selectedCount} selected item(s). ${unresolvedCount} item(s) have no in-stock offer summaries yet.`;
    }
    if (pricingSourceCounts.summaryStale > 0) {
      return `Estimated from derived summaries; ${pricingSourceCounts.summaryStale} selected item(s) use stale checks.`;
    }
    if (pricingSourceCounts.selected > 0) {
      return `Derived summaries with ${pricingSourceCounts.selected} selected offer override(s).`;
    }
    return "Derived offer summaries priced every selected item.";
  }, [
    offerSummariesQ.isLoading,
    pricedCount,
    pricingSourceCounts.selected,
    pricingSourceCounts.summaryStale,
    selectedCount,
    unresolvedCount,
  ]);

  const categoriesData = categoriesQ.data;
  const categories: CategoryRow[] = categoriesData ?? [];
  const shareMutation = trpc.builds.upsertAnonymous.useMutation();
  const saveMutation = trpc.builds.upsertMine.useMutation();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeOffers, setActiveOffers] = useState<{ productId: string; productName: string } | null>(null);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

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
    setSaveStatus(null);

    const productsPayload: Record<string, string> = {};
    for (const [categorySlug, p] of Object.entries(productsByCategory)) {
      if (p?.id) productsPayload[categorySlug] = p.id;
    }

    const plantIds = plants.map((p) => p.id);
    const selectedOfferIds = Object.fromEntries(
      Object.entries(selectedOfferIdByProductId).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0,
      ),
    );

    let res: { buildId: string; shareSlug: string; itemCount: number };
    try {
      res = await shareMutation.mutateAsync({
        buildId: buildId ?? undefined,
        shareSlug: shareSlug ?? undefined,
        productsByCategory: productsPayload,
        plantIds,
        selectedOfferIdByProductId: selectedOfferIds,
        flags: { hasShrimp: flags.hasShrimp, lowTechNoCo2 },
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
      selectedOfferIdByProductId: selectedOfferIdByProductId,
      flags,
    });

    const url = `${window.location.origin}/builds/${res.shareSlug}`;
    setShareUrl(url);

    void trackEvent("share_created", {
      buildId: res.buildId,
      meta: { itemCount: res.itemCount },
    });

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Copied share link to clipboard.");
    } catch {
      setShareStatus("Share link ready. Copy it from the field below.");
    }

    router.push(`/builds/${res.shareSlug}`);
  };

  const onSave = async (): Promise<void> => {
    setSaveStatus(null);
    setShareStatus(null);

    if (!session?.user?.id) {
      setSaveStatus("Sign in to save builds to your account.");
      return;
    }

    const productsPayload: Record<string, string> = {};
    for (const [categorySlug, p] of Object.entries(productsByCategory)) {
      if (p?.id) productsPayload[categorySlug] = p.id;
    }

    const plantIds = plants.map((p) => p.id);
    const selectedOfferIds = Object.fromEntries(
      Object.entries(selectedOfferIdByProductId).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0,
      ),
    );

    const defaultName = productsByCategory["tank"]?.name
      ? `${productsByCategory["tank"]?.name} build`
      : "Untitled Build";

    let res: { buildId: string; shareSlug: string; itemCount: number };
    try {
      res = await saveMutation.mutateAsync({
        buildId: buildId ?? undefined,
        shareSlug: shareSlug ?? undefined,
        name: defaultName,
        productsByCategory: productsPayload,
        plantIds,
        selectedOfferIdByProductId: selectedOfferIds,
        flags: { hasShrimp: flags.hasShrimp, lowTechNoCo2 },
      });
    } catch {
      setSaveStatus("Failed to save build to your account.");
      return;
    }

    hydrate({
      buildId: res.buildId,
      shareSlug: res.shareSlug,
      productsByCategory,
      plants,
      selectedOfferIdByProductId: selectedOfferIdByProductId,
      flags: { ...flags, lowTechNoCo2 },
    });

    setSaveStatus("Saved to your profile.");
  };

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (lastSyncedUserId === userId) return;
    if (saveMutation.isPending) return;

    const hasAnySelections =
      Object.values(productsByCategory).some((p) => Boolean(p?.id)) || plants.length > 0;

    // Mark as synced even if empty, so we only attempt once per user session.
    if (!hasAnySelections) {
      setLastSyncedUserId(userId);
      return;
    }

    const run = async (): Promise<void> => {
      const productsPayload: Record<string, string> = {};
      for (const [categorySlug, p] of Object.entries(productsByCategory)) {
        if (p?.id) productsPayload[categorySlug] = p.id;
      }

      const plantIds = plants.map((p) => p.id);
      const selectedOfferIds = Object.fromEntries(
        Object.entries(selectedOfferIdByProductId).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].length > 0,
        ),
      );

      const defaultName = productsByCategory["tank"]?.name
        ? `${productsByCategory["tank"]?.name} build`
        : "Untitled Build";

      try {
        const res = await saveMutation.mutateAsync({
          buildId: buildId ?? undefined,
          shareSlug: shareSlug ?? undefined,
          name: defaultName,
          productsByCategory: productsPayload,
          plantIds,
          selectedOfferIdByProductId: selectedOfferIds,
          flags: { hasShrimp: flags.hasShrimp, lowTechNoCo2 },
        });

        hydrate({
          buildId: res.buildId,
          shareSlug: res.shareSlug,
          productsByCategory,
          plants,
          selectedOfferIdByProductId: selectedOfferIdByProductId,
          flags: { ...flags, lowTechNoCo2 },
        });

        setSaveStatus("Synced your local build to your profile.");
      } catch {
        setSaveStatus("Could not sync your local build automatically. Use Save to try again.");
      } finally {
        setLastSyncedUserId(userId);
      }
    };

    void run();
  }, [
    buildId,
    flags,
    hydrate,
    lastSyncedUserId,
    lowTechNoCo2,
    plants,
    productsByCategory,
    saveMutation,
    selectedOfferIdByProductId,
    session?.user?.id,
    setLastSyncedUserId,
    shareSlug,
  ]);

  const topBannerEval = evals[0] ?? null;
  const sortedEvals = useMemo(() => {
    const order: Record<Severity, number> = {
      error: 0,
      warning: 1,
      completeness: 2,
      recommendation: 3,
    };
    return [...evals].sort((a, b) => {
      const ao = order[a.severity] ?? 9;
      const bo = order[b.severity] ?? 9;
      if (ao !== bo) return ao - bo;
      return a.message.localeCompare(b.message);
    });
  }, [evals]);

  return (
    <div className="ptl-builder-bg">
      <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="ptl-page-title"
          >
            Builder
          </h1>
          <p className="mt-3 ptl-lede text-neutral-700">
            Choose parts category-by-category. Warnings update instantly.
          </p>
          {shareStatus ? (
            <div className="mt-2 text-sm text-neutral-700">{shareStatus}</div>
          ) : null}
          {saveStatus ? (
            <div className="mt-2 text-sm text-neutral-700">{saveStatus}</div>
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
          {isSignedIn ? (
            <button
              type="button"
              className="ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onSave()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
          ) : null}
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
                <div className="text-xs font-medium text-neutral-600">Next recommended</div>
                <button
                  type="button"
                  onClick={() => openWorkflowStep(nextCoreStep.id)}
                  className="ptl-btn-primary"
                  title={`Choose ${nextCoreStep.label}`}
                >
                  {nextCoreStep.kind === "plants" ? "Add plants" : `Choose ${nextCoreStep.label}`}
                </button>
                <div className="text-xs text-neutral-600">
                  Filters update automatically as you build.
                </div>
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
        <div className="ptl-surface p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-neutral-600">{totalLabel}</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {totalDisplay}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{totalSubLabel}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-600">Errors</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{counts.error}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-600">Warnings</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{counts.warning}</div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--ptl-border)" }}>
            <button
              type="button"
              onClick={() => setOptionsExpanded((v) => !v)}
              className="rounded-full border bg-white/75 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {optionsExpanded ? "Hide options" : "Show options"}
            </button>

            {optionsExpanded ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
            ) : null}
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

        {sortedEvals.length > 0 ? (
          <div className="ptl-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900">What to fix next</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Jump to a step, swap an item, and re-check instantly.
                </div>
              </div>
              {sortedEvals.length > 6 ? (
                <button
                  type="button"
                  className="rounded-full border bg-white/70 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
                  style={{ borderColor: "var(--ptl-border)" }}
                  onClick={() => setIssuesExpanded((v) => !v)}
                >
                  {issuesExpanded ? "Show less" : `Show all (${sortedEvals.length})`}
                </button>
              ) : null}
            </div>

            <ul className="mt-4 space-y-2">
              {(issuesExpanded ? sortedEvals : sortedEvals.slice(0, 6)).map((e, idx) => {
                const steps = [...workflow.core, ...workflow.extras];
                const fixStepId = (() => {
                  for (const s of steps) {
                    if (!e.categoriesInvolved.includes(s.id)) continue;
                    if (!isStepComplete(s, workflowState)) return s.id;
                  }
                  for (let i = steps.length - 1; i >= 0; i--) {
                    const s = steps[i]!;
                    if (e.categoriesInvolved.includes(s.id)) return s.id;
                  }
                  return null;
                })();
                const fixStep = fixStepId ? steps.find((s) => s.id === fixStepId) ?? null : null;

                return (
                  <li
                    key={`${e.ruleCode}-${idx}`}
                    className="rounded-2xl border bg-white/70 p-4"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              "rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                              severityClasses(e.severity)
                            }
                          >
                            {severityLabel(e.severity)}
                          </span>
                          {fixStep ? (
                            <span className="text-xs font-semibold text-neutral-700">
                              in {fixStep.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-neutral-900">{e.message}</div>
                        {e.fixSuggestion ? (
                          <div className="mt-1 text-xs text-neutral-700">
                            <span className="font-semibold">Fix:</span> {e.fixSuggestion}
                          </div>
                        ) : null}
                      </div>
                      {fixStep ? (
                        <button
                          type="button"
                          className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
                          style={{ borderColor: "var(--ptl-border)" }}
                          onClick={() => openWorkflowStep(fixStep.id)}
                        >
                          Fix
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
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
                const buyOffer = effectiveSelected
                  ? chosenOfferByProductId.get(effectiveSelected.id)
                  : null;
                const displayPrice = effectiveSelected
                  ? displayPriceByProductId.get(effectiveSelected.id)
                  : null;
                const priceCents = displayPrice?.priceCents ?? null;

                const selectionLabel = isCo2Category
                  ? lowTechNoCo2
                    ? "No CO2 (low-tech)"
                    : effectiveSelected
                      ? effectiveSelected.name
                      : `No ${c.name} selected`
                  : effectiveSelected
                    ? effectiveSelected.name
                    : `No ${c.name} selected`;

                const hasSelection = Boolean(effectiveSelected) ||
                  (isCo2Category && lowTechNoCo2);

                const catEvals = evalsByCat[c.slug] ?? [];
                const priceSubLabel = (() => {
                  if (!effectiveSelected) return null;

                  if (displayPrice?.source === "selected") {
                    return `${displayPrice.retailerName} (selected)`;
                  }

                  if (displayPrice?.source === "summary") {
                    const checked = formatOfferSummaryCheckedAt(displayPrice.checkedAt);
                    if (displayPrice.staleFlag) {
                      return checked
                        ? `Offer summary stale · Checked ${checked}`
                        : "Offer summary stale";
                    }
                    return checked ? `Offer summary checked ${checked}` : "Offer summary ready";
                  }

                  if (offerSummariesQ.isLoading) return "Loading offer summary...";

                  const summaryState = deriveOfferSummaryState(
                    offerSummaryByProductId.get(effectiveSelected.id),
                  );
                  if (summaryState.kind === "pending") return "Offer summary pending";
                  return "No in-stock offers yet";
                })();

                return (
                  <CategoryRowView
                    key={c.id}
                    testId={`category-row-${c.slug}`}
                    categoryName={c.name}
                    required={c.builderRequired}
                    hasSelection={hasSelection}
                    selectionLabel={selectionLabel}
                    priceLabel={formatMoney(priceCents)}
                    priceSubLabel={priceSubLabel}
                    buyHref={buyOffer ? buyOffer.goUrl : null}
                    onOffers={
                      effectiveSelected
                        ? () =>
                            setActiveOffers({
                              productId: effectiveSelected.id,
                              productName: effectiveSelected.name,
                            })
                        : undefined
                    }
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

            <div
              data-testid="category-row-plants"
              className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_1.7fr_0.8fr_auto] sm:items-center"
            >
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

              <div className="text-left text-sm text-neutral-700 sm:text-right">—</div>

              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-self-end">
                <button
                  type="button"
                  onClick={() => {
                    setFocusedStepId("plants");
                    setActivePicker({ type: "plants" });
                  }}
                  className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  {plants.length === 0 ? "Add" : "Manage"}
                </button>
                {plants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearPlants()}
                    className="rounded-full border bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
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
                      className="rounded-full border bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-900 transition hover:bg-white cursor-pointer"
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

      <div className="mt-3 text-xs text-neutral-600">
        Affiliate disclosure: PlantedTankLab may earn from qualifying purchases.
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
            const pickedCategory = activePicker.categorySlug;
            const wasSelected = Boolean(productsByCategory[pickedCategory]);
            const isCore = workflow.core.some(
              (s) => s.kind === "product" && s.categorySlug === pickedCategory,
            );

            // Compute next step based on the post-pick state. We do this before
            // the store update lands so the "continue" action feels instant.
            const nextProductsByCategory = { ...productsByCategory, [pickedCategory]: p };
            const nextState = {
              productsByCategory: nextProductsByCategory,
              plants,
              flags,
              lowTechNoCo2: pickedCategory === "co2" ? false : lowTechNoCo2,
            };
            const next = nextRecommendedCoreStep(workflow.core, nextState);

            if (pickedCategory === "co2") setLowTechNoCo2(false);
            setProduct(pickedCategory, p);
            setFocusedStepId(null);

            // Auto-advance only when users are moving through the core steps
            // for the first time (not when swapping).
            if (isCore && !wasSelected && next && next.id !== pickedCategory) {
              setTimeout(() => openWorkflowStep(next.id), 50);
            }
          }}
          compatibilityEnabled={compatibilityEnabled}
          curatedOnly={curatedOnly}
          currentProductsByCategory={productsByCategory}
          currentPlants={plants}
          currentFlags={{ ...flags, lowTechNoCo2 }}
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
          lowTechNoCo2={lowTechNoCo2}
          currentProductsByCategory={productsByCategory}
          currentPlants={plants}
          currentFlags={{ ...flags, lowTechNoCo2 }}
          rules={rules}
        />
      ) : null}

      {activeOffers ? (
        <OffersDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setActiveOffers(null);
          }}
          productId={activeOffers.productId}
          productName={activeOffers.productName}
          selectedOfferId={selectedOfferIdByProductId[activeOffers.productId] ?? null}
          onSelectOfferId={(offerId) => {
            setSelectedOfferId(activeOffers.productId, offerId);
            setActiveOffers(null);
          }}
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
      {bestOffersQ.isError || selectedOffersQ.isError ? (
        <div className="mt-2 text-xs text-red-700">Failed to load prices.</div>
      ) : null}
      </main>
    </div>
  );
}
