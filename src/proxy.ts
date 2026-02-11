import { NextResponse, type NextRequest } from "next/server";

import { createFixedWindowRateLimiter, getRateLimitHeaders } from "@/lib/rate-limit";

type Rule = {
  id: "go" | "trpc" | "auth";
  limit: number;
  windowMs: number;
};

const globalForRateLimit = globalThis as unknown as {
  __ptlRateLimiter?: ReturnType<typeof createFixedWindowRateLimiter>;
};

const limiter =
  globalForRateLimit.__ptlRateLimiter ??
  (globalForRateLimit.__ptlRateLimiter = createFixedWindowRateLimiter());

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function firstIpFromXff(xff: string | null): string | null {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first ? first : null;
}

function getClientIp(req: NextRequest): string | null {
  return (
    firstIpFromXff(req.headers.get("x-forwarded-for")) ??
    req.headers.get("x-real-ip")?.trim() ??
    null
  );
}

function pickRule(pathname: string): Rule | null {
  if (pathname.startsWith("/go/")) return { id: "go", limit: 60, windowMs: 60_000 };
  if (pathname.startsWith("/api/trpc/")) return { id: "trpc", limit: 300, windowMs: 60_000 };
  // Limit magic-link send attempts to reduce abuse.
  if (pathname.startsWith("/api/auth/signin/email")) return { id: "auth", limit: 12, windowMs: 60_000 };
  return null;
}

export function proxy(req: NextRequest) {
  // Canonicalize host in production so auth cookies and OAuth callbacks stay deterministic.
  // NextAuth uses host-only cookies (e.g. `__Host-*`), so apex and `www.` would otherwise be
  // effectively separate sites with separate sessions.
  if (process.env.NODE_ENV === "production") {
    const hostHeader = (req.headers.get("host") ?? "").toLowerCase();
    const hostname = hostHeader.split(":")[0] ?? "";
    if (hostname === "www.plantedtanklab.com") {
      const url = req.nextUrl.clone();
      url.hostname = "plantedtanklab.com";
      // Fly forwards internally on :8080; strip it from the canonical redirect target.
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
  }

  const pathname = req.nextUrl.pathname;
  const requestId = req.headers.get("x-request-id")?.slice(0, 200) ?? newRequestId();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const rule = pickRule(pathname);
  if (!rule) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const ip = getClientIp(req);
  if (!ip) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const nowMs = Date.now();
  const decision = limiter.check(`${rule.id}:${ip}`, {
    limit: rule.limit,
    windowMs: rule.windowMs,
    nowMs,
  });

  const rlHeaders = getRateLimitHeaders(decision, { nowMs });
  rlHeaders["x-request-id"] = requestId;

  if (!decision.allowed) {
    // Keep the body short; clients should treat this as a retryable failure.
    const headers = new Headers(rlHeaders);
    const isApi = pathname.startsWith("/api/");

    if (isApi) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
    }

    return new NextResponse("Too many requests", { status: 429, headers });
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [k, v] of Object.entries(rlHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  // Run for all app routes so canonical host redirect applies everywhere.
  // Skip static assets and Next internals.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
