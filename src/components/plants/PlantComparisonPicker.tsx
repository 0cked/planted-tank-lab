"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { serializePlantCompareSlugs } from "@/lib/plants/compare";

type PlantComparisonPickerOption = {
  slug: string;
  commonName: string;
  scientificName: string | null;
};

type PlantComparisonPickerProps = {
  options: PlantComparisonPickerOption[];
  selectedSlugs: string[];
};

const MAX_COMPARE_PLANTS = 4;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function PlantComparisonPicker(props: PlantComparisonPickerProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const optionsBySlug = useMemo(
    () => new Map(props.options.map((option) => [option.slug, option] as const)),
    [props.options],
  );

  const selectedOptions = useMemo(
    () =>
      props.selectedSlugs
        .map((slug) => optionsBySlug.get(slug))
        .filter((option): option is PlantComparisonPickerOption => Boolean(option)),
    [optionsBySlug, props.selectedSlugs],
  );

  const selectedSet = useMemo(() => new Set(props.selectedSlugs), [props.selectedSlugs]);

  const normalizedQuery = normalizeSearch(query);

  const suggestions = useMemo(() => {
    const candidates = props.options.filter((option) => !selectedSet.has(option.slug));

    if (!normalizedQuery) {
      return candidates.slice(0, 8);
    }

    return candidates
      .filter((option) => {
        const haystack = `${option.commonName} ${option.scientificName ?? ""} ${option.slug}`
          .toLowerCase()
          .trim();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, props.options, selectedSet]);

  const canAddMore = props.selectedSlugs.length < MAX_COMPARE_PLANTS;

  const updateComparisonSlugs = (nextSlugs: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializePlantCompareSlugs(nextSlugs);

    if (serialized) {
      params.set("plants", serialized);
    } else {
      params.delete("plants");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const addPlant = (slug: string) => {
    if (!canAddMore) return;
    if (selectedSet.has(slug)) return;

    updateComparisonSlugs([...props.selectedSlugs, slug]);
    setQuery("");
  };

  const removePlant = (slug: string) => {
    updateComparisonSlugs(props.selectedSlugs.filter((candidate) => candidate !== slug));
  };

  return (
    <section className="ptl-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Compare plants</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Select 2-4 plants to compare requirements side by side.
          </p>
        </div>
        <div className="text-xs font-semibold text-neutral-700">
          {props.selectedSlugs.length}/{MAX_COMPARE_PLANTS} selected
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedOptions.length === 0 ? (
          <span className="rounded-full border border-neutral-200 bg-white/70 px-2.5 py-1 text-xs text-neutral-600">
            No plants selected yet
          </span>
        ) : (
          selectedOptions.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => removePlant(option.slug)}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
              title={`Remove ${option.commonName}`}
            >
              <span>{option.commonName}</span>
              <span aria-hidden className="text-neutral-500">
                ×
              </span>
            </button>
          ))
        )}
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const firstSuggestion = suggestions[0];
          if (!firstSuggestion) return;
          addPlant(firstSuggestion.slug);
        }}
      >
        <label htmlFor="plant-compare-search" className="sr-only">
          Search plants to compare
        </label>
        <input
          id="plant-compare-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={!canAddMore}
          placeholder={
            canAddMore
              ? "Search by common or scientific name..."
              : "Maximum 4 plants selected"
          }
          className="w-full rounded-xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[color:var(--ptl-accent)] disabled:cursor-not-allowed disabled:bg-neutral-100"
        />
      </form>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {suggestions.map((option) => (
          <li key={option.slug}>
            <button
              type="button"
              disabled={!canAddMore}
              onClick={() => addPlant(option.slug)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white/80 px-3 py-2 text-left transition hover:border-neutral-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{option.commonName}</span>
                {option.scientificName ? (
                  <span className="block text-xs italic text-neutral-600">{option.scientificName}</span>
                ) : null}
              </span>
              <span className="text-xs font-semibold text-emerald-800">Add</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
