import Link from "next/link";

import { asc } from "drizzle-orm";

import { db } from "@/server/db";
import { categories } from "@/server/db/schema";

export const metadata = {
  title: "Admin Categories | PlantedTankLab",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage(props: {
  searchParams: Promise<{ saved?: string; created?: string; error?: string }>;
}) {
  const sp = await props.searchParams;
  const saved = (sp.saved ?? "").trim();
  const created = (sp.created ?? "").trim();
  const error = (sp.error ?? "").trim();

  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      displayOrder: categories.displayOrder,
      builderRequired: categories.builderRequired,
      icon: categories.icon,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name))
    .limit(200);

  const maxOrder = rows.reduce((m, r) => Math.max(m, r.displayOrder ?? 0), 0);

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
              Categories
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-700">
              Categories drive the builder workflow and product browsing. Reordering updates the
              builder stepper immediately.
            </p>
          </div>
          <Link href="/admin" className="ptl-btn-secondary">
            Back to admin
          </Link>
        </div>

        {error ? (
          <div
            className="mt-6 rounded-2xl border bg-red-50 px-5 py-4 text-sm text-red-900"
            style={{ borderColor: "rgb(254 202 202)" }}
          >
            <div className="font-semibold">Save failed</div>
            <div className="mt-1 opacity-90">{error}</div>
          </div>
        ) : null}
        {saved || created ? (
          <div
            className="mt-6 rounded-2xl border bg-white/70 px-5 py-4 text-sm text-neutral-800"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            {created ? "Category created." : "Changes saved."}
          </div>
        ) : null}

        <div
          className="mt-8 overflow-hidden rounded-2xl border bg-white/70"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <div className="divide-y divide-neutral-200">
            {rows.map((c, idx) => (
              <form
                key={c.id}
                method="post"
                action={`/admin/categories/${c.id}/save`}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <input type="hidden" name="id" value={c.id} />

                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                  <label className="sm:col-span-2">
                    <div className="text-xs font-medium text-neutral-600">Order</div>
                    <input
                      name="displayOrder"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={c.displayOrder}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </label>

                  <label className="sm:col-span-3">
                    <div className="text-xs font-medium text-neutral-600">Slug</div>
                    <input
                      name="slug"
                      defaultValue={c.slug}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </label>

                  <label className="sm:col-span-4">
                    <div className="text-xs font-medium text-neutral-600">Name</div>
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </label>

                  <label className="sm:col-span-3">
                    <div className="text-xs font-medium text-neutral-600">Icon (optional)</div>
                    <input
                      name="icon"
                      defaultValue={c.icon ?? ""}
                      placeholder="leaf"
                      className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                      style={{ borderColor: "var(--ptl-border)" }}
                    />
                  </label>

                  <label className="sm:col-span-12 flex items-center gap-2 text-sm font-semibold text-neutral-800">
                    <input
                      type="checkbox"
                      name="builderRequired"
                      defaultChecked={c.builderRequired}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    <span>Required in builder</span>
                  </label>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    name="direction"
                    value="up"
                    formAction="/admin/categories/reorder"
                    className="ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={idx === 0}
                    title="Move up"
                  >
                    Up
                  </button>
                  <button
                    type="submit"
                    name="direction"
                    value="down"
                    formAction="/admin/categories/reorder"
                    className="ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={idx === rows.length - 1}
                    title="Move down"
                  >
                    Down
                  </button>
                  <button type="submit" className="ptl-btn-primary">
                    Save
                  </button>
                </div>
              </form>
            ))}

            {rows.length === 0 ? (
              <div className="px-5 py-6 text-sm text-neutral-600">No categories yet.</div>
            ) : null}
          </div>
        </div>

        <div
          className="mt-10 rounded-2xl border bg-white/70 p-5"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <div className="text-sm font-semibold text-neutral-900">New category</div>
          <form
            method="post"
            action="/admin/categories/new"
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
          >
            <label className="sm:col-span-3">
              <div className="text-xs font-medium text-neutral-600">Slug</div>
              <input
                name="slug"
                placeholder="new_category"
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="sm:col-span-5">
              <div className="text-xs font-medium text-neutral-600">Name</div>
              <input
                name="name"
                placeholder="New Category"
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="sm:col-span-2">
              <div className="text-xs font-medium text-neutral-600">Order</div>
              <input
                name="displayOrder"
                type="number"
                min={1}
                step={1}
                defaultValue={maxOrder + 1}
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="sm:col-span-2">
              <div className="text-xs font-medium text-neutral-600">Icon</div>
              <input
                name="icon"
                placeholder="leaf"
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="sm:col-span-12 flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <input
                type="checkbox"
                name="builderRequired"
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span>Required in builder</span>
            </label>

            <div className="sm:col-span-12">
              <button type="submit" className="ptl-btn-primary">
                Create category
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

