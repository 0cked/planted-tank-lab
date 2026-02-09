import * as Sentry from "@sentry/nextjs";

const globalForSentryClient = globalThis as unknown as {
  __ptlSentryClientInited?: boolean;
};

function getPublicDsn(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();
  return raw ? raw : null;
}

function stripSearch(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function initSentryClient(): void {
  if (globalForSentryClient.__ptlSentryClientInited) return;
  globalForSentryClient.__ptlSentryClientInited = true;

  const dsn = getPublicDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: (process.env.NODE_ENV ?? "production").trim(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Keep URLs compact and avoid leaking query params.
      if (event.request?.url) {
        event.request.url = stripSearch(event.request.url);
      }
      return event;
    },
  });
}

initSentryClient();

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void {
  // Breadcrumbs make error triage much faster without adding PII.
  if (!getPublicDsn()) return;

  Sentry.addBreadcrumb({
    category: "navigation",
    message: stripSearch(url),
    level: "info",
    data: { navigationType },
  });
}

