const PLANT_SKELETON_COUNT = 9;

function PlantCardSkeleton({ index }: { index: number }) {
  return (
    <li key={`plant-skeleton-${index}`}>
      <div
        className="overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-sm"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        <div className="aspect-[4/3] p-3">
          <div className="ptl-skeleton h-full w-full rounded-2xl" />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="ptl-skeleton h-6 w-16 rounded-full" />
            <div className="ptl-skeleton h-6 w-[4.5rem] rounded-full" />
            <div className="ptl-skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="ptl-skeleton h-3 w-full" />
            <div className="ptl-skeleton h-3 w-4/5" />
          </div>
          <div className="ptl-skeleton h-3 w-20" />
        </div>
      </div>
    </li>
  );
}

export default function PlantsLoadingPage() {
  return (
    <main aria-busy="true" className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-[46rem] space-y-3">
          <div className="ptl-skeleton h-12 w-40" />
          <div className="ptl-skeleton h-4 w-full" />
          <div className="ptl-skeleton h-4 w-5/6" />
        </div>

        <div className="ptl-surface-sand flex items-center gap-3 px-4 py-3">
          <div className="ptl-skeleton h-3 w-14" />
          <div className="ptl-skeleton h-4 w-7" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="ptl-surface h-fit space-y-5 p-5">
          <div className="ptl-skeleton h-4 w-28" />
          <div className="space-y-3">
            <div className="ptl-skeleton h-10 w-full" />
            <div className="ptl-skeleton h-10 w-full" />
            <div className="ptl-skeleton h-10 w-full" />
            <div className="ptl-skeleton h-10 w-full" />
            <div className="ptl-skeleton h-10 w-full" />
          </div>
          <div className="ptl-skeleton h-10 w-full rounded-full" />
        </aside>

        <section>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PLANT_SKELETON_COUNT }).map((_, index) => (
              <PlantCardSkeleton index={index} key={`plant-card-loading-${index}`} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
