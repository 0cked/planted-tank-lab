import type { Metadata } from "next";
import Link from "next/link";

import { PlantComparisonPicker } from "@/components/plants/PlantComparisonPicker";
import {
  comparisonToneClass,
  normalizePlantCompareSlugs,
  parseMaxHeightIn,
  rankDemand,
  rankDifficulty,
  rankGrowth,
  resolveRelativeComparisonTone,
  serializePlantCompareSlugs,
  titleWords,
} from "@/lib/plants/compare";
import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Plant Comparison Tool | PlantedTankLab",
  description:
    "Compare 2-4 aquarium plants side by side by light demand, CO2 demand, difficulty, growth rate, placement, and size.",
  openGraph: {
    url: "/plants/compare",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

type PlantCompareRecord = {
  slug: string;
  commonName: string;
  scientificName: string | null;
  difficulty: string | null;
  lightDemand: string | null;
  co2Demand: string | null;
  growthRate: string | null;
  placement: string | null;
  maxHeightIn: string | number | null;
  propagation: string | null;
};

type CompareRow = {
  id: string;
  label: string;
  value: (plant: PlantCompareRecord) => string;
  rank?: (plant: PlantCompareRecord) => number | null;
};

function first(sp: SearchParams, key: string): string | string[] | null {
  const value = sp[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value;
  return null;
}

function numberToLabel(value: number | null, unit: string): string {
  if (value == null) return "—";
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function tonePillLabel(tone: "easier" | "harder" | "neutral"): string {
  if (tone === "easier") return "Easier";
  if (tone === "harder") return "Harder";
  return "Neutral";
}

const comparisonRows: CompareRow[] = [
  {
    id: "difficulty",
    label: "Difficulty",
    value: (plant) => titleWords(plant.difficulty),
    rank: (plant) => rankDifficulty(plant.difficulty),
  },
  {
    id: "light-demand",
    label: "Light",
    value: (plant) => titleWords(plant.lightDemand),
    rank: (plant) => rankDemand(plant.lightDemand),
  },
  {
    id: "co2-demand",
    label: "CO₂",
    value: (plant) => titleWords(plant.co2Demand),
    rank: (plant) => rankDemand(plant.co2Demand),
  },
  {
    id: "growth-rate",
    label: "Growth rate",
    value: (plant) => titleWords(plant.growthRate),
    rank: (plant) => rankGrowth(plant.growthRate),
  },
  {
    id: "placement",
    label: "Placement",
    value: (plant) => titleWords(plant.placement),
  },
  {
    id: "size",
    label: "Max size",
    value: (plant) => numberToLabel(parseMaxHeightIn(plant.maxHeightIn), "in"),
    rank: (plant) => parseMaxHeightIn(plant.maxHeightIn),
  },
  {
    id: "propagation",
    label: "Propagation",
    value: (plant) => titleWords(plant.propagation),
  },
];

export default async function PlantComparisonPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const selectedSlugs = normalizePlantCompareSlugs(first(searchParams, "plants"));

  const caller = await getServerCaller();
  const plants = await caller.plants.list({ limit: 500 });

  const options = plants
    .map((plant) => ({
      slug: plant.slug,
      commonName: plant.commonName,
      scientificName: plant.scientificName,
    }))
    .sort((a, b) => a.commonName.localeCompare(b.commonName));

  const plantsBySlug = new Map(plants.map((plant) => [plant.slug, plant] as const));
  const selectedPlants = selectedSlugs
    .map((slug) => plantsBySlug.get(slug))
    .filter((plant): plant is (typeof plants)[number] => Boolean(plant));

  const serializedSelection = serializePlantCompareSlugs(
    selectedPlants.map((plant) => plant.slug),
  );
  const compareLink = serializedSelection
    ? `/plants/compare?plants=${encodeURIComponent(serializedSelection)}`
    : "/plants/compare";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">
            <Link href="/plants" className="hover:text-neutral-900 hover:underline">
              Plants
            </Link>
          </div>
          <h1 className="mt-2 ptl-page-title">Plant comparison tool</h1>
          <p className="mt-3 max-w-[72ch] ptl-lede text-neutral-700">
            Compare care requirements side by side. Green highlights indicate easier requirements and red highlights show
            more demanding care.
          </p>
        </div>
        <div className="ptl-surface-sand px-4 py-3 text-xs text-neutral-700">
          Shareable URL:{" "}
          <Link href={compareLink} className="font-semibold text-neutral-900 hover:underline">
            {compareLink}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <PlantComparisonPicker options={options} selectedSlugs={selectedPlants.map((plant) => plant.slug)} />

        <section className="ptl-surface p-5">
          {selectedPlants.length < 2 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-7 text-sm text-neutral-700">
              Select at least two plants to see a side-by-side comparison table.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-[180px] border-b border-neutral-200 bg-white/70 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      Parameter
                    </th>
                    {selectedPlants.map((plant) => (
                      <th
                        key={plant.slug}
                        className="border-b border-neutral-200 bg-white/70 px-3 py-2 text-left"
                      >
                        <div className="text-sm font-semibold text-neutral-900">{plant.commonName}</div>
                        {plant.scientificName ? (
                          <div className="text-xs italic text-neutral-600">{plant.scientificName}</div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => {
                    const ranks = row.rank ? selectedPlants.map((plant) => row.rank?.(plant) ?? null) : [];

                    return (
                      <tr key={row.id}>
                        <th className="border-b border-neutral-200 bg-white/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                          {row.label}
                        </th>
                        {selectedPlants.map((plant) => {
                          const rank = row.rank ? row.rank(plant) : null;
                          const tone = row.rank
                            ? resolveRelativeComparisonTone({
                                rank,
                                allRanks: ranks,
                                lowerIsEasier: true,
                              })
                            : "neutral";

                          return (
                            <td key={`${row.id}-${plant.slug}`} className="border-b border-neutral-200 px-3 py-2 align-top">
                              <div className={`rounded-lg border px-2.5 py-2 ${comparisonToneClass(tone)}`}>
                                <div className="font-semibold">{row.value(plant)}</div>
                                {row.rank ? (
                                  <div className="mt-1 text-[11px] font-medium text-current/80">
                                    {tonePillLabel(tone)}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
