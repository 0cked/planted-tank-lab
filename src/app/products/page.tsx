import type { Metadata } from "next";
import Link from "next/link";

import { SmartImage } from "@/components/SmartImage";
import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Products | PlantedTankLab",
  description: "Browse aquarium equipment categories and compare compatible options.",
};

export default async function ProductsPage() {
  const caller = await getServerCaller();
  const categories = await caller.products.categoriesList();

  const coverPosClassBySlug: Record<string, string> = {
    tank: "object-[65%_55%]",
    stand: "object-[55%_70%]",
    light: "object-[70%_25%]",
    filter: "object-[60%_60%]",
    co2: "object-[20%_55%]",
    substrate: "object-[55%_80%]",
    hardscape: "object-[80%_70%]",
    fertilizer: "object-[25%_65%]",
    heater: "object-[85%_35%]",
    test_kit: "object-[15%_25%]",
    accessories: "object-[60%_75%]",
    plants: "object-[70%_60%]",
  };

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
            const posClass = coverPosClassBySlug[c.slug] ?? "object-[50%_50%]";
            return (
              <Link
                key={c.id}
                href={`/products/${c.slug}`}
                className="group overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-sm transition hover:bg-white/75 ptl-hover-lift"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <SmartImage
                    src="/images/aquascape-hero-2400.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className={`object-cover ${posClass} transition duration-700 group-hover:scale-[1.03]`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
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
