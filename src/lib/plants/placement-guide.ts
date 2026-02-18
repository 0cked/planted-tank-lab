export type PlantPlacementZoneId = "foreground" | "midground" | "background";

export type PlacementGuidePlant = {
  slug: string;
  commonName: string;
  scientificName: string | null;
  placement: string | null;
  difficulty?: string | null;
  lightDemand?: string | null;
  co2Demand?: string | null;
  beginnerFriendly?: boolean | null;
};

export type PlacementGuideZone = {
  id: PlantPlacementZoneId;
  label: string;
  subtitle: string;
  description: string;
  xRangeLabel: string;
  recommendedPlants: PlacementGuidePlant[];
};

const ZONE_META: Record<
  PlantPlacementZoneId,
  {
    label: string;
    subtitle: string;
    description: string;
    xRangeLabel: string;
  }
> = {
  foreground: {
    label: "Foreground",
    subtitle: "Front third",
    description:
      "Keep this zone low and open so hardscape details stay visible and maintenance remains easy.",
    xRangeLabel: "0–35% depth",
  },
  midground: {
    label: "Midground",
    subtitle: "Middle bridge",
    description:
      "Use this zone to connect foreground carpets to taller background stems and create layered depth.",
    xRangeLabel: "35–70% depth",
  },
  background: {
    label: "Background",
    subtitle: "Rear wall",
    description:
      "Reserve the back for taller stems and visual framing that hides equipment and closes the composition.",
    xRangeLabel: "70–100% depth",
  },
};

function normalizePlacementTokens(value: string | null | undefined): string[] {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (!normalized) return [];

  return normalized
    .split(/[,&/|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function tokenToZone(token: string): PlantPlacementZoneId | null {
  if (!token) return null;

  if (token.includes("foreground") || token.includes("carpet")) {
    return "foreground";
  }

  if (token.includes("background") || token.includes("rear")) {
    return "background";
  }

  if (
    token.includes("midground") ||
    token.includes("middle") ||
    token.includes("epiphyte") ||
    token.includes("floating")
  ) {
    return "midground";
  }

  return null;
}

export function resolvePlantPlacementZones(
  placement: string | null | undefined,
): PlantPlacementZoneId[] {
  const tokens = normalizePlacementTokens(placement);
  if (tokens.length === 0) return ["midground"];

  const zones = new Set<PlantPlacementZoneId>();

  for (const token of tokens) {
    const zone = tokenToZone(token);
    if (!zone) continue;
    zones.add(zone);
  }

  if (zones.size === 0) {
    zones.add("midground");
  }

  return Array.from(zones);
}

function comparePlants(a: PlacementGuidePlant, b: PlacementGuidePlant): number {
  if (a.beginnerFriendly && !b.beginnerFriendly) return -1;
  if (!a.beginnerFriendly && b.beginnerFriendly) return 1;

  return a.commonName.localeCompare(b.commonName);
}

function uniqueBySlug(plants: PlacementGuidePlant[]): PlacementGuidePlant[] {
  const seen = new Set<string>();
  const unique: PlacementGuidePlant[] = [];

  for (const plant of plants) {
    if (seen.has(plant.slug)) continue;
    seen.add(plant.slug);
    unique.push(plant);
  }

  return unique;
}

export function buildPlacementGuideZones(
  plants: PlacementGuidePlant[],
): PlacementGuideZone[] {
  const grouped: Record<PlantPlacementZoneId, PlacementGuidePlant[]> = {
    foreground: [],
    midground: [],
    background: [],
  };

  for (const plant of plants) {
    const zones = resolvePlantPlacementZones(plant.placement);
    for (const zone of zones) {
      grouped[zone].push(plant);
    }
  }

  return (["foreground", "midground", "background"] as const).map((zoneId) => {
    const meta = ZONE_META[zoneId];
    const recommendedPlants = uniqueBySlug(grouped[zoneId])
      .sort(comparePlants)
      .slice(0, 20);

    return {
      id: zoneId,
      label: meta.label,
      subtitle: meta.subtitle,
      description: meta.description,
      xRangeLabel: meta.xRangeLabel,
      recommendedPlants,
    };
  });
}
