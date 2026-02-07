import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { compatibilityRules } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import type { CompatibilityRule } from "@/engine/types";
import { RulePreview } from "./RulePreview";

export const metadata = {
  title: "Admin Rule | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function safeJson(value: unknown, fallback: unknown): string {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

export default async function AdminRuleEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;

  if (!isUuid(id)) notFound();

  const rows = await db
    .select({
      id: compatibilityRules.id,
      code: compatibilityRules.code,
      name: compatibilityRules.name,
      description: compatibilityRules.description,
      severity: compatibilityRules.severity,
      categoriesInvolved: compatibilityRules.categoriesInvolved,
      conditionLogic: compatibilityRules.conditionLogic,
      messageTemplate: compatibilityRules.messageTemplate,
      fixSuggestion: compatibilityRules.fixSuggestion,
      active: compatibilityRules.active,
      version: compatibilityRules.version,
      updatedAt: compatibilityRules.updatedAt,
    })
    .from(compatibilityRules)
    .where(eq(compatibilityRules.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) notFound();

  const error = (sp.error ?? "").trim();
  const saved = sp.saved === "1";

  const engineRule: CompatibilityRule = {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    severity: r.severity as CompatibilityRule["severity"],
    categoriesInvolved: r.categoriesInvolved,
    conditionLogic: (r.conditionLogic ?? {}) as Record<string, unknown>,
    messageTemplate: r.messageTemplate,
    fixSuggestion: r.fixSuggestion ?? null,
    active: r.active,
    version: r.version,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Rule
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {r.name}
            </h1>
            <div className="mt-2 text-sm text-neutral-700">
              {r.code} · {r.severity} · v{r.version} · {r.active ? "active" : "inactive"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/rules" className="ptl-btn-secondary">
              Back to rules
            </Link>
          </div>
        </div>

        {saved ? (
          <div
            className="mt-6 rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            style={{ borderColor: "rgba(16,185,129,.25)" }}
          >
            Saved.
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <form className="mt-8 grid grid-cols-1 gap-5" method="post" action={`/admin/rules/${r.id}/save`}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Code</div>
              <input
                name="code"
                defaultValue={r.code}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
              <div className="mt-1 text-xs text-neutral-600">Unique, short identifier.</div>
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Severity</div>
              <select
                name="severity"
                defaultValue={r.severity}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <option value="error">error</option>
                <option value="warning">warning</option>
                <option value="recommendation">recommendation</option>
                <option value="completeness">completeness</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Name</div>
            <input
              name="name"
              defaultValue={r.name}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Description</div>
            <textarea
              name="description"
              defaultValue={r.description ?? ""}
              rows={3}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Categories involved (JSON array)</div>
              <textarea
                name="categoriesInvolvedJson"
                defaultValue={safeJson(r.categoriesInvolved, [])}
                rows={3}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Version</div>
              <input
                name="version"
                type="number"
                step="1"
                defaultValue={r.version}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
              <div className="mt-1 text-xs text-neutral-600">Bump when behavior changes.</div>
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Condition logic (JSON)</div>
            <textarea
              name="conditionLogicJson"
              defaultValue={safeJson(r.conditionLogic, {})}
              rows={10}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Message template</div>
            <textarea
              name="messageTemplate"
              defaultValue={r.messageTemplate}
              rows={3}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Fix suggestion</div>
            <textarea
              name="fixSuggestion"
              defaultValue={r.fixSuggestion ?? ""}
              rows={2}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
            <input type="checkbox" name="active" defaultChecked={r.active} />
            Active
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-600">
              Last updated{" "}
              {new Date(r.updatedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <button type="submit" className="ptl-btn-primary">
              Save
            </button>
          </div>
        </form>

        <div className="mt-10">
          <RulePreview initialRule={engineRule} />
        </div>
      </div>
    </main>
  );
}

