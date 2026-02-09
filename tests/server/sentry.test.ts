import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
  setContext: vi.fn(),
};

vi.mock("@sentry/nextjs", () => {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    withScope: vi.fn((cb: (s: typeof scope) => void) => cb(scope)),
    addBreadcrumb: vi.fn(),
  };
});

import * as Sentry from "@sentry/nextjs";

import { captureServerException } from "@/server/observability/sentry";

function resetSentryInitFlag(): void {
  const g = globalThis as unknown as { __ptlSentryInited?: boolean };
  delete g.__ptlSentryInited;
}

describe("sentry server capture", () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryInitFlag();
  });

  afterEach(() => {
    process.env = { ...prevEnv };
    resetSentryInitFlag();
  });

  it("does nothing when SENTRY_DSN is not configured", () => {
    delete process.env.SENTRY_DSN;

    captureServerException(new Error("boom"), { requestId: "r1", route: "/x" });

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("initializes once and captures with tags when configured", () => {
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";

    const err = new Error("boom");
    captureServerException(err, {
      requestId: "req-123",
      route: "/builder",
      tags: { foo: "bar" },
      extra: { x: 1 },
    });

    captureServerException(err, { requestId: "req-123", route: "/builder" });

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);

    expect(scope.setTag).toHaveBeenCalledWith("request_id", "req-123");
    expect(scope.setTag).toHaveBeenCalledWith("route", "/builder");
    expect(scope.setTag).toHaveBeenCalledWith("foo", "bar");
    expect(scope.setExtra).toHaveBeenCalledWith("x", 1);
  });
});
