import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { plants } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Admin Plant | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function safeJson(value: unknown, fallback: unknown): string {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

export default async function AdminPlantEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; uploaded?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;

  if (!isUuid(id)) notFound();

  const rows = await db
    .select({
      id: plants.id,
      commonName: plants.commonName,
      scientificName: plants.scientificName,
      slug: plants.slug,
      family: plants.family,
      description: plants.description,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      sources: plants.sources,

      difficulty: plants.difficulty,
      lightDemand: plants.lightDemand,
      co2Demand: plants.co2Demand,
      growthRate: plants.growthRate,
      placement: plants.placement,

      tempMinF: plants.tempMinF,
      tempMaxF: plants.tempMaxF,
      phMin: plants.phMin,
      phMax: plants.phMax,
      ghMin: plants.ghMin,
      ghMax: plants.ghMax,
      khMin: plants.khMin,
      khMax: plants.khMax,

      maxHeightIn: plants.maxHeightIn,
      propagation: plants.propagation,
      substrateType: plants.substrateType,
      shrimpSafe: plants.shrimpSafe,
      beginnerFriendly: plants.beginnerFriendly,

      nativeRegion: plants.nativeRegion,
      notes: plants.notes,
      verified: plants.verified,
      status: plants.status,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);

  const p = rows[0];
  if (!p) notFound();

  const error = (sp.error ?? "").trim();
  const saved = sp.saved === "1";
  const uploaded = sp.uploaded === "1";

  const publicHref = `/plants/${p.slug}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Plant
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {p.commonName}
            </h1>
            <div className="mt-2 text-sm text-neutral-700">
              {p.scientificName ? <span>{p.scientificName} · </span> : null}
              {p.status}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/plants" className="ptl-btn-secondary">
              Back to plants
            </Link>
            <Link href={publicHref} className="ptl-btn-secondary">
              View public
            </Link>
          </div>
        </div>

        {saved ? (
          <div
            className="mt-6 rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            style={{ borderColor: "rgba(16,185,129,.25)" }}
          >
            Saved.
          </div>
        ) : null}
        {uploaded ? (
          <div
            className="mt-6 rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            style={{ borderColor: "rgba(16,185,129,.25)" }}
          >
            Photo uploaded.
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Photo</div>
            <div
              className="mt-3 overflow-hidden rounded-2xl border bg-white/70"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square w-full bg-[radial-gradient(circle_at_30%_20%,rgba(21,128,61,.22),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(13,148,136,.18),transparent_55%),linear-gradient(135deg,rgba(255,255,255,.7),rgba(255,255,255,.35))]" />
              )}
            </div>

            <form
              className="mt-4 grid gap-3"
              method="post"
              encType="multipart/form-data"
              action={`/admin/plants/${p.id}/upload`}
            >
              <input type="file" name="file" accept="image/*" className="text-sm" required />
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <input type="checkbox" name="setPrimary" defaultChecked />
                Set as primary
              </label>
              <button type="submit" className="ptl-btn-primary w-full">
                Upload
              </button>
              <div className="text-xs text-neutral-600">
                Uploads go to Supabase Storage when configured.
              </div>
            </form>

            <div className="mt-5 text-xs text-neutral-600">
              Tip: keep photos square-ish for best results in the grid.
            </div>
          </aside>

          <section>
            <form className="grid grid-cols-1 gap-5" method="post" action={`/admin/plants/${p.id}/save`}>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Common name</div>
                  <input
                    name="commonName"
                    defaultValue={p.commonName}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Scientific name</div>
                  <input
                    name="scientificName"
                    defaultValue={p.scientificName ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Slug</div>
                  <input
                    name="slug"
                    defaultValue={p.slug}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Family</div>
                  <input
                    name="family"
                    defaultValue={p.family ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-semibold text-neutral-900">Description</div>
                <textarea
                  name="description"
                  defaultValue={p.description ?? ""}
                  rows={4}
                  className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                />
              </label>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Difficulty</div>
                  <select
                    name="difficulty"
                    defaultValue={p.difficulty}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Light demand</div>
                  <select
                    name="lightDemand"
                    defaultValue={p.lightDemand}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">CO2 demand</div>
                  <select
                    name="co2Demand"
                    defaultValue={p.co2Demand}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="required">required</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Growth rate</div>
                  <select
                    name="growthRate"
                    defaultValue={p.growthRate ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="">(unset)</option>
                    <option value="slow">slow</option>
                    <option value="medium">medium</option>
                    <option value="fast">fast</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Placement</div>
                  <select
                    name="placement"
                    defaultValue={p.placement}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="foreground">foreground</option>
                    <option value="midground">midground</option>
                    <option value="background">background</option>
                    <option value="epiphyte">epiphyte</option>
                    <option value="floating">floating</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Max height (in)</div>
                  <input
                    name="maxHeightIn"
                    type="number"
                    step="any"
                    defaultValue={p.maxHeightIn ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Temp min (F)</div>
                  <input
                    name="tempMinF"
                    type="number"
                    step="any"
                    defaultValue={p.tempMinF ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Temp max (F)</div>
                  <input
                    name="tempMaxF"
                    type="number"
                    step="any"
                    defaultValue={p.tempMaxF ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">pH min</div>
                  <input
                    name="phMin"
                    type="number"
                    step="any"
                    defaultValue={p.phMin ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">pH max</div>
                  <input
                    name="phMax"
                    type="number"
                    step="any"
                    defaultValue={p.phMax ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">GH min</div>
                  <input
                    name="ghMin"
                    type="number"
                    step="1"
                    defaultValue={p.ghMin ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">GH max</div>
                  <input
                    name="ghMax"
                    type="number"
                    step="1"
                    defaultValue={p.ghMax ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">KH min</div>
                  <input
                    name="khMin"
                    type="number"
                    step="1"
                    defaultValue={p.khMin ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">KH max</div>
                  <input
                    name="khMax"
                    type="number"
                    step="1"
                    defaultValue={p.khMax ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Propagation</div>
                  <input
                    name="propagation"
                    defaultValue={p.propagation ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Substrate type</div>
                  <input
                    name="substrateType"
                    defaultValue={p.substrateType ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Native region</div>
                  <input
                    name="nativeRegion"
                    defaultValue={p.nativeRegion ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                  <input type="checkbox" name="shrimpSafe" defaultChecked={p.shrimpSafe} />
                  Shrimp safe
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                  <input
                    type="checkbox"
                    name="beginnerFriendly"
                    defaultChecked={p.beginnerFriendly}
                  />
                  Beginner friendly
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                  <input type="checkbox" name="verified" defaultChecked={p.verified} />
                  Verified
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Status</div>
                  <select
                    name="status"
                    defaultValue={p.status}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-neutral-900">Primary image URL</div>
                  <input
                    name="imageUrl"
                    defaultValue={p.imageUrl ?? ""}
                    className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-semibold text-neutral-900">Notes</div>
                <textarea
                  name="notes"
                  defaultValue={p.notes ?? ""}
                  rows={4}
                  className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                />
              </label>

              <label className="block">
                <div className="text-sm font-semibold text-neutral-900">Image URLs (JSON)</div>
                <textarea
                  name="imageUrlsJson"
                  defaultValue={safeJson(p.imageUrls, [])}
                  rows={4}
                  className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                />
              </label>

              <label className="block">
                <div className="text-sm font-semibold text-neutral-900">Sources (JSON array)</div>
                <textarea
                  name="sourcesJson"
                  defaultValue={safeJson(p.sources, [])}
                  rows={4}
                  className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
                  style={{ borderColor: "var(--ptl-border)" }}
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-neutral-600">
                  Last updated{" "}
                  {new Date(p.updatedAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <button type="submit" className="ptl-btn-primary">
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

