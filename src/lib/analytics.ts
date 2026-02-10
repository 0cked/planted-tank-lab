"use client";

const CONSENT_COOKIE = "ptl_cookie_consent";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const c of cookies) {
    if (!c) continue;
    if (!c.startsWith(name + "=")) continue;
    try {
      return decodeURIComponent(c.slice(name.length + 1));
    } catch {
      return c.slice(name.length + 1);
    }
  }
  return null;
}

export type AnalyticsEventName = "builder_started" | "share_created" | "signup_completed";

export function hasAnalyticsConsent(): boolean {
  return readCookie(CONSENT_COOKIE) === "accepted";
}

export async function trackEvent(
  name: AnalyticsEventName,
  props?: { buildId?: string; meta?: Record<string, unknown> },
): Promise<void> {
  if (!hasAnalyticsConsent()) return;

  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        buildId: props?.buildId,
        meta: props?.meta,
      }),
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

export function markSignupTracked(userId: string): boolean {
  // Returns true if we should emit the signup_completed event.
  if (!hasAnalyticsConsent()) return false;
  if (typeof window === "undefined") return false;

  try {
    const key = `ptl_signup_tracked:${userId}`;
    const existing = window.localStorage.getItem(key);
    if (existing === "1") return false;
    window.localStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}
