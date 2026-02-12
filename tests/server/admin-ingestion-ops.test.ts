import { describe, expect, test } from "vitest";

import {
  classifyRecoveryCandidates,
  computeFreshnessPercent,
} from "@/server/services/admin/ingestion-ops";

describe("admin ingestion ops helpers", () => {
  test("computeFreshnessPercent handles empty and rounds to 2 decimals", () => {
    expect(computeFreshnessPercent({ checkedWithinWindow: 0, total: 0 })).toBe(0);
    expect(computeFreshnessPercent({ checkedWithinWindow: 9, total: 10 })).toBe(90);
    expect(computeFreshnessPercent({ checkedWithinWindow: 7, total: 9 })).toBe(77.78);
  });

  test("classifyRecoveryCandidates selects stale queued, stuck running, and failed jobs", () => {
    const now = new Date("2026-02-12T09:00:00.000Z");
    const rows = [
      {
        id: "queued-stale",
        status: "queued",
        runAfter: new Date("2026-02-12T05:30:00.000Z"),
        lockedAt: null,
      },
      {
        id: "queued-fresh",
        status: "queued",
        runAfter: new Date("2026-02-12T08:50:00.000Z"),
        lockedAt: null,
      },
      {
        id: "running-stuck",
        status: "running",
        runAfter: new Date("2026-02-12T08:00:00.000Z"),
        lockedAt: new Date("2026-02-12T07:30:00.000Z"),
      },
      {
        id: "running-fresh",
        status: "running",
        runAfter: new Date("2026-02-12T08:40:00.000Z"),
        lockedAt: new Date("2026-02-12T08:45:00.000Z"),
      },
      {
        id: "failed-one",
        status: "failed",
        runAfter: new Date("2026-02-12T08:00:00.000Z"),
        lockedAt: null,
      },
    ];

    const result = classifyRecoveryCandidates({
      rows,
      now,
      staleQueuedMinutes: 120,
      stuckRunningMinutes: 45,
    });

    expect(result.staleQueuedIds).toEqual(["queued-stale"]);
    expect(result.stuckRunningIds).toEqual(["running-stuck"]);
    expect(result.failedIds).toEqual(["failed-one"]);
  });
});
