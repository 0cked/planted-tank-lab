import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RetailerMark } from "@/components/RetailerMark";
import { SmartImage } from "@/components/SmartImage";

import { PriceAlertCard } from "./PriceAlertCard";
import {
  deriveOfferSummaryState,
  formatOfferSummaryCheckedAt,
  type OfferSummaryLike,
} from "@/lib/offer-summary";
import { sanitizeCatalogImageUrls } from "@/lib/catalog-guardrails";
import { firstCatalogImageUrl, missingSourceImageCopy } from "@/lib/catalog-no-data";
import { formatSpecs } from "@/lib/specs";
import { getServerCaller } from "@/server/trpc/server-caller";

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function isoDay(value: unknown): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatShortDate(value: unknown): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shippingInfoLabel(retailerSlug: string): string {
  switch (retailerSlug) {
    case "amazon":
      return "Varies by seller (Prime may apply)";
    case "buceplant":
      return "Rates calculated at checkout";
    case "aquarium-co-op":
      return "Rates calculated at checkout";
    default:
      return "Shipping shown at checkout";
  }
}

function offerSummaryTopline(summary: OfferSummaryLike): { priceCents: number | null; note: string } {
  const state = deriveOfferSummaryState(summary);
  if (state.kind === "pending") {
    return { priceCents: null, note: "Offer summary pending." };
  }
  if (state.kind === "no_in_stock") {
    return { priceCents: null, note: "No in-stock offers yet." };
  }

  const checked = formatOfferSummaryCheckedAt(state.checkedAt);
  if (!checked) {
    return { priceCents: state.minPriceCents, note: "Freshness unknown." };
  }

  return {
    priceCents: state.minPriceCents,
    note: state.staleFlag ? `Checked ${checked} (stale).` : `Checked ${checked}.`,
  };
}

