import Link from "next/link";

import { desc, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { plants } from "@/server/db/schema";

export const metadata = {
  title: "Admin Plants | PlantedTankLab",
  robots: { index: false, follow: false },
};

export default async function AdminPlantsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();

  const rows = await db
    .select({
      id: plants.id,
      slug: plants.slug,
      commonName: plants.commonName,
      scientificName: plants.scientificName,
      difficulty: plants.difficulty,
      lightDemand: plants.lightDemand,
      co2Demand: plants.co2Demand,
      placement: plants.placement,
      status: plants.status,
      verified: plants.verified,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .where(
      q
        ? or(
            ilike(plants.commonName, `%${q}%`),
            ilike(plants.scientificName, `%${q}%`),
            ilike(plants.slug, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(plants.updatedAt))
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
              Plants
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              Edit care parameters, sources, and photos. These drive plant filtering and
              compatibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="ptl-btn-secondary">
              Back to admin
            </Link>
            <form method="post" action="/admin/plants/new">
              <button type="submit" className="ptl-btn-primary">
                New plant
              </button>
            </form>
          </div>
        </div>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search plants..."
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <button type="submit" className="ptl-btn-primary shrink-0">
            Search
          </button>
        </form>

        <div
          className="mt-6 overflow-hidden rounded-2xl border bg-white/70"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-2">Plant</th>
                <th className="px-4 py-2">Difficulty</th>
                <th className="px-4 py-2">Light</th>
                <th className="px-4 py-2">CO2</th>
                <th className="px-4 py-2">Placement</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/plants/${r.id}`}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      {r.commonName}
                    </Link>
                    <div className="mt-0.5 text-xs text-neutral-600">
                      {r.scientificName ? <span>{r.scientificName} · </span> : null}
                      {r.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.difficulty}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.lightDemand}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.co2Demand}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.placement}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.status}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.verified ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">
                    {new Date(r.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-neutral-600" colSpan={8}>
                    No results.
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
