import type { AssetGroup, LibraryAsset, TankPreset } from "@/components/builder2d/types";

export const TANK_PRESETS: readonly TankPreset[] = [
  { id: "ada-mini-m", name: "ADA Mini M", widthCm: 36, depthCm: 22, heightCm: 26, liters: 19 },
  { id: "ada-45-p", name: "ADA 45-P", widthCm: 45, depthCm: 27, heightCm: 30, liters: 34 },
  { id: "ada-60-p", name: "ADA 60-P", widthCm: 60, depthCm: 30, heightCm: 36, liters: 60 },
  { id: "ada-60-h30", name: "ADA 60-H30", widthCm: 60, depthCm: 30, heightCm: 45, liters: 75 },
  { id: "ada-60-p45", name: "ADA 60-P45", widthCm: 60, depthCm: 45, heightCm: 36, liters: 90 },
  { id: "ada-90-p", name: "ADA 90-P", widthCm: 90, depthCm: 45, heightCm: 45, liters: 166 },
  { id: "ada-120-p", name: "ADA 120-P", widthCm: 120, depthCm: 50, heightCm: 50, liters: 273 },
  { id: "ada-150-p", name: "ADA 150-P", widthCm: 150, depthCm: 60, heightCm: 60, liters: 490 },
  { id: "ada-180-p", name: "ADA 180-P", widthCm: 180, depthCm: 60, heightCm: 60, liters: 590 },
] as const;

export const LIBRARY_ASSETS: readonly LibraryAsset[] = [
  {
    id: "alternanthera-mini",
    name: "Alternanthera Reineckii 'Mini'",
    group: "plants",
    variant: "rosette",
    colorA: "#8f2f44",
    colorB: "#d2647f",
  },
  {
    id: "anubias-nana",
    name: "Anubias barteri var. nana",
    group: "plants",
    variant: "rosette",
    colorA: "#2f8b47",
    colorB: "#6ac373",
  },
  {
    id: "bolbitis",
    name: "Bolbitis heudelotii",
    group: "plants",
    variant: "stem",
    colorA: "#4e8f31",
    colorB: "#90d466",
  },
  {
    id: "java-fern",
    name: "Java Fern",
    group: "plants",
    variant: "stem",
    colorA: "#3a7f34",
    colorB: "#7fc067",
  },
  {
    id: "crypt-wendtii",
    name: "Cryptocoryne wendtii",
    group: "plants",
    variant: "rosette",
    colorA: "#3f8140",
    colorB: "#7ec47b",
  },
  {
    id: "staurogyne-repens",
    name: "Staurogyne repens",
    group: "plants",
    variant: "carpet",
    colorA: "#4b9e3f",
    colorB: "#8ad46c",
  },
  {
    id: "monte-carlo",
    name: "Monte Carlo",
    group: "plants",
    variant: "carpet",
    colorA: "#4aa94f",
    colorB: "#94df7f",
  },
  {
    id: "rotala",
    name: "Rotala rotundifolia",
    group: "plants",
    variant: "stem",
    colorA: "#5aaf42",
    colorB: "#a0e274",
  },
  {
    id: "dwarf-hairgrass",
    name: "Dwarf Hairgrass",
    group: "plants",
    variant: "stem",
    colorA: "#6fb351",
    colorB: "#b8e689",
  },
  {
    id: "hygrophila",
    name: "Hygrophila polysperma",
    group: "plants",
    variant: "stem",
    colorA: "#4f9f42",
    colorB: "#91d26f",
  },
  {
    id: "ohko-stone",
    name: "Ohko Stone",
    group: "hardscape",
    variant: "rock",
    colorA: "#86614a",
    colorB: "#c39f86",
  },
  {
    id: "seiryu-stone",
    name: "Seiryu Stone",
    group: "hardscape",
    variant: "rock",
    colorA: "#708090",
    colorB: "#bcc5d0",
  },
  {
    id: "lava-rock",
    name: "Lava Rock",
    group: "hardscape",
    variant: "rock",
    colorA: "#4a4b4f",
    colorB: "#8a8d95",
  },
  {
    id: "river-pebble",
    name: "River Pebble Cluster",
    group: "hardscape",
    variant: "rock",
    colorA: "#75808a",
    colorB: "#ccd6de",
  },
  {
    id: "spider-wood",
    name: "Spider Wood Branch",
    group: "hardscape",
    variant: "wood",
    colorA: "#6a4128",
    colorB: "#ad7a4c",
  },
  {
    id: "manzanita",
    name: "Manzanita Branch",
    group: "hardscape",
    variant: "wood",
    colorA: "#6f4a2d",
    colorB: "#bd8a5f",
  },
  {
    id: "mopani-root",
    name: "Mopani Root",
    group: "hardscape",
    variant: "wood",
    colorA: "#5d3a28",
    colorB: "#9b6d45",
  },
  {
    id: "branch-arch",
    name: "Branchwood Arch",
    group: "hardscape",
    variant: "wood",
    colorA: "#694026",
    colorB: "#ac7a51",
  },
] as const;

const ASSET_BY_ID = new Map(LIBRARY_ASSETS.map((asset) => [asset.id, asset] as const));

export function assetById(assetId: string): LibraryAsset | null {
  return ASSET_BY_ID.get(assetId) ?? null;
}

export function fallbackAssetForGroup(group: AssetGroup): LibraryAsset {
  const fallbackId = group === "hardscape" ? "ohko-stone" : "anubias-nana";
  return ASSET_BY_ID.get(fallbackId) ?? LIBRARY_ASSETS[0]!;
}

export function inchesToCentimeters(valueInches: number): number {
  return valueInches * 2.54;
}

export function findClosestTankPreset(params: {
  widthIn: number;
  depthIn: number;
  heightIn: number;
}): TankPreset {
  const widthCm = inchesToCentimeters(params.widthIn);
  const depthCm = inchesToCentimeters(params.depthIn);
  const heightCm = inchesToCentimeters(params.heightIn);

  let closest = TANK_PRESETS[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const preset of TANK_PRESETS) {
    const distance =
      Math.abs(preset.widthCm - widthCm) +
      Math.abs(preset.depthCm - depthCm) +
      Math.abs(preset.heightCm - heightCm);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = preset;
    }
  }

  return closest;
}
