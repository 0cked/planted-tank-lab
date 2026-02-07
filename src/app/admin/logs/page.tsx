import Link from "next/link";

import { and, desc, eq, ilike } from "drizzle-orm";

import { db } from "@/server/db";
import { adminLogs, users } from "@/server/db/schema";

export const metadata = {
  title: "Admin Logs | PlantedTankLab",
  robots: { index: false, follow: false },
};

function safeJson(value: unknown, fallback: unknown): string {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

export default async function AdminLogsPage(props: {
  searchParams: Promise<{ action?: string; targetType?: string }>;
}) {
  const sp = await props.searchParams;
  const action = (sp.action ?? "").trim();
  const targetType = (sp.targetType ?? "").trim();

  const rows = await db
    .select({
      id: adminLogs.id,
      action: adminLogs.action,
      targetType: adminLogs.targetType,
      targetId: adminLogs.targetId,
      meta: adminLogs.meta,
      createdAt: adminLogs.createdAt,
      actorEmail: users.email,
    })
    .from(adminLogs)
    .leftJoin(users, eq(adminLogs.actorUserId, users.id))
    .where(
      and(
        action ? ilike(adminLogs.action, `%${action}%`) : undefined,
        targetType ? eq(adminLogs.targetType, targetType) : undefined,
      ),
    )
    .orderBy(desc(adminLogs.createdAt))
    .limit(250);

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
              Admin Logs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Best-effort audit trail of admin actions.
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        <form className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px_auto] sm:items-center">
          <input
            type="text"
            name="action"
            defaultValue={action}
            placeholder="Filter action..."
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <input
            type="text"
            name="targetType"
            defaultValue={targetType}
            placeholder="Filter target type..."
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <button type="submit" className="ptl-btn-primary">
            Filter
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border bg-white/70 p-5"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900">
                    {r.action}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {r.actorEmail ?? "Unknown"} · {r.targetType}
                    {r.targetId ? ` · ${r.targetId}` : ""} ·{" "}
                    {new Date(r.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                  Meta
                </summary>
                <pre className="mt-2 overflow-auto rounded-xl border bg-white/80 p-3 text-xs" style={{ borderColor: "var(--ptl-border)" }}>
                  {safeJson(r.meta, {})}
                </pre>
              </details>
            </div>
          ))}
          {rows.length === 0 ? (
            <div className="ptl-surface p-7 text-sm text-neutral-700">No logs yet.</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

