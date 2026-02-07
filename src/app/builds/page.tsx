import type { Metadata } from "next";
import Link from "next/link";

import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

export const metadata: Metadata = {
  title: "Builds | PlantedTankLab",
  description: "Browse public planted tank builds and learn what works.",
};

function formatMoney(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function BuildsIndexPage() {
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const rows = await caller.builds.listPublic({ limit: 50 }).catch(() => []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1
            className="ptl-page-title"
          >
            Builds
          </h1>
          <p className="mt-3 ptl-lede text-neutral-700">
            Public build snapshots from the community. Use them as inspiration, then
            open in the builder to tweak.
          </p>
        </div>
        <Link href="/builder" className="ptl-btn-primary">
          Start a build
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="ptl-surface p-7 sm:p-9">
            <div className="ptl-section-title text-neutral-900">No public builds yet</div>
            <p className="mt-3 ptl-lede text-neutral-700">
              When someone shares a build, it shows up here. If you want to help
              kick things off, build a setup and share the link.
            </p>

            <div className="mt-6 rounded-3xl border bg-white/70 p-5 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                How to share
              </div>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Pick your core gear (tank, light, filter, CO2).</li>
                <li>Add plants that match your light and CO2 choices.</li>
                <li>Press Share to generate a link.</li>
              </ol>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/builder" className="ptl-btn-primary">
                Open the builder
              </Link>
              <Link href="/plants" className="ptl-btn-secondary">
                Explore plants
              </Link>
            </div>
          </div>

          <div className="ptl-surface-stone p-7 sm:p-9">
            <div className="text-sm font-semibold text-neutral-900">What builds include</div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
              <li>Gear and plant lists you can tweak and re-share</li>
              <li>Compatibility warnings as you pick parts</li>
              <li>Price estimates from available offers</li>
            </ul>
            <div className="mt-6 text-xs text-neutral-600">
              Tip: You can share without signing in. If you want to save builds to your profile, sign in when it&apos;s available.
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <Link
              key={b.id}
              href={b.shareSlug ? `/builds/${b.shareSlug}` : "/builder"}
              className="ptl-surface block p-6 ptl-hover-lift transition hover:bg-white/70"
            >
              <div className="text-sm font-semibold text-neutral-900">{b.name}</div>
              <div className="mt-2 text-xs text-neutral-600">
                {b.itemCount} item(s) · {formatMoney(b.totalPriceCents)}
              </div>
              <div className="mt-3 line-clamp-3 text-sm text-neutral-700">
                {b.description ?? "Build snapshot"}
              </div>
              <div className="mt-4 text-xs font-semibold text-emerald-800">
                View build
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
