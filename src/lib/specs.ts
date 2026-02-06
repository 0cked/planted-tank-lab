type SpecDef = {
  label: string;
  unit?: string;
  order?: number;
  format?: (value: unknown) => string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(", ");
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

const tankSpecDefs: Record<string, SpecDef> = {
  volume_gal: { label: "Volume", unit: "gal", order: 1 },
  volume_liters: { label: "Volume", unit: "L", order: 2 },
  length_in: { label: "Length", unit: "in", order: 3 },
  width_in: { label: "Width", unit: "in", order: 4 },
  height_in: { label: "Height", unit: "in", order: 5 },
  material: { label: "Material", order: 6 },
  rimless: { label: "Rimless", order: 7 },
  filled_weight_lbs: { label: "Filled weight (est.)", unit: "lb", order: 8 },
};

const lightSpecDefs: Record<string, SpecDef> = {
  par_at_substrate: { label: "PAR (substrate)", order: 1 },
  par_at_12in: { label: "PAR (12 in)", order: 2 },
  par_at_18in: { label: "PAR (18 in)", order: 3 },
  par_at_24in: { label: "PAR (24 in)", order: 4 },
  spectrum_kelvin: { label: "Spectrum", unit: "K", order: 5 },
  wattage: { label: "Wattage", unit: "W", order: 6 },
  dimmable: { label: "Dimmable", order: 7 },
  app_controlled: { label: "App-controlled", order: 8 },
  mounting_type: { label: "Mounting type", order: 9 },
  min_tank_length_in: { label: "Min tank length", unit: "in", order: 10 },
  max_tank_length_in: { label: "Max tank length", unit: "in", order: 11 },
  color_channels: { label: "Color channels", order: 12 },
};

export function formatSpecs(params: {
  categorySlug: string;
  specs: unknown;
}): Array<{ key: string; label: string; value: string }> {
  const record = isRecord(params.specs) ? params.specs : {};
  const defs =
    params.categorySlug === "tank"
      ? tankSpecDefs
      : params.categorySlug === "light"
        ? lightSpecDefs
        : ({} satisfies Record<string, SpecDef>);

  const keys = Object.keys(record);
  keys.sort((a, b) => {
    const ao = defs[a]?.order ?? 1000;
    const bo = defs[b]?.order ?? 1000;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });

  return keys.map((key) => {
    const def = defs[key];
    const raw = record[key];
    const formatted = def?.format ? def.format(raw) : null;
    const value = formatted ?? formatValue(raw);
    const withUnit = def?.unit && value !== "—" ? `${value} ${def.unit}` : value;
    return {
      key,
      label: def?.label ?? key,
      value: withUnit,
    };
  });
}

