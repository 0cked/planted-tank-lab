import { describe, expect, test } from "vitest";

import { deriveOfferSummaryState, formatOfferSummaryCheckedAt } from "@/lib/offer-summary";

describe("offer summary helpers", () => {
  test("returns pending when summary row is missing", () => {
    expect(deriveOfferSummaryState(null)).toEqual({ kind: "pending" });
    expect(deriveOfferSummaryState(undefined)).toEqual({ kind: "pending" });
  });

  test("returns no_in_stock when there is no in-stock priced offer", () => {
    expect(
      deriveOfferSummaryState({
        minPriceCents: null,
        inStockCount: 0,
        staleFlag: false,
        checkedAt: null,
      }),
    ).toEqual({ kind: "no_in_stock" });

    expect(
      deriveOfferSummaryState({
        minPriceCents: 10999,
        inStockCount: 0,
        staleFlag: false,
        checkedAt: null,
      }),
    ).toEqual({ kind: "no_in_stock" });
  });

  test("returns priced with parsed freshness metadata", () => {
    const state = deriveOfferSummaryState({
      minPriceCents: 15999,
      inStockCount: 3,
      staleFlag: true,
      checkedAt: "2026-02-10T15:30:00.000Z",
    });

    expect(state.kind).toBe("priced");
    if (state.kind !== "priced") return;
    expect(state.minPriceCents).toBe(15999);
    expect(state.staleFlag).toBe(true);
    expect(state.checkedAt).toBeInstanceOf(Date);
  });

  test("handles invalid checkedAt values safely", () => {
    const state = deriveOfferSummaryState({
      minPriceCents: 19999,
      inStockCount: 1,
      staleFlag: false,
      checkedAt: "not-a-date",
    });

    expect(state.kind).toBe("priced");
    if (state.kind !== "priced") return;
    expect(state.checkedAt).toBeNull();
    expect(formatOfferSummaryCheckedAt(state.checkedAt)).toBeNull();
  });

  test("formats checkedAt labels with stable locale support", () => {
    const label = formatOfferSummaryCheckedAt(new Date("2026-02-10T12:00:00.000Z"), "en-US");
    expect(label).toContain("2026");
    expect(label).toContain("10");
  });
});
