import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { offers, products, retailers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Admin Offer | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function safeNum(v: number | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function safeDateTime(v: unknown): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export default async function AdminOfferEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!isUuid(id)) notFound();

  const rows = await db
    .select({
      id: offers.id,
      url: offers.url,
      affiliateUrl: offers.affiliateUrl,
      priceCents: offers.priceCents,
      currency: offers.currency,
      inStock: offers.inStock,
      lastCheckedAt: offers.lastCheckedAt,
      updatedAt: offers.updatedAt,
      product: { id: products.id, name: products.name, slug: products.slug },
      retailer: { id: retailers.id, name: retailers.name, slug: retailers.slug },
    })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(eq(offers.id, id))
    .limit(1);

  const o = rows[0];
  if (!o) notFound();

  const error = (sp.error ?? "").trim();
  const saved = sp.saved === "1";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Offer
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {o.product.name}
            </h1>
            <div className="mt-2 text-sm text-neutral-700">
              {o.retailer.name} · {o.inStock ? "in stock" : "out of stock"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/offers" className="ptl-btn-secondary">
              Back to offers
            </Link>
            <form method="post" action={`/admin/offers/${o.id}/refresh`}>
              <button type="submit" className="ptl-btn-secondary">
                Refresh now
              </button>
            </form>
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

        <form className="mt-8 grid grid-cols-1 gap-5" method="post" action={`/admin/offers/${o.id}/save`}>
          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">URL</div>
            <input
              name="url"
              defaultValue={o.url}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Affiliate URL (optional override)</div>
            <input
              name="affiliateUrl"
              defaultValue={o.affiliateUrl ?? ""}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Price cents</div>
              <input
                name="priceCents"
                defaultValue={safeNum(o.priceCents)}
                type="number"
                step="1"
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Currency</div>
              <input
                name="currency"
                defaultValue={o.currency}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="mt-7 flex items-center gap-3 text-sm font-semibold text-neutral-900">
              <input type="checkbox" name="inStock" defaultChecked={o.inStock} />
              In stock
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Last checked at (ISO datetime)</div>
            <input
              name="lastCheckedAt"
              defaultValue={safeDateTime(o.lastCheckedAt)}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
            <div className="mt-1 text-xs text-neutral-600">Leave blank to clear.</div>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-600">
              Updated{" "}
              {new Date(o.updatedAt).toLocaleString(undefined, {
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
      </div>
    </main>
  );
}

