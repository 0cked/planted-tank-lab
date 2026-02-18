const PRODUCT_ROW_SKELETON_COUNT = 8;

function ProductRowSkeleton({ index }: { index: number }) {
  return (
    <li className="px-5 py-4" key={`product-row-skeleton-${index}`}>
      <div className="flex items-start gap-4">
        <div
          className="h-16 w-16 shrink-0 rounded-2xl border p-1"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <div className="ptl-skeleton h-full w-full rounded-xl" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="ptl-skeleton h-4 w-4/5" />
              <div className="flex flex-wrap gap-1.5">
                <div className="ptl-skeleton h-5 w-20 rounded-full" />
                <div className="ptl-skeleton h-5 w-24 rounded-full" />
                <div className="ptl-skeleton h-5 w-16 rounded-full" />
              </div>
            </div>

            <div className="w-24 shrink-0 space-y-2">
              <div className="ptl-skeleton ml-auto h-4 w-[4.5rem]" />
              <div className="ptl-skeleton ml-auto h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function ProductCategoryLoadingPage() {
  return (
    <main aria-busy="true" className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="ptl-skeleton h-3 w-16" />
          <div className="ptl-skeleton h-12 w-48" />
          <div className="ptl-skeleton h-4 w-full max-w-lg" />
        </div>
        <div className="ptl-skeleton h-4 w-24" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="ptl-surface h-fit space-y-4 p-5">
          <div className="ptl-skeleton h-4 w-28" />
          <div className="ptl-skeleton h-10 w-full" />
          <div className="ptl-skeleton h-10 w-full" />
          <div className="ptl-skeleton h-10 w-full" />
          <div className="ptl-skeleton h-10 w-full" />
          <div className="ptl-skeleton h-10 w-full" />
        </aside>

        <section>
          <div className="flex items-center justify-between">
            <div className="ptl-skeleton h-4 w-40" />
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border bg-white/70 shadow-sm backdrop-blur-sm"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <ul className="divide-y divide-neutral-200">
              {Array.from({ length: PRODUCT_ROW_SKELETON_COUNT }).map((_, index) => (
                <ProductRowSkeleton index={index} key={`products-row-loading-${index}`} />
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-10">
        <div className="ptl-skeleton h-3 w-64" />
      </div>
    </main>
  );
}
