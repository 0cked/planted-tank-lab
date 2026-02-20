"use client";

import { useMemo, useState } from "react";

type BuildImageCarouselProps = {
  altBase: string;
  images:
    | {
        front?: string | null;
        top?: string | null;
        threeQuarter?: string | null;
      }
    | null
    | undefined;
  fallbackSrc?: string | null;
  className?: string;
};

type CarouselView = "front" | "top" | "threeQuarter";

const VIEW_ORDER: readonly CarouselView[] = ["front", "threeQuarter", "top"] as const;
const VIEW_LABEL: Record<CarouselView, string> = {
  front: "Front",
  threeQuarter: "3/4",
  top: "Top",
};

export function BuildImageCarousel(props: BuildImageCarouselProps) {
  const views = useMemo(
    () =>
      VIEW_ORDER.filter((view) => Boolean(props.images?.[view])).map((view) => ({
        id: view,
        label: VIEW_LABEL[view],
        src: props.images?.[view] ?? "",
      })),
    [props.images],
  );

  const fallback = props.fallbackSrc?.trim() ?? "";
  const resolvedViews =
    views.length > 0
      ? views
      : fallback
        ? [
            {
              id: "front" as const,
              label: VIEW_LABEL.front,
              src: fallback,
            },
          ]
        : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const boundedIndex = Math.min(Math.max(activeIndex, 0), Math.max(0, resolvedViews.length - 1));
  const activeView = resolvedViews[boundedIndex];

  if (!activeView) {
    return (
      <div
        className={`flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 px-6 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 ${props.className ?? ""}`}
      >
        Screenshot preview available after save
      </div>
    );
  }

  const hasMultipleViews = resolvedViews.length > 1;

  return (
    <div className={`relative h-full w-full ${props.className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeView.src}
        alt={`${props.altBase} ${activeView.label} view`}
        loading="lazy"
        className="h-full w-full object-cover"
      />

      {hasMultipleViews ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-between px-2">
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-white/65 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-black/65"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveIndex((previous) =>
                previous <= 0 ? resolvedViews.length - 1 : previous - 1,
              );
            }}
            aria-label="Show previous screenshot angle"
          >
            Prev
          </button>

          <div className="pointer-events-auto rounded-full border border-white/65 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
            {activeView.label}
          </div>

          <button
            type="button"
            className="pointer-events-auto rounded-full border border-white/65 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-black/65"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveIndex((previous) => (previous + 1) % resolvedViews.length);
            }}
            aria-label="Show next screenshot angle"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
