import Link from "next/link";

export const metadata = {
  title: "Admin | PlantedTankLab",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Admin
        </div>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Catalog Operations
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-neutral-700">
          Manage products, plants, rules, and pricing data. Changes here affect what users
          can select in the builder.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/categories"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Categories</div>
            <div className="mt-1 text-sm text-neutral-700">
              Builder ordering and required steps.
            </div>
          </Link>
          <Link
            href="/admin/products"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Products</div>
            <div className="mt-1 text-sm text-neutral-700">Specs, images, and status.</div>
          </Link>
          <Link
            href="/admin/plants"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Plants</div>
            <div className="mt-1 text-sm text-neutral-700">Care data, sources, photos.</div>
          </Link>
          <Link
            href="/admin/rules"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Rules</div>
            <div className="mt-1 text-sm text-neutral-700">Compatibility checks.</div>
          </Link>
          <Link
            href="/admin/offers"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Offers</div>
            <div className="mt-1 text-sm text-neutral-700">Retailers and pricing links.</div>
          </Link>
          <Link
            href="/admin/builds"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Builds</div>
            <div className="mt-1 text-sm text-neutral-700">Moderation and reports.</div>
          </Link>
          <Link
            href="/admin/logs"
            className="rounded-2xl border bg-white/70 p-5 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            <div className="text-sm font-semibold text-neutral-900">Logs</div>
            <div className="mt-1 text-sm text-neutral-700">Admin actions and audits.</div>
          </Link>
        </div>

        <div className="mt-8 text-xs text-neutral-600">
          Tip: set `ADMIN_EMAILS` in the environment (comma-separated) to bootstrap admin
          accounts.
        </div>
      </div>
    </main>
  );
}
