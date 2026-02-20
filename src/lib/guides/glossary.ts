export type GlossaryTermLink = {
  label: string;
  href: string;
};

export type GlossaryTermEntry = {
  term: string;
  definition: string;
  links?: readonly GlossaryTermLink[];
};

function glossarySlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function glossaryLetter(term: string): string {
  const match = term.trim().toUpperCase().match(/[A-Z]/);
  return match ? match[0] : "#";
}

export function glossaryTermId(term: string): string {
  return `term-${glossarySlug(term)}`;
}

export function glossaryLetterId(letter: string): string {
  return `letter-${letter.toLowerCase()}`;
}

export const GLOSSARY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const PLANTED_TANK_GLOSSARY: readonly GlossaryTermEntry[] = [
  {
    term: "Algae bloom",
    definition:
      "A rapid algae outbreak, usually triggered by unstable light, excess nutrients, or low plant mass.",
  },
  {
    term: "Ammonia",
    definition:
      "A toxic nitrogen compound produced from waste and decomposing organics, especially dangerous in new tanks.",
    links: [{ label: "Nitrogen cycle guide", href: "/guides/beginners-guide#the-nitrogen-cycle" }],
  },
  {
    term: "Anoxic zone",
    definition:
      "Low-oxygen substrate layer where anaerobic processes dominate; can become problematic if heavily compacted.",
  },
  {
    term: "Aquasoil",
    definition:
      "Nutrient-rich active substrate designed for rooted plants and often used in high-growth aquascapes.",
    links: [{ label: "Substrate calculator", href: "/tools/substrate-calculator" }],
  },
  {
    term: "BBA (Black Beard Algae)",
    definition:
      "Tough, dark filamentous algae commonly linked to inconsistent CO2 and unstable flow patterns.",
  },
  {
    term: "Biofilm",
    definition:
      "A microbial film that forms on surfaces and fresh hardscape, often consumed by shrimp and snails.",
  },
  {
    term: "Bioload",
    definition:
      "Total organic waste pressure from livestock, feeding, and plant decay that the system must process.",
    links: [{ label: "Stocking calculator", href: "/tools/stocking-calculator" }],
  },
  {
    term: "Carpet plant",
    definition:
      "Low-growing species used in the foreground to form a dense, lawn-like planting layer.",
    links: [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  },
  {
    term: "CO2 drop checker",
    definition:
      "A visual indicator that estimates dissolved CO2 using an indicator solution color shift.",
    links: [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  },
  {
    term: "Cycling",
    definition:
      "The startup period where beneficial bacteria establish and convert ammonia into less toxic nitrogen forms.",
    links: [{ label: "Beginner guide", href: "/guides/beginners-guide#the-nitrogen-cycle" }],
  },
  {
    term: "Dosing",
    definition:
      "Adding fertilizers or supplements to supply nutrients needed for plant growth and color.",
    links: [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  },
  {
    term: "Dry start method",
    definition:
      "Technique where carpeting plants establish emersed before flooding the tank for submerged growth.",
    links: [{ label: "Aquascaping styles", href: "/guides/aquascaping-styles" }],
  },
  {
    term: "EI dosing",
    definition:
      "Estimative Index nutrient strategy that doses in excess, then resets with regular large water changes.",
    links: [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  },
  {
    term: "Emersed growth",
    definition:
      "Plant growth form above water, often with thicker leaves than submerged growth.",
  },
  {
    term: "Epiphyte",
    definition:
      "Plant type that attaches to hardscape rather than rooting in substrate, such as Anubias or Java fern.",
    links: [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  },
  {
    term: "Filter turnover",
    definition:
      "How many times per hour a filter circulates the tank volume through mechanical and biological media.",
    links: [{ label: "Products", href: "/products" }],
  },
  {
    term: "Foreground plant",
    definition:
      "Species suited to the front of the tank where low height preserves visibility and scale.",
    links: [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  },
  {
    term: "GDA (Green Dust Algae)",
    definition:
      "Fine green film algae on glass that often appears during early tank stabilization phases.",
  },
  {
    term: "GH (General Hardness)",
    definition:
      "Measure of dissolved calcium and magnesium ions that affect plant and livestock health.",
    links: [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  },
  {
    term: "GSA (Green Spot Algae)",
    definition:
      "Hard green spots on glass and older leaves, often associated with low phosphate availability.",
  },
  {
    term: "Hardscape",
    definition:
      "Non-living structural elements such as stone and wood that define composition and depth.",
    links: [{ label: "Builder", href: "/builder" }],
  },
  {
    term: "High-tech tank",
    definition:
      "Planted tank setup with stronger light, pressurized CO2, and more aggressive nutrient management.",
    links: [{ label: "Browse high-tech builds", href: "/builds?tag=high-tech" }],
  },
  {
    term: "Hydrogen peroxide spot treatment",
    definition:
      "Targeted treatment method for algae patches, used carefully to avoid livestock and plant stress.",
  },
  {
    term: "Iwagumi",
    definition:
      "Minimalist aquascaping style centered on disciplined stone composition and restrained plant palette.",
    links: [{ label: "Iwagumi style guide", href: "/guides/aquascaping-styles#iwagumi" }],
  },
  {
    term: "KH (Carbonate Hardness)",
    definition:
      "Buffering capacity of water that stabilizes pH and influences dissolved CO2 interpretation.",
    links: [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  },
  {
    term: "Midground plant",
    definition:
      "Species used between foreground and background to create transition and depth in layouts.",
    links: [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  },
  {
    term: "Nitrate (NO3)",
    definition:
      "End-product nitrogen form used by plants and controlled with plant mass, maintenance, and water changes.",
    links: [{ label: "Nitrogen cycle guide", href: "/guides/beginners-guide#the-nitrogen-cycle" }],
  },
  {
    term: "Nitrite (NO2)",
    definition:
      "Intermediate nitrogen compound in cycling that is toxic to livestock and should remain near zero.",
    links: [{ label: "Nitrogen cycle guide", href: "/guides/beginners-guide#the-nitrogen-cycle" }],
  },
  {
    term: "NPK",
    definition:
      "Macronutrient shorthand for nitrogen, phosphorus, and potassium in plant fertilization.",
    links: [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  },
  {
    term: "Paludarium",
    definition:
      "Hybrid layout combining aquatic and terrestrial zones in a shared planted environment.",
    links: [{ label: "Browse paludarium builds", href: "/builds?tag=paludarium" }],
  },
  {
    term: "PAR",
    definition:
      "Photosynthetically Active Radiation: usable light intensity reaching plants across the tank.",
    links: [{ label: "Lighting calculator", href: "/tools/lighting-calculator" }],
  },
  {
    term: "Photoperiod",
    definition:
      "Total daily light duration; consistency is usually more important than running very long hours.",
    links: [{ label: "Lighting calculator", href: "/tools/lighting-calculator" }],
  },
  {
    term: "Rhizome",
    definition:
      "Horizontal stem structure on plants like Anubias and Java fern that should not be buried in substrate.",
  },
  {
    term: "Root tab",
    definition:
      "Slow-release fertilizer capsule inserted in substrate near heavy root-feeding plants.",
    links: [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  },
  {
    term: "Runner",
    definition:
      "Horizontal offshoot that propagates new plants, common in carpeting and rosette species.",
  },
  {
    term: "Scape",
    definition:
      "Shorthand for the aquascape layout design, including hardscape composition and plant zoning.",
    links: [{ label: "Builder", href: "/builder" }],
  },
  {
    term: "Staghorn algae",
    definition:
      "Branching gray-green algae typically linked to unstable nutrient balance and fluctuating CO2.",
  },
  {
    term: "Stem plant",
    definition:
      "Fast-growing plant category propagated by trimming and replanting healthy stem tops.",
    links: [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  },
  {
    term: "Submersed growth",
    definition:
      "Plant form adapted for underwater conditions after transition from emersed leaves.",
  },
  {
    term: "Surface agitation",
    definition:
      "Water movement at the surface that improves oxygen exchange but can reduce dissolved CO2.",
    links: [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  },
  {
    term: "TDS (Total Dissolved Solids)",
    definition:
      "Overall dissolved mineral and nutrient concentration, often tracked for shrimp-focused systems.",
    links: [{ label: "Stocking calculator", href: "/tools/stocking-calculator" }],
  },
  {
    term: "Trim and replant",
    definition:
      "Maintenance approach for stem plants where healthy tops are replanted to keep dense growth.",
  },
  {
    term: "Walstad method",
    definition:
      "Low-tech ecosystem-focused approach emphasizing soil substrate, plant mass, and minimal intervention.",
    links: [{ label: "Walstad style guide", href: "/guides/aquascaping-styles#walstad-low-tech" }],
  },
  {
    term: "Water change",
    definition:
      "Routine partial replacement of aquarium water to export waste and maintain stable chemistry.",
    links: [{ label: "Beginner guide", href: "/guides/beginners-guide#first-month-care-schedule" }],
  },
  {
    term: "Water column dosing",
    definition:
      "Fertilizer strategy where nutrients are dosed into the water instead of relying only on root feeding.",
    links: [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  },
] as const;
