export type PlantMatchMethod =
  | "identifier_exact"
  | "scientific_name_exact"
  | "slug_exact"
  | "new_canonical";

export const PLANT_MATCH_CONFIDENCE = {
  identifierExact: 100,
  scientificNameExact: 97,
  slugExact: 94,
  newCanonical: 80,
} as const;

export type ExistingCanonicalPlant = {
  id: string;
  slug: string;
  scientificName: string | null;
};

export type MatchCanonicalPlantParams = {
  existingEntityCanonicalId: string | null;
  slug: string;
  scientificName: string | null;
  existingPlants: ExistingCanonicalPlant[];
};

export type PlantMatchResult = {
  canonicalId: string | null;
  matchMethod: PlantMatchMethod;
  confidence: number;
};

function normalizeScientificName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSingleMatchId(values: Iterable<string>): string | null {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] ?? null : null;
}

export function matchCanonicalPlant(
  params: MatchCanonicalPlantParams,
): PlantMatchResult {
  const existingById = new Map(
    params.existingPlants.map((plant) => [plant.id, plant] as const),
  );

  if (
    params.existingEntityCanonicalId &&
    existingById.has(params.existingEntityCanonicalId)
  ) {
    return {
      canonicalId: params.existingEntityCanonicalId,
      matchMethod: "identifier_exact",
      confidence: PLANT_MATCH_CONFIDENCE.identifierExact,
    };
  }

  const scientificName = params.scientificName
    ? normalizeScientificName(params.scientificName)
    : null;
  if (scientificName) {
    const matchIds = params.existingPlants
      .filter((plant) => plant.scientificName)
      .filter(
        (plant) =>
          normalizeScientificName(plant.scientificName as string) === scientificName,
      )
      .map((plant) => plant.id);

    const canonicalId = getSingleMatchId(matchIds);
    if (canonicalId) {
      return {
        canonicalId,
        matchMethod: "scientific_name_exact",
        confidence: PLANT_MATCH_CONFIDENCE.scientificNameExact,
      };
    }
  }

  const normalizedSlug = normalizeSlug(params.slug);
  const slugMatches = params.existingPlants
    .filter((plant) => normalizeSlug(plant.slug) === normalizedSlug)
    .map((plant) => plant.id);
  const slugCanonicalId = getSingleMatchId(slugMatches);
  if (slugCanonicalId) {
    return {
      canonicalId: slugCanonicalId,
      matchMethod: "slug_exact",
      confidence: PLANT_MATCH_CONFIDENCE.slugExact,
    };
  }

  return {
    canonicalId: null,
    matchMethod: "new_canonical",
    confidence: PLANT_MATCH_CONFIDENCE.newCanonical,
  };
}
