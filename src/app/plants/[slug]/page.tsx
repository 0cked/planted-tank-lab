import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerCaller } from "@/server/trpc/server-caller";

function numOrNull(v: string | number | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rangeLabel(min: number | null, max: number | null, unit?: string): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${min}-${max}${unit ? ` ${unit}` : ""}`;
  if (min != null) return `${min}+${unit ? ` ${unit}` : ""}`;
  return `<=${max}${unit ? ` ${unit}` : ""}`;
}

function pill(text: string) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800">
      {text}
    </span>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const caller = await getServerCaller();
  try {
    const p = await caller.plants.getBySlug({ slug: params.slug });
    return {
      title: `${p.commonName} | PlantedTankLab`,
      description:
        p.description ??
        `Care parameters for ${p.commonName}: difficulty, light, CO2, placement, and water ranges.`,
    };
  } catch {
    return { title: "Plant | PlantedTankLab" };
  }
}

export default async function PlantDetailPage(props: { params: Promise<{ slug: string }> }) {
  const caller = await getServerCaller();

  const params = await props.params;

  let p: Awaited<ReturnType<typeof caller.plants.getBySlug>>;
  try {
    p = await caller.plants.getBySlug({ slug: params.slug });
  } catch {
    notFound();
  }

  const tempMin = numOrNull(p.tempMinF);
  const tempMax = numOrNull(p.tempMaxF);
  const phMin = numOrNull(p.phMin);
  const phMax = numOrNull(p.phMax);

  const maxHeight = numOrNull(p.maxHeightIn);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-sm text-neutral-600">
            <Link href="/plants" className="hover:text-neutral-900 hover:underline">
              Plants
            </Link>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{p.commonName}</h1>
          {p.scientificName ? (
            <div className="mt-1 text-sm italic text-neutral-600">{p.scientificName}</div>
          ) : null}
          {p.description ? (
            <p className="mt-3 max-w-2xl text-sm text-neutral-600">{p.description}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {pill(`Difficulty: ${p.difficulty}`)}
            {pill(`Light: ${p.lightDemand}`)}
            {pill(`CO2: ${p.co2Demand}`)}
            {pill(`Placement: ${p.placement}`)}
            {p.beginnerFriendly ? pill("Beginner-friendly") : null}
            {p.shrimpSafe ? pill("Shrimp-safe") : null}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">Care Card</div>

          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <th className="w-[40%] bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Temperature
                  </th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(tempMin, tempMax, "F")}
                  </td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">pH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(phMin, phMax)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">GH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(p.ghMin ?? null, p.ghMax ?? null)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">KH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(p.khMin ?? null, p.khMax ?? null)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Max height
                  </th>
                  <td className="px-4 py-2 text-neutral-800">
                    {maxHeight == null ? "—" : `${maxHeight} in`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">Details</div>
          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <th className="w-[40%] bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Growth rate
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.growthRate ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Substrate type
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.substrateType ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Propagation
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.propagation ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-neutral-50 px-4 py-2 font-medium text-neutral-800">
                    Native region
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.nativeRegion ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {p.notes ? <p className="mt-4 text-sm text-neutral-600">{p.notes}</p> : null}
        </section>
      </div>
    </main>
  );
}
