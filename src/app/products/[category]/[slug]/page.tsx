import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RetailerMark } from "@/components/RetailerMark";
import { SmartImage } from "@/components/SmartImage";
import { formatSpecs } from "@/lib/specs";
import { getServerCaller } from "@/server/trpc/server-caller";

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDateShort(value: unknown): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isoDay(value: unknown): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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

function firstImageUrl(imageUrl: string | null, imageUrls: unknown): string | null {
  if (imageUrl) return imageUrl;
  if (Array.isArray(imageUrls) && typeof imageUrls[0] === "string") return imageUrls[0];
  return null;
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
      title: `${title} | PlantedTankLab`,
      description: p.description ?? `Specs, prices, and details for ${title}.`,
    };
  } catch {
    return { title: "Product | PlantedTankLab" };
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

  const offers = await caller.offers.listByProductId({ productId: p.id, limit: 50 });
  const historyRows = await caller.offers
    .priceHistoryByProductId({ productId: p.id, days: 30, limit: 500 })
    .catch(() => []);
  const worksWellWith = await caller.products.worksWellWith({ productId: p.id, limit: 6 }).catch(() => []);
  const lowest = offers.reduce<number | null>((min, o) => {
    const cents = o.priceCents;
    if (cents == null) return min;
    if (min == null) return cents;
    return Math.min(min, cents);
  }, null);

  const specs = formatSpecs({ categorySlug: p.category.slug, specs: p.specs });

  const gallery = Array.isArray(p.imageUrls)
    ? p.imageUrls.filter((u): u is string => typeof u === "string")
    : [];
  const primaryImage = firstImageUrl(p.imageUrl ?? null, gallery) ?? null;

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
          <div className="text-xs font-semibold text-neutral-600">Lowest price</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatMoney(lowest)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Prices update as we add more stores.
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
              <div className="relative aspect-square w-full overflow-hidden">
                <SmartImage
                  src="/images/aquascape-hero-2400.jpg"
                  alt=""
                  width={720}
                  height={720}
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                <div className="absolute left-4 top-4 rounded-full border bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-900" style={{ borderColor: "var(--ptl-border)" }}>
                  Photo coming soon
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="max-w-[34ch] rounded-2xl border bg-white/80 px-5 py-4 text-center" style={{ borderColor: "var(--ptl-border)" }}>
                    <div className="text-sm font-semibold text-neutral-900">No product photo yet</div>
                    <div className="mt-1 text-xs text-neutral-700">
                      We’re still filling in the catalog. Specs and pricing should be correct, even if the photo isn’t here yet.
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/products/${p.category.slug}`}
                        className="text-xs font-semibold text-[color:var(--ptl-accent)] hover:underline"
                      >
                        Browse more {p.category.name.toLowerCase()}
                      </Link>
                    </div>
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
            Product photos are being added over time.
          </div>
        </aside>

        <section className="ptl-surface p-6">
          <div className="text-sm font-medium">Specs</div>
          {specs.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">No specs yet.</div>
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
          {offers.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">No offers yet.</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border bg-white/70 p-4"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <RetailerMark
                        name={o.retailer.name}
                        logoAssetPath={
                          (o.retailer as { logoAssetPath?: string | null }).logoAssetPath ?? null
                        }
                        logoUrl={o.retailer.logoUrl ?? null}
                      />
                      <div className="mt-1 text-xs text-neutral-600">
                        {o.inStock ? "In stock" : "Out of stock"}
                        {(() => {
                          const checked = formatDateShort(
                            (o as { lastCheckedAt?: unknown }).lastCheckedAt,
                          );
                          return checked ? ` · Checked ${checked}` : "";
                        })()}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-neutral-900">
                      {formatMoney(o.priceCents)}
                    </div>
                  </div>

                  <div className="mt-2">
                    <a
                      href={o.goUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="ptl-btn-primary"
                    >
                      Buy
                    </a>
                  </div>
                </li>
              ))}
            </ul>
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
              const img = firstImageUrl(x.imageUrl ?? null, x.imageUrls) ?? null;
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
