"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useMemo, useState } from "react";

type BrandOption = { id: string; slug: string; name: string };

type FilterDefaults = {
  q: string;
  brandSlug: string;

  volumeMin: string;
  volumeMax: string;
  rimless: boolean;
  material: string;

  parMin: string;
  parMax: string;
  tankLength: string;
  dimmable: boolean;
  app: boolean;
};

function ProductCategoryFiltersForm(props: {
  categorySlug: string;
  brands: BrandOption[];
  defaults: FilterDefaults;
  onSubmit?: () => void;
}) {
  const formAction = `/products/${props.categorySlug}`;

  return (
    <form
      className="space-y-4"
      method="GET"
      action={formAction}
      onSubmit={() => props.onSubmit?.()}
    >
      <div>
        <label className="text-xs font-medium text-neutral-700">Search</label>
        <input
          name="q"
          defaultValue={props.defaults.q}
          placeholder="Name contains..."
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">Brand</label>
        <select
          name="brand"
          defaultValue={props.defaults.brandSlug}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="">Any</option>
          {props.brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {props.categorySlug === "tank" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700">Min gal</label>
              <input
                name="volumeMin"
                inputMode="numeric"
                defaultValue={props.defaults.volumeMin}
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Max gal</label>
              <input
                name="volumeMax"
                inputMode="numeric"
                defaultValue={props.defaults.volumeMax}
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
              defaultChecked={props.defaults.rimless}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Rimless only
          </label>

          <div>
            <label className="text-xs font-medium text-neutral-700">Material</label>
            <select
              name="material"
              defaultValue={props.defaults.material}
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

      {props.categorySlug === "light" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700">Min PAR</label>
              <input
                name="parMin"
                inputMode="numeric"
                defaultValue={props.defaults.parMin}
                className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Max PAR</label>
              <input
                name="parMax"
                inputMode="numeric"
                defaultValue={props.defaults.parMax}
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
              defaultValue={props.defaults.tankLength}
              placeholder="e.g. 24"
              className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
            <div className="mt-1 text-xs text-neutral-500">Filters lights that fit this tank length.</div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="dimmable"
              value="1"
              defaultChecked={props.defaults.dimmable}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Dimmable only
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="app"
              value="1"
              defaultChecked={props.defaults.app}
              className="h-4 w-4 rounded border-neutral-300"
            />
            App-controlled only
          </label>
        </>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className="ptl-btn-primary">
          Apply
        </button>
        <Link href={formAction} className="ptl-btn-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}

export function ProductCategoryFilters(props: {
  categorySlug: string;
  brands: BrandOption[];
  defaults: FilterDefaults;
  resultsCount: number;
}) {
  const [open, setOpen] = useState(false);

  const activeTags = useMemo(() => {
    const tags: string[] = [];
    if (props.defaults.q) tags.push(`"${props.defaults.q.slice(0, 18)}${props.defaults.q.length > 18 ? "..." : ""}"`);
    if (props.defaults.brandSlug) tags.push(props.defaults.brandSlug);

    if (props.categorySlug === "tank") {
      if (props.defaults.volumeMin) tags.push(`${props.defaults.volumeMin}+ gal`);
      if (props.defaults.volumeMax) tags.push(`<=${props.defaults.volumeMax} gal`);
      if (props.defaults.rimless) tags.push("rimless");
      if (props.defaults.material) tags.push(props.defaults.material);
    }

    if (props.categorySlug === "light") {
      if (props.defaults.parMin) tags.push(`${props.defaults.parMin}+ PAR`);
      if (props.defaults.tankLength) tags.push(`${props.defaults.tankLength} in tank`);
      if (props.defaults.dimmable) tags.push("dimmable");
      if (props.defaults.app) tags.push("app");
    }

    return tags.slice(0, 4);
  }, [props.categorySlug, props.defaults]);

  return (
    <>
      <div className="ptl-surface p-4 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900">Filters</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {activeTags.length > 0 ? (
                activeTags.map((t) => (
                  <span
                    key={t}
                    className="truncate rounded-full border bg-white/70 px-2 py-1 text-[11px] font-semibold text-neutral-800"
                    style={{ borderColor: "var(--ptl-border)", maxWidth: 160 }}
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-600">Use filters to narrow results.</span>
              )}
            </div>
          </div>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="ptl-btn-secondary shrink-0">
                Open
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-t-3xl border bg-white/92 shadow-2xl backdrop-blur-md">
                <div
                  className="flex items-center justify-between gap-3 border-b px-5 py-4"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Filters</div>
                    <div className="mt-1 text-xs text-neutral-600">Showing {props.resultsCount}</div>
                  </div>
                  <Dialog.Close asChild>
                    <button type="button" className="ptl-btn-secondary">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 overflow-y-auto px-5 py-5">
                  <ProductCategoryFiltersForm
                    categorySlug={props.categorySlug}
                    brands={props.brands}
                    defaults={props.defaults}
                    onSubmit={() => setOpen(false)}
                  />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <aside className="ptl-surface hidden self-start p-5 lg:block">
        <div className="text-sm font-medium">Filters</div>
        <div className="mt-4">
          <ProductCategoryFiltersForm
            categorySlug={props.categorySlug}
            brands={props.brands}
            defaults={props.defaults}
          />
        </div>
      </aside>
    </>
  );
}
