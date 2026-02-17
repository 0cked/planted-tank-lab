"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildCo2KhPhReferenceTable,
  calculateCo2Targets,
  convertVolume,
  type VolumeUnit,
} from "@/lib/co2-calculator";

const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  gal: "gallons",
  l: "liters",
};

const KH_REFERENCE_VALUES = [1, 2, 3, 4, 6, 8, 10];
const PH_REFERENCE_VALUES = [6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2, 7.4, 7.6];

function parseInput(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function convertInput(raw: string, from: VolumeUnit, to: VolumeUnit): string {
  if (raw.trim().length === 0) return "";
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return formatInput(convertVolume(value, from, to));
}

function formatDisplay(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function classifyPpmBand(ppm: number): string {
  if (ppm < 15) return "bg-sky-50 text-sky-900";
  if (ppm <= 35) return "bg-emerald-50 text-emerald-900";
  if (ppm <= 45) return "bg-amber-50 text-amber-900";
  return "bg-rose-50 text-rose-900";
}

export function Co2CalculatorClient() {
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("gal");
  const [tankVolume, setTankVolume] = useState("20");
  const [desiredCo2Ppm, setDesiredCo2Ppm] = useState("30");
  const [kh, setKh] = useState("4");

  const parsedTankVolume = parseInput(tankVolume);
  const parsedDesiredPpm = parseInput(desiredCo2Ppm);
  const parsedKh = parseInput(kh);

  const hasValidInput = parsedTankVolume > 0 && parsedDesiredPpm > 0 && parsedKh > 0;

  const results = useMemo(
    () =>
      calculateCo2Targets({
        volume: parsedTankVolume,
        volumeUnit,
        desiredPpm: parsedDesiredPpm,
        kh: parsedKh,
      }),
    [parsedDesiredPpm, parsedKh, parsedTankVolume, volumeUnit],
  );

  const referenceTable = useMemo(
    () => buildCo2KhPhReferenceTable(PH_REFERENCE_VALUES, KH_REFERENCE_VALUES),
    [],
  );

  const cylinderLifeDays =
    results.estimatedConsumptionGPerDay > 0
      ? 2267.96 / results.estimatedConsumptionGPerDay
      : 0;

  function handleVolumeUnitChange(nextUnit: VolumeUnit) {
    if (nextUnit === volumeUnit) return;

    setTankVolume((current) => convertInput(current, volumeUnit, nextUnit));
    setVolumeUnit(nextUnit);
  }

  return (
    <section className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Aquarium CO2 calculator</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Dial in a safe starting CO2 target from tank volume and KH. Use this as a baseline,
        then fine-tune with livestock behavior and a drop checker.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Volume units</div>
          <div className="mt-3 inline-flex rounded-full border p-1" style={{ borderColor: "var(--ptl-border)" }}>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              onClick={() => handleVolumeUnitChange("gal")}
              style={
                volumeUnit === "gal"
                  ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                  : undefined
              }
            >
              Gallons
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              onClick={() => handleVolumeUnitChange("l")}
              style={
                volumeUnit === "l"
                  ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                  : undefined
              }
            >
              Liters
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm" htmlFor="co2-tank-volume">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Tank volume ({volumeUnit})
              </div>
              <input
                id="co2-tank-volume"
                type="number"
                min={0}
                step={volumeUnit === "l" ? 1 : 0.5}
                value={tankVolume}
                onChange={(event) => setTankVolume(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm" htmlFor="co2-desired-ppm">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Desired CO2 (ppm)
              </div>
              <input
                id="co2-desired-ppm"
                type="number"
                min={0}
                step={1}
                value={desiredCo2Ppm}
                onChange={(event) => setDesiredCo2Ppm(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm sm:col-span-2" htmlFor="co2-kh">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                KH (dKH)
              </div>
              <input
                id="co2-kh"
                type="number"
                min={0}
                step={0.5}
                value={kh}
                onChange={(event) => setKh(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="mt-4 text-xs text-neutral-600">
            Formula used: CO2 (ppm) = 3 × KH × 10^(7 − pH). Target ranges of 20-35 ppm are common
            for planted tanks.
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">pH target</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? formatDisplay(results.phTarget, 2) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Approximate pH to reach {formatDisplay(results.desiredPpm, 0)} ppm CO2.</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Bubble rate
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? formatDisplay(results.suggestedBubbleRateBps, 1) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Starting point (bubbles/sec), then tune with observations.</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                CO2 use
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? formatDisplay(results.estimatedConsumptionGPerDay, 2) : "--"} g/day
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                ~{hasValidInput ? formatDisplay(results.estimatedConsumptionOzPerDay, 2) : "--"} oz/day at 10h dosing.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Plan your hardware</div>
                <p className="mt-1 text-sm text-neutral-700">
                  Estimated 5 lb cylinder runtime: {hasValidInput ? `${formatDisplay(cylinderLifeDays, 0)} days` : "--"}.
                </p>
              </div>
              <Link href="/products/co2" className="ptl-btn-primary">
                Browse CO2 equipment
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Input summary
            </div>
            <div className="mt-2 text-sm text-neutral-700">
              {hasValidInput
                ? `${formatDisplay(results.volumeGallons, 1)} gal (${formatDisplay(results.volumeLiters, 1)} L), target ${formatDisplay(results.desiredPpm, 0)} ppm, KH ${formatDisplay(results.kh, 1)} dKH.`
                : `Enter tank volume, target ppm, and KH in ${VOLUME_UNIT_LABELS[volumeUnit]}.`}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-white/70 p-4" style={{ borderColor: "var(--ptl-border)" }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">CO2 / KH / pH reference table</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Values show estimated CO2 ppm from measured KH and pH. Green cells are the common
              planted-tank target zone.
            </p>
          </div>
          <div className="text-xs text-neutral-600">Rows: pH · Columns: KH (dKH)</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1 text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="rounded-lg bg-neutral-900 px-3 py-2 text-left font-semibold text-white">pH ↓ / KH →</th>
                {KH_REFERENCE_VALUES.map((khValue) => (
                  <th
                    key={khValue}
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-center font-semibold text-white"
                  >
                    {khValue}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referenceTable.map((row) => (
                <tr key={row.ph}>
                  <th className="rounded-lg bg-neutral-100 px-3 py-2 text-left font-semibold text-neutral-900">
                    {row.ph.toFixed(1)}
                  </th>
                  {row.ppmByKh.map((ppm, index) => (
                    <td
                      key={`${row.ph}-${KH_REFERENCE_VALUES[index]}`}
                      className={`rounded-lg px-3 py-2 text-center font-semibold ${classifyPpmBand(ppm)}`}
                    >
                      {formatDisplay(ppm, ppm >= 10 ? 0 : 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          Always verify with livestock behavior and measured pH/KH. This calculator provides
          planning estimates, not a replacement for safe incremental tuning.
        </div>
      </div>
    </section>
  );
}
