import Link from "next/link";

import { PublishToggle } from "./PublishToggle";
import {
  buildThumbnailSrc,
  formatMoney,
  type ProfileBuildSummary,
} from "./profile-data";

type ProfileBuildGridProps = {
  builds: ProfileBuildSummary[];
  emptyStateMessage: string;
  allowManage?: boolean;
};

function buildHref(build: ProfileBuildSummary, allowManage: boolean): string | null {
  if (build.shareSlug) {
    return `/builds/${build.shareSlug}`;
  }

  if (allowManage) {
    return "/builder";
  }

  return null;
}

function formatUpdatedAt(updatedAt: Date | string): string {
  const parsedDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toISOString().slice(0, 10);
}

export function ProfileBuildGrid(props: ProfileBuildGridProps) {
  const allowManage = props.allowManage ?? false;

  if (props.builds.length === 0) {
    return <p className="mt-4 text-sm text-neutral-700">{props.emptyStateMessage}</p>;
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {props.builds.map((build) => {
        const thumbnailSrc = buildThumbnailSrc(build.coverImageUrl, build.updatedAt);
        const href = buildHref(build, allowManage);

        return (
          <article key={build.id} className="ptl-surface overflow-hidden">
            <div className="aspect-[16/10] w-full border-b" style={{ borderColor: "var(--ptl-border)" }}>
              {thumbnailSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailSrc}
                  alt={`${build.name} thumbnail`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 px-6 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Screenshot preview available after save
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900">{build.name}</h3>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    build.isPublic
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-neutral-200 bg-white/70 text-neutral-700"
                  }`}
                >
                  {build.isPublic ? "Public" : "Private"}
                </span>
              </div>

              <div className="mt-2 text-xs text-neutral-600">Updated {formatUpdatedAt(build.updatedAt)}</div>
              <div className="mt-1 text-xs text-neutral-600">
                {build.itemCount} item(s) · {formatMoney(build.totalPriceCents)}
              </div>
              <div className="mt-1 text-xs text-neutral-600">{build.voteCount} vote(s)</div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                {href ? (
                  <Link href={href} className="ptl-btn-secondary !px-3 !py-1.5">
                    View
                  </Link>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Unshared
                  </span>
                )}

                {allowManage ? (
                  <PublishToggle buildId={build.id} isPublic={build.isPublic} />
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
