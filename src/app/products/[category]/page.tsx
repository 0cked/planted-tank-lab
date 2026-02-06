import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerCaller } from "@/server/trpc/server-caller";

type SearchParams = Record<string, string | string[] | undefined>;

function first(sp: SearchParams, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function toNumberOrNull(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: string | null): boolean {
  return v === "1" || v === "true" || v === "on";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numSpec(specs: unknown, key: string): number | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return toNumberOrNull(v);
  return null;
}

function boolSpec(specs: unknown, key: string): boolean | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v === "boolean") return v;
  return null;
}

function strSpec(specs: unknown, key: string): string | null {
  if (!isRecord(specs)) return null;
  const v = specs[key];
  if (typeof v === "string") return v;
  return null;
}

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function tankSummary(specs: unknown): string {
  const vol = numSpec(specs, "volume_gal");
  const l = numSpec(specs, "length_in");
  const w = numSpec(specs, "width_in");
  const h = numSpec(specs, "height_in");
  const rimless = boolSpec(specs, "rimless");
  const bits: string[] = [];
  if (vol != null) bits.push(`${vol} gal`);
  if (l != null && w != null && h != null) bits.push(`${l} x ${w} x ${h} in`);
  if (rimless === true) bits.push("rimless");
  return bits.join(" · ");
}

function lightSummary(specs: unknown): string {
  const par = numSpec(specs, "par_at_substrate");
  const minLen = numSpec(specs, "min_tank_length_in");
  const maxLen = numSpec(specs, "max_tank_length_in");
  const dimmable = boolSpec(specs, "dimmable");
  const app = boolSpec(specs, "app_controlled");
  const bits: string[] = [];
  if (par != null) bits.push(`PAR ~${par} (substrate)`);
  if (minLen != null && maxLen != null) bits.push(`${minLen}-${maxLen} in tank`);
  if (dimmable === true) bits.push("dimmable");
  if (app === true) bits.push("app");
  return bits.join(" · ");
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const caller = await getServerCaller();
  const category = await caller.products.categoryBySlug({ slug: params.category });
  if (!category || category.slug === "plants") {
    return {
      title: "Products | PlantedTankLab",
    };
  }

  return {
    title: `${category.name} | Products | PlantedTankLab`,
    description: `Browse ${category.name.toLowerCase()} with filters and key specs.`,
  };
}

