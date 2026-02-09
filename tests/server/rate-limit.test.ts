import { describe, expect, test } from "vitest";

import { createFixedWindowRateLimiter, getRateLimitHeaders } from "@/lib/rate-limit";

describe("rate-limit", () => {
  test("fixed window allows up to limit and then blocks", () => {
    const rl = createFixedWindowRateLimiter({ maxEntries: 1000 });
    const limit = 3;
    const windowMs = 1000;
    const base = 10_000;

    expect(rl.check("k", { limit, windowMs, nowMs: base })).toMatchObject({
      allowed: true,
      limit,
      remaining: 2,
    });
    expect(rl.check("k", { limit, windowMs, nowMs: base + 10 })).toMatchObject({
      allowed: true,
      limit,
      remaining: 1,
    });
    expect(rl.check("k", { limit, windowMs, nowMs: base + 20 })).toMatchObject({
      allowed: true,
      limit,
      remaining: 0,
    });

    const blocked = rl.check("k", { limit, windowMs, nowMs: base + 30 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  test("fixed window resets after window elapses", () => {
    const rl = createFixedWindowRateLimiter({ maxEntries: 1000 });
    const limit = 1;
    const windowMs = 1000;
    const base = 10_000;

    expect(rl.check("k", { limit, windowMs, nowMs: base }).allowed).toBe(true);
    expect(rl.check("k", { limit, windowMs, nowMs: base + 10 }).allowed).toBe(false);

    expect(rl.check("k", { limit, windowMs, nowMs: base + windowMs + 1 }).allowed).toBe(true);
  });

  test("getRateLimitHeaders includes retry-after when blocked", () => {
    const nowMs = 10_000;
    const headers = getRateLimitHeaders(
      { allowed: false, limit: 10, remaining: 0, resetAtMs: nowMs + 5500 },
      { nowMs },
    );
    expect(headers["retry-after"]).toBeDefined();
    expect(headers["x-ratelimit-limit"]).toBe("10");
    expect(headers["x-ratelimit-remaining"]).toBe("0");
    expect(headers["x-ratelimit-reset"]).toBe(String(Math.ceil((nowMs + 5500) / 1000)));
  });
});

