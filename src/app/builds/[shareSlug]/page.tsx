import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportBuildDialog } from "./ReportBuildDialog";

import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

export async function generateMetadata(props: {
  params: Promise<{ shareSlug: string }>;
}): Promise<Metadata> {
  const { shareSlug } = await props.params;
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
  const data = await caller.builds.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) return { title: "Build | PlantedTankLab" };
  return {
    title: data.build.name,
    description:
      data.build.description ??
      `A planted tank build snapshot with ${data.build.itemCount} items.`,
  };
}

function formatMoney(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelForCategory(params: { slug: string; name?: string | null }): string {
  if (params.slug === "co2") return "CO2";
  const name = params.name?.trim();
  if (name) return name;
  return titleCaseSlug(params.slug);
}

export default async function BuildSharePage(props: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await props.params;

  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const data = await caller.builds.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) notFound();

  const categoriesList = await caller.products.categoriesList().catch(() => []);
  const categoryNameBySlug = new Map(categoriesList.map((c) => [c.slug, c.name] as const));

  const gear = Object.entries(data.snapshot.productsByCategory)
    .map(([categorySlug, p]) => ({ categorySlug, product: p }))
    .filter((x) => Boolean(x.product?.id));

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">Build snapshot</div>
          <h1
            className="mt-2 ptl-page-title"
          >
            {data.build.name}
          </h1>
          {data.build.description ? (
            <p className="mt-3 max-w-[70ch] ptl-lede text-neutral-700">
              {data.build.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-700">
            <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
              {data.build.itemCount} item(s)
            </div>
            <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
              {formatMoney(data.build.totalPriceCents)}
            </div>
            {data.build.isPublic ? (
              <div className="rounded-full border bg-emerald-50 px-3 py-1.5 text-emerald-900" style={{ borderColor: "rgba(16,185,129,.25)" }}>
                Public
              </div>
            ) : (
              <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
                Unlisted
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-2">
            <Link href={`/builder/${shareSlug}`} className="ptl-btn-primary">
              Open in builder
            </Link>
            <ReportBuildDialog shareSlug={shareSlug} />
          </div>
          <div className="text-xs text-neutral-700">
            This opens the snapshot in the builder so you can tweak it. Sharing again updates this
            link.
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="ptl-surface p-7 sm:p-10">
          <h2 className="text-lg font-semibold">Gear</h2>
          {gear.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">
              No gear selected yet. Open this build in the builder to start picking gear.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {gear.map((g) => (
                <li
                  key={g.categorySlug}
                  className="rounded-2xl border bg-white/55 p-4"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {labelForCategory({
                      slug: g.categorySlug,
                      name: categoryNameBySlug.get(g.categorySlug) ?? null,
                    })}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">
                    {g.product?.slug ? (
                      <Link
                        href={`/products/${g.categorySlug}/${g.product.slug}`}
                        className="hover:underline"
                      >
                        {g.product.name}
                      </Link>
                    ) : (
                      (g.product?.name ?? "—")
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ptl-surface p-7 sm:p-10">
          <h2 className="text-lg font-semibold">Plants</h2>
          {data.snapshot.plants.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">No plants selected.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.snapshot.plants.map((p) => (
                <li key={p.id}>
                  <Link href={`/plants/${p.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                    {p.commonName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
