import Link from "next/link";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { offers, products, retailers } from "@/server/db/schema";

export const metadata = {
  title: "Admin Offers | PlantedTankLab",
  robots: { index: false, follow: false },
};

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDateShort(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminOffersPage(props: {
  searchParams: Promise<{ q?: string; retailer?: string; refreshed?: string }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const retailerSlug = (sp.retailer ?? "").trim();

  const retailerRows = await db
    .select({
      id: retailers.id,
      name: retailers.name,
      slug: retailers.slug,
      active: retailers.active,
      priority: retailers.priority,
      updatedAt: retailers.updatedAt,
    })
    .from(retailers)
    .orderBy(asc(retailers.priority), asc(retailers.name))
    .limit(200);

  const offerRows = await db
    .select({
      id: offers.id,
      priceCents: offers.priceCents,
      currency: offers.currency,
      inStock: offers.inStock,
      lastCheckedAt: offers.lastCheckedAt,
      updatedAt: offers.updatedAt,
      url: offers.url,
      affiliateUrl: offers.affiliateUrl,
      product: { id: products.id, name: products.name, slug: products.slug },
      retailer: { id: retailers.id, name: retailers.name, slug: retailers.slug },
    })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(
      and(
        q ? or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`)) : undefined,
        retailerSlug ? eq(retailers.slug, retailerSlug) : undefined,
      ),
    )
    .orderBy(desc(offers.updatedAt))
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
              Offers
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              View and manage retailer offers and refresh checks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="ptl-btn-secondary">
              Back to admin
            </Link>
            <Link href="/admin/offers/retailers" className="ptl-btn-secondary">
              Edit retailers
            </Link>
            <a href="/admin/exports/offers" className="ptl-btn-secondary">
              Export CSV
            </a>
            <form method="post" action="/admin/offers/refresh">
              <input type="hidden" name="olderThanDays" value="0" />
              <input type="hidden" name="limit" value="30" />
              <button type="submit" className="ptl-btn-primary">
                Refresh 30 now
              </button>
            </form>
          </div>
        </div>

        <form className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search products..."
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <select
            name="retailer"
            defaultValue={retailerSlug}
            className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <option value="">All retailers</option>
            {retailerRows.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
          <button type="submit" className="ptl-btn-primary shrink-0">
            Filter
          </button>
        </form>

        <div className="mt-8">
          <div className="text-sm font-semibold text-neutral-900">Retailers</div>
          <div
            className="mt-3 overflow-hidden rounded-2xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-2">Retailer</th>
                  <th className="px-4 py-2">Slug</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {retailerRows.map((r) => (
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
                    <td className="px-4 py-3 text-neutral-800">{r.active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-neutral-800">{r.priority}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{formatDateShort(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Offers</div>
              <div className="mt-1 text-sm text-neutral-700">
                Offers are refreshed via HEAD checks. Prices are manual for now.
              </div>
            </div>
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Retailer</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2">Checked</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {offerRows.map((o) => (
                  <tr key={o.id} className="hover:bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{o.product.name}</div>
                      <div className="mt-0.5 text-xs text-neutral-600">{o.product.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">{o.retailer.name}</td>
                    <td className="px-4 py-3 text-neutral-800">{formatMoney(o.priceCents)}</td>
                    <td className="px-4 py-3 text-neutral-800">{o.inStock ? "In stock" : "Out"}</td>
                    <td className="px-4 py-3 text-neutral-800">{formatDateShort(o.lastCheckedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/admin/offers/${o.id}`} className="ptl-btn-secondary">
                          Edit
                        </Link>
                        <form method="post" action={`/admin/offers/${o.id}/refresh`}>
                          <button type="submit" className="ptl-btn-secondary">
                            Refresh
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {offerRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-neutral-600" colSpan={6}>
                      No results.
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
