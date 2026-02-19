export type BeginnerGuideSectionId =
  | "what-is-a-planted-tank"
  | "essential-equipment"
  | "choosing-your-first-plants"
  | "setting-up-the-tank"
  | "the-nitrogen-cycle"
  | "first-month-care-schedule";

export type BeginnerGuideResourceLink = {
  label: string;
  href: string;
};

export type BeginnerGuideEquipmentLink = BeginnerGuideResourceLink & {
  id: "tank" | "light" | "filter" | "substrate" | "co2" | "fertilizer";
  emoji: string;
  description: string;
};

export type BeginnerGuideSetupStep = {
  step: number;
  title: string;
  description: string;
  resources?: BeginnerGuideResourceLink[];
};

export type BeginnerGuideNitrogenCycleStage = {
  id: "ammonia" | "nitrite" | "nitrate";
  title: string;
  window: string;
  description: string;
};

export type BeginnerGuideCareWeek = {
  week: number;
  title: string;
  focus: string;
  checklist: string[];
  resources: BeginnerGuideResourceLink[];
};

export const BEGINNER_GUIDE_SECTION_ORDER: readonly BeginnerGuideSectionId[] = [
  "what-is-a-planted-tank",
  "essential-equipment",
  "choosing-your-first-plants",
  "setting-up-the-tank",
  "the-nitrogen-cycle",
  "first-month-care-schedule",
] as const;

export const BEGINNER_FIRST_PLANTS_LINK = "/plants?difficulty=easy&curated=0";

export const BEGINNER_GUIDE_QUICK_LINKS: ReadonlyArray<{
  id: BeginnerGuideSectionId;
  label: string;
}> = [
  { id: "what-is-a-planted-tank", label: "What is a planted tank?" },
  { id: "essential-equipment", label: "Essential equipment" },
  { id: "choosing-your-first-plants", label: "Choosing your first plants" },
  { id: "setting-up-the-tank", label: "Setting up the tank" },
  { id: "the-nitrogen-cycle", label: "The nitrogen cycle" },
  { id: "first-month-care-schedule", label: "First month care schedule" },
] as const;

export const BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT: readonly BeginnerGuideEquipmentLink[] = [
  {
    id: "tank",
    label: "Starter tanks",
    href: "/products/tank",
    emoji: "🫙",
    description:
      "A manageable 10g-40g footprint gives beginners more stable water chemistry and easier planting access.",
  },
  {
    id: "light",
    label: "Planted lights",
    href: "/products/light",
    emoji: "💡",
    description:
      "Consistent daily light drives plant growth; start in low-to-medium PAR to keep algae pressure manageable.",
  },
  {
    id: "filter",
    label: "Filtration",
    href: "/products/filter",
    emoji: "🌊",
    description:
      "Biological filtration supports bacteria that process waste into plant-usable nitrate.",
  },
  {
    id: "substrate",
    label: "Substrates",
    href: "/products/substrate",
    emoji: "🪨",
    description:
      "A nutrient-rich base with sloped depth helps root feeders establish and creates cleaner composition depth.",
  },
  {
    id: "co2",
    label: "CO₂ systems",
    href: "/products/co2",
    emoji: "🫧",
    description:
      "Optional for first tanks. Add later when you want faster growth or higher light intensity.",
  },
  {
    id: "fertilizer",
    label: "Fertilizers",
    href: "/products/fertilizer",
    emoji: "🧪",
    description:
      "Liquid nutrients cover what fish waste and substrate do not supply, especially in lightly stocked tanks.",
  },
] as const;

