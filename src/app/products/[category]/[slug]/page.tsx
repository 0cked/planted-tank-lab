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
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const caller = await getServerCaller();
  try {
    const p = await caller.products.getBySlug({ slug: props.params.slug });
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
  params: { category: string; slug: string };
}) {
  const caller = await getServerCaller();
  const p = await caller.products.getBySlug({ slug: props.params.slug });

  if (p.category.slug !== props.params.category) notFound();
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-neutral-600">
            <Link
              href={`/products/${p.category.slug}`}
              className="hover:text-neutral-900 hover:underline"
            >
              {p.category.name}
            </Link>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          {p.description ? (
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">{p.description}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 text-right">
          <div className="text-xs font-medium text-neutral-600">Lowest price</div>
          <div className="mt-1 text-xl font-semibold tracking-tight">{formatMoney(lowest)}</div>
          <div className="mt-1 text-xs text-neutral-500">
            Best-effort until offers are seeded.
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">Specs</div>
          {specs.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">No specs yet.</div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-200">
                  {specs.map((row) => (
                    <tr key={row.key}>
                      <th className="w-[40%] bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
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

        <aside className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">Offers</div>
          {offers.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">No offers yet.</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-900">
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
                      href={o.url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="inline-flex rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      View
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 text-xs text-neutral-500">
            Affiliate redirects are added later via `/go/[offerId]`.
          </div>
        </aside>
      </div>
    </main>
  );
}

