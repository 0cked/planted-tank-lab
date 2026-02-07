import Link from "next/link";

import { count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { buildReports, builds, users } from "@/server/db/schema";

export const metadata = {
  title: "Admin Builds | PlantedTankLab",
  robots: { index: false, follow: false },
};

function formatDateShort(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminBuildsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await props.searchParams;
  const tab = (sp.tab ?? "reports").trim();

  const reportRows = await db
    .select({
      buildId: builds.id,
      name: builds.name,
      shareSlug: builds.shareSlug,
      isPublic: builds.isPublic,
      updatedAt: builds.updatedAt,
      createdAt: builds.createdAt,
      reportCount: count(buildReports.id).as("report_count"),
      latestReportAt: sql<Date | null>`max(${buildReports.createdAt})`,
      ownerEmail: users.email,
    })
    .from(builds)
    .leftJoin(buildReports, eq(buildReports.buildId, builds.id))
    .leftJoin(users, eq(builds.userId, users.id))
    .where(isNull(buildReports.resolvedAt))
    .groupBy(builds.id, users.email)
    .orderBy(desc(sql`report_count`), desc(sql`max(${buildReports.createdAt})`))
    .limit(200);

  const publicRows = await db
    .select({
      buildId: builds.id,
      name: builds.name,
      shareSlug: builds.shareSlug,
      createdAt: builds.createdAt,
      updatedAt: builds.updatedAt,
      ownerEmail: users.email,
      reportsOpen: sql<number>`coalesce(sum(case when ${buildReports.resolvedAt} is null then 1 else 0 end), 0)::int`,
    })
    .from(builds)
    .leftJoin(buildReports, eq(buildReports.buildId, builds.id))
    .leftJoin(users, eq(builds.userId, users.id))
    .where(eq(builds.isPublic, true))
    .groupBy(builds.id, users.email)
    .orderBy(desc(builds.updatedAt))
    .limit(200);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Builds Moderation
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Review reports and manage public builds.
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/builds?tab=reports"
            className={"rounded-full border px-3 py-1.5 text-sm font-semibold " + (tab === "reports" ? "bg-white/90 text-neutral-900" : "bg-white/60 text-neutral-800")}
            style={{ borderColor: "var(--ptl-border)" }}
          >
            Reports
          </Link>
          <Link
            href="/admin/builds?tab=public"
            className={"rounded-full border px-3 py-1.5 text-sm font-semibold " + (tab === "public" ? "bg-white/90 text-neutral-900" : "bg-white/60 text-neutral-800")}
            style={{ borderColor: "var(--ptl-border)" }}
          >
            Public builds
          </Link>
        </div>

        {tab === "public" ? (
          <div className="mt-6">
            <div
              className="overflow-hidden rounded-2xl border bg-white/70"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  <tr>
                    <th className="px-4 py-2">Build</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Reports</th>
                    <th className="px-4 py-2">Updated</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {publicRows.map((r) => (
                    <tr key={r.buildId} className="hover:bg-white/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">{r.name}</div>
                        <div className="mt-0.5 text-xs text-neutral-600">
                          {r.shareSlug ? (
                            <Link href={`/builds/${r.shareSlug}`} className="hover:underline">
                              /builds/{r.shareSlug}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-800">{r.ownerEmail ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-800">{r.reportsOpen}</td>
                      <td className="px-4 py-3 text-neutral-800">{formatDateShort(r.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <form method="post" action={`/admin/builds/${r.buildId}/takedown`}>
                            <input type="hidden" name="note" value="Unpublished by admin." />
                            <button type="submit" className="ptl-btn-secondary">
                              Unpublish
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {publicRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-neutral-600" colSpan={5}>
                        No public builds.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div
              className="overflow-hidden rounded-2xl border bg-white/70"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  <tr>
                    <th className="px-4 py-2">Build</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Reports</th>
                    <th className="px-4 py-2">Latest</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {reportRows.map((r) => (
                    <tr key={r.buildId} className="hover:bg-white/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">{r.name}</div>
                        <div className="mt-0.5 text-xs text-neutral-600">
                          {r.shareSlug ? (
                            <Link href={`/builds/${r.shareSlug}`} className="hover:underline">
                              /builds/{r.shareSlug}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-800">{r.ownerEmail ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-800">{Number(r.reportCount)}</td>
                      <td className="px-4 py-3 text-neutral-800">{formatDateShort(r.latestReportAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <form method="post" action={`/admin/builds/${r.buildId}/reports/dismiss`}>
                            <input type="hidden" name="note" value="Dismissed by admin." />
                            <button type="submit" className="ptl-btn-secondary">
                              Dismiss
                            </button>
                          </form>
                          <form method="post" action={`/admin/builds/${r.buildId}/takedown`}>
                            <input type="hidden" name="note" value="Unpublished by admin after reports." />
                            <button type="submit" className="ptl-btn-primary">
                              Takedown
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reportRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-neutral-600" colSpan={5}>
                        No open reports.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
