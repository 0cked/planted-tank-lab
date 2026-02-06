import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatSpecs } from "@/lib/specs";
import { getServerCaller } from "@/server/trpc/server-caller";

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
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
  const lowest = offers.reduce<number | null>((min, o) => {
    const cents = o.priceCents;
    if (cents == null) return min;
    if (min == null) return cents;
    return Math.min(min, cents);
  }, null);

  const specs = formatSpecs({ categorySlug: p.category.slug, specs: p.specs });

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <Link
              href={`/products/${p.category.slug}`}
              className="hover:text-neutral-900 hover:underline"
            >
              {p.category.name}
            </Link>
          </div>
          <h1
            className="mt-2 text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {p.description ? (
            <p className="mt-3 max-w-2xl text-sm text-neutral-700">{p.description}</p>
          ) : null}
        </div>
        <div className="ptl-surface px-5 py-4 text-right">
          <div className="text-xs font-semibold text-neutral-600">Lowest price</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatMoney(lowest)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Best-effort until offers are seeded.
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
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
                      <div className="truncate text-sm font-semibold text-neutral-900">
                        {o.retailer.name}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {o.inStock ? "In stock" : "Out of stock"}
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
    </main>
  );
}
