const BUILD_CARD_SKELETON_COUNT = 6;

function BuildCardSkeleton({ index }: { index: number }) {
  return (
    <li key={`build-card-skeleton-${index}`}>
      <article className="ptl-surface overflow-hidden">
        <div className="aspect-[16/10] w-full border-b p-3" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="ptl-skeleton h-full w-full rounded-2xl" />
        </div>

        <div className="space-y-3 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="ptl-skeleton h-4 w-2/3" />
            <div className="ptl-skeleton h-6 w-16 rounded-full" />
          </div>

          <div className="ptl-skeleton h-3 w-40" />

          <div className="space-y-2">
            <div className="ptl-skeleton h-3 w-full" />
            <div className="ptl-skeleton h-3 w-5/6" />
            <div className="ptl-skeleton h-3 w-2/3" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="ptl-skeleton h-5 w-[4.5rem] rounded-full" />
            <div className="ptl-skeleton h-5 w-20 rounded-full" />
          </div>

          <div className="ptl-skeleton h-3 w-20" />
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="ptl-skeleton h-3 w-28" />
          <div className="ptl-skeleton h-8 w-20 rounded-full" />
        </div>
      </article>
    </li>
  );
}

export default function BuildsLoadingPage() {
  return (
    <main aria-busy="true" className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-end justify-between gap-6">
        <div className="w-full max-w-2xl space-y-3">
          <div className="ptl-skeleton h-12 w-40" />
          <div className="ptl-skeleton h-4 w-full" />
          <div className="ptl-skeleton h-4 w-5/6" />
        </div>

        <div className="ptl-skeleton h-10 w-28 rounded-full" />
      </div>

      <div
        className="mt-6 grid gap-3 rounded-3xl border bg-white/70 p-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-center"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        <div className="ptl-skeleton h-11 w-full" />
        <div className="ptl-skeleton h-11 w-full" />
        <div className="ptl-skeleton h-11 w-full rounded-full" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="ptl-skeleton h-3 w-10" />
        <div className="ptl-skeleton h-7 w-12 rounded-full" />
        <div className="ptl-skeleton h-7 w-[4.5rem] rounded-full" />
        <div className="ptl-skeleton h-7 w-20 rounded-full" />
        <div className="ptl-skeleton h-7 w-16 rounded-full" />
      </div>

      <div className="mt-6">
        <div className="ptl-skeleton h-4 w-48" />
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: BUILD_CARD_SKELETON_COUNT }).map((_, index) => (
          <BuildCardSkeleton index={index} key={`builds-loading-card-${index}`} />
        ))}
      </ul>
    </main>
  );
}
