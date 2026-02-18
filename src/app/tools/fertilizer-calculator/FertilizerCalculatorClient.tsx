"use client";

import { useMemo, useState } from "react";

import {
  calculateFertilizerDosing,
  convertFertilizerVolume,
  formatFertilizerSchedule,
  getFertilizerMethodDescription,
  getFertilizerMethodLabel,
  type FertilizerMethod,
  type FertilizerVolumeUnit,
} from "@/lib/fertilizer-calculator";

const METHODS: FertilizerMethod[] = ["ei", "pps-pro"];

const VOLUME_UNIT_LABELS: Record<FertilizerVolumeUnit, string> = {
  gal: "gallons",
  l: "liters",
};

function parseInput(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function convertInput(raw: string, from: FertilizerVolumeUnit, to: FertilizerVolumeUnit): string {
  if (raw.trim().length === 0) return "";
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return formatInput(convertFertilizerVolume(value, from, to));
}

function formatAmount(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function FertilizerCalculatorClient() {
  const [method, setMethod] = useState<FertilizerMethod>("ei");
  const [volumeUnit, setVolumeUnit] = useState<FertilizerVolumeUnit>("gal");
  const [tankVolume, setTankVolume] = useState("40");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const parsedTankVolume = parseInput(tankVolume);
  const hasValidInput = parsedTankVolume > 0;

  const result = useMemo(
    () =>
      calculateFertilizerDosing({
        volume: parsedTankVolume,
        volumeUnit,
        method,
      }),
    [method, parsedTankVolume, volumeUnit],
  );

  const scheduleText = useMemo(() => formatFertilizerSchedule(result), [result]);

  function handleMethodChange(nextMethod: FertilizerMethod) {
    setMethod(nextMethod);
    setCopyStatus("idle");
  }

  function handleUnitChange(nextUnit: FertilizerVolumeUnit) {
    if (nextUnit === volumeUnit) return;

    setTankVolume((current) => convertInput(current, volumeUnit, nextUnit));
    setVolumeUnit(nextUnit);
    setCopyStatus("idle");
  }

  async function handleCopySchedule() {
    if (!hasValidInput) return;

    try {
      await navigator.clipboard.writeText(scheduleText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  function handlePrintSchedule() {
    window.print();
  }

  return (
    <section className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Aquarium fertilizer dosing calculator</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Plan dry-fertilizer dosing with either Estimative Index (EI) or PPS-Pro. Get per-dose and
        weekly amounts for KNO3, KH2PO4, K2SO4, and CSM+B trace mix.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Dosing method</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {METHODS.map((option) => {
              const isActive = option === method;

              return (
                <button
                  key={option}
                  type="button"
                  className="rounded-2xl border px-4 py-3 text-left"
                  style={
                    isActive
                      ? {
                          borderColor: "rgba(27, 127, 90, 0.35)",
                          backgroundColor: "rgba(27, 127, 90, 0.12)",
                        }
                      : { borderColor: "var(--ptl-border)", backgroundColor: "rgba(255,255,255,0.7)" }
                  }
                  onClick={() => handleMethodChange(option)}
                >
                  <div className="text-sm font-semibold text-neutral-900">{getFertilizerMethodLabel(option)}</div>
                  <p className="mt-1 text-xs text-neutral-600">{getFertilizerMethodDescription(option)}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Tank volume</div>
          <div className="mt-3 inline-flex rounded-full border p-1" style={{ borderColor: "var(--ptl-border)" }}>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              onClick={() => handleUnitChange("gal")}
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
              onClick={() => handleUnitChange("l")}
              style={
                volumeUnit === "l"
                  ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                  : undefined
              }
            >
              Liters
            </button>
          </div>

          <label className="mt-4 block text-sm" htmlFor="fertilizer-tank-volume">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Volume ({volumeUnit})
            </div>
            <input
              id="fertilizer-tank-volume"
              type="number"
              min={0}
              step={volumeUnit === "gal" ? 0.5 : 1}
              value={tankVolume}
              onChange={(event) => {
                setTankVolume(event.target.value);
                setCopyStatus("idle");
              }}
              className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <div className="mt-4 text-xs text-neutral-600">
            {method === "ei"
              ? "EI target reference (40 gal): KNO3 1/2 tsp, KH2PO4 1/8 tsp, K2SO4 1/4 tsp on macro days and CSM+B 1/8 tsp on trace days."
              : "PPS-Pro reference uses 1 ml stock solution per 10 gallons daily, converted to dry-fertilizer equivalent."}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Method</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                {getFertilizerMethodLabel(method)}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Tank volume</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                {hasValidInput
                  ? `${formatAmount(result.volumeGallons, 1)} gal`
                  : `Enter volume in ${VOLUME_UNIT_LABELS[volumeUnit]}`}
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                {hasValidInput ? `${formatAmount(result.volumeLiters, 1)} L` : ""}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Weekly cadence</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                {method === "ei" ? "3 macro + 3 trace" : "7 daily doses"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                {method === "ei" ? "Sunday reset day" : "Steady all-in daily dosing"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Dose breakdown</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold text-neutral-700">Fertilizer</th>
                    <th className="px-2 py-1 text-left font-semibold text-neutral-700">Per dose</th>
                    <th className="px-2 py-1 text-left font-semibold text-neutral-700">Doses/week</th>
                    <th className="px-2 py-1 text-left font-semibold text-neutral-700">Weekly total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.doses.map((dose) => (
                    <tr
                      key={dose.key}
                      className="rounded-xl border bg-white/85"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      <td className="px-2 py-2 font-semibold text-neutral-900">{dose.label}</td>
                      <td className="px-2 py-2 text-neutral-700">
                        {hasValidInput
                          ? `${formatAmount(dose.gramsPerDose, 3)} g (${formatAmount(dose.teaspoonsPerDose, 4)} tsp)`
                          : "--"}
                      </td>
                      <td className="px-2 py-2 text-neutral-700">{hasValidInput ? dose.dosesPerWeek : "--"}</td>
                      <td className="px-2 py-2 text-neutral-700">
                        {hasValidInput
                          ? `${formatAmount(dose.gramsPerWeek, 3)} g (${formatAmount(dose.teaspoonsPerWeek, 4)} tsp)`
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Printable weekly schedule</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Copy this plan into your notes or print it for your aquarium maintenance routine.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ptl-btn-secondary" onClick={handleCopySchedule}>
              Copy schedule
            </button>
            <button type="button" className="ptl-btn-secondary" onClick={handlePrintSchedule}>
              Print
            </button>
          </div>
        </div>

        <pre
          className="mt-4 overflow-x-auto rounded-2xl border bg-white/90 p-4 text-xs leading-5 text-neutral-700 sm:text-sm"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          {hasValidInput
            ? scheduleText
            : `Enter tank volume in ${VOLUME_UNIT_LABELS[volumeUnit]} to generate your schedule.`}
        </pre>

        {copyStatus === "copied" ? (
          <p className="mt-2 text-xs text-emerald-700">Schedule copied to clipboard.</p>
        ) : null}

        {copyStatus === "error" ? (
          <p className="mt-2 text-xs text-rose-700">
            Could not copy automatically. Select the schedule text and copy manually.
          </p>
        ) : null}
      </div>
    </section>
  );
}
