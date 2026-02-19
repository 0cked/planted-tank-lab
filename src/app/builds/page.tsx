import type { Metadata } from "next";
import Link from "next/link";

import {
  BUILD_SORT_OPTIONS,
  DEFAULT_BUILD_SORT_OPTION,
  buildSortLabel,
  normalizeBuildSortOption,
} from "@/lib/build-sort";
import { BUILD_TAG_OPTIONS, buildTagLabel, type BuildTagSlug, isBuildTagSlug } from "@/lib/build-tags";
import { getServerCaller } from "@/server/trpc/server-caller";

import { BuildVoteButton } from "./BuildVoteButton";

export const metadata: Metadata = {
  title: "Builds",
  description: "Browse public planted tank builds and learn what works.",
  openGraph: {
    url: "/builds",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(searchParams: SearchParams, key: string): string | null {
  const value = searchParams[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function activeTagFromSearchParams(searchParams: SearchParams): BuildTagSlug | null {
  const rawTag = (first(searchParams, "tag") ?? "").trim().toLowerCase();
  if (!rawTag || !isBuildTagSlug(rawTag)) return null;
  return rawTag;
}

function searchQueryFromSearchParams(searchParams: SearchParams): string {
  return (first(searchParams, "q") ?? "").trim();
}

function sortFromSearchParams(searchParams: SearchParams) {
  return normalizeBuildSortOption(first(searchParams, "sort"));
}

function buildsHref(filters: {
  tag: BuildTagSlug | null;
  query: string;
  sort: (typeof BUILD_SORT_OPTIONS)[number];
}): string {
  const params = new URLSearchParams();

  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.sort !== DEFAULT_BUILD_SORT_OPTION) {
    params.set("sort", filters.sort);
  }

  const serialized = params.toString();
  return serialized ? `/builds?${serialized}` : "/builds";
}

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

export default async function BuildsIndexPage(props: { searchParams: Promise<SearchParams> }) {
  const caller = await getServerCaller();
  const searchParams = await props.searchParams;
  const activeTag = activeTagFromSearchParams(searchParams);
  const searchQuery = searchQueryFromSearchParams(searchParams);
  const activeSort = sortFromSearchParams(searchParams);

  const rows = await caller.builds
    .listPublic({
      limit: 50,
      tag: activeTag ?? undefined,
      search: searchQuery || undefined,
      sort: activeSort,
    })
    .catch(() => []);

  return (
    <main className="ptl-page">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="ptl-page-title">Builds</h1>
          <p className="mt-3 ptl-lede">
            Public build snapshots from the community. Use them as inspiration, then
            open in the builder to tweak.
          </p>
        </div>
        <Link href="/builder" className="ptl-btn-primary">
          Start a build
        </Link>
      </div>

      <form
        method="get"
        className="ptl-surface mt-6 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-center"
      >
        {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}

        <label htmlFor="builds-search" className="sr-only">
          Search builds
        </label>
        <input
          id="builds-search"
          name="q"
          defaultValue={searchQuery}
          placeholder="Search by build name, notes, or equipment"
          className="ptl-control h-11 px-4"
        />

        <label htmlFor="builds-sort" className="sr-only">
          Sort builds
        </label>
        <select
          id="builds-sort"
          name="sort"
          defaultValue={activeSort}
          className="ptl-control h-11 px-3 text-sm font-medium"
        >
          {BUILD_SORT_OPTIONS.map((sort) => (
            <option key={sort} value={sort}>
              {buildSortLabel(sort)}
            </option>
          ))}
        </select>

        <button type="submit" className="ptl-btn-secondary h-11">
          Apply
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ptl-ink-muted)]">
          Filter
        </span>
        <Link
          href={buildsHref({
            tag: null,
            query: searchQuery,
            sort: activeSort,
          })}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            activeTag === null
              ? "border-emerald-300/80 bg-emerald-100 text-emerald-900"
              : "border-[color:var(--ptl-border)] bg-white/70 text-[color:var(--ptl-ink-muted)] hover:border-[color:var(--ptl-border-strong)]"
          }`}
        >
          All
        </Link>
        {BUILD_TAG_OPTIONS.map((tag) => {
          const selected = activeTag === tag;
          return (
            <Link
              key={tag}
              href={buildsHref({
                tag,
                query: searchQuery,
                sort: activeSort,
              })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-emerald-300/80 bg-emerald-100 text-emerald-900"
                  : "border-[color:var(--ptl-border)] bg-white/70 text-[color:var(--ptl-ink-muted)] hover:border-[color:var(--ptl-border-strong)]"
              }`}
            >
              {buildTagLabel(tag)}
            </Link>
          );
        })}

        {searchQuery ? (
          <Link
            href={buildsHref({
              tag: activeTag,
              query: "",
              sort: activeSort,
            })}
            className="rounded-full border border-[color:var(--ptl-border)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[color:var(--ptl-ink-muted)] transition hover:border-[color:var(--ptl-border-strong)]"
          >
            Clear search
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="ptl-surface p-7 sm:p-9">
            <div className="ptl-section-title text-[color:var(--ptl-ink-strong)]">
              {searchQuery
                ? activeTag
                  ? `No ${buildTagLabel(activeTag)} builds matching “${searchQuery}”`
                  : `No builds matching “${searchQuery}”`
                : activeTag
                  ? `No ${buildTagLabel(activeTag)} builds yet`
                  : "No public builds yet"}
            </div>
            <p className="mt-3 ptl-lede">
              {searchQuery
                ? "Try a broader search term or clear the search field to browse all public builds."
                : activeTag
                  ? `No shared builds are tagged ${buildTagLabel(activeTag)} yet. Start one and publish it to set the vibe.`
                  : "When someone shares a build, it shows up here. If you want to help kick things off, build a setup and share the link."}
            </p>

            <div className="mt-6 rounded-3xl border bg-white/70 p-5 text-sm text-[color:var(--ptl-ink-muted)]" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ptl-ink-muted)]">
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
            <div className="text-sm font-semibold text-[color:var(--ptl-ink-strong)]">What builds include</div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[color:var(--ptl-ink-muted)]">
              <li>Gear and plant lists you can tweak and re-share</li>
              <li>Compatibility warnings as you pick parts</li>
              <li>Price estimates from available offers</li>
            </ul>
            <div className="mt-6 text-xs text-[color:var(--ptl-ink-soft)]">
              Tip: You can share without signing in. If you want to save builds to your profile, sign in when it&apos;s available.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 text-sm text-[color:var(--ptl-ink-soft)]">
            Showing {rows.length} build{rows.length === 1 ? "" : "s"}
            {searchQuery ? ` matching “${searchQuery}”` : ""} · Sorted by {buildSortLabel(activeSort)}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((b) => {
              const tier = tierMeta(b.style);
              const thumbnailSrc = buildThumbnailSrc(b.coverImageUrl, b.updatedAt);

              const buildHref = b.shareSlug ? `/builds/${b.shareSlug}` : "/builder";

              return (
                <article key={b.id} className="ptl-surface overflow-hidden">
                  <Link href={buildHref} className="block ptl-hover-lift transition hover:bg-white/35">
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
                        <div className="text-sm font-semibold text-[color:var(--ptl-ink-strong)]">{b.name}</div>
                        {tier ? (
                          <div
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tier.className}`}
                          >
                            {tier.label}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--ptl-ink-soft)]">
                        {b.itemCount} item(s) · {formatMoney(b.totalPriceCents)}
                      </div>
                      <div className="mt-3 line-clamp-3 text-sm text-[color:var(--ptl-ink-muted)]">
                        {b.description ?? "Build snapshot"}
                      </div>
                      {b.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {b.tags.map((tag) => (
                            <span
                              key={`${b.id}-${tag}`}
                              className="rounded-full border border-[color:var(--ptl-border)] bg-white/75 px-2 py-0.5 text-[11px] font-medium text-[color:var(--ptl-ink-muted)]"
                            >
                              {buildTagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 text-xs font-semibold text-[color:var(--ptl-accent-ink)]">
                        View build
                      </div>
                    </div>
                  </Link>

                  <div
                    className="flex items-center justify-between border-t px-6 py-4"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <span className="text-xs text-[color:var(--ptl-ink-soft)]">Community votes</span>
                    <BuildVoteButton buildId={b.id} initialVoteCount={b.voteCount ?? 0} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
