import type { Metadata } from "next";

import { PlantPlacementGuideClient } from "@/app/guides/plant-placement/PlantPlacementGuideClient";
import { buildPlacementGuideZones } from "@/lib/plants/placement-guide";
import { getServerCaller } from "@/server/trpc/server-caller";

const GUIDE_TITLE = "Planted Aquarium Layout Guide - Where to Place Your Plants.";
const GUIDE_DESCRIPTION =
  "Learn how to layer foreground, midground, and background plants in a planted aquarium and browse recommended species for each zone.";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  openGraph: {
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url: "/guides/plant-placement",
  },
};

export default async function PlantPlacementGuidePage() {
  const caller = await getServerCaller();
  const plants = await caller.plants.list({ limit: 500 });

  const zones = buildPlacementGuideZones(
    plants.map((plant) => ({
      slug: plant.slug,
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      placement: plant.placement,
      difficulty: plant.difficulty,
      lightDemand: plant.lightDemand,
      co2Demand: plant.co2Demand,
      beginnerFriendly: plant.beginnerFriendly,
    })),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <PlantPlacementGuideClient zones={zones} />
    </main>
  );
}
