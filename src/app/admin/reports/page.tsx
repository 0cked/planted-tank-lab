import Link from "next/link";

import { desc, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { problemReports } from "@/server/db/schema";

export const metadata = {
  title: "Admin Reports | PlantedTankLab",
  robots: { index: false, follow: false },
};

function formatDateShort(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminReportsPage() {
  const rows = await db
    .select()
    .from(problemReports)
    .where(isNull(problemReports.resolvedAt))
    .orderBy(desc(problemReports.createdAt))
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
              Problem Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Incoming user-reported issues (data problems, broken links, spam, etc.).
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border bg-white/70" style={{ borderColor: "var(--ptl-border)" }}>
          <table className="w-full text-left text-sm">
            <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Message</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-white/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-900">{r.targetType}</div>
                    <div className="mt-0.5 break-all text-xs text-neutral-600">
                      {r.targetUrl ? (
                        <a href={r.targetUrl} className="hover:underline" target="_blank" rel="noreferrer">
                          {r.targetUrl}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">
                    <div className="whitespace-pre-wrap">{r.message}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.contactEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-800">{formatDateShort(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <form method="post" action={`/admin/reports/${r.id}/resolve`}>
                        <input type="hidden" name="resolution" value="dismissed" />
                        <input type="hidden" name="note" value="Dismissed by admin." />
                        <button type="submit" className="ptl-btn-secondary">
                          Dismiss
                        </button>
                      </form>
                      <form method="post" action={`/admin/reports/${r.id}/resolve`}>
                        <input type="hidden" name="resolution" value="resolved" />
                        <input type="hidden" name="note" value="Marked resolved by admin." />
                        <button type="submit" className="ptl-btn-primary">
                          Resolved
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-neutral-600" colSpan={5}>
                    No open problem reports.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
