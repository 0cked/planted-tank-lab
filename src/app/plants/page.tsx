import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

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

export default async function PlantsPage(props: { searchParams: Promise<SearchParams> }) {
  const caller = await getServerCaller();

  const searchParams = await props.searchParams;

  const q = (first(searchParams, "q") ?? "").trim() || undefined;
  const difficulty = (first(searchParams, "difficulty") ?? "").trim() || undefined;
  const lightDemand = (first(searchParams, "light") ?? "").trim() || undefined;
  const co2Demand = (first(searchParams, "co2") ?? "").trim() || undefined;
  const placement = (first(searchParams, "placement") ?? "").trim() || undefined;
  const beginnerFriendly = toBool(first(searchParams, "beginner"));
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1
        className="text-4xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Plants
      </h1>
      <p className="mt-3 text-sm text-neutral-700">
        Filter by difficulty, light, CO2, and placement. URLs are shareable via query params.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <section className="ptl-surface p-5">
          <div className="text-sm font-medium">Filters</div>
          <form className="mt-4 space-y-4" method="GET">
            <div>
              <label className="text-xs font-medium text-neutral-700">Search</label>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Common or scientific name..."
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Difficulty</label>
              <select
                name="difficulty"
                defaultValue={difficulty ?? ""}
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
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
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
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
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
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
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
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
                className="ptl-btn-primary"
              >
                Apply
              </button>
              <Link
                href="/plants"
                className="ptl-btn-secondary"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section>
          <div className="text-sm text-neutral-700">
            Showing <span className="font-medium text-neutral-900">{plants.length}</span>{" "}
            result(s)
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70 shadow-sm backdrop-blur-sm"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            {plants.length === 0 ? (
              <div className="px-5 py-8 text-sm text-neutral-600">No results.</div>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {plants.map((p) => (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white/60" style={{ borderColor: "var(--ptl-border)" }}>
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt=""
                              aria-hidden="true"
                              width={96}
                              height={96}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="h-full w-full"
                              style={{
                                background:
                                  "radial-gradient(28px 28px at 20% 20%, rgba(122, 163, 66, 0.35), transparent 60%), radial-gradient(40px 40px at 70% 60%, rgba(27, 127, 90, 0.22), transparent 65%), linear-gradient(135deg, rgba(255,255,255,0.65), rgba(255,255,255,0.25))",
                              }}
                            />
                          )}
                        </div>

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
