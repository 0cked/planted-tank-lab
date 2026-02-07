import Link from "next/link";

import { asc } from "drizzle-orm";

import { db } from "@/server/db";
import { retailers } from "@/server/db/schema";

export const metadata = {
  title: "Admin Retailers | PlantedTankLab",
  robots: { index: false, follow: false },
};

export default async function AdminRetailersPage() {
  const rows = await db
    .select({
      id: retailers.id,
      name: retailers.name,
      slug: retailers.slug,
      active: retailers.active,
      priority: retailers.priority,
      affiliateNetwork: retailers.affiliateNetwork,
      affiliateTag: retailers.affiliateTag,
      updatedAt: retailers.updatedAt,
    })
    .from(retailers)
    .orderBy(asc(retailers.priority), asc(retailers.name))
    .limit(300);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Offers
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Retailers
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              Affiliate settings and safety allow-lists live on retailers.
            </p>
          </div>
          <Link href="/admin/offers" className="ptl-btn-secondary">
            Back to offers
          </Link>
        </div>

        <div
          className="mt-8 overflow-hidden rounded-2xl border bg-white/70"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-2">Retailer</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Network</th>
                <th className="px-4 py-2">Tag</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/offers/retailers/${r.id}`}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.slug}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.affiliateNetwork ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.affiliateTag ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.priority}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">
                    {new Date(r.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

