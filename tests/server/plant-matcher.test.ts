import { describe, expect, test } from "vitest";

import {
  PLANT_MATCH_CONFIDENCE,
  matchCanonicalPlant,
} from "@/server/normalization/matchers/plant";

describe("plant matcher", () => {
  test("keeps existing canonical mapping first", () => {
    const result = matchCanonicalPlant({
      existingEntityCanonicalId: "plant-existing",
      slug: "ignored",
      scientificName: "ignored",
      existingPlants: [
        {
          id: "plant-existing",
          slug: "existing-slug",
          scientificName: "Existing scientific name",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "plant-existing",
      matchMethod: "identifier_exact",
      confidence: PLANT_MATCH_CONFIDENCE.identifierExact,
    });
  });

  test("uses scientific name deterministic matching when unique", () => {
    const result = matchCanonicalPlant({
      existingEntityCanonicalId: null,
      slug: "anubias-barteri-nana",
      scientificName: "Anubias barteri var. nana",
      existingPlants: [
        {
          id: "plant-1",
          slug: "anubias-nana",
          scientificName: "anubias barteri var nana",
        },
        {
          id: "plant-2",
          slug: "java-fern",
          scientificName: "Microsorum pteropus",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "plant-1",
      matchMethod: "scientific_name_exact",
      confidence: PLANT_MATCH_CONFIDENCE.scientificNameExact,
    });
  });

  test("falls back to slug deterministic matching", () => {
    const result = matchCanonicalPlant({
      existingEntityCanonicalId: null,
      slug: "rotala-rotundifolia",
      scientificName: null,
      existingPlants: [
        {
          id: "plant-11",
          slug: "rotala-rotundifolia",
          scientificName: null,
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "plant-11",
      matchMethod: "slug_exact",
      confidence: PLANT_MATCH_CONFIDENCE.slugExact,
    });
  });

  test("returns new canonical when no deterministic plant match exists", () => {
    const result = matchCanonicalPlant({
      existingEntityCanonicalId: null,
      slug: "unknown-plant",
      scientificName: "Unknownus plantus",
      existingPlants: [
        {
          id: "plant-existing",
          slug: "known-plant",
          scientificName: "Knownus plantus",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: null,
      matchMethod: "new_canonical",
      confidence: PLANT_MATCH_CONFIDENCE.newCanonical,
    });
  });
});
