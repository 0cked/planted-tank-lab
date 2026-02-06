import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { brands, categories, products, specDefinitions } from "@/server/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const metadata = {
  title: "Admin Product | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export default async function AdminProductEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;

  if (!isUuid(id)) notFound();

  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      name: products.name,
      slug: products.slug,
      description: products.description,
      status: products.status,
      verified: products.verified,
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
      specs: products.specs,
      meta: products.meta,
      updatedAt: products.updatedAt,
      category: { slug: categories.slug, name: categories.name },
      brand: { slug: brands.slug, name: brands.name },
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.id, id)))
    .limit(1);

  const p = rows[0];
  if (!p) notFound();

  const defs = await db
    .select({
      id: specDefinitions.id,
      key: specDefinitions.key,
      label: specDefinitions.label,
      dataType: specDefinitions.dataType,
      unit: specDefinitions.unit,
      enumValues: specDefinitions.enumValues,
      displayOrder: specDefinitions.displayOrder,
    })
    .from(specDefinitions)
    .where(eq(specDefinitions.categoryId, p.categoryId))
    .orderBy(asc(specDefinitions.displayOrder));

  const error = (sp.error ?? "").trim();
  const saved = sp.saved === "1";

  const publicHref = `/products/${p.category.slug}/${p.slug}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Product
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {p.name}
            </h1>
            <div className="mt-2 text-sm text-neutral-700">
              {p.brand?.name ? `${p.brand.name} · ` : null}
              {p.category.name} · {p.status}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/products" className="ptl-btn-secondary">
              Back to products
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
        {error ? (
          <div className="mt-6 rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <form
          className="mt-8 grid grid-cols-1 gap-5"
          method="post"
          action={`/admin/products/${p.id}/save`}
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Name</div>
              <input
                name="name"
                defaultValue={p.name}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Slug</div>
              <input
                name="slug"
                defaultValue={p.slug}
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
              <div className="text-sm font-semibold text-neutral-900">Image URL</div>
              <input
                name="imageUrl"
                defaultValue={p.imageUrl ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="mt-7 flex items-center gap-3 text-sm font-semibold text-neutral-900">
              <input type="checkbox" name="verified" defaultChecked={p.verified} />
              Verified
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Image URLs (JSON)</div>
            <textarea
              name="imageUrlsJson"
              defaultValue={JSON.stringify(p.imageUrls ?? [], null, 2)}
              rows={4}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Specs (JSON)</div>
            <textarea
              name="specsJson"
              defaultValue={JSON.stringify(p.specs ?? {}, null, 2)}
              rows={10}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          {defs.length > 0 ? (
            <div
              className="rounded-2xl border bg-white/70 p-5"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="text-sm font-semibold text-neutral-900">Spec fields</div>
              <div className="mt-1 text-sm text-neutral-700">
                These are driven by <code className="font-mono text-xs">spec_definitions</code>.
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {defs.map((d) => {
                  const current = (p.specs as Record<string, unknown>)[d.key];
                  const label = d.unit ? `${d.label} (${d.unit})` : d.label;
                  const fieldName = `spec__${d.key}`;

                  if (d.dataType === "boolean") {
                    return (
                      <label key={d.id} className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                        <input type="checkbox" name={fieldName} defaultChecked={current === true} />
                        {label}
                      </label>
                    );
                  }

                  if (d.dataType === "enum" && Array.isArray(d.enumValues)) {
                    const opts = d.enumValues.filter((x): x is string => typeof x === "string" && x.length > 0);
                    return (
                      <label key={d.id} className="block">
                        <div className="text-sm font-semibold text-neutral-900">{label}</div>
                        <select
                          name={fieldName}
                          defaultValue={typeof current === "string" ? current : ""}
                          className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                          style={{ borderColor: "var(--ptl-border)" }}
                        >
                          <option value="">(unset)</option>
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  const value = current == null ? "" : String(current);
                  const inputType = d.dataType === "number" ? "number" : "text";
                  const step = d.dataType === "number" ? "any" : undefined;
                  return (
                    <label key={d.id} className="block">
                      <div className="text-sm font-semibold text-neutral-900">{label}</div>
                      <input
                        name={fieldName}
                        defaultValue={value}
                        type={inputType}
                        step={step}
                        className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                        style={{ borderColor: "var(--ptl-border)" }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Meta (JSON)</div>
            <textarea
              name="metaJson"
              defaultValue={JSON.stringify(p.meta ?? {}, null, 2)}
              rows={6}
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
      </div>
    </main>
  );
}
