export type HomeSearchParams = Record<string, string | string[] | undefined> | undefined;

function first(sp: HomeSearchParams, key: string): string | null {
  if (!sp) return null;
  const value = sp[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

/**
 * Home hero FX enablement rules:
 * 1) Explicit preview query `?fx=water-v2` always enables.
 * 2) Explicit query `?fx=off` disables for easy QA.
 * 3) Otherwise controlled by env flag `HERO_WATER_FX_V2`.
 */
export function isHeroWaterFxV2Enabled(params: {
  searchParams: HomeSearchParams;
  envFlag: string | undefined;
}): boolean {
  const preview = (first(params.searchParams, "fx") ?? "").trim().toLowerCase();
  if (preview === "water-v2") return true;
  if (preview === "off") return false;
  return isTruthyFlag(params.envFlag);
}

