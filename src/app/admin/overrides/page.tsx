import Link from "next/link";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { normalizationOverrides, users } from "@/server/db/schema";
import type { CanonicalType } from "@/server/services/admin/overrides";

export const metadata = {
  title: "Admin Overrides | PlantedTankLab",
  robots: { index: false, follow: false },
};

function parseTypeFilter(value: string): CanonicalType | "" {
  if (value === "product" || value === "plant" || value === "offer") {
    return value;
  }
  return "";
}

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function serializeValueForForm(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function actorLabel(displayName: string | null, email: string | null): string {
  const display = displayName?.trim();
  const emailValue = email?.trim();
  if (display && emailValue) return `${display} (${emailValue})`;
  if (display) return display;
  if (emailValue) return emailValue;
  return "Unknown";
}

export default async function AdminOverridesPage(props: {
  searchParams: Promise<{ q?: string; type?: string; saved?: string; error?: string }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const typeFilter = parseTypeFilter((sp.type ?? "").trim());
  const saved = (sp.saved ?? "").trim();
  const error = (sp.error ?? "").trim();

  const rows = await db
    .select({
      id: normalizationOverrides.id,
      canonicalType: normalizationOverrides.canonicalType,
      canonicalId: normalizationOverrides.canonicalId,
      fieldPath: normalizationOverrides.fieldPath,
      value: normalizationOverrides.value,
      reason: normalizationOverrides.reason,
      actorUserId: normalizationOverrides.actorUserId,
      createdAt: normalizationOverrides.createdAt,
      updatedAt: normalizationOverrides.updatedAt,
      actorEmail: users.email,
      actorDisplayName: users.displayName,
    })
    .from(normalizationOverrides)
    .leftJoin(users, eq(normalizationOverrides.actorUserId, users.id))
    .where(
      and(
        typeFilter ? eq(normalizationOverrides.canonicalType, typeFilter) : undefined,
        q
          ? or(
              ilike(normalizationOverrides.canonicalId, `%${q}%`),
              ilike(normalizationOverrides.fieldPath, `%${q}%`),
              ilike(normalizationOverrides.reason, `%${q}%`),
              ilike(users.email, `%${q}%`),
              ilike(users.displayName, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(normalizationOverrides.updatedAt))
    .limit(250);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Admin</div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Normalization overrides
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Override canonical fields when automated normalization should not win.
              Changes here are applied on future normalization runs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="ptl-btn-secondary">
              Back to admin
            </Link>
            <Link href="/admin/ingestion" className="ptl-btn-secondary">
              Ingestion mappings
            </Link>
          </div>
        </div>

        {saved ? (
          <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Override saved.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="text-sm font-semibold text-neutral-900">Create override</div>
          <div className="mt-1 text-sm text-neutral-700">
            Value accepts JSON. If invalid JSON is entered, it is stored as a string.
          </div>

          <form method="post" action="/admin/overrides/create" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              name="canonicalType"
              required
              defaultValue="product"
              className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <option value="product">Product</option>
              <option value="plant">Plant</option>
              <option value="offer">Offer</option>
            </select>

            <input
              name="canonicalId"
              required
              placeholder="Canonical ID (UUID)"
              className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />

            <input
              name="fieldPath"
              required
              placeholder="Field path (example: specs.tankVolumeGallons)"
              className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
              style={{ borderColor: "var(--ptl-border)" }}
            />

            <textarea
              name="value"
              required
              rows={4}
              placeholder='Override value (example: 60, true, {"lumens": 2800}, Manual text)'
              className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
              style={{ borderColor: "var(--ptl-border)" }}
            />

            <input
              name="reason"
              required
              maxLength={500}
              placeholder="Reason for override"
              className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
              style={{ borderColor: "var(--ptl-border)" }}
            />

            <div className="md:col-span-2">
              <button type="submit" className="ptl-btn-primary">
                Create override
              </button>
            </div>
          </form>
        </div>

        <form className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search field path, canonical id, reason, actor..."
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <select
            name="type"
            defaultValue={typeFilter}
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <option value="">All types</option>
            <option value="product">Product</option>
            <option value="plant">Plant</option>
            <option value="offer">Offer</option>
          </select>
          <button type="submit" className="ptl-btn-primary">
            Filter
          </button>
        </form>

        <div className="mt-6 text-sm text-neutral-700">
          {rows.length} override{rows.length === 1 ? "" : "s"} shown.
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border bg-white/70 p-5"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="flex flex-col gap-1 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  Actor: {actorLabel(row.actorDisplayName, row.actorEmail)}
                  {row.actorUserId ? ` (${row.actorUserId})` : ""}
                </div>
                <div>
                  Created {formatDateTime(row.createdAt)} · Updated {formatDateTime(row.updatedAt)}
                </div>
              </div>

              <form
                method="post"
                action={`/admin/overrides/${row.id}/update`}
                className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                <select
                  name="canonicalType"
                  required
                  defaultValue={row.canonicalType}
                  className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <option value="product">Product</option>
                  <option value="plant">Plant</option>
                  <option value="offer">Offer</option>
                </select>

                <input
                  name="canonicalId"
                  required
                  defaultValue={row.canonicalId}
                  className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                />

                <input
                  name="fieldPath"
                  required
                  defaultValue={row.fieldPath}
                  className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
                  style={{ borderColor: "var(--ptl-border)" }}
                />

                <textarea
                  name="value"
                  required
                  rows={4}
                  defaultValue={serializeValueForForm(row.value)}
                  className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
                  style={{ borderColor: "var(--ptl-border)" }}
                />

                <input
                  name="reason"
                  required
                  maxLength={500}
                  defaultValue={row.reason ?? ""}
                  className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)] md:col-span-2"
                  style={{ borderColor: "var(--ptl-border)" }}
                />

                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <button type="submit" className="ptl-btn-primary">
                    Update
                  </button>
                </div>
              </form>

              <form method="post" action={`/admin/overrides/${row.id}/delete`} className="mt-3">
                <button type="submit" className="ptl-btn-secondary">
                  Delete
                </button>
              </form>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="rounded-2xl border bg-white/70 p-5 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
              No overrides found for this filter.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
