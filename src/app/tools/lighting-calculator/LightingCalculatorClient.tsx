"use client";

import { useMemo, useState } from "react";

import {
  calculateLightingPar,
  getLightTypeLabel,
  type LightType,
  type LightingParBand,
  type LightingSuitability,
} from "@/lib/lighting-calculator";

type PlantZone = {
  band: LightingParBand;
  title: string;
  range: string;
  description: string;
};

const LIGHT_TYPES: LightType[] = ["led", "t5", "t8"];

const PLANT_ZONES: PlantZone[] = [
  {
    band: "low",
    title: "Low light",
    range: "< 40 PAR",
    description: "Anubias, java fern, moss, and other low-demand plants.",
  },
  {
    band: "medium",
    title: "Medium light",
    range: "40-80 PAR",
    description: "Most stem plants and mixed aquascapes with moderate growth.",
  },
  {
    band: "high",
    title: "High light",
    range: "80+ PAR",
    description: "Demanding plants and high-tech layouts, usually with CO2.",
  },
];

function parseInput(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatPar(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(1).replace(/\.0$/, "");
}

function getBandLabel(band: LightingParBand): string {
  if (band === "low") return "Low";
  if (band === "medium") return "Medium";
  return "High";
}

function getSuitabilityLabel(suitability: LightingSuitability): string {
  if (suitability === "low-tech") {
    return "Suitable for low-tech setups";
  }

  if (suitability === "medium") {
    return "Suitable for medium-light setups";
  }

  return "Suitable for high-tech setups";
}

function getBandClasses(isActive: boolean): string {
  if (isActive) {
    return "border-transparent bg-[rgba(27,127,90,0.12)] text-[var(--ptl-accent-ink)]";
  }

  return "border bg-white/80 text-neutral-700";
}

export function LightingCalculatorClient() {
  const [wattage, setWattage] = useState("30");
  const [tankDepth, setTankDepth] = useState("18");
  const [mountingHeight, setMountingHeight] = useState("4");
  const [lightType, setLightType] = useState<LightType>("led");

  const parsedWattage = parseInput(wattage);
  const parsedTankDepth = parseInput(tankDepth);
  const parsedMountingHeight = parseInput(mountingHeight);

  const hasValidInput = parsedWattage > 0 && parsedTankDepth > 0;

  const result = useMemo(
    () =>
      calculateLightingPar({
        wattage: parsedWattage,
        tankDepthInches: parsedTankDepth,
        mountingHeightInches: parsedMountingHeight,
        lightType,
      }),
    [lightType, parsedMountingHeight, parsedTankDepth, parsedWattage],
  );

  const suitabilityLabel = getSuitabilityLabel(result.suitability);

  return (
    <section className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Aquarium lighting calculator</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Estimate substrate PAR from fixture wattage, depth, and mounting height. Use it to
        quickly classify your setup as low-tech, medium, or high-tech.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Light type</div>
          <div className="mt-3 inline-flex rounded-full border p-1" style={{ borderColor: "var(--ptl-border)" }}>
            {LIGHT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold"
                onClick={() => setLightType(type)}
                style={
                  type === lightType
                    ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                    : undefined
                }
              >
                {getLightTypeLabel(type)}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm" htmlFor="lighting-wattage">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Fixture wattage (W)
              </div>
              <input
                id="lighting-wattage"
                type="number"
                min={0}
                step={1}
                value={wattage}
                onChange={(event) => setWattage(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm" htmlFor="lighting-depth">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Tank depth (in)
              </div>
              <input
                id="lighting-depth"
                type="number"
                min={0}
                step={0.5}
                value={tankDepth}
                onChange={(event) => setTankDepth(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm sm:col-span-2" htmlFor="lighting-mounting-height">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Mounting height above water (in)
              </div>
              <input
                id="lighting-mounting-height"
                type="number"
                min={0}
                step={0.5}
                value={mountingHeight}
                onChange={(event) => setMountingHeight(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="mt-4 text-xs text-neutral-600">
            Simplified model: PAR ≈ (wattage × light efficiency) / distance² × e
            <sup>−absorption × depth</sup>.
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Estimated PAR
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? formatPar(result.estimatedPar) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">At substrate level</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Plant zone</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? getBandLabel(result.parBand) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Low (&lt;40), medium (40-80), high (80+)</div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Setup profile
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? suitabilityLabel : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Use this as a planning baseline.</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Plant requirement zones</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLANT_ZONES.map((zone) => {
                const isActive = hasValidInput && zone.band === result.parBand;

                return (
                  <div
                    key={zone.band}
                    className={`rounded-xl p-3 ${getBandClasses(isActive)}`}
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <div className="text-sm font-semibold text-neutral-900">{zone.title}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      {zone.range}
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">{zone.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Input summary
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              {hasValidInput
                ? `${formatPar(parsedWattage)}W ${getLightTypeLabel(lightType)} fixture, ${formatPar(parsedTankDepth)}\" depth, ${formatPar(parsedMountingHeight)}\" mount height. Total light-to-substrate distance: ${formatPar(result.totalDistanceInches)}\".`
                : "Enter wattage and tank depth to get your PAR estimate."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
