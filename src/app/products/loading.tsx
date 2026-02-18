const CATEGORY_SKELETON_COUNT = 6;

function CategoryCardSkeleton({ index }: { index: number }) {
  return (
    <li key={`products-category-skeleton-${index}`}>
      <div
        className="overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-sm"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        <div
          className="flex aspect-[16/10] items-center justify-center border-b bg-white/25 px-6"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <div className="ptl-skeleton h-11 w-3/4" />
        </div>

        <div className="space-y-3 p-6">
          <div className="ptl-skeleton h-3 w-20" />
          <div className="ptl-skeleton h-6 w-2/3" />
          <div className="space-y-2">
            <div className="ptl-skeleton h-3 w-full" />
            <div className="ptl-skeleton h-3 w-5/6" />
          </div>
          <div className="ptl-skeleton h-3 w-24" />
        </div>
      </div>
    </li>
  );
}

export default function ProductsLoadingPage() {
  return (
    <main aria-busy="true" className="mx-auto max-w-6xl px-6 py-14">
      <div className="space-y-3">
        <div className="ptl-skeleton h-12 w-52" />
        <div className="ptl-skeleton h-4 w-full max-w-xl" />
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: CATEGORY_SKELETON_COUNT }).map((_, index) => (
          <CategoryCardSkeleton index={index} key={`products-loading-card-${index}`} />
        ))}
      </ul>
    </main>
  );
}
