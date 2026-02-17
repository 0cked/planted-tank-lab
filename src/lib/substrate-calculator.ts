export type LengthUnit = "in" | "cm";

export type SubstrateMaterial = "aquasoil" | "sand" | "gravel";

export type SubstrateWeightEstimate = {
  key: SubstrateMaterial;
  label: string;
  densityKgPerLiter: number;
  kilograms: number;
  pounds: number;
};

export type SubstrateVolumeInput = {
  length: number;
  width: number;
  frontDepth: number;
  backDepth: number;
  unit: LengthUnit;
};

export type SubstrateVolumeResult = {
  lengthIn: number;
  widthIn: number;
  frontDepthIn: number;
  backDepthIn: number;
  averageDepthIn: number;
  volumeCubicIn: number;
  volumeLiters: number;
};

const CM_PER_INCH = 2.54;
const CUBIC_INCHES_PER_LITER = 61.0237440947323;
const POUNDS_PER_KILOGRAM = 2.2046226218;

const SUBSTRATE_DENSITY_KG_PER_LITER: Record<SubstrateMaterial, { label: string; value: number }> = {
  aquasoil: {
    label: "Aquasoil",
    value: 0.75,
  },
  sand: {
    label: "Sand",
    value: 1.6,
  },
  gravel: {
    label: "Gravel",
    value: 1.5,
  },
};

function sanitizeDimension(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const safeValue = sanitizeDimension(value);
  if (from === to) return safeValue;

  if (from === "cm" && to === "in") {
    return safeValue / CM_PER_INCH;
  }

  return safeValue * CM_PER_INCH;
}

export function calculateSubstrateVolume(input: SubstrateVolumeInput): SubstrateVolumeResult {
  const lengthIn = convertLength(input.length, input.unit, "in");
  const widthIn = convertLength(input.width, input.unit, "in");
  const frontDepthIn = convertLength(input.frontDepth, input.unit, "in");
  const backDepthIn = convertLength(input.backDepth, input.unit, "in");

  const averageDepthIn = (frontDepthIn + backDepthIn) / 2;
  const volumeCubicIn = lengthIn * widthIn * averageDepthIn;

  return {
    lengthIn,
    widthIn,
    frontDepthIn,
    backDepthIn,
    averageDepthIn,
    volumeCubicIn,
    volumeLiters: volumeCubicIn / CUBIC_INCHES_PER_LITER,
  };
}

export function estimateSubstrateWeight(volumeLiters: number): SubstrateWeightEstimate[] {
  const safeVolumeLiters = sanitizeDimension(volumeLiters);

  return (Object.entries(SUBSTRATE_DENSITY_KG_PER_LITER) as Array<
    [SubstrateMaterial, { label: string; value: number }]
  >).map(([key, density]) => {
    const kilograms = safeVolumeLiters * density.value;

    return {
      key,
      label: density.label,
      densityKgPerLiter: density.value,
      kilograms,
      pounds: kilograms * POUNDS_PER_KILOGRAM,
    };
  });
}
