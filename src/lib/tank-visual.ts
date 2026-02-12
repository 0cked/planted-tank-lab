function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export type TankVisualDimensions = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
};

export function getTankVisualDimensions(specs: unknown): TankVisualDimensions | null {
  const row = asRecord(specs);
  if (!row) return null;

  const lengthIn =
    asNumber(row.length_in) ??
    asNumber(row.tank_length_in) ??
    asNumber(row.max_tank_length_in);
  const widthIn = asNumber(row.width_in) ?? asNumber(row.depth_in);
  const heightIn = asNumber(row.height_in);

  if (lengthIn == null || widthIn == null || heightIn == null) return null;
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;

  return { lengthIn, widthIn, heightIn };
}

export function tankModelFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith("uns-")) return trimmed.slice(4).toUpperCase();
  return trimmed.toUpperCase();
}

export function buildTankIllustrationUrl(params: {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  label?: string | null;
}): string {
  const query = new URLSearchParams({
    l: String(clamp(params.lengthIn, 1, 300)),
    w: String(clamp(params.widthIn, 1, 300)),
    h: String(clamp(params.heightIn, 1, 300)),
  });

  const label = params.label?.trim();
  if (label) query.set("label", label.slice(0, 24));

  return `/api/tank-illustration?${query.toString()}`;
}