function PriceSparkline(props: { centsByDay: Array<{ day: string; cents: number }> }) {
  const w = 320;
  const h = 70;
  const pad = 6;

  const values = props.centsByDay.map((p) => p.cents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  const pts = props.centsByDay.map((p, idx) => {
    const x = pad + (idx * (w - pad * 2)) / Math.max(1, props.centsByDay.length - 1);
    const y = h - pad - ((p.cents - min) * (h - pad * 2)) / span;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 w-full overflow-visible"
      role="img"
      aria-label="Price history sparkline"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="rgba(5,150,105,0.95)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const caller = await getServerCaller();
  try {
    const p = await caller.products.getBySlug({ slug: params.slug });
    const brandName = p.brand?.name ?? null;
    const title = brandName ? `${brandName} ${p.name}` : p.name;
    return {
      title: title,
      description: p.description ?? `Specs, prices, and details for ${title}.`,
      openGraph: {
        url: `/products/${params.category}/${params.slug}`,
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductDetailPage(props: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const params = await props.params;
  const caller = await getServerCaller();
  const p = await caller.products.getBySlug({ slug: params.slug });

  if (p.category.slug !== params.category) notFound();
  if (p.category.slug === "plants") notFound();

  const brandName = p.brand?.name ?? null;
  const title = brandName ? `${brandName} ${p.name}` : p.name;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(
    `/products/${p.category.slug}/${p.slug}`,
  )}`;

  const offerSummary = (
    await caller.offers.summaryByProductIds({
      productIds: [p.id],
    })
  )[0];
  const summaryTopline = offerSummaryTopline(offerSummary);

  const offers = await caller.offers.listByProductId({ productId: p.id, limit: 50 });
  const historyRows = await caller.offers
    .priceHistoryByProductId({ productId: p.id, days: 30, limit: 500 })
    .catch(() => []);
  const worksWellWith = await caller.products.worksWellWith({ productId: p.id, limit: 6 }).catch(() => []);

  const specs = formatSpecs({ categorySlug: p.category.slug, specs: p.specs });

  const gallery = sanitizeCatalogImageUrls(p.imageUrls);
  const primaryImage = firstCatalogImageUrl({
    imageUrl: p.imageUrl ?? null,
    imageUrls: gallery,
  });
  const missingProductImage = missingSourceImageCopy("product");

  const centsByDay = (() => {
    const m = new Map<string, number>();
    for (const r of historyRows) {
      if (!r.inStock) continue;
      const day = isoDay(r.recordedAt);
      if (!day) continue;
      const prev = m.get(day);
      if (prev == null) m.set(day, r.priceCents);
      else m.set(day, Math.min(prev, r.priceCents));
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, cents]) => ({ day, cents }));
  })();

  const sortedOffers = [...offers].sort((a, b) => {
    const aInStock = a.inStock && a.priceCents != null;
    const bInStock = b.inStock && b.priceCents != null;
    if (aInStock !== bInStock) return aInStock ? -1 : 1;

    const aPrice = a.priceCents ?? Number.POSITIVE_INFINITY;
    const bPrice = b.priceCents ?? Number.POSITIVE_INFINITY;
    if (aPrice !== bPrice) return aPrice - bPrice;

    const aUpdated = parseDate(a.updatedAt)?.getTime() ?? 0;
    const bUpdated = parseDate(b.updatedAt)?.getTime() ?? 0;
    return bUpdated - aUpdated;
  });

  const bestOfferId = sortedOffers.find((o) => o.inStock && o.priceCents != null)?.id ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">
            <Link
              href={`/products/${p.category.slug}`}
              className="hover:text-neutral-900 hover:underline"
            >
              {p.category.name}
            </Link>
          </div>
          <h1
            className="mt-2 ptl-page-title"
          >
            {title}
          </h1>
          {p.description ? (
            <p className="mt-3 max-w-2xl ptl-lede text-neutral-700">{p.description}</p>
          ) : null}
        </div>
        <div className="ptl-surface px-5 py-4 text-right">
          <div className="text-xs font-semibold text-neutral-600">Lowest price (summary)</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatMoney(summaryTopline.priceCents)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {summaryTopline.note}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr_360px]">
        <aside className="ptl-surface p-6">
          <div className="text-sm font-medium">Photo</div>
          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            {primaryImage ? (
              <SmartImage
                src={primaryImage}
                alt=""
                width={720}
                height={720}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="ptl-image-ph flex aspect-square w-full items-center justify-center">
                <div className="max-w-[34ch] px-5 py-4 text-center">
                  <div className="text-sm font-semibold text-neutral-900">
                    {missingProductImage.title}
                  </div>
                  <div className="mt-1 text-xs text-neutral-700">
                    {missingProductImage.body}
                  </div>
                </div>
              </div>
            )}
          </div>

          {gallery.length > 1 ? (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {gallery.slice(0, 10).map((u) => (
                <div
                  key={u}
                  className="overflow-hidden rounded-xl border bg-white/70"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <SmartImage
                    src={u}
                    alt=""
                    width={160}
                    height={160}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 text-xs text-neutral-500">
            Photos appear only when source-linked media is available.
          </div>
        </aside>

        <section className="ptl-surface p-6">
          <div className="text-sm font-medium">Specs</div>
          {specs.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">Specs unavailable from current sources.</div>
          ) : (
            <div
              className="mt-4 overflow-hidden rounded-xl border bg-white/70"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-200">
                  {specs.map((row) => (
                    <tr key={row.key}>
                      <th className="w-[40%] bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                        {row.label}
                      </th>
                      <td className="px-4 py-2 text-neutral-800">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="ptl-surface p-6">
          <div className="text-sm font-medium">Offers</div>
          {centsByDay.length >= 2 ? (
            <div
              className="mt-4 rounded-2xl border bg-white/70 px-4 py-3"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Price trend (last 30 days)
              </div>
              <PriceSparkline centsByDay={centsByDay} />
              <div className="mt-2 text-xs text-neutral-500">
                Based on our periodic checks. Prices may vary.
              </div>
            </div>
          ) : null}

          <PriceAlertCard
            productId={p.id}
            loginHref={loginHref}
            suggestedPriceCents={summaryTopline.priceCents}
          />

          {sortedOffers.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">No offers available from tracked retailers.</div>
          ) : (
            <div
              className="mt-4 overflow-x-auto rounded-2xl border bg-white/70"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-white/60 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  <tr>
                    <th className="px-4 py-2">Retailer</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Shipping</th>
                    <th className="px-4 py-2">Last updated</th>
                    <th className="px-4 py-2">Availability</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sortedOffers.map((o) => {
                    const inStock = o.inStock && o.priceCents != null;
                    const isBestPrice = inStock && o.id === bestOfferId;

                    return (
                      <tr key={o.id} className={isBestPrice ? "bg-emerald-50/40" : "hover:bg-white/40"}>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <RetailerMark
                              name={o.retailer.name}
                              logoAssetPath={o.retailer.logoAssetPath ?? null}
                              logoUrl={o.retailer.logoUrl ?? null}
                            />
                            {isBestPrice ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                Best price
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">
                          {formatMoney(o.priceCents)}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-700">
                          {shippingInfoLabel(o.retailer.slug)}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-700">{formatShortDate(o.updatedAt)}</td>
                        <td className="px-4 py-3">
                          {inStock ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              In stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Out of stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={o.goUrl}
                            target="_blank"
                            rel="noreferrer nofollow"
                            className={inStock ? "ptl-btn-primary" : "ptl-btn-secondary"}
                          >
                            {inStock ? "Buy" : "View"}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-xs text-neutral-500">
            Affiliate disclosure: PlantedTankLab may earn from qualifying purchases.
          </div>
        </aside>
      </div>

      {worksWellWith.length > 0 ? (
        <section className="mt-10 ptl-surface p-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-sm font-medium">Works well with</div>
              <div className="mt-1 text-sm text-neutral-700">
                Based on what people commonly pair in builds.
              </div>
            </div>
            <Link href="/builder" className="text-sm font-semibold text-emerald-800 hover:underline">
              Try in builder
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {worksWellWith.map((x) => {
              const img = firstCatalogImageUrl({ imageUrl: x.imageUrl ?? null, imageUrls: x.imageUrls });
              const brandPrefix = x.brand?.name ? `${x.brand.name} ` : "";
              const title = `${brandPrefix}${x.name}`;
              return (
                <Link
                  key={x.id}
                  href={`/products/${x.category.slug}/${x.slug}`}
                  className="group overflow-hidden rounded-2xl border bg-white/60 transition hover:bg-white/80 ptl-hover-lift"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="relative">
                    {img ? (
                      <SmartImage
                        src={img}
                        alt=""
                        width={720}
                        height={540}
                        className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="ptl-image-ph aspect-[4/3] w-full" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      {x.category.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900">
                      {title}
                    </div>
                    <div className="mt-2 text-xs text-neutral-600">
                      Seen together in {x.uses} build(s)
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
