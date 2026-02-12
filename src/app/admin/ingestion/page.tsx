import Link from "next/link";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from "drizzle-orm";

import { db } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionSources,
  offers,
  plants,
  products,
  retailers,
} from "@/server/db/schema";
import { getIngestionOpsSnapshot } from "@/server/services/admin/ingestion-ops";
import type { CanonicalType } from "@/server/services/admin/mappings";

export const metadata = {
  title: "Admin Ingestion | PlantedTankLab",
  robots: { index: false, follow: false },
};

const MAPPABLE_TYPES: CanonicalType[] = ["product", "plant", "offer"];

type CanonicalOption = {
  id: string;
  label: string;
};

function canonicalTypeForEntityType(value: string): CanonicalType | null {
  if (value === "product") return "product";
  if (value === "plant") return "plant";
  if (value === "offer") return "offer";
  return null;
}

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

function formatDurationMs(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1000) return `${Math.round(value)}ms`;

  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export default async function AdminIngestionPage(props: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    saved?: string;
    error?: string;
    recoveryAction?: string;
    recoveryCount?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const typeFilter = parseTypeFilter((sp.type ?? "").trim());
  const saved = (sp.saved ?? "").trim();
  const error = (sp.error ?? "").trim();
  const recoveryAction = (sp.recoveryAction ?? "").trim();
  const recoveryCount = Number(sp.recoveryCount ?? "0");

  const ingestionOps = await getIngestionOpsSnapshot();

  const productOptionsRows = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .orderBy(asc(products.name))
    .limit(5000);

  const plantOptionsRows = await db
    .select({ id: plants.id, commonName: plants.commonName, slug: plants.slug })
    .from(plants)
    .orderBy(asc(plants.commonName))
    .limit(5000);

  const offerOptionsRows = await db
    .select({
      id: offers.id,
      productName: products.name,
      retailerName: retailers.name,
    })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .orderBy(desc(offers.updatedAt))
    .limit(5000);

  const canonicalOptions: Record<CanonicalType, CanonicalOption[]> = {
    product: productOptionsRows.map((row) => ({
      id: row.id,
      label: `${row.name} (${row.slug})`,
    })),
    plant: plantOptionsRows.map((row) => ({
      id: row.id,
      label: `${row.commonName} (${row.slug})`,
    })),
    offer: offerOptionsRows.map((row) => ({
      id: row.id,
      label: `${row.productName} · ${row.retailerName}`,
    })),
  };

  const unmappedRows = await db
    .select({
      entityId: ingestionEntities.id,
      entityType: ingestionEntities.entityType,
      sourceEntityId: ingestionEntities.sourceEntityId,
      url: ingestionEntities.url,
      sourceName: ingestionSources.name,
      sourceSlug: ingestionSources.slug,
      lastSeenAt: ingestionEntities.lastSeenAt,
      updatedAt: ingestionEntities.updatedAt,
    })
    .from(ingestionEntities)
    .innerJoin(ingestionSources, eq(ingestionEntities.sourceId, ingestionSources.id))
    .leftJoin(canonicalEntityMappings, eq(canonicalEntityMappings.entityId, ingestionEntities.id))
    .where(
      and(
        inArray(ingestionEntities.entityType, MAPPABLE_TYPES),
        isNull(canonicalEntityMappings.entityId),
        typeFilter ? eq(ingestionEntities.entityType, typeFilter) : undefined,
        q
          ? or(
              ilike(ingestionEntities.sourceEntityId, `%${q}%`),
              ilike(ingestionSources.slug, `%${q}%`),
              ilike(ingestionSources.name, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(ingestionEntities.lastSeenAt), desc(ingestionEntities.updatedAt))
    .limit(250);

  const mappedRows = await db
    .select({
      entityId: ingestionEntities.id,
      entityType: ingestionEntities.entityType,
      sourceEntityId: ingestionEntities.sourceEntityId,
      sourceName: ingestionSources.name,
      sourceSlug: ingestionSources.slug,
      canonicalType: canonicalEntityMappings.canonicalType,
      canonicalId: canonicalEntityMappings.canonicalId,
      matchMethod: canonicalEntityMappings.matchMethod,
      confidence: canonicalEntityMappings.confidence,
      updatedAt: canonicalEntityMappings.updatedAt,
    })
    .from(canonicalEntityMappings)
    .innerJoin(ingestionEntities, eq(canonicalEntityMappings.entityId, ingestionEntities.id))
    .innerJoin(ingestionSources, eq(ingestionEntities.sourceId, ingestionSources.id))
    .where(inArray(ingestionEntities.entityType, MAPPABLE_TYPES))
    .orderBy(desc(canonicalEntityMappings.updatedAt))
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
              Ingestion mappings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Resolve unmapped ingestion entities by linking them to canonical products,
              plants, and offers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="ptl-btn-secondary">
              Back to admin
            </Link>
            <Link href="/admin/overrides" className="ptl-btn-secondary">
              Overrides
            </Link>
            <Link href="/admin/logs" className="ptl-btn-secondary">
              View logs
            </Link>
          </div>
        </div>

        {saved ? (
          <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {saved === "recovery"
              ? `Recovery action '${recoveryAction || "unknown"}' completed (${Number.isFinite(recoveryCount) ? recoveryCount : 0} job${recoveryCount === 1 ? "" : "s"} affected).`
              : "Mapping update saved."}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Ingestion ops dashboard</div>
              <div className="text-xs text-neutral-600">Snapshot generated {formatDateTime(ingestionOps.generatedAt)}</div>
            </div>
            <div className="text-xs text-neutral-600">
              Freshness: {ingestionOps.freshness.freshnessPercent}% ({ingestionOps.freshness.activeCheckedWithinWindow}/
              {ingestionOps.freshness.activeCatalogOffers} active offers in {ingestionOps.freshness.freshnessWindowHours}h)
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Queued</div>
              <div className="text-lg font-semibold text-neutral-900">{ingestionOps.queue.queued}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Running</div>
              <div className="text-lg font-semibold text-neutral-900">{ingestionOps.queue.running}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Failed</div>
              <div className="text-lg font-semibold text-rose-700">{ingestionOps.queue.failed}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Ready now</div>
              <div className="text-lg font-semibold text-neutral-900">{ingestionOps.queue.readyNow}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Stale queued</div>
              <div className="text-lg font-semibold text-amber-700">{ingestionOps.queue.staleQueued}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Stuck running</div>
              <div className="text-lg font-semibold text-amber-700">{ingestionOps.queue.stuckRunning}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Unmapped</div>
              <div className="text-lg font-semibold text-neutral-900">{ingestionOps.counts.unmappedEntities}</div>
            </div>
            <div className="rounded-xl border bg-white/80 px-3 py-2" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-[11px] uppercase tracking-wide text-neutral-600">Active stale offers</div>
              <div className="text-lg font-semibold text-neutral-900">{ingestionOps.freshness.activeStaleOrMissing}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Queue recovery</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <form method="post" action="/admin/ingestion/recover" className="contents">
                  <input type="hidden" name="action" value="retry_failed_jobs" />
                  <input type="hidden" name="limit" value="200" />
                  <button type="submit" className="ptl-btn-secondary w-full">Retry failed jobs</button>
                </form>

                <form method="post" action="/admin/ingestion/recover" className="contents">
                  <input type="hidden" name="action" value="recover_stuck_running_jobs" />
                  <input type="hidden" name="limit" value="200" />
                  <input type="hidden" name="stuckRunningMinutes" value="45" />
                  <button type="submit" className="ptl-btn-secondary w-full">Recover stuck running</button>
                </form>

                <form method="post" action="/admin/ingestion/recover" className="contents">
                  <input type="hidden" name="action" value="requeue_stale_queued_jobs" />
                  <input type="hidden" name="limit" value="200" />
                  <input type="hidden" name="staleQueuedMinutes" value="120" />
                  <button type="submit" className="ptl-btn-secondary w-full">Requeue stale queued</button>
                </form>

                <form method="post" action="/admin/ingestion/recover" className="contents">
                  <input type="hidden" name="action" value="enqueue_freshness_refresh" />
                  <input type="hidden" name="limit" value="120" />
                  <button type="submit" className="ptl-btn-primary w-full">Enqueue freshness refresh</button>
                </form>
              </div>
            </div>

            <div className="rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Run status (recent)</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-700">
                {ingestionOps.runStatusLast24h.map((row) => (
                  <span
                    key={row.status}
                    className="rounded-full border bg-white px-2 py-1"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    {row.status}: {row.count}
                  </span>
                ))}
                {ingestionOps.runStatusLast24h.length === 0 ? <span>No ingestion runs recorded yet.</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Recent failed jobs</div>
              <div className="mt-2 space-y-2 text-xs text-neutral-700">
                {ingestionOps.recentFailedJobs.slice(0, 8).map((job) => (
                  <div key={job.id} className="rounded-lg border bg-white px-2 py-2" style={{ borderColor: "var(--ptl-border)" }}>
                    <div className="font-medium text-neutral-900">{job.kind}</div>
                    <div>Attempts {job.attempts}/{job.maxAttempts} · runAfter {formatDateTime(job.runAfter)}</div>
                    {job.lastError ? <div className="mt-1 line-clamp-2 text-rose-700">{job.lastError}</div> : null}
                  </div>
                ))}
                {ingestionOps.recentFailedJobs.length === 0 ? <div>No failed ingestion jobs.</div> : null}
              </div>
            </div>

            <div className="rounded-xl border bg-white/80 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Recent ingestion runs</div>
              <div className="mt-2 space-y-2 text-xs text-neutral-700">
                {ingestionOps.recentRuns.slice(0, 8).map((run) => (
                  <div key={run.id} className="rounded-lg border bg-white px-2 py-2" style={{ borderColor: "var(--ptl-border)" }}>
                    <div className="font-medium text-neutral-900">
                      {run.sourceName} ({run.sourceSlug})
                    </div>
                    <div>
                      {run.status} · started {formatDateTime(run.startedAt)} · duration {formatDurationMs(run.durationMs)}
                    </div>
                    {run.error ? <div className="mt-1 line-clamp-2 text-rose-700">{run.error}</div> : null}
                  </div>
                ))}
                {ingestionOps.recentRuns.length === 0 ? <div>No ingestion runs recorded yet.</div> : null}
              </div>
            </div>
          </div>
        </section>

        <form className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search source entity..."
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

        <div className="mt-10">
          <div className="text-sm font-semibold text-neutral-900">Unmapped entities</div>
          <div className="mt-1 text-sm text-neutral-700">
            {unmappedRows.length} unmapped entity{unmappedRows.length === 1 ? "" : "ies"} shown.
          </div>

          <div className="mt-4 space-y-3">
            {unmappedRows.map((row) => {
              const canonicalType = canonicalTypeForEntityType(row.entityType);
              if (!canonicalType) return null;
              const options = canonicalOptions[canonicalType];

              return (
                <div
                  key={row.entityId}
                  className="rounded-2xl border bg-white/70 p-5"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900">
                        {row.entityType} · {row.sourceEntityId}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        Source: {row.sourceName} ({row.sourceSlug})
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        Last seen: {formatDateTime(row.lastSeenAt)}
                      </div>
                      {row.url ? (
                        <div className="mt-1 text-xs text-neutral-600 break-all">{row.url}</div>
                      ) : null}
                    </div>
                  </div>

                  <form
                    method="post"
                    action="/admin/mappings/map"
                    className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input type="hidden" name="entityId" value={row.entityId} />
                    <input type="hidden" name="canonicalType" value={canonicalType} />

                    <select
                      name="canonicalId"
                      required
                      className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      <option value="">Select canonical {canonicalType}</option>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <input
                      name="reason"
                      type="text"
                      placeholder="Reason (optional)"
                      className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />

                    <button type="submit" className="ptl-btn-primary" disabled={options.length === 0}>
                      Map
                    </button>
                  </form>

                  {options.length === 0 ? (
                    <div className="mt-2 text-xs text-neutral-600">
                      No canonical {canonicalType} records available to map.
                    </div>
                  ) : null}
                </div>
              );
            })}

            {unmappedRows.length === 0 ? (
              <div className="rounded-2xl border bg-white/70 p-5 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
                No unmapped entities found for this filter.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10">
          <div className="text-sm font-semibold text-neutral-900">Recent mappings</div>
          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-2">Entity</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Canonical</th>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Updated</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {mappedRows.map((row) => (
                  <tr key={row.entityId} className="hover:bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{row.entityType}</div>
                      <div className="mt-0.5 text-xs text-neutral-600">{row.sourceEntityId}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {row.sourceName}
                      <div className="mt-0.5 text-xs text-neutral-600">{row.sourceSlug}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      <div>{row.canonicalType}</div>
                      <div className="mt-0.5 text-xs text-neutral-600 break-all">{row.canonicalId}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {row.matchMethod}
                      <div className="mt-0.5 text-xs text-neutral-600">confidence {row.confidence}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">{formatDateTime(row.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <form method="post" action="/admin/mappings/unmap">
                        <input type="hidden" name="entityId" value={row.entityId} />
                        <button type="submit" className="ptl-btn-secondary">
                          Unmap
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {mappedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-neutral-600" colSpan={6}>
                      No mapped entities yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
