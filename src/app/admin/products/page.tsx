import Link from "next/link";

import { db } from "@/server/db";
import { brands, categories, products } from "@/server/db/schema";
import { desc, eq, ilike, or } from "drizzle-orm";

export const metadata = {
  title: "Admin Products | PlantedTankLab",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      status: products.status,
      verified: products.verified,
      updatedAt: products.updatedAt,
      category: { slug: categories.slug, name: categories.name },
      brand: { slug: brands.slug, name: brands.name },
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(
      q
        ? or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`))
        : undefined,
    )
    .orderBy(desc(products.updatedAt))
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
              Products
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              Edit specs, images, and status. Changes affect compatibility and search.
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search products..."
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
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Brand</th>
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
                      href={`/admin/products/${r.id}`}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-neutral-600">{r.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.category.name}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.brand?.name ?? "—"}</td>
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
                  <td className="px-4 py-6 text-sm text-neutral-600" colSpan={6}>
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
