import type { Metadata } from "next";
import Link from "next/link";

import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Plants | PlantedTankLab",
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

export default async function PlantsPage(props: { searchParams: SearchParams }) {
  const caller = await getServerCaller();

  const q = (first(props.searchParams, "q") ?? "").trim() || undefined;
  const difficulty = (first(props.searchParams, "difficulty") ?? "").trim() || undefined;
  const lightDemand = (first(props.searchParams, "light") ?? "").trim() || undefined;
  const co2Demand = (first(props.searchParams, "co2") ?? "").trim() || undefined;
  const placement = (first(props.searchParams, "placement") ?? "").trim() || undefined;
  const beginnerFriendly = toBool(first(props.searchParams, "beginner"));
  const shrimpSafe = toBool(first(props.searchParams, "shrimpSafe"));

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Plants</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Filter by difficulty, light, CO2, and placement. URLs are shareable via query params.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">Filters</div>
          <form className="mt-4 space-y-4" method="GET">
            <div>
              <label className="text-xs font-medium text-neutral-700">Search</label>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Common or scientific name..."
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Difficulty</label>
              <select
                name="difficulty"
                defaultValue={difficulty ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Any</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Light demand</label>
              <select
                name="light"
                defaultValue={lightDemand ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">CO2 demand</label>
              <select
                name="co2"
                defaultValue={co2Demand ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Any</option>
                <option value="none">None</option>
                <option value="beneficial">Beneficial</option>
                <option value="required">Required</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Placement</label>
              <select
                name="placement"
                defaultValue={placement ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Any</option>
                <option value="foreground">Foreground</option>
                <option value="midground">Midground</option>
                <option value="background">Background</option>
                <option value="carpet">Carpet</option>
                <option value="epiphyte">Epiphyte</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="beginner"
                value="1"
                defaultChecked={beginnerFriendly}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Beginner-friendly
            </label>

            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="shrimpSafe"
                value="1"
                defaultChecked={shrimpSafe}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Shrimp-safe
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Apply
              </button>
              <Link
                href="/plants"
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section>
          <div className="text-sm text-neutral-600">
            Showing <span className="font-medium text-neutral-900">{plants.length}</span>{" "}
            result(s)
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {plants.length === 0 ? (
              <div className="px-5 py-8 text-sm text-neutral-600">No results.</div>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {plants.map((p) => (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/plants/${p.slug}`}
                          className="truncate text-sm font-semibold text-neutral-900 hover:underline"
                        >
                          {p.commonName}
                        </Link>
                        {p.scientificName ? (
                          <div className="truncate text-xs text-neutral-600">
                            {p.scientificName}
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-neutral-600">
                          {p.difficulty} · {p.lightDemand} light · {p.co2Demand} CO2 ·{" "}
                          {p.placement}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-600">
                        {p.beginnerFriendly ? "Beginner" : null}
                        {p.beginnerFriendly && p.shrimpSafe ? " · " : null}
                        {p.shrimpSafe ? "Shrimp-safe" : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
