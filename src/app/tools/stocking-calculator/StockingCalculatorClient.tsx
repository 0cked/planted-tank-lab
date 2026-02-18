"use client";

import { useMemo, useState } from "react";

import {
  STOCKING_SPECIES,
  calculateStockingLevel,
  getBioloadLabel,
  getSpeciesTypeLabel,
  getStockingSpeciesById,
  getStockingStatusLabel,
  type StockingSelectionInput,
  type StockingStatus,
  type StockingWarningSeverity,
} from "@/lib/stocking-calculator";

type SelectionRow = {
  speciesId: string;
  quantity: string;
};

const STATUS_STYLES: Record<
  StockingStatus,
  {
    badgeClassName: string;
    barClassName: string;
    textClassName: string;
    summary: string;
  }
> = {
  green: {
    badgeClassName: "bg-emerald-100 text-emerald-700",
    barClassName: "bg-emerald-500",
    textClassName: "text-emerald-700",
    summary: "Plenty of room left for growth and bio-load swings.",
  },
  yellow: {
    badgeClassName: "bg-amber-100 text-amber-700",
    barClassName: "bg-amber-500",
    textClassName: "text-amber-700",
    summary: "Near baseline capacity. Stock slowly and monitor water quality.",
  },
  red: {
    badgeClassName: "bg-rose-100 text-rose-700",
    barClassName: "bg-rose-500",
    textClassName: "text-rose-700",
    summary: "Likely overstocked for the classic baseline. Rebalance your list.",
  },
};

const WARNING_STYLES: Record<StockingWarningSeverity, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
};

const SORTED_SPECIES = [...STOCKING_SPECIES].sort((a, b) =>
  a.commonName.localeCompare(b.commonName),
);

const DEFAULT_SELECTIONS: SelectionRow[] = [{ speciesId: "neon-tetra", quantity: "10" }];

