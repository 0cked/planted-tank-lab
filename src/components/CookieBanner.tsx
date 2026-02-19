"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const c of cookies) {
    if (!c) continue;
    if (!c.startsWith(name + "=")) continue;
    return decodeURIComponent(c.slice(name.length + 1));
  }
  return null;
}

function writeCookie(name: string, value: string, days: number): void {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event("ptl_cookie_consent_changed"));
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("ptl_cookie_consent_changed", handler);
  return () => window.removeEventListener("ptl_cookie_consent_changed", handler);
}

export function CookieBanner() {
  const cookieName = "ptl_cookie_consent";

  // Avoid making routes dynamic by never reading request cookies on the server.
  // During SSR/hydration we assume "accepted" to prevent markup mismatch; the
  // real value is read on the client snapshot and React will re-render.
  const choice = useSyncExternalStore(
    subscribe,
    () => readCookie(cookieName),
    () => "accepted",
  );

  const [dismissed, setDismissed] = useState(false);

  const visible = useMemo(() => {
    if (dismissed) return false;
    return choice !== "accepted" && choice !== "declined";
  }, [choice, dismissed]);

  if (!visible) return null;

  return (
    <div
      data-ptl-cookie-banner
      className="fixed inset-x-0 bottom-4 z-50 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:px-0"
    >
      <div
        className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[rgba(172,196,185,0.28)] bg-[rgba(29,43,38,0.86)] p-4 text-white shadow-2xl backdrop-blur-md sm:mx-0 sm:max-w-[540px] sm:flex-row sm:items-center sm:justify-between"
        role="dialog"
        aria-live="polite"
      >
        <div className="text-sm text-white/88">
          <span className="font-semibold">Cookies:</span> we use essential cookies for
          sign-in and saved builds. Optional analytics cookies are off by default.
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="ptl-btn-secondary"
            onClick={() => {
              writeCookie(cookieName, "declined", 180);
              setDismissed(true);
            }}
          >
            No thanks
          </button>
          <button
            type="button"
            className="ptl-btn-primary"
            onClick={() => {
              writeCookie(cookieName, "accepted", 180);
              setDismissed(true);
            }}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
