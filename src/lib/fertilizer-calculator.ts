export type FertilizerMethod = "ei" | "pps-pro";

export type FertilizerVolumeUnit = "gal" | "l";

export type FertilizerCompoundKey = "kno3" | "kh2po4" | "k2so4" | "csm-b";

export type FertilizerDose = {
  key: FertilizerCompoundKey;
  label: string;
  gramsPerTeaspoon: number;
  gramsPerDose: number;
  teaspoonsPerDose: number;
  dosesPerWeek: number;
  gramsPerWeek: number;
  teaspoonsPerWeek: number;
};

export type FertilizerScheduleDose = {
  key: FertilizerCompoundKey;
  label: string;
  grams: number;
  teaspoons: number;
};

export type FertilizerScheduleEntry = {
  day: string;
  focus: string;
  note: string;
  doses: FertilizerScheduleDose[];
};

export type FertilizerCalculatorInput = {
  volume: number;
  volumeUnit: FertilizerVolumeUnit;
  method: FertilizerMethod;
};

export type FertilizerCalculatorResult = {
  volumeGallons: number;
  volumeLiters: number;
  method: FertilizerMethod;
  doses: FertilizerDose[];
  schedule: FertilizerScheduleEntry[];
};

type FertilizerCompoundConfig = {
  label: string;
  gramsPerTeaspoon: number;
  eiTeaspoonsPerDoseAt40Gallons: number;
  eiDosesPerWeek: number;
  ppsProStockGramsPerMl: number;
};

const LITERS_PER_GALLON = 3.785411784;
const EI_REFERENCE_GALLONS = 40;
const PPS_PRO_GALLONS_PER_ML = 10;

const COMPOUND_KEYS: FertilizerCompoundKey[] = ["kno3", "kh2po4", "k2so4", "csm-b"];

const COMPOUND_CONFIG: Record<FertilizerCompoundKey, FertilizerCompoundConfig> = {
  kno3: {
    label: "KNO3",
    gramsPerTeaspoon: 6,
    eiTeaspoonsPerDoseAt40Gallons: 0.5,
    eiDosesPerWeek: 3,
    ppsProStockGramsPerMl: 29.4 / 500,
  },
  kh2po4: {
    label: "KH2PO4",
    gramsPerTeaspoon: 6,
    eiTeaspoonsPerDoseAt40Gallons: 0.125,
    eiDosesPerWeek: 3,
    ppsProStockGramsPerMl: 2.65 / 500,
  },
  k2so4: {
    label: "K2SO4",
    gramsPerTeaspoon: 6,
    eiTeaspoonsPerDoseAt40Gallons: 0.25,
    eiDosesPerWeek: 3,
    ppsProStockGramsPerMl: 20.8 / 500,
  },
  "csm-b": {
    label: "CSM+B trace mix",
    gramsPerTeaspoon: 5,
    eiTeaspoonsPerDoseAt40Gallons: 0.125,
    eiDosesPerWeek: 3,
    ppsProStockGramsPerMl: 14.7 / 500,
  },
};

