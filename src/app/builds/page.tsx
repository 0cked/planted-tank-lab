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
            className="text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Builds
          </h1>
          <p className="mt-3 text-sm text-neutral-700">
            Public build snapshots from the community. Use them as inspiration, then
            open in the builder to tweak.
          </p>
        </div>
        <Link href="/builder" className="ptl-btn-primary">
          Start a build
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 ptl-surface p-7 text-sm text-neutral-700">
          No public builds yet.
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <Link
              key={b.id}
              href={b.shareSlug ? `/builds/${b.shareSlug}` : "/builder"}
              className="ptl-surface block p-6 transition hover:bg-white/70"
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

