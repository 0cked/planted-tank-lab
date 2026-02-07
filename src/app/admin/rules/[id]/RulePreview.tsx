"use client";

import { useMemo, useState } from "react";

import { evaluateBuild } from "@/engine/evaluate";
import type { BuildSnapshot, CompatibilityRule, Evaluation, Severity } from "@/engine/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function severityColor(sev: Severity): string {
  switch (sev) {
    case "error":
      return "border-red-200 bg-red-50 text-red-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "recommendation":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "completeness":
      return "border-neutral-200 bg-neutral-50 text-neutral-900";
  }
}

const exampleSnapshot: BuildSnapshot = {
  productsByCategory: {
    tank: {
      id: "tank-1",
      name: "Example Tank",
      slug: "example-tank",
      categorySlug: "tank",
      specs: { length_in: 24, volume_gal: 20 },
    },
    light: {
      id: "light-1",
      name: "Example Light",
      slug: "example-light",
      categorySlug: "light",
      specs: { min_tank_length_in: 18, max_tank_length_in: 24, par_at_substrate: 55 },
    },
  },
  plants: [
    {
      id: "plant-1",
      commonName: "Example Plant",
      slug: "example-plant",
      difficulty: "easy",
      lightDemand: "high",
      co2Demand: "required",
      growthRate: "medium",
      placement: "foreground",
      phMin: 6.5,
      phMax: 7.5,
      maxHeightIn: 3,
    },
  ],
  flags: { hasShrimp: true, lowTechNoCo2: true },
};

export function RulePreview(props: {
  initialRule: CompatibilityRule;
}) {
  const [ruleJson, setRuleJson] = useState(() => JSON.stringify(props.initialRule, null, 2));
  const [snapshotJson, setSnapshotJson] = useState(() => JSON.stringify(exampleSnapshot, null, 2));
  const [result, setResult] = useState<{ ok: boolean; evals: Evaluation[]; error?: string } | null>(null);

  const parsed = useMemo(() => {
    try {
      const ruleRaw = JSON.parse(ruleJson) as unknown;
      const snapRaw = JSON.parse(snapshotJson) as unknown;
      return { ruleRaw, snapRaw, error: null as string | null };
    } catch (err) {
      return { ruleRaw: null, snapRaw: null, error: err instanceof Error ? err.message : "Invalid JSON" };
    }
  }, [ruleJson, snapshotJson]);

  const run = () => {
    if (parsed.error) {
      setResult({ ok: false, evals: [], error: parsed.error });
      return;
    }
    try {
      const ruleRaw = parsed.ruleRaw;
      const snapRaw = parsed.snapRaw;

      if (!isRecord(ruleRaw) || !isRecord(snapRaw)) throw new Error("Rule and snapshot must be objects.");
      // Minimal validation; admin UI saves the canonical form.
      const rule = ruleRaw as unknown as CompatibilityRule;
      const snapshot = snapRaw as unknown as BuildSnapshot;

      const evals = evaluateBuild([rule], snapshot);
      setResult({ ok: true, evals });
    } catch (err) {
      setResult({ ok: false, evals: [], error: err instanceof Error ? err.message : "Preview failed" });
    }
  };

  return (
    <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Preview evaluator</div>
          <div className="mt-1 text-sm text-neutral-700">
            Paste a rule + snapshot, then run the engine locally in the browser.
          </div>
        </div>
        <button type="button" onClick={run} className="ptl-btn-primary">
          Run preview
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Rule JSON</div>
          <textarea
            value={ruleJson}
            onChange={(e) => setRuleJson(e.target.value)}
            rows={14}
            className="mt-2 w-full rounded-xl border bg-white/80 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Snapshot JSON</div>
          <textarea
            value={snapshotJson}
            onChange={(e) => setSnapshotJson(e.target.value)}
            rows={14}
            className="mt-2 w-full rounded-xl border bg-white/80 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
        </label>
      </div>

      {result ? (
        <div className="mt-4">
          {!result.ok ? (
            <div className="rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-900">
              {result.error ?? "Preview failed."}
            </div>
          ) : result.evals.length === 0 ? (
            <div className="rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              No issues triggered.
            </div>
          ) : (
            <div className="space-y-2">
              {result.evals.map((e, idx) => (
                <div key={idx} className={"rounded-xl border px-4 py-3 text-sm " + severityColor(e.severity)}>
                  <div className="font-semibold">{e.severity.toUpperCase()}</div>
                  <div className="mt-1">{e.message}</div>
                  {e.fixSuggestion ? (
                    <div className="mt-1 text-xs opacity-90">
                      <span className="font-semibold">Fix:</span> {e.fixSuggestion}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

