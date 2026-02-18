import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SmartImage } from "@/components/SmartImage";
import { firstCatalogImageUrl, missingSourceImageCopy } from "@/lib/catalog-no-data";
import { getServerCaller } from "@/server/trpc/server-caller";

const BASE_URL = "https://plantedtanklab.com";

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

function titleWords(v: string | null | undefined): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "—";
  const cleaned = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "—";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function optionalText(v: string | null | undefined): string | null {
  const t = String(v ?? "").trim();
  if (!t) return null;
  if (t === "—") return null;
  return t;
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
  const missingPlantImage = missingSourceImageCopy("plant");
  const imageUrl = firstCatalogImageUrl({ imageUrl: p.imageUrl ?? null, imageUrls: p.imageUrls });
  const plantUrl = `${BASE_URL}/plants/${p.slug}`;
  const plantStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.commonName,
    ...(p.scientificName ? { alternateName: p.scientificName } : {}),
    description:
      p.description ??
      `Care parameters for ${p.commonName}: difficulty, light, CO2, placement, and water ranges.`,
    url: plantUrl,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    category: "Aquatic plant",
  };

  const plantInfoRows: Array<{ label: string; value: string }> = [
    { label: "Type", value: titleWords(typeLabel) },
    ...(optionalText(p.nativeRegion) ? [{ label: "Origin", value: optionalText(p.nativeRegion)! }] : []),
    ...(optionalText(p.growthRate) ? [{ label: "Growth rate", value: optionalText(p.growthRate)! }] : []),
    ...(maxHeight == null ? [] : [{ label: "Height range", value: rangeLabel(null, maxHeight, "in") }]),
    ...(optionalText(p.propagation) ? [{ label: "Propagation", value: optionalText(p.propagation)! }] : []),
    ...(optionalText(p.family) ? [{ label: "Family", value: optionalText(p.family)! }] : []),
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(plantStructuredData),
        }}
      />

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="ptl-kicker">
            <Link href="/plants" className="hover:text-neutral-900 hover:underline">
              Plants
            </Link>
          </div>
          <h1
            className="mt-2 ptl-page-title"
          >
            {p.commonName}
          </h1>
          {p.scientificName ? (
            <div className="mt-1 text-sm italic text-neutral-600">{p.scientificName}</div>
          ) : null}
          {p.description ? (
            <p className="mt-3 max-w-2xl ptl-lede text-neutral-700">{p.description}</p>
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
              {imageUrl ? (
                <SmartImage
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="ptl-image-ph flex h-full w-full items-center justify-center">
                  <div className="px-6 text-center">
                    <div className="text-sm font-semibold text-neutral-800">{missingPlantImage.title}</div>
                    <div className="mt-1 text-xs text-neutral-600">{missingPlantImage.body}</div>
                    <div className="mt-3">
                      <Link href="/plants" className="text-xs font-semibold text-[color:var(--ptl-accent)] hover:underline">
                        Browse other plants
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {imageUrl ? (
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
            {plantInfoRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-600">Detailed plant information is unavailable from current sources.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-200">
                  {plantInfoRows.map((row) => (
                    <tr key={row.label}>
                      <th className="w-[40%] bg-white/60 px-4 py-2 font-semibold text-neutral-800">
                        {row.label}
                      </th>
                      <td className="px-4 py-2 text-neutral-800">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
