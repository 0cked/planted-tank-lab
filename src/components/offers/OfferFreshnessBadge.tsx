type OfferFreshnessBadgeProps = {
  lastCheckedAt: unknown;
  sourceLabel?: string;
  nowMs?: number;
};

function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function checkedLabel(lastCheckedAt: Date): string {
  return lastCheckedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function OfferFreshnessBadge(props: OfferFreshnessBadgeProps) {
  const checkedAt = parseDate(props.lastCheckedAt);

  if (!checkedAt) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        Freshness unknown
      </span>
    );
  }

  const isStale =
    typeof props.nowMs === "number"
      ? props.nowMs - checkedAt.getTime() > 24 * 60 * 60 * 1000
      : false;

  return (
    <span
      className={
        isStale
          ? "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
      }
    >
      {isStale ? "Stale" : "Checked"} {checkedLabel(checkedAt)}
      {props.sourceLabel ? ` · ${props.sourceLabel}` : ""}
    </span>
  );
}
