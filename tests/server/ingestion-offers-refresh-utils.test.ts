import { describe, expect, test } from "vitest";

import { availabilitySignalFromStatus } from "@/server/ingestion/sources/availability-signal";
import {
  DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS,
  resolveOffersRefreshCutoffDate,
  resolveOffersRefreshWindowHours,
} from "@/server/ingestion/sources/offers-refresh-window";

describe("availabilitySignalFromStatus", () => {
  test("returns true for successful and redirected responses", () => {
    expect(availabilitySignalFromStatus(200)).toBe(true);
    expect(availabilitySignalFromStatus(302)).toBe(true);
  });

  test("returns false only for definitive gone/not-found statuses", () => {
    expect(availabilitySignalFromStatus(404)).toBe(false);
    expect(availabilitySignalFromStatus(410)).toBe(false);
  });

  test("returns null for ambiguous transport or rate-limit statuses", () => {
    expect(availabilitySignalFromStatus(null)).toBeNull();
    expect(availabilitySignalFromStatus(405)).toBeNull();
    expect(availabilitySignalFromStatus(429)).toBeNull();
    expect(availabilitySignalFromStatus(500)).toBeNull();
  });
});

describe("offers refresh window resolution", () => {
  test("prefers explicit hour window over day window", () => {
    expect(
      resolveOffersRefreshWindowHours({ olderThanHours: 6, olderThanDays: 3 }),
    ).toBe(6);
  });

  test("falls back to day window when hour window is omitted", () => {
    expect(resolveOffersRefreshWindowHours({ olderThanDays: 2 })).toBe(48);
  });

  test("uses default window when no explicit override is provided", () => {
    expect(resolveOffersRefreshWindowHours({})).toBe(
      DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS,
    );
  });

  test("resolves deterministic cutoff timestamps", () => {
    const now = new Date("2026-02-12T07:00:00.000Z");

    expect(
      resolveOffersRefreshCutoffDate({ now, olderThanHours: 6 }).toISOString(),
    ).toBe("2026-02-12T01:00:00.000Z");

    expect(
      resolveOffersRefreshCutoffDate({ now, olderThanDays: 1 }).toISOString(),
    ).toBe("2026-02-11T07:00:00.000Z");
  });
});
