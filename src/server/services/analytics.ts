import { cookies } from "next/headers";

export const ANALYTICS_CONSENT_COOKIE = "ptl_cookie_consent";

export function hasAnalyticsConsentFromCookieHeader(cookieHeader: string | null): boolean {
  const raw = cookieHeader ?? "";
  // Very small cookie parser to avoid pulling dependencies.
  // Format: "a=b; c=d".
  const parts = raw.split(";");
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith(ANALYTICS_CONSENT_COOKIE + "=")) continue;
    const v = trimmed.slice(ANALYTICS_CONSENT_COOKIE.length + 1);
    try {
      return decodeURIComponent(v) === "accepted";
    } catch {
      return v === "accepted";
    }
  }
  return false;
}

export async function hasAnalyticsConsentFromNextCookies(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(ANALYTICS_CONSENT_COOKIE)?.value === "accepted";
  } catch {
    return false;
  }
}
