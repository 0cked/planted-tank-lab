import type { Metadata } from "next";
import Link from "next/link";

import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse aquarium equipment categories and compare compatible options.",
  openGraph: {
    url: "/products",
  },
};

export default async function ProductsPage() {
  const caller = await getServerCaller();
  const categories = await caller.products.categoriesList();

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1
        className="ptl-page-title"
      >
        Products
      </h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Browse equipment categories and compare compatible options.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories
          .filter((c) => c.slug !== "plants")
          .map((c) => {
            return (
              <Link
                key={c.id}
                href={`/products/${c.slug}`}
                className="group overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-sm transition hover:bg-white/75 ptl-hover-lift"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <div
                  className="ptl-image-ph flex aspect-[16/10] items-center justify-center border-b bg-white/25 px-6 text-center"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="max-w-[28ch]">
                    <div className="text-sm font-semibold text-neutral-900">
                      No source image
                    </div>
                    <div className="mt-1 text-xs text-neutral-700">
                      Category media appears when source-linked imagery is available.
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Category
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                    {c.name}
                  </div>
                  <div className="mt-2 text-sm text-neutral-700">
                    Browse {c.name.toLowerCase()} and compare key specs and prices.
                  </div>
                  <div className="mt-4 text-xs font-semibold text-emerald-800">
                    Browse {c.name.toLowerCase()}
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </main>
  );
}
