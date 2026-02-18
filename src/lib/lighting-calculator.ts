export type LightType = "led" | "t5" | "t8";

export type LightingParBand = "low" | "medium" | "high";

export type LightingSuitability = "low-tech" | "medium" | "high-tech";

export type LightingCalculatorInput = {
  wattage: number;
  tankDepthInches: number;
  mountingHeightInches: number;
  lightType: LightType;
};

export type LightingCalculatorResult = {
  wattage: number;
  tankDepthInches: number;
  mountingHeightInches: number;
  totalDistanceInches: number;
  estimatedPar: number;
  parBand: LightingParBand;
  suitability: LightingSuitability;
};

type LightTypeConfig = {
  label: string;
  photonEfficiency: number;
};

const LIGHT_TYPE_CONFIG: Record<LightType, LightTypeConfig> = {
  led: {
    label: "LED",
    photonEfficiency: 1.35,
  },
  t5: {
    label: "T5",
    photonEfficiency: 1.05,
  },
  t8: {
    label: "T8",
    photonEfficiency: 0.82,
  },
};

const WATER_ABSORPTION_PER_INCH = 0.018;
const PAR_CALIBRATION_FACTOR = 6.2;
const MIN_TOTAL_DISTANCE_INCHES = 4;

function sanitizePositive(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function getLightTypeLabel(lightType: LightType): string {
  return LIGHT_TYPE_CONFIG[lightType].label;
}

export function classifyParBand(par: number): LightingParBand {
  const safePar = sanitizePositive(par);

  if (safePar < 40) return "low";
  if (safePar < 80) return "medium";
  return "high";
}

export function classifyLightingSuitability(par: number): LightingSuitability {
  const band = classifyParBand(par);

  if (band === "low") return "low-tech";
  if (band === "medium") return "medium";
  return "high-tech";
}

export function calculateLightingPar(input: LightingCalculatorInput): LightingCalculatorResult {
  const wattage = sanitizePositive(input.wattage);
  const tankDepthInches = sanitizePositive(input.tankDepthInches);
  const mountingHeightInches = sanitizePositive(input.mountingHeightInches);
  const lightTypeConfig = LIGHT_TYPE_CONFIG[input.lightType];

  const totalDistanceInches = Math.max(
    MIN_TOTAL_DISTANCE_INCHES,
    tankDepthInches + mountingHeightInches,
  );

  const distanceFeet = totalDistanceInches / 12;
  const inverseSquareFactor = 1 / Math.max(distanceFeet ** 2, 0.1);
  const absorptionFactor = Math.exp(-WATER_ABSORPTION_PER_INCH * tankDepthInches);

  const estimatedPar =
    wattage * lightTypeConfig.photonEfficiency * inverseSquareFactor * absorptionFactor * PAR_CALIBRATION_FACTOR;

  return {
    wattage,
    tankDepthInches,
    mountingHeightInches,
    totalDistanceInches,
    estimatedPar,
    parBand: classifyParBand(estimatedPar),
    suitability: classifyLightingSuitability(estimatedPar),
  };
}
