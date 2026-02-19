"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useMemo, useState } from "react";

type PlantsFiltersDefaults = {
  curatedOnly: boolean;
  q: string;
  difficulty: string;
  lightDemand: string;
  co2Demand: string;
  placement: string;
  shrimpSafe: boolean;
};

function PlantsFiltersForm(props: { defaults: PlantsFiltersDefaults; onSubmit?: () => void }) {
  return (
    <form
      className="space-y-4"
      method="GET"
      action="/plants"
      onSubmit={() => props.onSubmit?.()}
    >
      <div>
        <label className="text-xs font-medium text-neutral-700">Browse mode</label>
        <select
          name="curated"
          defaultValue={props.defaults.curatedOnly ? "1" : "0"}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="1">Curated picks</option>
          <option value="0">All plants</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">Search</label>
        <input
          name="q"
          defaultValue={props.defaults.q}
          placeholder="Common or scientific name..."
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">Difficulty</label>
        <select
          name="difficulty"
          defaultValue={props.defaults.difficulty}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="">Any</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">Light demand</label>
        <select
          name="light"
          defaultValue={props.defaults.lightDemand}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="">Any</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">CO2 demand</label>
        <select
          name="co2"
          defaultValue={props.defaults.co2Demand}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="">Any</option>
          <option value="none">None</option>
          <option value="beneficial">Beneficial</option>
          <option value="required">Required</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-700">Placement</label>
        <select
          name="placement"
          defaultValue={props.defaults.placement}
          className="mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <option value="">Any</option>
          <option value="foreground">Foreground</option>
          <option value="midground">Midground</option>
          <option value="background">Background</option>
          <option value="carpet">Carpet</option>
          <option value="epiphyte">Epiphyte</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="shrimpSafe"
          value="1"
          defaultChecked={props.defaults.shrimpSafe}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Shrimp-safe
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" className="ptl-btn-primary">
          Apply
        </button>
        <Link href="/plants" className="ptl-btn-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}

export function PlantsFilters(props: { defaults: PlantsFiltersDefaults; resultsCount: number }) {
  const [open, setOpen] = useState(false);

  const activeTags = useMemo(() => {
    const tags: string[] = [];
    if (!props.defaults.curatedOnly) tags.push("All plants");
    if (props.defaults.q)
      tags.push(
        `"${props.defaults.q.slice(0, 18)}${props.defaults.q.length > 18 ? "..." : ""}"`,
      );
    if (props.defaults.difficulty) tags.push(props.defaults.difficulty);
    if (props.defaults.lightDemand) tags.push(`${props.defaults.lightDemand} light`);
    if (props.defaults.co2Demand) tags.push(`${props.defaults.co2Demand} CO2`);
    if (props.defaults.placement) tags.push(props.defaults.placement);
    if (props.defaults.shrimpSafe) tags.push("Shrimp-safe");
    return tags.slice(0, 4);
  }, [props.defaults]);

  return (
    <>
      <div className="ptl-surface-stone p-4 lg:hidden">
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
                <span className="text-xs text-neutral-600">Curated picks</span>
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
                <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--ptl-border)" }}>
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Plant filters</div>
                    <div className="mt-1 text-xs text-neutral-600">
                      Showing {props.resultsCount}
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button type="button" className="ptl-btn-secondary">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 overflow-y-auto px-5 py-5">
                  <PlantsFiltersForm defaults={props.defaults} onSubmit={() => setOpen(false)} />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <aside className="ptl-surface-stone sticky top-24 hidden self-start p-5 lg:block">
        <div className="text-sm font-medium">Filters</div>
        <div className="mt-4">
          <PlantsFiltersForm defaults={props.defaults} />
        </div>
      </aside>
    </>
  );
}
