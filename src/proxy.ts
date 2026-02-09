import { NextResponse, type NextRequest } from "next/server";

import { createFixedWindowRateLimiter, getRateLimitHeaders } from "@/lib/rate-limit";

type Rule = {
  id: "go" | "trpc";
  limit: number;
  windowMs: number;
};

const globalForRateLimit = globalThis as unknown as {
  __ptlRateLimiter?: ReturnType<typeof createFixedWindowRateLimiter>;
};

const limiter =
  globalForRateLimit.__ptlRateLimiter ??
  (globalForRateLimit.__ptlRateLimiter = createFixedWindowRateLimiter());

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
  return null;
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const rule = pickRule(pathname);
  if (!rule) return NextResponse.next();

  const ip = getClientIp(req);
  if (!ip) return NextResponse.next();

  const nowMs = Date.now();
  const decision = limiter.check(`${rule.id}:${ip}`, {
    limit: rule.limit,
    windowMs: rule.windowMs,
    nowMs,
  });

  const rlHeaders = getRateLimitHeaders(decision, { nowMs });

  if (!decision.allowed) {
    // Keep the body short; clients should treat this as a retryable failure.
    const headers = new Headers(rlHeaders);
    const isApi = pathname.startsWith("/api/");

    if (isApi) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
    }

    return new NextResponse("Too many requests", { status: 429, headers });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(rlHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: ["/go/:path*", "/api/trpc/:path*"],
};

