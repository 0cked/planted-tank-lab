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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Browse equipment categories and compare compatible options.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories
          .filter((c) => c.slug !== "plants")
          .map((c) => (
            <Link
              key={c.id}
              href={`/products/${c.slug}`}
              className="rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300"
            >
              <div className="text-sm text-neutral-600">Category</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">
                {c.name}
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                Browse {c.name.toLowerCase()} and see key specs.
              </div>
            </Link>
          ))}
      </div>
    </main>
  );
}
