const MS_PER_HOUR = 60 * 60 * 1000;

export const DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS = 20;

function toNonNegativeInt(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.floor(value);
}

export function resolveOffersRefreshWindowHours(params: {
  olderThanHours?: number | null;
  olderThanDays?: number | null;
  defaultHours?: number;
}): number {
  const explicitHours = toNonNegativeInt(params.olderThanHours);
  if (explicitHours != null) return explicitHours;

  const explicitDays = toNonNegativeInt(params.olderThanDays);
  if (explicitDays != null) return explicitDays * 24;

  const fallback =
    toNonNegativeInt(params.defaultHours ?? DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS) ??
    DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS;

  return fallback;
}

export function resolveOffersRefreshCutoffDate(params: {
  now?: Date;
  olderThanHours?: number | null;
  olderThanDays?: number | null;
  defaultHours?: number;
}): Date {
  const now = params.now ?? new Date();
  const windowHours = resolveOffersRefreshWindowHours(params);
  return new Date(now.getTime() - windowHours * MS_PER_HOUR);
}