function parsePositive(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function parseQuantity(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function StockingCalculatorClient() {
  const [tankVolume, setTankVolume] = useState("20");
  const [speciesToAdd, setSpeciesToAdd] = useState<string>(SORTED_SPECIES[0]?.id ?? "");
  const [selections, setSelections] = useState<SelectionRow[]>(DEFAULT_SELECTIONS);

  const parsedTankVolume = parsePositive(tankVolume);

  const normalizedSelections = useMemo<StockingSelectionInput[]>(
    () =>
      selections.map((selection) => ({
        speciesId: selection.speciesId,
        quantity: parseQuantity(selection.quantity),
      })),
    [selections],
  );

  const result = useMemo(
    () =>
      calculateStockingLevel({
        tankVolumeGallons: parsedTankVolume,
        selections: normalizedSelections,
      }),
    [normalizedSelections, parsedTankVolume],
  );

  const resultBySpeciesId = useMemo(
    () => new Map(result.selections.map((selection) => [selection.species.id, selection])),
    [result.selections],
  );

  const hasTankVolume = parsedTankVolume > 0;
  const hasSelections = result.selections.length > 0;
  const hasCalculatedResult = hasTankVolume && hasSelections;

  const statusStyle = STATUS_STYLES[result.status];
  const progressPercent = clamp(result.stockingPercent, 0, 100);

  function handleAddSpecies(speciesId = speciesToAdd) {
    if (!speciesId) return;

    setSelections((current) => {
      const existingSelection = current.find((selection) => selection.speciesId === speciesId);
      if (!existingSelection) {
        return [...current, { speciesId, quantity: "1" }];
      }

      return current.map((selection) => {
        if (selection.speciesId !== speciesId) return selection;

        return {
          ...selection,
          quantity: String(parseQuantity(selection.quantity) + 1),
        };
      });
    });
  }

  function handleQuantityChange(speciesId: string, quantity: string) {
    setSelections((current) =>
      current.map((selection) =>
        selection.speciesId === speciesId ? { ...selection, quantity } : selection,
      ),
    );
  }

  function handleRemoveSpecies(speciesId: string) {
    setSelections((current) => current.filter((selection) => selection.speciesId !== speciesId));
  }

  function handleClearSelections() {
    setSelections([]);
  }

  return (
    <section className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Aquarium stocking calculator</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Estimate stocking load with the classic 1 inch per gallon baseline, then adjust using
        species-specific bioload, activity, and water-zone modifiers. Includes 37 common fish and
        shrimp species with compatibility warnings.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <label className="text-sm" htmlFor="stocking-volume">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Tank volume (gallons)
            </div>
            <input
              id="stocking-volume"
              type="number"
              min={0}
              step={0.5}
              value={tankVolume}
              onChange={(event) => setTankVolume(event.target.value)}
              className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Add species
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select
              value={speciesToAdd}
              onChange={(event) => setSpeciesToAdd(event.target.value)}
              className="w-full rounded-2xl border bg-white/85 px-3 py-2 text-sm sm:flex-1"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {SORTED_SPECIES.map((species) => (
                <option key={species.id} value={species.id}>
                  {species.commonName} ({getSpeciesTypeLabel(species.type)})
                </option>
              ))}
            </select>
            <button type="button" className="ptl-btn-secondary" onClick={() => handleAddSpecies()}>
              Add
            </button>
          </div>

          <div className="mt-2 text-xs text-neutral-600">
            Use quantity to represent how many of each species you plan to keep.
          </div>

          <div className="mt-5 rounded-2xl border bg-white/75 p-3" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Selected species</h2>
              <button
                type="button"
                className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline"
                onClick={handleClearSelections}
              >
                Clear
              </button>
            </div>

            {selections.length === 0 ? (
              <p className="mt-3 text-xs text-neutral-600">
                Add species to start. Example: 10 neon tetras in a 20 gallon tank.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold text-neutral-700">Species</th>
                      <th className="px-2 py-1 text-left font-semibold text-neutral-700">Qty</th>
                      <th className="px-2 py-1 text-left font-semibold text-neutral-700">Load</th>
                      <th className="px-2 py-1 text-left font-semibold text-neutral-700" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {selections.map((selection) => {
                      const species = getStockingSpeciesById(selection.speciesId);
                      if (!species) return null;

                      const computedSelection = resultBySpeciesId.get(selection.speciesId);

                      return (
                        <tr
                          key={selection.speciesId}
                          className="rounded-xl border bg-white/85"
                          style={{ borderColor: "var(--ptl-border)" }}
                        >
                          <td className="px-2 py-2 align-top text-neutral-800">
                            <div className="font-semibold text-neutral-900">{species.commonName}</div>
                            <div className="text-[11px] text-neutral-600">
                              {getSpeciesTypeLabel(species.type)} · {formatNumber(species.adultSizeInches, 1)} in · {getBioloadLabel(species.bioloadRating)} bioload
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={selection.quantity}
                              onChange={(event) =>
                                handleQuantityChange(selection.speciesId, event.target.value)
                              }
                              className="w-20 rounded-xl border bg-white px-2 py-1 text-sm"
                              style={{ borderColor: "var(--ptl-border)" }}
                              aria-label={`Quantity for ${species.commonName}`}
                            />
                          </td>
                          <td className="px-2 py-2 align-top text-neutral-700">
                            {computedSelection
                              ? `${formatNumber(computedSelection.baselineSharePercent, 1)}%`
                              : "--"}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <button
                              type="button"
                              className="rounded-lg border px-2 py-1 text-xs font-semibold text-neutral-700"
                              style={{ borderColor: "var(--ptl-border)" }}
                              onClick={() => handleRemoveSpecies(selection.speciesId)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Stocking level
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasCalculatedResult ? formatNumber(result.stockingPercent, 1) : "--"}%
              </div>
              <div className="mt-2 text-xs text-neutral-600">100% = classic baseline capacity</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Effective load
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasCalculatedResult ? formatNumber(result.totalEffectiveInches, 1) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Adjusted inches of fish/shrimp load</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Baseline capacity
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasTankVolume ? formatNumber(result.baselineCapacityInches, 1) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">1 inch per gallon target</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Stocking indicator</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.badgeClassName}`}
              >
                {getStockingStatusLabel(result.status)}
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full rounded-full transition-all ${statusStyle.barClassName}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className={`mt-3 text-sm font-medium ${statusStyle.textClassName}`}>{statusStyle.summary}</p>
            <p className="mt-2 text-xs text-neutral-600">
              Formula: ∑(adult size × bioload modifier × activity modifier × zone modifier ×
              quantity) ÷ tank gallons.
            </p>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Compatibility warnings
            </h2>

            {result.warnings.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-700">
                No compatibility flags with current inputs.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.warnings.map((warning) => (
                  <li
                    key={warning.code}
                    className={`rounded-xl border px-3 py-2 text-sm ${WARNING_STYLES[warning.severity]}`}
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Species reference</h2>
          <p className="text-xs text-neutral-600">
            Built-in list: {STOCKING_SPECIES.length} species with bioload and temperament ratings.
          </p>
        </div>

        <div className="mt-3 max-h-[22rem] overflow-auto rounded-xl border" style={{ borderColor: "var(--ptl-border)" }}>
          <table className="min-w-full border-separate border-spacing-y-0 text-xs sm:text-sm">
            <thead className="sticky top-0 bg-white/95 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Species</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Adult size</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Bioload</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Temperament</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700">Min tank</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-700" aria-label="Add" />
              </tr>
            </thead>
            <tbody>
              {SORTED_SPECIES.map((species) => (
                <tr key={species.id} className="border-t" style={{ borderColor: "var(--ptl-border)" }}>
                  <td className="px-3 py-2 text-neutral-900">
                    <div className="font-semibold">{species.commonName}</div>
                    <div className="text-[11px] text-neutral-600 italic">{species.scientificName}</div>
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{getSpeciesTypeLabel(species.type)}</td>
                  <td className="px-3 py-2 text-neutral-700">{formatNumber(species.adultSizeInches, 1)} in</td>
                  <td className="px-3 py-2 text-neutral-700">{getBioloadLabel(species.bioloadRating)}</td>
                  <td className="px-3 py-2 text-neutral-700 capitalize">{species.temperament}</td>
                  <td className="px-3 py-2 text-neutral-700">{species.minimumTankGallons} gal</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded-lg border px-2 py-1 text-xs font-semibold text-neutral-700"
                      style={{ borderColor: "var(--ptl-border)" }}
                      onClick={() => handleAddSpecies(species.id)}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
