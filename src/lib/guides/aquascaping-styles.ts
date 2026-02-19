import type { BuildTagSlug } from "@/lib/build-tags";

export type AquascapingStyleGuideId =
  | "nature-aquarium"
  | "dutch"
  | "iwagumi"
  | "jungle"
  | "walstad-low-tech";

export type AquascapingStyleGuidePlant = {
  label: string;
  href: string;
};

export type AquascapingStyleGuideDifficulty = {
  rating: 1 | 2 | 3 | 4 | 5;
  label: "Beginner" | "Easy-Intermediate" | "Intermediate" | "Advanced";
  summary: string;
};

export type AquascapingStyleGuideEntry = {
  id: AquascapingStyleGuideId;
  name: string;
  buildTag: BuildTagSlug;
  description: string;
  keyCharacteristics: readonly string[];
  recommendedPlants: readonly AquascapingStyleGuidePlant[];
  recommendedHardscape: readonly string[];
  exampleTankDimensions: string;
  difficulty: AquascapingStyleGuideDifficulty;
};

function plantSearchHref(query: string): string {
  return `/plants?q=${encodeURIComponent(query)}&curated=0`;
}

export const AQUASCAPING_STYLE_GUIDE: readonly AquascapingStyleGuideEntry[] = [
  {
    id: "nature-aquarium",
    name: "Nature Aquarium (Amano)",
    buildTag: "nature",
    description:
      "Naturalistic compositions inspired by terrestrial landscapes, with asymmetry, open negative space, and one clear focal flow.",
    keyCharacteristics: [
      "Triangular or concave composition with directional flow.",
      "Layered plant heights to mimic meadows, shrubs, and tree canopies.",
      "Strong foreground-to-background depth built with substrate slope.",
      "High trimming discipline to preserve the intended silhouette.",
    ],
    recommendedPlants: [
      { label: "Rotala rotundifolia", href: plantSearchHref("Rotala rotundifolia") },
      { label: "Monte Carlo", href: plantSearchHref("Micranthemum monte carlo") },
      { label: "Dwarf hairgrass", href: plantSearchHref("Eleocharis acicularis") },
      { label: "Java fern", href: plantSearchHref("Microsorum pteropus") },
    ],
    recommendedHardscape: [
      "Branching driftwood that establishes directional movement.",
      "Supporting stones tucked into planting mounds.",
      "Fine foreground sand lane used sparingly for contrast.",
    ],
    exampleTankDimensions: "36 x 18 x 18 in (roughly 50 gallons)",
    difficulty: {
      rating: 4,
      label: "Advanced",
      summary: "Demanding planting density, regular pruning, and consistent light/CO2 balance.",
    },
  },
  {
    id: "dutch",
    name: "Dutch",
    buildTag: "dutch",
    description:
      "Plant-dominant layouts focused on color grouping, leaf contrast, and manicured terraces rather than heavy hardscape.",
    keyCharacteristics: [
      "Distinct plant streets with color and texture contrast.",
      "Minimal visible hardscape and a strong horticultural focus.",
      "Tight spacing and frequent pruning for geometric structure.",
      "High stem-plant volume to keep dense, layered rows.",
    ],
    recommendedPlants: [
      { label: "Ludwigia repens", href: plantSearchHref("Ludwigia repens") },
      { label: "Hygrophila corymbosa", href: plantSearchHref("Hygrophila corymbosa") },
      { label: "Alternanthera reineckii", href: plantSearchHref("Alternanthera reineckii") },
      { label: "Limnophila sessiliflora", href: plantSearchHref("Limnophila sessiliflora") },
    ],
    recommendedHardscape: [
      "Very limited wood or stone, often hidden by plant mass.",
      "Dark, nutrient-rich substrate to support heavy root feeding.",
      "Subtle back-slope only, preserving visual rows.",
    ],
    exampleTankDimensions: "48 x 18 x 20 in (roughly 75 gallons)",
    difficulty: {
      rating: 5,
      label: "Advanced",
      summary: "High maintenance style with strict trimming cadence and nutrient management.",
    },
  },
  {
    id: "iwagumi",
    name: "Iwagumi",
    buildTag: "iwagumi",
    description:
      "Minimal stone-centric design built around disciplined rock placement and open foreground carpets.",
    keyCharacteristics: [
      "Single dominant stone with supporting companion stones.",
      "Sparse plant palette to keep attention on stone composition.",
      "Large negative space and low visual clutter.",
      "Strong use of odd-number groupings and directional tilt.",
    ],
    recommendedPlants: [
      { label: "Dwarf hairgrass mini", href: plantSearchHref("Eleocharis mini") },
      { label: "Glossostigma", href: plantSearchHref("Glossostigma elatinoides") },
      { label: "Monte Carlo", href: plantSearchHref("Micranthemum monte carlo") },
      { label: "Marsilea hirsuta", href: plantSearchHref("Marsilea hirsuta") },
    ],
    recommendedHardscape: [
      "Seiryu-style or similar texture-rich stone sets.",
      "Minimal or no driftwood; rock is the visual anchor.",
      "Fine-grain substrate with a clean front edge.",
    ],
    exampleTankDimensions: "24 x 12 x 14 in (roughly 17 gallons)",
    difficulty: {
      rating: 3,
      label: "Intermediate",
      summary: "Simple palette but unforgiving composition and algae control in open layouts.",
    },
  },
  {
    id: "jungle",
    name: "Jungle",
    buildTag: "jungle",
    description:
      "Dense, overgrown look with mixed textures, heavy biomass, and intentionally wild transitions between zones.",
    keyCharacteristics: [
      "High plant density with layered broadleaf and stem species.",
      "Organic, less formal shape language than Dutch or Iwagumi.",
      "Mature canopy effect from tall background growth.",
      "Visual richness prioritized over strict symmetry.",
    ],
    recommendedPlants: [
      { label: "Java fern", href: plantSearchHref("Microsorum pteropus") },
      { label: "Anubias barteri", href: plantSearchHref("Anubias barteri") },
      { label: "Cryptocoryne wendtii", href: plantSearchHref("Cryptocoryne wendtii") },
      { label: "Vallisneria", href: plantSearchHref("Vallisneria spiralis") },
    ],
    recommendedHardscape: [
      "Branching driftwood networks that disappear into plant mass.",
      "Rounded stone accents used as secondary anchors.",
      "Deep substrate in rear corners for tall root feeders.",
    ],
    exampleTankDimensions: "36 x 18 x 24 in (roughly 67 gallons)",
    difficulty: {
      rating: 2,
      label: "Easy-Intermediate",
      summary: "Forgiving style if biomass is high, but still requires pruning to avoid overcrowding.",
    },
  },
  {
    id: "walstad-low-tech",
    name: "Walstad / Low-tech",
    buildTag: "low-tech",
    description:
      "Ecosystem-first approach centered on lower light, slower growth, and balanced biological processes with minimal hardware.",
    keyCharacteristics: [
      "Lower light and slower growth with less aggressive intervention.",
      "Plant and microbial balance prioritized over rapid sculpted growth.",
      "Low-tech equipment stack with moderate stocking and feeding.",
      "Long-term stability over fast visual turnover.",
    ],
    recommendedPlants: [
      { label: "Anubias nana", href: plantSearchHref("Anubias nana") },
      { label: "Java moss", href: plantSearchHref("Taxiphyllum barbieri") },
      { label: "Cryptocoryne lutea", href: plantSearchHref("Cryptocoryne lutea") },
      { label: "Dwarf sagittaria", href: plantSearchHref("Sagittaria subulata") },
    ],
    recommendedHardscape: [
      "Natural wood and small river stones with gentle transitions.",
      "Nutrient substrate capped with sand or fine gravel.",
      "Leaf litter or botanicals used in moderation for habitat texture.",
    ],
    exampleTankDimensions: "20 x 10 x 12 in (roughly 10 gallons)",
    difficulty: {
      rating: 2,
      label: "Beginner",
      summary: "Lower demand style that rewards patience and stable routines over constant tuning.",
    },
  },
] as const;
