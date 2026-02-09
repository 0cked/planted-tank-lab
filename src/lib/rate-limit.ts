export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
};

type Bucket = {
  count: number;
  resetAtMs: number;
};

export type FixedWindowRateLimiter = {
  check: (key: string, params: { limit: number; windowMs: number; nowMs?: number }) => RateLimitDecision;
};

export function createFixedWindowRateLimiter(opts?: { maxEntries?: number }): FixedWindowRateLimiter {
  const maxEntries = Math.max(1000, opts?.maxEntries ?? 10_000);
  const buckets = new Map<string, Bucket>();

  function prune(nowMs: number): void {
    // Remove expired buckets first.
    for (const [k, b] of buckets) {
      if (b.resetAtMs <= nowMs) buckets.delete(k);
    }

    // If we are still too large, reset entirely. This trades strictness for safety.
    if (buckets.size > maxEntries) buckets.clear();
  }

  function check(
    key: string,
    params: { limit: number; windowMs: number; nowMs?: number },
  ): RateLimitDecision {
    const nowMs = params.nowMs ?? Date.now();
    const limit = Math.max(0, Math.floor(params.limit));
    const windowMs = Math.max(1, Math.floor(params.windowMs));

    if (!key) {
      return { allowed: true, limit, remaining: limit, resetAtMs: nowMs + windowMs };
    }

    if (buckets.size > maxEntries * 2) prune(nowMs);

    const existing = buckets.get(key);
    let bucket: Bucket;
    if (!existing || existing.resetAtMs <= nowMs) {
      bucket = { count: 0, resetAtMs: nowMs + windowMs };
      buckets.set(key, bucket);
    } else {
      bucket = existing;
    }

    if (bucket.count >= limit) {
      return { allowed: false, limit, remaining: 0, resetAtMs: bucket.resetAtMs };
    }

    bucket.count += 1;
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAtMs: bucket.resetAtMs,
    };
  }

  return { check };
}

export function getRateLimitHeaders(
  decision: RateLimitDecision,
  params: { nowMs: number },
): Record<string, string> {
  const resetSeconds = Math.ceil(decision.resetAtMs / 1000);
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(decision.limit),
    "x-ratelimit-remaining": String(decision.remaining),
    "x-ratelimit-reset": String(resetSeconds),
  };

  if (!decision.allowed) {
    const retryAfterSeconds = Math.max(0, Math.ceil((decision.resetAtMs - params.nowMs) / 1000));
    headers["retry-after"] = String(retryAfterSeconds);
  }

  return headers;
}

