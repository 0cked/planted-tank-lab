import Link from "next/link";

export default function BuilderNotFound() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Not found
        </div>
        <h1 className="mt-2 ptl-page-title">Build not found</h1>
        <p className="mt-3 ptl-lede text-neutral-700">
          This share link may be invalid, expired, or was never saved.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/builder" className="ptl-btn-primary">
            Start a new build
          </Link>
          <Link href="/builds" className="ptl-btn-secondary">
            Browse builds
          </Link>
        </div>
      </div>
    </main>
  );
}

