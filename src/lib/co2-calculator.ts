export type VolumeUnit = "gal" | "l";

export type Co2CalculatorInput = {
  volume: number;
  volumeUnit: VolumeUnit;
  desiredPpm: number;
  kh: number;
};

export type Co2CalculatorResult = {
  volumeLiters: number;
  volumeGallons: number;
  desiredPpm: number;
  kh: number;
  phTarget: number;
  suggestedBubbleRateBps: number;
  estimatedConsumptionGPerDay: number;
  estimatedConsumptionOzPerDay: number;
};

export type Co2ReferenceRow = {
  ph: number;
  ppmByKh: number[];
};

const LITERS_PER_GALLON = 3.785411784;
const BASELINE_GALLONS_PER_BUBBLE_PER_SECOND = 10;
const BASELINE_TARGET_PPM = 30;
const BASELINE_KH = 4;
const MINIMUM_BUBBLE_RATE_BPS = 0.1;
const BUBBLE_VOLUME_ML = 0.015;
const DOSING_HOURS_PER_DAY = 10;
const CO2_DENSITY_G_PER_L = 1.842;
const OUNCES_PER_GRAM = 0.03527396195;

function sanitizePositive(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  const safeValue = sanitizePositive(value);
  if (from === to) return safeValue;

  if (from === "gal" && to === "l") {
    return safeValue * LITERS_PER_GALLON;
  }

  return safeValue / LITERS_PER_GALLON;
}

export function calculateCo2PpmFromKhPh(kh: number, ph: number): number {
  const safeKh = sanitizePositive(kh);
  const safePh = Number.isFinite(ph) ? ph : 7;
  if (safeKh <= 0) return 0;

  return 3 * safeKh * Math.pow(10, 7 - safePh);
}

export function calculatePhTargetFromKh(co2Ppm: number, kh: number): number {
  const safePpm = sanitizePositive(co2Ppm);
  const safeKh = sanitizePositive(kh);

  if (safePpm <= 0 || safeKh <= 0) return 7;

  return 7 - Math.log10(safePpm / (3 * safeKh));
}

export function estimateBubbleRateBps(
  volumeGallons: number,
  desiredPpm: number,
  kh: number,
): number {
  const safeGallons = sanitizePositive(volumeGallons);
  const safePpm = sanitizePositive(desiredPpm);
  const safeKh = sanitizePositive(kh);

  if (safeGallons <= 0 || safePpm <= 0 || safeKh <= 0) {
    return 0;
  }

  const ppmFactor = safePpm / BASELINE_TARGET_PPM;
  const khFactor = Math.sqrt(safeKh / BASELINE_KH);
  const estimate =
    (safeGallons / BASELINE_GALLONS_PER_BUBBLE_PER_SECOND) * ppmFactor * khFactor;

  return Math.max(MINIMUM_BUBBLE_RATE_BPS, estimate);
}

export function estimateCo2ConsumptionPerDay(bubbleRateBps: number): {
  gramsPerDay: number;
  ouncesPerDay: number;
} {
  const safeBubbleRate = sanitizePositive(bubbleRateBps);
  if (safeBubbleRate <= 0) {
    return {
      gramsPerDay: 0,
      ouncesPerDay: 0,
    };
  }

  const bubblesPerDay = safeBubbleRate * 60 * 60 * DOSING_HOURS_PER_DAY;
  const litersPerDay = (bubblesPerDay * BUBBLE_VOLUME_ML) / 1000;
  const gramsPerDay = litersPerDay * CO2_DENSITY_G_PER_L;

  return {
    gramsPerDay,
    ouncesPerDay: gramsPerDay * OUNCES_PER_GRAM,
  };
}

export function calculateCo2Targets(input: Co2CalculatorInput): Co2CalculatorResult {
  const volumeLiters = convertVolume(input.volume, input.volumeUnit, "l");
  const volumeGallons = convertVolume(volumeLiters, "l", "gal");
  const desiredPpm = sanitizePositive(input.desiredPpm);
  const kh = sanitizePositive(input.kh);

  const phTarget = calculatePhTargetFromKh(desiredPpm, kh);
  const suggestedBubbleRateBps = estimateBubbleRateBps(volumeGallons, desiredPpm, kh);
  const consumption = estimateCo2ConsumptionPerDay(suggestedBubbleRateBps);

  return {
    volumeLiters,
    volumeGallons,
    desiredPpm,
    kh,
    phTarget,
    suggestedBubbleRateBps,
    estimatedConsumptionGPerDay: consumption.gramsPerDay,
    estimatedConsumptionOzPerDay: consumption.ouncesPerDay,
  };
}

export function buildCo2KhPhReferenceTable(phValues: number[], khValues: number[]): Co2ReferenceRow[] {
  const safePhValues = phValues.filter((value) => Number.isFinite(value));
  const safeKhValues = khValues
    .map((value) => sanitizePositive(value))
    .filter((value) => value > 0);

  return safePhValues.map((ph) => ({
    ph,
    ppmByKh: safeKhValues.map((kh) => calculateCo2PpmFromKhPh(kh, ph)),
  }));
}
