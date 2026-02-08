import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Not found
        </div>
        <h1 className="mt-2 ptl-page-title">That page does not exist</h1>
        <p className="mt-3 ptl-lede text-neutral-700">
          If you followed a link from somewhere else, it may be outdated.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/" className="ptl-btn-secondary">
            Go home
          </Link>
          <Link href="/builder" className="ptl-btn-primary">
            Open builder
          </Link>
          <Link href="/plants" className="ptl-btn-secondary">
            Browse plants
          </Link>
        </div>
      </div>
    </main>
  );
}

