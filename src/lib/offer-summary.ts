export type OfferSummaryLike =
  | {
      minPriceCents: number | null;
      inStockCount: number;
      staleFlag: boolean;
      checkedAt: Date | string | null;
    }
  | null
  | undefined;

export type OfferSummaryState =
  | { kind: "pending" }
  | { kind: "no_in_stock" }
  | {
      kind: "priced";
      minPriceCents: number;
      staleFlag: boolean;
      checkedAt: Date | null;
    };

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function deriveOfferSummaryState(summary: OfferSummaryLike): OfferSummaryState {
  if (!summary) return { kind: "pending" };
  if (summary.inStockCount <= 0 || summary.minPriceCents == null) return { kind: "no_in_stock" };
  return {
    kind: "priced",
    minPriceCents: summary.minPriceCents,
    staleFlag: summary.staleFlag,
    checkedAt: toDateOrNull(summary.checkedAt),
  };
}

export function formatOfferSummaryCheckedAt(
  value: Date | null,
  locale?: string,
): string | null {
  if (!value) return null;
  return value.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