export const BEGINNER_GUIDE_SETUP_STEPS: readonly BeginnerGuideSetupStep[] = [
  {
    step: 1,
    title: "Plan dimensions and substrate depth",
    description:
      "Pick a tank size, then target roughly 1 in front and 2-3 in rear substrate depth for root room and visual slope.",
    resources: [
      { label: "Substrate calculator", href: "/tools/substrate-calculator" },
      { label: "Visual builder", href: "/builder" },
    ],
  },
  {
    step: 2,
    title: "Install hardware and hardscape",
    description:
      "Set filter and heater positions before filling. Place rocks and wood dry first so you can iterate quickly.",
    resources: [
      { label: "Filter options", href: "/products/filter" },
      { label: "Hardscape builds", href: "/builds?tag=iwagumi" },
    ],
  },
  {
    step: 3,
    title: "Fill slowly and plant by zone",
    description:
      "Mist substrate, partially fill, then place foreground plants first, midground second, and tall stems last.",
    resources: [
      { label: "Placement guide", href: "/guides/plant-placement" },
      { label: "Beginner plants", href: BEGINNER_FIRST_PLANTS_LINK },
    ],
  },
  {
    step: 4,
    title: "Cycle before heavy stocking",
    description:
      "Run the tank for bacteria establishment before adding full livestock. Introduce fish gradually over multiple weeks.",
    resources: [
      { label: "Stocking calculator", href: "/tools/stocking-calculator" },
      { label: "Water test kits", href: "/products/test_kit" },
    ],
  },
] as const;

export const BEGINNER_GUIDE_NITROGEN_CYCLE: readonly BeginnerGuideNitrogenCycleStage[] = [
  {
    id: "ammonia",
    title: "Ammonia spike",
    window: "Days 1-10",
    description:
      "Organic waste and new substrate release ammonia first. This stage is toxic to livestock and should be monitored.",
  },
  {
    id: "nitrite",
    title: "Nitrite conversion",
    window: "Days 7-21",
    description:
      "Beneficial bacteria convert ammonia into nitrite. Nitrite still stresses livestock, so avoid heavy stocking here.",
  },
  {
    id: "nitrate",
    title: "Nitrate stabilization",
    window: "Days 14-35",
    description:
      "Second-stage bacteria convert nitrite into nitrate. Plants can uptake nitrate, and regular water changes keep it controlled.",
  },
] as const;

export const BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE: readonly BeginnerGuideCareWeek[] = [
  {
    week: 1,
    title: "Week 1 · Settle and observe",
    focus: "Stability over speed",
    checklist: [
      "Run lights 6-7 hours daily while plants establish.",
      "Test ammonia/nitrite every 2-3 days.",
      "Top off evaporation with dechlorinated water only.",
    ],
    resources: [
      { label: "Lighting calculator", href: "/tools/lighting-calculator" },
      { label: "Test kit products", href: "/products/test_kit" },
    ],
  },
  {
    week: 2,
    title: "Week 2 · First trim and clean-up",
    focus: "Prevent algae footholds",
    checklist: [
      "Trim melting or damaged leaves quickly.",
      "Add first small fertilizer dose if growth stalls.",
      "Change 30-40% water once this week.",
    ],
    resources: [
      { label: "Fertilizer calculator", href: "/tools/fertilizer-calculator" },
      { label: "Fertilizer products", href: "/products/fertilizer" },
    ],
  },
  {
    week: 3,
    title: "Week 3 · Expand plant mass",
    focus: "Outcompete algae with healthy growth",
    checklist: [
      "Replant healthy stem tops from your first trims.",
      "Keep photoperiod consistent instead of increasing daily.",
      "Verify nitrite trending toward zero before adding more fish.",
    ],
    resources: [
      { label: "Plant comparison", href: "/plants/compare" },
      { label: "CO₂ calculator", href: "/tools/co2-calculator" },
    ],
  },
  {
    week: 4,
    title: "Week 4 · Routine lock-in",
    focus: "Transition to long-term maintenance",
    checklist: [
      "Set weekly water change + trim day and keep it fixed.",
      "Tune stocking gradually and avoid sudden bio-load jumps.",
      "Save your current setup in the builder as a baseline snapshot.",
    ],
    resources: [
      { label: "Stocking calculator", href: "/tools/stocking-calculator" },
      { label: "Open builder", href: "/builder" },
    ],
  },
] as const;
