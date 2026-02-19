export type GlossaryTermLink = {
  label: string;
  href: string;
};

export type GlossaryTerm = {
  id: string;
  term: string;
  letter: string;
  definition: string;
  links: readonly GlossaryTermLink[];
};

function toGlossaryId(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function glossaryTerm(
  term: string,
  definition: string,
  links: readonly GlossaryTermLink[] = [],
): GlossaryTerm {
  const letter = term.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? "#";
  return {
    id: toGlossaryId(term),
    term,
    letter,
    definition,
    links,
  };
}

const RAW_GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  glossaryTerm(
    "Aeration",
    "Gas exchange at the water surface that helps maintain oxygen and release excess carbon dioxide.",
    [{ label: "Beginner guide", href: "/guides/beginners-guide" }],
  ),
  glossaryTerm(
    "Algae Bloom",
    "A sudden increase in algae growth, usually triggered by unstable light, nutrients, or plant mass.",
    [{ label: "First month care", href: "/guides/beginners-guide#first-month-care-schedule" }],
  ),
  glossaryTerm(
    "Aquascape",
    "The visual composition of plants, hardscape, and negative space inside an aquarium.",
    [
      { label: "Visual builder", href: "/builder" },
      { label: "Community builds", href: "/builds" },
    ],
  ),
  glossaryTerm(
    "BBA (Black Beard Algae)",
    "A tough dark algae that often appears on hardscape and slow-growing leaves under unstable CO2 conditions.",
  ),
  glossaryTerm(
    "Biofilm",
    "A thin bacterial layer that forms on surfaces and can be a normal food source for shrimp and fry.",
    [{ label: "Stocking calculator", href: "/tools/stocking-calculator" }],
  ),
  glossaryTerm(
    "Carpet Plant",
    "Low-growing species used in the foreground to create a lawn-like effect.",
    [
      { label: "Plant placement guide", href: "/guides/plant-placement" },
      { label: "Foreground plants", href: "/plants?placement=foreground&curated=0" },
    ],
  ),
  glossaryTerm(
    "Chlorosis",
    "Leaf yellowing caused by nutrient deficiency, poor uptake, or unstable root conditions.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
  glossaryTerm(
    "CO2 Injection",
    "Adding carbon dioxide to speed plant growth and support demanding species under stronger lighting.",
    [
      { label: "CO2 calculator", href: "/tools/co2-calculator" },
      { label: "CO2 products", href: "/products/co2" },
    ],
  ),
  glossaryTerm(
    "Cyanobacteria",
    "A photosynthetic bacterial film often mistaken for algae that spreads quickly in low-flow dead spots.",
  ),
  glossaryTerm(
    "Drop Checker",
    "A visual indicator that changes color to estimate dissolved CO2 concentration in planted tanks.",
    [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  ),
  glossaryTerm(
    "Dry Start Method (DSM)",
    "Technique where foreground plants are grown emersed in high humidity before the tank is flooded.",
    [
      { label: "Plant placement guide", href: "/guides/plant-placement" },
      { label: "Substrate calculator", href: "/tools/substrate-calculator" },
    ],
  ),
  glossaryTerm(
    "EI Dosing (Estimative Index)",
    "A nutrient dosing strategy that intentionally doses excess macros and micros, then resets with water changes.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
  glossaryTerm(
    "Emersed Growth",
    "Plant growth above the waterline, common in nurseries and during dry starts.",
    [{ label: "Beginner guide", href: "/guides/beginners-guide" }],
  ),
  glossaryTerm(
    "Fertilizer Dosing",
    "Adding macro and micro nutrients to keep plants supplied when fish waste and substrate are not enough.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
  glossaryTerm(
    "Flow Rate",
    "The volume of water moved by filtration, influencing nutrient transport and debris suspension.",
    [{ label: "Filter products", href: "/products/filter" }],
  ),
  glossaryTerm(
    "Foreground Plant",
    "Short plants placed at the front to frame hardscape and establish depth transitions.",
    [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  ),
  glossaryTerm(
    "GDA (Green Dust Algae)",
    "Fine green film on glass that usually wipes away and often appears in new or unstable systems.",
  ),
  glossaryTerm(
    "GH (General Hardness)",
    "Measurement of dissolved calcium and magnesium that affects mineral availability and livestock health.",
    [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  ),
  glossaryTerm(
    "GSA (Green Spot Algae)",
    "Hard green spots on glass and leaves, often associated with nutrient imbalance and long photoperiods.",
  ),
  glossaryTerm(
    "Hardscape",
    "Non-living structural materials such as rocks and wood used to establish composition and scale.",
    [
      { label: "Iwagumi builds", href: "/builds?tag=iwagumi" },
      { label: "Visual builder", href: "/builder" },
    ],
  ),
  glossaryTerm(
    "High-tech Tank",
    "A planted setup using stronger light, pressurized CO2, and frequent maintenance for faster growth.",
    [
      { label: "High-tech builds", href: "/builds?tag=high-tech" },
      { label: "CO2 calculator", href: "/tools/co2-calculator" },
    ],
  ),
  glossaryTerm(
    "Iron Deficiency",
    "A common micronutrient shortage that can show as pale new growth and reduced red coloration.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
  glossaryTerm(
    "KH (Carbonate Hardness)",
    "Buffering capacity of water that helps stabilize pH and is a core input for CO2 target estimates.",
    [{ label: "CO2 calculator", href: "/tools/co2-calculator" }],
  ),
  glossaryTerm(
    "Low-tech Tank",
    "A slower-growth planted setup that favors lower light and reduced equipment complexity.",
    [
      { label: "Low-tech builds", href: "/builds?tag=low-tech" },
      { label: "Aquascaping styles", href: "/guides/aquascaping-styles#walstad-low-tech" },
    ],
  ),
  glossaryTerm(
    "Lumen",
    "A measure of visible light output; useful for fixture comparisons but less useful than PAR at substrate level.",
    [{ label: "Lighting calculator", href: "/tools/lighting-calculator" }],
  ),
  glossaryTerm(
    "Melt (Plant Melt)",
    "Temporary dieback after transplanting as plants adapt from emersed to submersed growth.",
    [{ label: "First month care", href: "/guides/beginners-guide#first-month-care-schedule" }],
  ),
  glossaryTerm(
    "Midground Plant",
    "Plants placed between foreground and background to bridge scale and hide hardscape seams.",
    [{ label: "Plant placement guide", href: "/guides/plant-placement" }],
  ),
  glossaryTerm(
    "Nitrate (NO3)",
    "A nitrogen nutrient used by plants and one output stage of the aquarium nitrogen cycle.",
    [
      { label: "Nitrogen cycle", href: "/guides/beginners-guide#the-nitrogen-cycle" },
      { label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" },
    ],
  ),
  glossaryTerm(
    "Nitrogen Cycle",
    "Biological conversion of ammonia to nitrite and then nitrate by beneficial bacteria.",
    [{ label: "Beginner guide section", href: "/guides/beginners-guide#the-nitrogen-cycle" }],
  ),
  glossaryTerm(
    "Nutrient Uptake",
    "Process where plants absorb nutrients through roots and leaves based on demand, flow, and lighting.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
  glossaryTerm(
    "Osmotic Shock",
    "Stress response when livestock or plants experience a rapid change in dissolved solids or salinity.",
    [{ label: "Stocking calculator", href: "/tools/stocking-calculator" }],
  ),
  glossaryTerm(
    "PAR (Photosynthetically Active Radiation)",
    "The amount of usable light plants receive, measured at different depths and zones in the tank.",
    [{ label: "Lighting calculator", href: "/tools/lighting-calculator" }],
  ),
  glossaryTerm(
    "Photoperiod",
    "The daily light duration. Longer is not always better; consistency matters more than raw hours.",
    [{ label: "Lighting calculator", href: "/tools/lighting-calculator" }],
  ),
  glossaryTerm(
    "Propagation",
    "Growing new plants from cuttings, runners, or rhizome division to increase plant mass.",
    [{ label: "Plants browser", href: "/plants?curated=0" }],
  ),
  glossaryTerm(
    "Rhizome",
    "A horizontal stem found in plants like anubias and java fern that should stay above substrate.",
    [{ label: "Rhizome plants", href: "/plants?q=Anubias&curated=0" }],
  ),
  glossaryTerm(
    "Root Tab",
    "Slow-release fertilizer tablet pushed into substrate for heavy root-feeding plants.",
    [{ label: "Substrate products", href: "/products/substrate" }],
  ),
  glossaryTerm(
    "Runner",
    "Horizontal shoot that creates daughter plants, common in species like vallisneria and sagittaria.",
    [{ label: "Runner plants", href: "/plants?q=Vallisneria&curated=0" }],
  ),
  glossaryTerm(
    "Staghorn Algae",
    "Branch-like gray or dark algae that appears on edges and often signals inconsistent CO2 or flow.",
  ),
  glossaryTerm(
    "Stem Plant",
    "Fast-growing species trimmed and replanted from tops, often used for background mass and nutrient uptake.",
    [{ label: "Background plants", href: "/plants?placement=background&curated=0" }],
  ),
  glossaryTerm(
    "Submersed Growth",
    "Plant growth form underwater, often with different leaf shape and color than emersed form.",
    [{ label: "Beginner guide", href: "/guides/beginners-guide" }],
  ),
  glossaryTerm(
    "Substrate Cap",
    "Top layer of sand or fine gravel placed over nutrient soil to control clouding and release.",
    [{ label: "Substrate calculator", href: "/tools/substrate-calculator" }],
  ),
  glossaryTerm(
    "Surface Skimming",
    "Removing protein film and floating debris from the top of the water to improve gas exchange and clarity.",
    [{ label: "Filter products", href: "/products/filter" }],
  ),
  glossaryTerm(
    "TDS (Total Dissolved Solids)",
    "A conductivity-based estimate of dissolved minerals and compounds in aquarium water.",
  ),
  glossaryTerm(
    "Trim and Replant",
    "Maintenance method where fast stems are cut and healthy tops replanted to keep dense growth.",
    [{ label: "First month care", href: "/guides/beginners-guide#first-month-care-schedule" }],
  ),
  glossaryTerm(
    "Walstad Method",
    "Low-tech, ecosystem-driven approach using rich substrate, plant biomass, and minimal equipment.",
    [
      { label: "Walstad style guide", href: "/guides/aquascaping-styles#walstad-low-tech" },
      { label: "Low-tech builds", href: "/builds?tag=low-tech" },
    ],
  ),
  glossaryTerm(
    "Water Change Regime",
    "A consistent schedule and percentage for replacing water to stabilize nutrients and waste levels.",
    [{ label: "First month care", href: "/guides/beginners-guide#first-month-care-schedule" }],
  ),
  glossaryTerm(
    "Water Column Dosing",
    "Dosing liquid nutrients directly into the water for uptake through leaves and stems.",
    [{ label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" }],
  ),
] as const;

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [...RAW_GLOSSARY_TERMS].sort((a, b) =>
  a.term.localeCompare(b.term),
);

export const GLOSSARY_LETTERS: readonly string[] = Array.from(
  new Set(GLOSSARY_TERMS.map((term) => term.letter)),
);