function sanitizePositive(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function createDose(
  key: FertilizerCompoundKey,
  gramsPerDose: number,
  teaspoonsPerDose: number,
  dosesPerWeek: number,
): FertilizerDose {
  const config = COMPOUND_CONFIG[key];

  return {
    key,
    label: config.label,
    gramsPerTeaspoon: config.gramsPerTeaspoon,
    gramsPerDose,
    teaspoonsPerDose,
    dosesPerWeek,
    gramsPerWeek: gramsPerDose * dosesPerWeek,
    teaspoonsPerWeek: teaspoonsPerDose * dosesPerWeek,
  };
}

function buildEiDoses(volumeGallons: number): FertilizerDose[] {
  const scale = EI_REFERENCE_GALLONS > 0 ? volumeGallons / EI_REFERENCE_GALLONS : 0;

  return COMPOUND_KEYS.map((key) => {
    const config = COMPOUND_CONFIG[key];
    const teaspoonsPerDose = config.eiTeaspoonsPerDoseAt40Gallons * scale;
    const gramsPerDose = teaspoonsPerDose * config.gramsPerTeaspoon;

    return createDose(key, gramsPerDose, teaspoonsPerDose, config.eiDosesPerWeek);
  });
}

function buildPpsProDoses(volumeGallons: number): FertilizerDose[] {
  const dailyDoseMl = volumeGallons / PPS_PRO_GALLONS_PER_ML;

  return COMPOUND_KEYS.map((key) => {
    const config = COMPOUND_CONFIG[key];
    const gramsPerDose = dailyDoseMl * config.ppsProStockGramsPerMl;
    const teaspoonsPerDose =
      config.gramsPerTeaspoon > 0 ? gramsPerDose / config.gramsPerTeaspoon : 0;

    return createDose(key, gramsPerDose, teaspoonsPerDose, 7);
  });
}

function toDoseMap(doses: FertilizerDose[]): Map<FertilizerCompoundKey, FertilizerDose> {
  return new Map(doses.map((dose) => [dose.key, dose]));
}

function createScheduleDose(dose: FertilizerDose): FertilizerScheduleDose {
  return {
    key: dose.key,
    label: dose.label,
    grams: dose.gramsPerDose,
    teaspoons: dose.teaspoonsPerDose,
  };
}

function pickScheduleDoses(
  doseMap: Map<FertilizerCompoundKey, FertilizerDose>,
  keys: FertilizerCompoundKey[],
): FertilizerScheduleDose[] {
  return keys
    .map((key) => {
      const dose = doseMap.get(key);
      if (!dose) return null;
      return createScheduleDose(dose);
    })
    .filter((dose): dose is FertilizerScheduleDose => dose !== null);
}

function buildEiSchedule(doses: FertilizerDose[]): FertilizerScheduleEntry[] {
  const doseMap = toDoseMap(doses);
  const macroDoseKeys: FertilizerCompoundKey[] = ["kno3", "kh2po4", "k2so4"];
  const macroDoses = pickScheduleDoses(doseMap, macroDoseKeys);
  const traceDoses = pickScheduleDoses(doseMap, ["csm-b"]);

  return [
    {
      day: "Monday",
      focus: "Macro day",
      note: "Dose KNO3, KH2PO4, and K2SO4.",
      doses: macroDoses,
    },
    {
      day: "Tuesday",
      focus: "Trace day",
      note: "Dose CSM+B trace mix.",
      doses: traceDoses,
    },
    {
      day: "Wednesday",
      focus: "Macro day",
      note: "Repeat macro dose.",
      doses: macroDoses,
    },
    {
      day: "Thursday",
      focus: "Trace day",
      note: "Repeat trace dose.",
      doses: traceDoses,
    },
    {
      day: "Friday",
      focus: "Macro day",
      note: "Repeat macro dose.",
      doses: macroDoses,
    },
    {
      day: "Saturday",
      focus: "Trace day",
      note: "Repeat trace dose.",
      doses: traceDoses,
    },
    {
      day: "Sunday",
      focus: "Reset",
      note: "50% water change and no dry dosing.",
      doses: [],
    },
  ];
}

function buildPpsProSchedule(doses: FertilizerDose[]): FertilizerScheduleEntry[] {
  const doseMap = toDoseMap(doses);
  const dailyDoses = pickScheduleDoses(doseMap, COMPOUND_KEYS);
  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return weekDays.map((day) => ({
    day,
    focus: "Daily PPS-Pro dose",
    note:
      day === "Sunday"
        ? "Dose all nutrients. Optional weekly water change if plant mass is high."
        : "Dose all nutrients.",
    doses: dailyDoses,
  }));
}

function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatDoseLine(dose: FertilizerScheduleDose): string {
  return `${dose.label}: ${formatNumber(dose.grams, 3)} g (${formatNumber(dose.teaspoons, 4)} tsp)`;
}

export function convertFertilizerVolume(
  value: number,
  from: FertilizerVolumeUnit,
  to: FertilizerVolumeUnit,
): number {
  const safeValue = sanitizePositive(value);
  if (from === to) return safeValue;

  if (from === "gal" && to === "l") {
    return safeValue * LITERS_PER_GALLON;
  }

  return safeValue / LITERS_PER_GALLON;
}

export function getFertilizerMethodLabel(method: FertilizerMethod): string {
  if (method === "ei") return "Estimative Index (EI)";
  return "PPS-Pro";
}

export function getFertilizerMethodDescription(method: FertilizerMethod): string {
  if (method === "ei") {
    return "Higher nutrient dosing with three macro and three trace days, plus a weekly reset water change.";
  }

  return "Lean daily dosing across all nutrients to maintain steadier nutrient levels.";
}

export function calculateFertilizerDosing(
  input: FertilizerCalculatorInput,
): FertilizerCalculatorResult {
  const volume = sanitizePositive(input.volume);
  const volumeGallons = convertFertilizerVolume(volume, input.volumeUnit, "gal");
  const volumeLiters = convertFertilizerVolume(volumeGallons, "gal", "l");

  const doses = input.method === "ei" ? buildEiDoses(volumeGallons) : buildPpsProDoses(volumeGallons);

  return {
    volumeGallons,
    volumeLiters,
    method: input.method,
    doses,
    schedule: input.method === "ei" ? buildEiSchedule(doses) : buildPpsProSchedule(doses),
  };
}

export function formatFertilizerSchedule(result: FertilizerCalculatorResult): string {
  const header = `${getFertilizerMethodLabel(result.method)} dosing schedule (${formatNumber(result.volumeGallons, 1)} gal / ${formatNumber(result.volumeLiters, 1)} L)`;

  const weeklyTotals = result.doses.map(
    (dose) =>
      `${dose.label}: ${formatNumber(dose.gramsPerWeek, 3)} g/week (${formatNumber(dose.teaspoonsPerWeek, 4)} tsp/week)`,
  );

  const scheduleLines = result.schedule.map((entry) => {
    if (entry.doses.length === 0) {
      return `${entry.day}: ${entry.focus} — ${entry.note}`;
    }

    const doseSummary = entry.doses.map((dose) => formatDoseLine(dose)).join("; ");
    return `${entry.day}: ${entry.focus} — ${doseSummary}`;
  });

  return [header, "", "Weekly totals:", ...weeklyTotals, "", "Daily plan:", ...scheduleLines].join("\n");
}
