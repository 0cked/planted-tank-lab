export type StockingSpeciesType = "fish" | "shrimp";

export type StockingBioloadRating = "very-low" | "low" | "medium" | "high";

export type StockingActivityLevel = "sedate" | "moderate" | "active";

export type StockingWaterZone = "surface" | "mid" | "bottom";

export type StockingTemperament = "peaceful" | "semi-aggressive" | "aggressive";

export type StockingStatus = "green" | "yellow" | "red";

export type StockingWarningSeverity = "info" | "warning" | "critical";

export type StockingSpecies = {
  id: string;
  commonName: string;
  scientificName: string;
  type: StockingSpeciesType;
  adultSizeInches: number;
  bioloadRating: StockingBioloadRating;
  activityLevel: StockingActivityLevel;
  waterZone: StockingWaterZone;
  temperament: StockingTemperament;
  minimumTankGallons: number;
  minimumSchoolSize?: number;
  shrimpSafe: boolean;
};

export type StockingSelectionInput = {
  speciesId: string;
  quantity: number;
};

export type StockingSelectionResult = {
  species: StockingSpecies;
  quantity: number;
  effectiveInchesPerSpecimen: number;
  effectiveInches: number;
  baselineSharePercent: number;
};

export type StockingWarning = {
  code: string;
  message: string;
  severity: StockingWarningSeverity;
};

export type StockingCalculatorInput = {
  tankVolumeGallons: number;
  selections: StockingSelectionInput[];
};

export type StockingCalculatorResult = {
  tankVolumeGallons: number;
  baselineCapacityInches: number;
  totalEffectiveInches: number;
  stockingPercent: number;
  status: StockingStatus;
  selections: StockingSelectionResult[];
  warnings: StockingWarning[];
};

const BIOLOAD_MULTIPLIER: Record<StockingBioloadRating, number> = {
  "very-low": 0.35,
  low: 0.5,
  medium: 0.8,
  high: 1.15,
};

const ACTIVITY_MULTIPLIER: Record<StockingActivityLevel, number> = {
  sedate: 0.9,
  moderate: 1,
  active: 1.2,
};

const WATER_ZONE_MULTIPLIER: Record<StockingWaterZone, number> = {
  surface: 0.95,
  mid: 1,
  bottom: 0.85,
};

const STATUS_THRESHOLDS = {
  greenMax: 85,
  yellowMax: 110,
};