export default async function ProductCategoryPage(props: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const categorySlug = params.category;
  const caller = await getServerCaller();

  const category = await caller.products.categoryBySlug({ slug: categorySlug });
  if (!category) notFound();
  if (category.slug === "plants") notFound();

  const q = (first(searchParams, "q") ?? "").trim() || undefined;
  const brandSlug = (first(searchParams, "brand") ?? "").trim() || undefined;

  const volumeMin = toNumberOrNull(first(searchParams, "volumeMin"));
  const volumeMax = toNumberOrNull(first(searchParams, "volumeMax"));
  const rimless = toBool(first(searchParams, "rimless"));
  const material = (first(searchParams, "material") ?? "").trim() || undefined;

  const parMin = toNumberOrNull(first(searchParams, "parMin"));
  const parMax = toNumberOrNull(first(searchParams, "parMax"));
  const tankLength = toNumberOrNull(first(searchParams, "tankLength"));
  const dimmable = toBool(first(searchParams, "dimmable"));
  const app = toBool(first(searchParams, "app"));

  const brands = await caller.products.brandsByCategorySlug({ categorySlug });
  const raw = await caller.products.search({
    categorySlug,
    q,
    brandSlug,
    limit: 200,
  });

  const filtered = raw.filter((p) => {
    const specs = p.specs;

    if (categorySlug === "tank") {
      const vol = numSpec(specs, "volume_gal");
      if (volumeMin != null && (vol == null || vol < volumeMin)) return false;
      if (volumeMax != null && (vol == null || vol > volumeMax)) return false;
      if (rimless) {
        const r = boolSpec(specs, "rimless");
        if (r !== true) return false;
      }
      if (material) {
        const m = strSpec(specs, "material");
        if (!m || m.toLowerCase() !== material.toLowerCase()) return false;
      }
    }

    if (categorySlug === "light") {
      const par = numSpec(specs, "par_at_substrate");
      if (parMin != null && (par == null || par < parMin)) return false;
      if (parMax != null && (par == null || par > parMax)) return false;

      if (tankLength != null) {
        const minLen = numSpec(specs, "min_tank_length_in");
        const maxLen = numSpec(specs, "max_tank_length_in");
        if (minLen == null || maxLen == null) return false;
        if (tankLength < minLen || tankLength > maxLen) return false;
      }

      if (dimmable) {
        const d = boolSpec(specs, "dimmable");
        if (d !== true) return false;
      }
      if (app) {
        const a = boolSpec(specs, "app_controlled");
        if (a !== true) return false;
      }
    }

    return true;
  });

  const productIds = filtered.map((p) => p.id);
  const prices = productIds.length
    ? await caller.offers.lowestByProductIds({ productIds })
    : [];
  const minById = new Map(prices.map((r) => [r.productId, r.minPriceCents] as const));

  const title = `${category.name} Products`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Products
          </div>
          <h1
            className="mt-2 text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {category.name}
          </h1>
          <p className="mt-3 text-sm text-neutral-700">
            Filters are query-param based (shareable URLs).
          </p>
        </div>
        <Link href="/products" className="text-sm text-neutral-700 hover:text-neutral-900">
          All categories
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <section className="ptl-surface p-5">
          <div className="text-sm font-medium">Filters</div>
          <form className="mt-4 space-y-4" method="GET">
            <div>
              <label className="text-xs font-medium text-neutral-700">Search</label>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Name contains..."
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Brand</label>
              <select
                name="brand"
                defaultValue={brandSlug ?? ""}
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <option value="">Any</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {categorySlug === "tank" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Min gal</label>
                    <input
                      name="volumeMin"
                      inputMode="numeric"
                      defaultValue={volumeMin ?? ""}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Max gal</label>
                    <input
                      name="volumeMax"
                      inputMode="numeric"
                      defaultValue={volumeMax ?? ""}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="rimless"
                    value="1"
                    defaultChecked={rimless}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Rimless only
                </label>

                <div>
                  <label className="text-xs font-medium text-neutral-700">Material</label>
                  <select
                    name="material"
                    defaultValue={material ?? ""}
                    className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <option value="">Any</option>
                    <option value="glass">Glass</option>
                    <option value="acrylic">Acrylic</option>
                  </select>
                </div>
              </>
            ) : null}

            {categorySlug === "light" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Min PAR</label>
                    <input
                      name="parMin"
                      inputMode="numeric"
                      defaultValue={parMin ?? ""}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Max PAR</label>
                    <input
                      name="parMax"
                      inputMode="numeric"
                      defaultValue={parMax ?? ""}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">Tank length (in)</label>
                  <input
                    name="tankLength"
                    inputMode="numeric"
                    defaultValue={tankLength ?? ""}
                    placeholder="e.g. 24"
                    className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    Filters lights that fit this tank length.
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="dimmable"
                    value="1"
                    defaultChecked={dimmable}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Dimmable only
                </label>

                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="app"
                    value="1"
                    defaultChecked={app}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  App-controlled only
                </label>
              </>
            ) : (
              <div className="text-sm text-neutral-600">
                Parametric filters for this category are coming soon.
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="ptl-btn-primary"
              >
                Apply
              </button>
              <Link
                href={`/products/${categorySlug}`}
                className="ptl-btn-secondary"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              Showing <span className="font-medium text-neutral-900">{filtered.length}</span>{" "}
              result(s)
            </div>
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70 shadow-sm backdrop-blur-sm"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-sm text-neutral-600">No results.</div>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {filtered.map((p) => {
                  const price = minById.get(p.id) ?? null;
                  const summary =
                    categorySlug === "tank"
                      ? tankSummary(p.specs)
                      : categorySlug === "light"
                        ? lightSummary(p.specs)
                        : "";
                  const brandName = p.brand?.name ?? null;
                  return (
                    <li key={p.id} className="px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${categorySlug}/${p.slug}`}
                            className="truncate text-sm font-semibold text-neutral-900 hover:underline"
                          >
                            {brandName ? `${brandName} ${p.name}` : p.name}
                          </Link>
                          {summary ? (
                            <div className="mt-1 text-xs text-neutral-600">{summary}</div>
                          ) : null}
                        </div>
                        <div className="text-right text-sm font-semibold text-neutral-900">
                          {formatMoney(price)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="mt-10 text-xs text-neutral-500">
        {title}. Prices are best-effort until retailer offers are seeded.
      </div>
    </main>
  );
}
