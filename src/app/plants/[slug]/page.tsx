import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerCaller } from "@/server/trpc/server-caller";

function sourcesList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.startsWith("http"));
}

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

function title(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (!t) return "—";
  return t.slice(0, 1).toUpperCase() + t.slice(1);
}

function pill(text: string) {
  return (
    <span className="ptl-pill">
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
  const sources = sourcesList((p as { sources?: unknown }).sources);
  const updated = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : null;
  const typeLabel = p.substrateType ?? p.placement;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <Link href="/plants" className="hover:text-neutral-900 hover:underline">
              Plants
            </Link>
          </div>
          <h1
            className="mt-2 text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {p.commonName}
          </h1>
          {p.scientificName ? (
            <div className="mt-1 text-sm italic text-neutral-600">{p.scientificName}</div>
          ) : null}
          {p.description ? (
            <p className="mt-3 max-w-2xl text-sm text-neutral-700">{p.description}</p>
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
        <section className="ptl-surface overflow-hidden p-0">
          <div className="border-b px-6 py-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-medium">Photo</div>
          </div>
          <div className="p-6">
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-white/60"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "radial-gradient(220px 180px at 20% 20%, rgba(122, 163, 66, 0.28), transparent 60%), radial-gradient(280px 220px at 70% 70%, rgba(27, 127, 90, 0.18), transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.25))",
                  }}
                />
              )}
            </div>
            {p.imageUrl ? (
              <div className="mt-2 text-xs text-neutral-600">
                Images are provided as-is from external sources.
              </div>
            ) : null}
          </div>
        </section>

        <section className="ptl-surface p-6">
          <div className="text-sm font-medium">Care Card</div>

          <div
            className="mt-4 overflow-hidden rounded-xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <th className="w-[40%] bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Temperature
                  </th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(tempMin, tempMax, "F")}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">pH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(phMin, phMax)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">GH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(p.ghMin ?? null, p.ghMax ?? null)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">KH</th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(p.khMin ?? null, p.khMax ?? null)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
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

        <section className="ptl-surface p-6 lg:col-span-2">
          <div className="text-sm font-medium">Plant info</div>
          <div
            className="mt-4 overflow-hidden rounded-xl border bg-white/70"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <th className="w-[40%] bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Type
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{title(typeLabel)}</td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Origin
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.nativeRegion ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Growth rate
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.growthRate ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Height range
                  </th>
                  <td className="px-4 py-2 text-neutral-800">
                    {rangeLabel(null, maxHeight, "in")}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Propagation
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.propagation ?? "—"}</td>
                </tr>
                <tr>
                  <th className="bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                    Family
                  </th>
                  <td className="px-4 py-2 text-neutral-800">{p.family ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {p.notes ? <p className="mt-4 text-sm text-neutral-600">{p.notes}</p> : null}

          {sources.length > 0 ? (
            <div className="mt-6">
              <div className="text-sm font-medium">Sources</div>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                {sources.map((u) => (
                  <li key={u} className="truncate">
                    <a
                      href={u}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="hover:underline"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-neutral-500">
                Citations are shown for transparency; care parameters can vary by conditions.
              </div>
            </div>
          ) : null}

          {updated ? (
            <div className="mt-6 text-xs text-neutral-500">
              Last updated: <span className="font-semibold text-neutral-700">{updated}</span>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
