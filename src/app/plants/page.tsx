import type { Metadata } from "next";
import Link from "next/link";

import { SmartImage } from "@/components/SmartImage";
import { PlantsFilters } from "@/components/plants/PlantsFilters";
import { firstCatalogImageUrl, missingSourceImageCopy } from "@/lib/catalog-no-data";
import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Plants",
  description: "Browse planted aquarium species by difficulty, light demand, CO2 demand, and placement.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(sp: SearchParams, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function toBool(v: string | null): boolean {
  return v === "1" || v === "true" || v === "on";
}

export default async function PlantsPage(props: { searchParams: Promise<SearchParams> }) {
  const caller = await getServerCaller();

  const searchParams = await props.searchParams;

  const q = (first(searchParams, "q") ?? "").trim() || undefined;
  const difficulty = (first(searchParams, "difficulty") ?? "").trim() || undefined;
  const lightDemand = (first(searchParams, "light") ?? "").trim() || undefined;
  const co2Demand = (first(searchParams, "co2") ?? "").trim() || undefined;
  const placement = (first(searchParams, "placement") ?? "").trim() || undefined;
  const curated = first(searchParams, "curated");
  const curatedOnly = curated === null ? true : toBool(curated);
  // Legacy support for older share URLs.
  const beginnerFriendly = curatedOnly || toBool(first(searchParams, "beginner"));
  const shrimpSafe = toBool(first(searchParams, "shrimpSafe"));

  const plants = await caller.plants.search({
    q,
    difficulty,
    lightDemand,
    co2Demand,
    placement,
    beginnerFriendly: beginnerFriendly ? true : undefined,
    shrimpSafe: shrimpSafe ? true : undefined,
    limit: 200,
  });
  const missingPlantImage = missingSourceImageCopy("plant");

  return (
    <main className="ptl-page">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ptl-page-title">Plants</h1>
          <p className="mt-3 max-w-[70ch] ptl-lede">
            Image-forward browsing with fast filters. Start with curated beginner picks, then
            widen as you refine your scape.
          </p>
          <div className="mt-4">
            <Link href="/plants/compare" className="ptl-btn-secondary rounded-xl !px-3 !py-1.5 text-xs">
              Compare plants side by side
            </Link>
          </div>
        </div>
        <div className="ptl-surface-sand flex items-center gap-3 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Showing
          </div>
          <div className="text-sm font-semibold text-neutral-900">{plants.length}</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <PlantsFilters
          defaults={{
            curatedOnly,
            q: q ?? "",
            difficulty: difficulty ?? "",
            lightDemand: lightDemand ?? "",
            co2Demand: co2Demand ?? "",
            placement: placement ?? "",
            shrimpSafe,
          }}
          resultsCount={plants.length}
        />

        <section>
          {plants.length === 0 ? (
            <div className="ptl-surface p-7 text-sm text-[color:var(--ptl-ink-muted)]">No results.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plants.map((p) => {
                const imageUrl = firstCatalogImageUrl({
                  imageUrl: p.imageUrl ?? null,
                  imageUrls: p.imageUrls,
                });
                const hasImg = Boolean(imageUrl);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/plants/${p.slug}`}
                      className="group block overflow-hidden ptl-surface ptl-hover-lift"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {hasImg ? (
                          <SmartImage
                            src={imageUrl as string}
                            alt={`${p.commonName} plant photo`}
                            fill
                            sizes="(max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="ptl-image-ph absolute inset-0 p-3">
                            <span className="inline-flex rounded-full border border-neutral-300/60 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ptl-ink-muted)]">
                              {missingPlantImage.title}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="truncate text-sm font-semibold text-white">
                            {p.commonName}
                          </div>
                          {p.scientificName ? (
                            <div className="truncate text-xs text-white/80">
                              {p.scientificName}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-[color:var(--ptl-ink-strong)]">
                          <span className="rounded-full border bg-white/70 px-2 py-1" style={{ borderColor: "var(--ptl-border)" }}>
                            {p.difficulty}
                          </span>
                          <span className="rounded-full border bg-white/70 px-2 py-1" style={{ borderColor: "var(--ptl-border)" }}>
                            {p.lightDemand} light
                          </span>
                          <span className="rounded-full border bg-white/70 px-2 py-1" style={{ borderColor: "var(--ptl-border)" }}>
                            {p.co2Demand} CO2
                          </span>
                          <span className="rounded-full border bg-white/70 px-2 py-1" style={{ borderColor: "var(--ptl-border)" }}>
                            {p.placement}
                          </span>
                          {p.beginnerFriendly ? (
                            <span className="rounded-full border bg-emerald-50 px-2 py-1 text-emerald-900" style={{ borderColor: "rgba(16,185,129,.25)" }}>
                              Beginner
                            </span>
                          ) : null}
                          {p.shrimpSafe ? (
                            <span className="rounded-full border bg-sky-50 px-2 py-1 text-sky-900" style={{ borderColor: "rgba(56,189,248,.25)" }}>
                              Shrimp-safe
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 line-clamp-2 text-sm text-[color:var(--ptl-ink-muted)]">
                          {p.description ?? "Care details are unavailable from current sources."}
                        </div>

                        <div className="mt-4 text-xs font-semibold text-[color:var(--ptl-accent-ink)]">
                          View care
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
