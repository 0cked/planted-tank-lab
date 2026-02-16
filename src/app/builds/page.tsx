import type { Metadata } from "next";
import Link from "next/link";

import { getServerCaller } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Builds",
  description: "Browse public planted tank builds and learn what works.",
  openGraph: {
    url: "/builds",
  },
};

function formatMoney(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function buildThumbnailSrc(
  coverImageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): string | null {
  if (!coverImageUrl) return null;

  const timestamp =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === "string"
        ? Date.parse(updatedAt)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) return coverImageUrl;

  const separator = coverImageUrl.includes("?") ? "&" : "?";
  return `${coverImageUrl}${separator}v=${timestamp}`;
}

function tierMeta(style: string | null | undefined): {
  label: string;
  className: string;
} | null {
  if (!style) return null;
  const normalized = style.trim().toLowerCase();
  if (normalized === "budget") {
    return {
      label: "Budget",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }
  if (normalized === "mid") {
    return {
      label: "Mid",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    };
  }
  if (normalized === "premium") {
    return {
      label: "Premium",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return null;
}

export default async function BuildsIndexPage() {
  const caller = await getServerCaller();

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
          {rows.map((b) => {
            const tier = tierMeta(b.style);
            const thumbnailSrc = buildThumbnailSrc(b.coverImageUrl, b.updatedAt);

            return (
              <Link
                key={b.id}
                href={b.shareSlug ? `/builds/${b.shareSlug}` : "/builder"}
                className="ptl-surface block overflow-hidden ptl-hover-lift transition hover:bg-white/70"
              >
                <div className="aspect-[16/10] w-full border-b" style={{ borderColor: "var(--ptl-border)" }}>
                  {thumbnailSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailSrc}
                      alt={`${b.name} thumbnail`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 px-6 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Screenshot preview available after save
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">{b.name}</div>
                    {tier ? (
                      <div
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tier.className}`}
                      >
                        {tier.label}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-neutral-600">
                    {b.itemCount} item(s) · {formatMoney(b.totalPriceCents)}
                  </div>
                  <div className="mt-3 line-clamp-3 text-sm text-neutral-700">
                    {b.description ?? "Build snapshot"}
                  </div>
                  <div className="mt-4 text-xs font-semibold text-emerald-800">
                    View build
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