const SPECIES: StockingSpecies[] = [
  {
    id: "neon-tetra",
    commonName: "Neon tetra",
    scientificName: "Paracheirodon innesi",
    type: "fish",
    adultSizeInches: 1.5,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "cardinal-tetra",
    commonName: "Cardinal tetra",
    scientificName: "Paracheirodon axelrodi",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 15,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "ember-tetra",
    commonName: "Ember tetra",
    scientificName: "Hyphessobrycon amandae",
    type: "fish",
    adultSizeInches: 1,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "rummy-nose-tetra",
    commonName: "Rummy nose tetra",
    scientificName: "Hemigrammus rhodostomus",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "harlequin-rasbora",
    commonName: "Harlequin rasbora",
    scientificName: "Trigonostigma heteromorpha",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 15,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "chili-rasbora",
    commonName: "Chili rasbora",
    scientificName: "Boraras brigittae",
    type: "fish",
    adultSizeInches: 0.9,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "celestial-pearl-danio",
    commonName: "Celestial pearl danio",
    scientificName: "Danio margaritatus",
    type: "fish",
    adultSizeInches: 1,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 8,
    shrimpSafe: true,
  },
  {
    id: "zebra-danio",
    commonName: "Zebra danio",
    scientificName: "Danio rerio",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: false,
  },
  {
    id: "guppy",
    commonName: "Guppy",
    scientificName: "Poecilia reticulata",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 5,
    shrimpSafe: true,
  },
  {
    id: "platy",
    commonName: "Platy",
    scientificName: "Xiphophorus maculatus",
    type: "fish",
    adultSizeInches: 2.5,
    bioloadRating: "medium",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 5,
    shrimpSafe: true,
  },
  {
    id: "molly",
    commonName: "Molly",
    scientificName: "Poecilia sphenops",
    type: "fish",
    adultSizeInches: 4,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 30,
    minimumSchoolSize: 4,
    shrimpSafe: true,
  },
  {
    id: "swordtail",
    commonName: "Swordtail",
    scientificName: "Xiphophorus hellerii",
    type: "fish",
    adultSizeInches: 4.5,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 30,
    minimumSchoolSize: 4,
    shrimpSafe: true,
  },
  {
    id: "betta",
    commonName: "Betta splendens",
    scientificName: "Betta splendens",
    type: "fish",
    adultSizeInches: 2.5,
    bioloadRating: "medium",
    activityLevel: "sedate",
    waterZone: "surface",
    temperament: "semi-aggressive",
    minimumTankGallons: 10,
    shrimpSafe: false,
  },
  {
    id: "honey-gourami",
    commonName: "Honey gourami",
    scientificName: "Trichogaster chuna",
    type: "fish",
    adultSizeInches: 2.5,
    bioloadRating: "low",
    activityLevel: "sedate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 15,
    shrimpSafe: false,
  },
  {
    id: "dwarf-gourami",
    commonName: "Dwarf gourami",
    scientificName: "Trichogaster lalius",
    type: "fish",
    adultSizeInches: 3,
    bioloadRating: "medium",
    activityLevel: "sedate",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 20,
    shrimpSafe: false,
  },
  {
    id: "pearl-gourami",
    commonName: "Pearl gourami",
    scientificName: "Trichopodus leerii",
    type: "fish",
    adultSizeInches: 4.5,
    bioloadRating: "medium",
    activityLevel: "sedate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 30,
    shrimpSafe: false,
  },
  {
    id: "panda-corydoras",
    commonName: "Panda corydoras",
    scientificName: "Corydoras panda",
    type: "fish",
    adultSizeInches: 2.2,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "sterbai-corydoras",
    commonName: "Sterbai corydoras",
    scientificName: "Corydoras sterbai",
    type: "fish",
    adultSizeInches: 2.8,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "otocinclus",
    commonName: "Otocinclus",
    scientificName: "Otocinclus vittatus",
    type: "fish",
    adultSizeInches: 1.8,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "kuhli-loach",
    commonName: "Kuhli loach",
    scientificName: "Pangio kuhlii",
    type: "fish",
    adultSizeInches: 4,
    bioloadRating: "low",
    activityLevel: "sedate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 5,
    shrimpSafe: true,
  },
  {
    id: "bristlenose-pleco",
    commonName: "Bristlenose pleco",
    scientificName: "Ancistrus cf. cirrhosus",
    type: "fish",
    adultSizeInches: 5,
    bioloadRating: "high",
    activityLevel: "sedate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 30,
    shrimpSafe: true,
  },
  {
    id: "clown-pleco",
    commonName: "Clown pleco",
    scientificName: "Panaqolus maccus",
    type: "fish",
    adultSizeInches: 4,
    bioloadRating: "medium",
    activityLevel: "sedate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 20,
    shrimpSafe: true,
  },
  {
    id: "siamese-algae-eater",
    commonName: "Siamese algae eater",
    scientificName: "Crossocheilus siamensis",
    type: "fish",
    adultSizeInches: 6,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 55,
    minimumSchoolSize: 3,
    shrimpSafe: false,
  },
  {
    id: "german-blue-ram",
    commonName: "German blue ram",
    scientificName: "Mikrogeophagus ramirezi",
    type: "fish",
    adultSizeInches: 2.5,
    bioloadRating: "medium",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "semi-aggressive",
    minimumTankGallons: 20,
    shrimpSafe: false,
  },
  {
    id: "cockatoo-apistogramma",
    commonName: "Cockatoo apistogramma",
    scientificName: "Apistogramma cacatuoides",
    type: "fish",
    adultSizeInches: 3,
    bioloadRating: "medium",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "semi-aggressive",
    minimumTankGallons: 20,
    shrimpSafe: false,
  },
  {
    id: "angelfish",
    commonName: "Angelfish",
    scientificName: "Pterophyllum scalare",
    type: "fish",
    adultSizeInches: 6,
    bioloadRating: "high",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 40,
    shrimpSafe: false,
  },
  {
    id: "discus",
    commonName: "Discus",
    scientificName: "Symphysodon aequifasciatus",
    type: "fish",
    adultSizeInches: 8,
    bioloadRating: "high",
    activityLevel: "sedate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 55,
    minimumSchoolSize: 5,
    shrimpSafe: false,
  },
  {
    id: "tiger-barb",
    commonName: "Tiger barb",
    scientificName: "Puntigrus tetrazona",
    type: "fish",
    adultSizeInches: 3,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "aggressive",
    minimumTankGallons: 30,
    minimumSchoolSize: 8,
    shrimpSafe: false,
  },
  {
    id: "serpae-tetra",
    commonName: "Serpae tetra",
    scientificName: "Hyphessobrycon eques",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 20,
    minimumSchoolSize: 8,
    shrimpSafe: false,
  },
  {
    id: "cherry-barb",
    commonName: "Cherry barb",
    scientificName: "Puntius titteya",
    type: "fish",
    adultSizeInches: 2,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "black-skirt-tetra",
    commonName: "Black skirt tetra",
    scientificName: "Gymnocorymbus ternetzi",
    type: "fish",
    adultSizeInches: 2.8,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 20,
    minimumSchoolSize: 6,
    shrimpSafe: false,
  },
  {
    id: "boesemani-rainbowfish",
    commonName: "Boesemani rainbowfish",
    scientificName: "Melanotaenia boesemani",
    type: "fish",
    adultSizeInches: 4.5,
    bioloadRating: "medium",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 55,
    minimumSchoolSize: 6,
    shrimpSafe: false,
  },
  {
    id: "roseline-shark",
    commonName: "Roseline shark",
    scientificName: "Sahyadria denisonii",
    type: "fish",
    adultSizeInches: 6,
    bioloadRating: "high",
    activityLevel: "active",
    waterZone: "mid",
    temperament: "semi-aggressive",
    minimumTankGallons: 75,
    minimumSchoolSize: 5,
    shrimpSafe: false,
  },
  {
    id: "cherry-shrimp",
    commonName: "Cherry shrimp",
    scientificName: "Neocaridina davidi",
    type: "shrimp",
    adultSizeInches: 1.5,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 5,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "amano-shrimp",
    commonName: "Amano shrimp",
    scientificName: "Caridina multidentata",
    type: "shrimp",
    adultSizeInches: 2,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 10,
    minimumSchoolSize: 4,
    shrimpSafe: true,
  },
  {
    id: "crystal-red-shrimp",
    commonName: "Crystal red shrimp",
    scientificName: "Caridina cantonensis",
    type: "shrimp",
    adultSizeInches: 1.2,
    bioloadRating: "very-low",
    activityLevel: "moderate",
    waterZone: "bottom",
    temperament: "peaceful",
    minimumTankGallons: 5,
    minimumSchoolSize: 6,
    shrimpSafe: true,
  },
  {
    id: "bamboo-shrimp",
    commonName: "Bamboo shrimp",
    scientificName: "Atyopsis moluccensis",
    type: "shrimp",
    adultSizeInches: 3,
    bioloadRating: "low",
    activityLevel: "moderate",
    waterZone: "mid",
    temperament: "peaceful",
    minimumTankGallons: 20,
    minimumSchoolSize: 2,
    shrimpSafe: true,
  },
];

