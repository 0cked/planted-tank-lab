import { describe, expect, it } from "vitest";

import {
  buildPlacementGuideZones,
  resolvePlantPlacementZones,
  type PlacementGuidePlant,
} from "@/lib/plants/placement-guide";

describe("plant placement guide helpers", () => {
  it("maps placement strings into foreground/midground/background zones", () => {
    expect(resolvePlantPlacementZones("foreground")).toEqual(["foreground"]);
    expect(resolvePlantPlacementZones("carpet")).toEqual(["foreground"]);
    expect(resolvePlantPlacementZones("midground")).toEqual(["midground"]);
    expect(resolvePlantPlacementZones("background")).toEqual(["background"]);
    expect(resolvePlantPlacementZones("midground/background").sort()).toEqual([
      "background",
      "midground",
    ]);
    expect(resolvePlantPlacementZones("epiphyte")).toEqual(["midground"]);
    expect(resolvePlantPlacementZones("unknown")).toEqual(["midground"]);
  });

  it("builds zone groupings from plant placement metadata", () => {
    const plants: PlacementGuidePlant[] = [
      {
        slug: "anubias-nana",
        commonName: "Anubias Nana",
        scientificName: "Anubias barteri var. nana",
        placement: "midground",
        beginnerFriendly: true,
      },
      {
        slug: "java-fern",
        commonName: "Java Fern",
        scientificName: "Microsorum pteropus",
        placement: "midground/background",
        beginnerFriendly: true,
      },
      {
        slug: "monte-carlo",
        commonName: "Monte Carlo",
        scientificName: "Micranthemum tweediei",
        placement: "carpet",
      },
      {
        slug: "rotala-rotundifolia",
        commonName: "Rotala Rotundifolia",
        scientificName: "Rotala rotundifolia",
        placement: "background",
      },
    ];

    const zones = buildPlacementGuideZones(plants);

    const foreground = zones.find((zone) => zone.id === "foreground");
    const midground = zones.find((zone) => zone.id === "midground");
    const background = zones.find((zone) => zone.id === "background");

    expect(foreground?.recommendedPlants.map((plant) => plant.slug)).toEqual(["monte-carlo"]);
    expect(midground?.recommendedPlants.map((plant) => plant.slug)).toEqual([
      "anubias-nana",
      "java-fern",
    ]);
    expect(background?.recommendedPlants.map((plant) => plant.slug)).toEqual([
      "java-fern",
      "rotala-rotundifolia",
    ]);
  });

  it("deduplicates plants assigned to multiple placement tokens", () => {
    const duplicated: PlacementGuidePlant[] = [
      {
        slug: "java-fern",
        commonName: "Java Fern",
        scientificName: "Microsorum pteropus",
        placement: "midground,midground",
      },
    ];

    const zones = buildPlacementGuideZones(duplicated);
    const midground = zones.find((zone) => zone.id === "midground");

    expect(midground?.recommendedPlants).toHaveLength(1);
    expect(midground?.recommendedPlants[0]?.slug).toBe("java-fern");
  });
});
