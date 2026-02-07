import type { Metadata } from "next";
import Link from "next/link";

import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Products | PlantedTankLab",
  description: "Browse aquarium equipment categories and compare compatible options.",
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
          .map((c) => (
            <Link
              key={c.id}
              href={`/products/${c.slug}`}
              className="ptl-surface-sand p-6 ptl-hover-lift transition hover:brightness-[1.02]"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Category
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                {c.name}
              </div>
              <div className="mt-2 text-sm text-neutral-700">
                Browse {c.name.toLowerCase()} and see key specs.
              </div>
            </Link>
          ))}
      </div>
    </main>
  );
}
