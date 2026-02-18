"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  PlantPlacementZoneId,
  PlacementGuideZone,
} from "@/lib/plants/placement-guide";

type PlantPlacementGuideClientProps = {
  zones: PlacementGuideZone[];
};

const ZONE_COLOR: Record<PlantPlacementZoneId, { fill: string; stroke: string; text: string }> = {
  foreground: {
    fill: "rgba(34,197,94,0.22)",
    stroke: "rgba(21,128,61,0.78)",
    text: "#14532d",
  },
  midground: {
    fill: "rgba(59,130,246,0.2)",
    stroke: "rgba(30,64,175,0.78)",
    text: "#172554",
  },
  background: {
    fill: "rgba(168,85,247,0.2)",
    stroke: "rgba(107,33,168,0.78)",
    text: "#3b0764",
  },
};

const ZONE_BOUNDS: Record<PlantPlacementZoneId, { x: number; width: number }> = {
  foreground: { x: 72, width: 195 },
  midground: { x: 267, width: 190 },
  background: { x: 457, width: 151 },
};

const ZONE_FILTER_LINK: Record<PlantPlacementZoneId, string> = {
  foreground: "/plants?curated=0&placement=foreground",
  midground: "/plants?curated=0&placement=midground",
  background: "/plants?curated=0&placement=background",
};

function zoneDepthLabel(zoneId: PlantPlacementZoneId): string {
  if (zoneId === "foreground") return "Front planting zone";
  if (zoneId === "midground") return "Mid planting zone";
  return "Background planting zone";
}

export function PlantPlacementGuideClient(props: PlantPlacementGuideClientProps) {
  const [activeZoneId, setActiveZoneId] = useState<PlantPlacementZoneId>("foreground");

  const zonesById = useMemo(
    () => new Map(props.zones.map((zone) => [zone.id, zone] as const)),
    [props.zones],
  );

  const activeZone = zonesById.get(activeZoneId) ?? props.zones[0] ?? null;

  return (
    <section className="ptl-surface p-7 sm:p-9">
      <h1 className="ptl-page-title">Planted aquarium layout guide</h1>
      <p className="mt-3 max-w-[76ch] ptl-lede text-neutral-700">
        Use foreground, midground, and background zones to create depth without blocking your
        hardscape focal points. Hover or click zones in the diagram to explore recommended species.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <svg
            viewBox="0 0 680 320"
            className="w-full rounded-3xl border bg-white/80"
            style={{ borderColor: "var(--ptl-border)" }}
            role="img"
            aria-label="Aquarium placement zones diagram"
          >
            <defs>
              <linearGradient id="placement-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(37,99,235,0.17)" />
                <stop offset="100%" stopColor="rgba(37,99,235,0.07)" />
              </linearGradient>
              <linearGradient id="placement-substrate" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(120,82,48,0.82)" />
                <stop offset="100%" stopColor="rgba(84,62,44,0.86)" />
              </linearGradient>
            </defs>

            <rect
              x={72}
              y={46}
              width={536}
              height={216}
              rx={16}
              fill="url(#placement-water)"
              stroke="rgba(15,23,42,0.35)"
              strokeWidth={2}
            />

            <polygon
              points="72,262 72,220 608,170 608,262"
              fill="url(#placement-substrate)"
            />

            <line
              x1={72}
              y1={220}
              x2={608}
              y2={170}
              stroke="rgba(255,255,255,0.62)"
              strokeWidth={2}
            />

            {props.zones.map((zone) => {
              const bounds = ZONE_BOUNDS[zone.id];
              const palette = ZONE_COLOR[zone.id];
              const isActive = zone.id === activeZoneId;

              return (
                <g
                  key={zone.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${zoneDepthLabel(zone.id)}: ${zone.recommendedPlants.length} recommended plants`}
                  onMouseEnter={() => setActiveZoneId(zone.id)}
                  onFocus={() => setActiveZoneId(zone.id)}
                  onClick={() => setActiveZoneId(zone.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveZoneId(zone.id);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={bounds.x}
                    y={64}
                    width={bounds.width}
                    height={182}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={isActive ? 3 : 1.6}
                    opacity={isActive ? 1 : 0.68}
                    rx={12}
                  />
                  <text
                    x={bounds.x + 12}
                    y={92}
                    fontSize={15}
                    fontWeight={700}
                    fill={palette.text}
                  >
                    {zone.label}
                  </text>
                  <text
                    x={bounds.x + 12}
                    y={111}
                    fontSize={12}
                    fill="rgba(15,23,42,0.76)"
                  >
                    {zone.subtitle}
                  </text>
                  <text
                    x={bounds.x + 12}
                    y={130}
                    fontSize={11}
                    fill="rgba(15,23,42,0.7)"
                  >
                    {zone.xRangeLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="rounded-2xl border bg-white/80 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            {activeZone ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                      Active zone
                    </div>
                    <div className="mt-1 text-sm font-semibold text-neutral-900">
                      {activeZone.label} · {activeZone.subtitle}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-700">
                    {activeZone.recommendedPlants.length} recommended plants
                  </div>
                </div>
                <p className="mt-2 text-sm text-neutral-700">{activeZone.description}</p>
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {props.zones.map((zone) => {
            const isActive = zone.id === activeZoneId;
            const palette = ZONE_COLOR[zone.id];

            return (
              <article
                key={zone.id}
                className="rounded-2xl border bg-white/80 p-4"
                style={{ borderColor: isActive ? palette.stroke : "var(--ptl-border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">{zone.label}</h2>
                    <div className="text-xs text-neutral-600">
                      {zone.subtitle} · {zone.xRangeLabel}
                    </div>
                  </div>
                  <Link
                    href={ZONE_FILTER_LINK[zone.id]}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    Browse {zone.label.toLowerCase()} plants
                  </Link>
                </div>

                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {zone.recommendedPlants.length > 0 ? (
                    zone.recommendedPlants.slice(0, 12).map((plant) => (
                      <li key={`${zone.id}-${plant.slug}`}>
                        <Link
                          href={`/plants/${plant.slug}`}
                          className="block rounded-md border border-neutral-200 bg-white/75 px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-900"
                        >
                          <div className="truncate">{plant.commonName}</div>
                          {plant.scientificName ? (
                            <div className="truncate text-[11px] italic text-neutral-600">
                              {plant.scientificName}
                            </div>
                          ) : null}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-neutral-600">No matching plants found for this zone yet.</li>
                  )}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
