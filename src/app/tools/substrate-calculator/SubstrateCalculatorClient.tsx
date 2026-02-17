"use client";

import { useMemo, useState } from "react";

import {
  calculateSubstrateVolume,
  convertLength,
  estimateSubstrateWeight,
  type LengthUnit,
} from "@/lib/substrate-calculator";

const UNIT_LABELS: Record<LengthUnit, string> = {
  in: "inches",
  cm: "centimeters",
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

function formatDisplay(value: number, unit: LengthUnit): string {
  const digits = unit === "cm" ? 1 : 2;
  return `${value.toFixed(digits).replace(/\.?0+$/, "")} ${unit}`;
}

function convertInput(raw: string, from: LengthUnit, to: LengthUnit): string {
  if (raw.trim().length === 0) return "";
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return formatInput(convertLength(value, from, to));
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type DiagramProps = {
  lengthIn: number;
  frontDepthIn: number;
  backDepthIn: number;
  unit: LengthUnit;
};

function SubstrateSlopeDiagram(props: DiagramProps) {
  const maxDepthIn = Math.max(0.5, props.frontDepthIn, props.backDepthIn);
  const visualTankHeightIn = Math.max(12, maxDepthIn * 2.6);

  const tank = {
    left: 24,
    right: 336,
    top: 18,
    bottom: 188,
  };

  const innerHeight = tank.bottom - tank.top;
  const pxPerIn = innerHeight / visualTankHeightIn;

  const frontY = clamp(tank.bottom - props.frontDepthIn * pxPerIn, tank.top + 6, tank.bottom);
  const backY = clamp(tank.bottom - props.backDepthIn * pxPerIn, tank.top + 6, tank.bottom);
  const averageY = (frontY + backY) / 2;

  const frontDepthDisplay = formatDisplay(convertLength(props.frontDepthIn, "in", props.unit), props.unit);
  const backDepthDisplay = formatDisplay(convertLength(props.backDepthIn, "in", props.unit), props.unit);
  const lengthDisplay = formatDisplay(convertLength(props.lengthIn, "in", props.unit), props.unit);

  return (
    <svg
      className="w-full rounded-2xl border bg-white/70"
      style={{ borderColor: "var(--ptl-border)" }}
      viewBox="0 0 360 220"
      role="img"
      aria-label="Side-view tank diagram with sloped substrate"
    >
      <defs>
        <linearGradient id="water-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(45, 128, 176, 0.18)" />
          <stop offset="100%" stopColor="rgba(45, 128, 176, 0.08)" />
        </linearGradient>
        <linearGradient id="substrate-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(132, 92, 54, 0.8)" />
          <stop offset="100%" stopColor="rgba(84, 63, 40, 0.82)" />
        </linearGradient>
      </defs>

      <rect
        x={tank.left}
        y={tank.top}
        width={tank.right - tank.left}
        height={tank.bottom - tank.top}
        fill="url(#water-gradient)"
        stroke="rgba(11, 31, 22, 0.2)"
        strokeWidth="2"
        rx="8"
      />

      <polygon
        points={`${tank.left},${tank.bottom} ${tank.left},${frontY} ${tank.right},${backY} ${tank.right},${tank.bottom}`}
        fill="url(#substrate-gradient)"
      />

      <line
        x1={tank.left}
        y1={averageY}
        x2={tank.right}
        y2={averageY}
        stroke="rgba(11, 31, 22, 0.35)"
        strokeDasharray="5 4"
        strokeWidth="1.5"
      />

      <line
        x1={tank.left}
        y1={frontY}
        x2={tank.right}
        y2={backY}
        stroke="rgba(255, 255, 255, 0.58)"
        strokeWidth="1.5"
      />

      <text x={tank.left + 10} y={frontY - 8} fontSize="12" fill="rgba(11, 31, 22, 0.86)">
        Front: {frontDepthDisplay}
      </text>
      <text x={tank.right - 110} y={backY - 8} fontSize="12" fill="rgba(11, 31, 22, 0.86)">
        Back: {backDepthDisplay}
      </text>
      <text x={tank.left + 96} y={tank.top - 2} fontSize="12" fill="rgba(11, 31, 22, 0.66)">
        Tank length: {lengthDisplay}
      </text>
      <text x={tank.left + 98} y={averageY - 6} fontSize="11" fill="rgba(11, 31, 22, 0.6)">
        Average depth line
      </text>
    </svg>
  );
}

export function SubstrateCalculatorClient() {
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [length, setLength] = useState("36");
  const [width, setWidth] = useState("18");
  const [frontDepth, setFrontDepth] = useState("1");
  const [backDepth, setBackDepth] = useState("3");

  const parsedLength = parseInput(length);
  const parsedWidth = parseInput(width);
  const parsedFrontDepth = parseInput(frontDepth);
  const parsedBackDepth = parseInput(backDepth);

  const hasValidInput =
    parsedLength > 0 && parsedWidth > 0 && parsedFrontDepth > 0 && parsedBackDepth > 0;

  const volume = useMemo(
    () =>
      calculateSubstrateVolume({
        length: parsedLength,
        width: parsedWidth,
        frontDepth: parsedFrontDepth,
        backDepth: parsedBackDepth,
        unit,
      }),
    [parsedBackDepth, parsedFrontDepth, parsedLength, parsedWidth, unit],
  );

  const weightEstimates = useMemo(
    () => estimateSubstrateWeight(volume.volumeLiters),
    [volume.volumeLiters],
  );

  const unitSuffix = unit === "in" ? "in" : "cm";
  const slopeInPerFoot =
    volume.lengthIn > 0 ? ((volume.backDepthIn - volume.frontDepthIn) / volume.lengthIn) * 12 : 0;

  function handleUnitChange(nextUnit: LengthUnit) {
    if (nextUnit === unit) return;

    setLength((current) => convertInput(current, unit, nextUnit));
    setWidth((current) => convertInput(current, unit, nextUnit));
    setFrontDepth((current) => convertInput(current, unit, nextUnit));
    setBackDepth((current) => convertInput(current, unit, nextUnit));
    setUnit(nextUnit);
  }

  return (
    <section className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Aquarium substrate calculator</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        Estimate how much substrate your tank needs using front and back depth.
        Results include liters and rough weight for common substrate types.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border bg-white/70 p-5" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Units
          </div>
          <div className="mt-3 inline-flex rounded-full border p-1" style={{ borderColor: "var(--ptl-border)" }}>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              onClick={() => handleUnitChange("in")}
              style={
                unit === "in"
                  ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                  : undefined
              }
            >
              Inches
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              onClick={() => handleUnitChange("cm")}
              style={
                unit === "cm"
                  ? { backgroundColor: "rgba(27, 127, 90, 0.12)", color: "var(--ptl-accent-ink)" }
                  : undefined
              }
            >
              Centimeters
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm" htmlFor="tank-length">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Tank length ({unitSuffix})
              </div>
              <input
                id="tank-length"
                type="number"
                min={0}
                step={unit === "cm" ? 0.1 : 0.25}
                value={length}
                onChange={(event) => setLength(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm" htmlFor="tank-width">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Tank width ({unitSuffix})
              </div>
              <input
                id="tank-width"
                type="number"
                min={0}
                step={unit === "cm" ? 0.1 : 0.25}
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm" htmlFor="front-depth">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Front depth ({unitSuffix})
              </div>
              <input
                id="front-depth"
                type="number"
                min={0}
                step={unit === "cm" ? 0.1 : 0.25}
                value={frontDepth}
                onChange={(event) => setFrontDepth(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>

            <label className="text-sm" htmlFor="back-depth">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Back depth ({unitSuffix})
              </div>
              <input
                id="back-depth"
                type="number"
                min={0}
                step={unit === "cm" ? 0.1 : 0.25}
                value={backDepth}
                onChange={(event) => setBackDepth(event.target.value)}
                className="mt-2 w-full rounded-2xl border bg-white/80 px-3 py-2 text-sm"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="mt-4 text-xs text-neutral-600">
            Calculated with a linear substrate slope from front to back.
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Substrate volume
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? volume.volumeLiters.toFixed(1) : "--"} L
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                {hasValidInput
                  ? `${volume.volumeCubicIn.toFixed(0)} cubic inches (${UNIT_LABELS[unit]})`
                  : `Enter all dimensions in ${UNIT_LABELS[unit]}.`}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Slope
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {hasValidInput ? slopeInPerFoot.toFixed(2) : "--"}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Depth change per 12 in of tank length</div>
            </div>
          </div>

          <SubstrateSlopeDiagram
            lengthIn={volume.lengthIn}
            frontDepthIn={volume.frontDepthIn}
            backDepthIn={volume.backDepthIn}
            unit={unit}
          />

          <div className="rounded-2xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Estimated dry weight
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {weightEstimates.map((weight) => (
                <div
                  key={weight.key}
                  className="rounded-xl border bg-white/80 p-3"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="text-sm font-semibold text-neutral-900">{weight.label}</div>
                  <div className="mt-1 text-xl font-semibold text-neutral-900">
                    {hasValidInput ? weight.pounds.toFixed(1) : "--"} lb
                  </div>
                  <div className="text-xs text-neutral-600">
                    {hasValidInput ? `${weight.kilograms.toFixed(1)} kg` : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-neutral-600">
              Uses typical bulk densities (aquasoil 0.75 kg/L, sand 1.6 kg/L, gravel 1.5 kg/L).
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
