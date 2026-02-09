import * as Sentry from "@sentry/nextjs";

type TagValue = string | number | boolean;

export type CaptureOpts = {
  requestId?: string | null;
  route?: string | null;
  tags?: Record<string, TagValue | null | undefined>;
  extra?: Record<string, unknown>;
};

const globalForSentry = globalThis as unknown as {
  __ptlSentryInited?: boolean;
};

function envTrimmed(name: string): string | null {
  const raw = (process.env[name] ?? "").trim();
  return raw ? raw : null;
}

function getServerDsn(): string | null {
  // DSN isn't a secret, but keep server config separate from the public client env var.
  return envTrimmed("SENTRY_DSN");
}

function getEnvironment(): string {
  return (process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production").trim();
}

function getRelease(): string | undefined {
  // Prefer Vercel's git sha when available.
  const sha =
    envTrimmed("VERCEL_GIT_COMMIT_SHA") ??
    envTrimmed("VERCEL_GITHUB_COMMIT_SHA") ??
    envTrimmed("GITHUB_SHA");
  return sha ?? undefined;
}

function stripSearch(url: string): string {
  try {
    // Handle relative paths by providing an origin.
    const u = new URL(url, "https://plantedtanklab.invalid");
    u.search = "";
    u.hash = "";
    // Keep output compact and avoid leaking a fake origin.
    return u.pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function initSentryServer(): void {
  if (globalForSentry.__ptlSentryInited) return;
  globalForSentry.__ptlSentryInited = true;

  const dsn = getServerDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: getEnvironment(),
    release: getRelease(),
    sendDefaultPii: false,
    // Keep v1 focused on error reporting, not APM.
    tracesSampleRate: 0,
    beforeSend(event) {
      // Be defensive: avoid shipping headers/cookies even if a default integration adds them.
      if (event.request) {
        delete (event.request as unknown as { headers?: unknown }).headers;
        delete (event.request as unknown as { cookies?: unknown }).cookies;

        const url = (event.request as unknown as { url?: unknown }).url;
        if (typeof url === "string" && url) {
          (event.request as unknown as { url?: string }).url = stripSearch(url);
        }
      }
      return event;
    },
  });
}

export function sentryEnabledServer(): boolean {
  return Boolean(getServerDsn());
}

export function captureServerException(error: unknown, opts: CaptureOpts = {}): void {
  initSentryServer();
  if (!getServerDsn()) return;

  Sentry.withScope((scope) => {
    if (opts.requestId) scope.setTag("request_id", opts.requestId);
    if (opts.route) scope.setTag("route", opts.route);

    if (opts.tags) {
      for (const [k, v] of Object.entries(opts.tags)) {
        if (v === null || v === undefined) continue;
        scope.setTag(k, String(v));
      }
    }

    if (opts.extra) {
      for (const [k, v] of Object.entries(opts.extra)) {
        scope.setExtra(k, v);
      }
    }

    Sentry.captureException(error);
  });
}