const SPECIES_MAP = new Map(SPECIES.map((species) => [species.id, species]));

function sanitizePositive(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function sanitizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function joinNames(names: string[]): string {
  const uniqueNames = [...new Set(names)];
  if (uniqueNames.length === 0) return "";
  if (uniqueNames.length === 1) return uniqueNames[0] ?? "";
  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} and ${uniqueNames[1]}`;
  }

  const allButLast = uniqueNames.slice(0, -1);
  const last = uniqueNames[uniqueNames.length - 1];
  return `${allButLast.join(", ")}, and ${last}`;
}

function getCapacityWarning(volume: number, selection: StockingSelectionResult): StockingWarning | null {
  if (volume >= selection.species.minimumTankGallons) return null;

  return {
    code: `tank-size:${selection.species.id}`,
    severity: "warning",
    message: `${selection.species.commonName} is usually recommended for ${selection.species.minimumTankGallons}+ gallons.`,
  };
}

function getSchoolingWarning(selection: StockingSelectionResult): StockingWarning | null {
  const minimumSchoolSize = selection.species.minimumSchoolSize;
  if (!minimumSchoolSize || selection.quantity >= minimumSchoolSize || selection.quantity === 0) {
    return null;
  }

  return {
    code: `school-size:${selection.species.id}`,
    severity: "info",
    message: `${selection.species.commonName} does best in groups of ${minimumSchoolSize}+ (currently ${selection.quantity}).`,
  };
}

function getShrimpRiskWarning(selections: StockingSelectionResult[]): StockingWarning | null {
  const hasShrimp = selections.some((selection) => selection.species.type === "shrimp");
  if (!hasShrimp) return null;

  const riskyFish = selections.filter(
    (selection) =>
      selection.species.type === "fish" &&
      !selection.species.shrimpSafe &&
      selection.species.temperament !== "peaceful",
  );

  if (riskyFish.length === 0) return null;

  const containsAggressiveFish = riskyFish.some(
    (selection) => selection.species.temperament === "aggressive",
  );

  return {
    code: "shrimp-risk",
    severity: containsAggressiveFish ? "critical" : "warning",
    message: `Shrimp may be harassed or eaten by ${joinNames(riskyFish.map((selection) => selection.species.commonName))}.`,
  };
}

function getTemperamentWarning(selections: StockingSelectionResult[]): StockingWarning | null {
  const aggressiveFish = selections.filter(
    (selection) =>
      selection.species.type === "fish" && selection.species.temperament === "aggressive",
  );

  if (aggressiveFish.length === 0) return null;

  const peacefulFish = selections.filter(
    (selection) =>
      selection.species.type === "fish" && selection.species.temperament === "peaceful",
  );

  if (peacefulFish.length === 0) return null;

  return {
    code: "temperament-mix",
    severity: "warning",
    message: `${joinNames(aggressiveFish.map((selection) => selection.species.commonName))} may bully peaceful species like ${joinNames(
      peacefulFish.map((selection) => selection.species.commonName),
    )}.`,
  };
}

function getStockingWarning(status: StockingStatus, stockingPercent: number): StockingWarning | null {
  if (status === "green") return null;

  if (status === "yellow") {
    return {
      code: "near-capacity",
      severity: "warning",
      message:
        "You are near the classic 1 inch per gallon baseline. Increase filtration and maintenance if you add more fish.",
    };
  }

  const overByPercent = Math.max(0, stockingPercent - 100);

  return {
    code: "overstocked",
    severity: "critical",
    message: `Stocking is ${overByPercent.toFixed(1)}% above the baseline capacity. Consider reducing fish count or moving to a larger tank.`,
  };
}

function resolveSelections(input: StockingSelectionInput[], capacityInches: number): StockingSelectionResult[] {
  return input
    .map((selection) => {
      const species = SPECIES_MAP.get(selection.speciesId);
      if (!species) return null;

      const quantity = sanitizeQuantity(selection.quantity);
      if (quantity === 0) return null;

      const effectiveInchesPerSpecimen =
        species.adultSizeInches *
        BIOLOAD_MULTIPLIER[species.bioloadRating] *
        ACTIVITY_MULTIPLIER[species.activityLevel] *
        WATER_ZONE_MULTIPLIER[species.waterZone];

      const effectiveInches = effectiveInchesPerSpecimen * quantity;
      const baselineSharePercent = capacityInches > 0 ? (effectiveInches / capacityInches) * 100 : 0;

      return {
        species,
        quantity,
        effectiveInchesPerSpecimen,
        effectiveInches,
        baselineSharePercent,
      };
    })
    .filter((selection): selection is StockingSelectionResult => selection !== null)
    .sort((a, b) => b.effectiveInches - a.effectiveInches);
}

function buildWarnings(
  tankVolumeGallons: number,
  status: StockingStatus,
  stockingPercent: number,
  selections: StockingSelectionResult[],
): StockingWarning[] {
  const baseWarnings = selections.flatMap((selection) => {
    const warnings: StockingWarning[] = [];

    const capacityWarning = getCapacityWarning(tankVolumeGallons, selection);
    if (capacityWarning) warnings.push(capacityWarning);

    const schoolingWarning = getSchoolingWarning(selection);
    if (schoolingWarning) warnings.push(schoolingWarning);

    return warnings;
  });

  const additionalWarnings = [
    getShrimpRiskWarning(selections),
    getTemperamentWarning(selections),
    getStockingWarning(status, stockingPercent),
  ].filter((warning): warning is StockingWarning => warning !== null);

  return [...baseWarnings, ...additionalWarnings];
}

export const STOCKING_SPECIES = SPECIES;

export function getStockingSpeciesById(speciesId: string): StockingSpecies | null {
  return SPECIES_MAP.get(speciesId) ?? null;
}

export function getBioloadLabel(rating: StockingBioloadRating): string {
  if (rating === "very-low") return "Very low";
  if (rating === "low") return "Low";
  if (rating === "medium") return "Medium";
  return "High";
}

export function getSpeciesTypeLabel(type: StockingSpeciesType): string {
  return type === "fish" ? "Fish" : "Shrimp";
}

export function getStockingStatus(stockingPercent: number): StockingStatus {
  const safeStockingPercent = sanitizePositive(stockingPercent);

  if (safeStockingPercent <= STATUS_THRESHOLDS.greenMax) return "green";
  if (safeStockingPercent <= STATUS_THRESHOLDS.yellowMax) return "yellow";
  return "red";
}

export function getStockingStatusLabel(status: StockingStatus): string {
  if (status === "green") return "Comfortable";
  if (status === "yellow") return "Near limit";
  return "Overstocked";
}

export function calculateStockingLevel(input: StockingCalculatorInput): StockingCalculatorResult {
  const tankVolumeGallons = sanitizePositive(input.tankVolumeGallons);
  const baselineCapacityInches = tankVolumeGallons;

  const selections = resolveSelections(input.selections, baselineCapacityInches);

  const totalEffectiveInches = selections.reduce(
    (sum, selection) => sum + selection.effectiveInches,
    0,
  );

  const stockingPercent =
    baselineCapacityInches > 0 ? (totalEffectiveInches / baselineCapacityInches) * 100 : 0;

  const status = getStockingStatus(stockingPercent);

  return {
    tankVolumeGallons,
    baselineCapacityInches,
    totalEffectiveInches,
    stockingPercent,
    status,
    selections,
    warnings: buildWarnings(tankVolumeGallons, status, stockingPercent, selections),
  };
}
