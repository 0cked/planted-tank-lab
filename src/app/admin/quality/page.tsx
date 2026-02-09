import Link from "next/link";

import { asc, eq, inArray, sql } from "drizzle-orm";

import { missingRequiredSpecs, requiredSpecsForCategory } from "@/engine/required-specs";
import type { CompatibilityRule, Severity } from "@/engine/types";
import { db } from "@/server/db";
import { brands, categories, compatibilityRules, offers, plants, products } from "@/server/db/schema";

export const metadata = {
  title: "Admin Quality | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function curatedRank(meta: unknown): number | null {
  if (!isRecord(meta)) return null;
  const v = meta["curated_rank"];
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

function toSeverity(value: string): Severity {
  switch (value) {
    case "error":
    case "warning":
    case "recommendation":
    case "completeness":
      return value;
    default:
      return "completeness";
  }
}

function firstImageUrl(params: { imageUrl: string | null; imageUrls: unknown }): string | null {
  if (params.imageUrl) return params.imageUrl;
  if (Array.isArray(params.imageUrls) && typeof params.imageUrls[0] === "string") {
    return params.imageUrls[0];
  }
  return null;
}

export default async function AdminQualityPage() {
  const activeRules = await db
    .select({
      code: compatibilityRules.code,
      severity: compatibilityRules.severity,
      categoriesInvolved: compatibilityRules.categoriesInvolved,
      conditionLogic: compatibilityRules.conditionLogic,
      fixSuggestion: compatibilityRules.fixSuggestion,
      active: compatibilityRules.active,
      version: compatibilityRules.version,
      name: compatibilityRules.name,
      description: compatibilityRules.description,
      messageTemplate: compatibilityRules.messageTemplate,
    })
    .from(compatibilityRules)
    .where(eq(compatibilityRules.active, true))
    .limit(1000);

  const rules: CompatibilityRule[] = activeRules.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description,
    severity: toSeverity(r.severity),
    categoriesInvolved: r.categoriesInvolved,
    conditionLogic: isRecord(r.conditionLogic) ? r.conditionLogic : {},
    messageTemplate: r.messageTemplate,
    fixSuggestion: r.fixSuggestion,
    active: r.active,
    version: r.version,
  }));

  const categoryRows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      displayOrder: categories.displayOrder,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name))
    .limit(500);

  const requiredKeysByCategory = new Map<string, string[]>();
  for (const c of categoryRows) {
    requiredKeysByCategory.set(c.slug, requiredSpecsForCategory(rules, c.slug));
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
      specs: products.specs,
      meta: products.meta,
      verified: products.verified,
      status: products.status,
      updatedAt: products.updatedAt,
      category: { slug: categories.slug, name: categories.name },
      brand: { name: brands.name, slug: brands.slug },
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .orderBy(asc(categories.displayOrder), asc(products.name))
    .limit(20_000);

  const curatedProducts = productRows
    .map((p) => ({ ...p, curatedRank: curatedRank(p.meta) }))
    .filter((p) => p.curatedRank != null)
    .sort((a, b) => (a.curatedRank ?? 9_999) - (b.curatedRank ?? 9_999));

  const curatedIds = curatedProducts.map((p) => p.id);

  const offerCountsRows =
    curatedIds.length > 0
      ? await db
          .select({
            productId: offers.productId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(offers)
          .where(inArray(offers.productId, curatedIds))
          .groupBy(offers.productId)
          .limit(50_000)
      : [];
  const offerCountByProductId = new Map<string, number>(
    offerCountsRows.map((r) => [r.productId, r.count]),
  );

  const missingImages = curatedProducts.filter(
    (p) => firstImageUrl({ imageUrl: p.imageUrl ?? null, imageUrls: p.imageUrls }) == null,
  );
  const missingOffers = curatedProducts.filter((p) => (offerCountByProductId.get(p.id) ?? 0) === 0);
  const missingSpecs = curatedProducts
    .map((p) => {
      const requiredKeys = requiredKeysByCategory.get(p.category.slug) ?? [];
      if (requiredKeys.length === 0) return null;
      const specs = isRecord(p.specs) ? p.specs : {};
      const missing = missingRequiredSpecs(specs, requiredKeys);
      if (missing.length === 0) return null;
      return { product: p, missing };
    })
    .filter((x): x is { product: (typeof curatedProducts)[number]; missing: string[] } => Boolean(x));

  const plantRows = await db
    .select({
      id: plants.id,
      commonName: plants.commonName,
      scientificName: plants.scientificName,
      slug: plants.slug,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      sources: plants.sources,
      description: plants.description,
      verified: plants.verified,
      status: plants.status,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .orderBy(asc(plants.commonName))
    .limit(5000);

  const plantsMissingImages = plantRows.filter(
    (p) => firstImageUrl({ imageUrl: p.imageUrl ?? null, imageUrls: p.imageUrls }) == null,
  );
  const plantsMissingSources = plantRows.filter(
    (p) => !Array.isArray(p.sources) || p.sources.filter((x) => typeof x === "string" && x.length > 0).length === 0,
  );

  const stat = (label: string, value: number) => (
    <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{value}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Data Quality
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Quick list of missing photos, offers, and spec data that can undermine trust. Focus on
              curated picks first.
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stat("Curated products", curatedProducts.length)}
          {stat("Missing product images", missingImages.length)}
          {stat("Missing product offers", missingOffers.length)}
          {stat("Missing required specs", missingSpecs.length)}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Curated products missing images</div>
            <div className="mt-1 text-xs text-neutral-600">Add a primary image or at least one image URL.</div>
            <ul className="mt-4 space-y-2 text-sm">
              {missingImages.slice(0, 30).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-emerald-800 hover:underline">
                      {p.brand?.name ? `${p.brand.name} ${p.name}` : p.name}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">
                      {p.category.name} · {p.slug}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-neutral-600">rank {p.curatedRank}</div>
                </li>
              ))}
              {missingImages.length === 0 ? <li className="text-neutral-600">None.</li> : null}
              {missingImages.length > 30 ? (
                <li className="text-xs text-neutral-600">Showing first 30.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Curated products missing offers</div>
            <div className="mt-1 text-xs text-neutral-600">Seed at least one in-stock offer per curated pick.</div>
            <ul className="mt-4 space-y-2 text-sm">
              {missingOffers.slice(0, 30).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-emerald-800 hover:underline">
                      {p.brand?.name ? `${p.brand.name} ${p.name}` : p.name}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">
                      {p.category.name} · {p.slug}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-neutral-600">rank {p.curatedRank}</div>
                </li>
              ))}
              {missingOffers.length === 0 ? <li className="text-neutral-600">None.</li> : null}
              {missingOffers.length > 30 ? (
                <li className="text-xs text-neutral-600">Showing first 30.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border bg-white/70 p-5 lg:col-span-2" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Curated products missing required specs</div>
            <div className="mt-1 text-xs text-neutral-600">
              Required keys are derived from active compatibility rules.
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {missingSpecs.slice(0, 40).map((x) => {
                const shown = x.missing.slice(0, 4).join(", ");
                const more = x.missing.length > 4 ? ` +${x.missing.length - 4} more` : "";
                const p = x.product;
                return (
                  <li key={p.id} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold text-emerald-800 hover:underline">
                        {p.brand?.name ? `${p.brand.name} ${p.name}` : p.name}
                      </Link>
                      <div className="mt-0.5 truncate text-xs text-neutral-600">
                        {p.category.name} · missing: {shown}{more}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-neutral-600">rank {p.curatedRank}</div>
                  </li>
                );
              })}
              {missingSpecs.length === 0 ? <li className="text-neutral-600">None.</li> : null}
              {missingSpecs.length > 40 ? (
                <li className="text-xs text-neutral-600">Showing first 40.</li>
              ) : null}
            </ul>
          </section>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Plants missing images</div>
            <ul className="mt-4 space-y-2 text-sm">
              {plantsMissingImages.slice(0, 20).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/plants/${p.id}`} className="font-semibold text-emerald-800 hover:underline">
                      {p.commonName}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">{p.slug}</div>
                  </div>
                </li>
              ))}
              {plantsMissingImages.length === 0 ? <li className="text-neutral-600">None.</li> : null}
            </ul>
          </section>

          <section className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-sm font-semibold text-neutral-900">Plants missing sources</div>
            <ul className="mt-4 space-y-2 text-sm">
              {plantsMissingSources.slice(0, 20).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/plants/${p.id}`} className="font-semibold text-emerald-800 hover:underline">
                      {p.commonName}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">{p.slug}</div>
                  </div>
                </li>
              ))}
              {plantsMissingSources.length === 0 ? <li className="text-neutral-600">None.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

