"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { trpc } from "@/components/TRPCProvider";

type BuildVersionHistoryPanelProps = {
  shareSlug: string;
  initialVersions: Array<{
    versionNumber: number;
    createdAt: string;
  }>;
};

function formatVersionTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function BuildVersionHistoryPanel(props: BuildVersionHistoryPanelProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [lastRestoreMessage, setLastRestoreMessage] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const versionsQuery = trpc.visualBuilder.listVersions.useQuery(
    { shareSlug: props.shareSlug },
    {
      initialData: {
        versions: props.initialVersions,
        buildUpdatedAt: new Date().toISOString(),
      },
      staleTime: 30_000,
    },
  );
  const restoreVersionMutation = trpc.visualBuilder.restoreVersion.useMutation({
    onSuccess: async (result) => {
      await utils.visualBuilder.listVersions.invalidate({ shareSlug: props.shareSlug });
      setRestoreError(null);
      setLastRestoreMessage(
        `Restored version ${result.restoredFromVersion}. New version ${result.versionNumber} saved.`,
      );
    },
  });

  const versions = useMemo(
    () =>
      (versionsQuery.data?.versions ?? []).map((version) => ({
        versionNumber: version.versionNumber,
        createdAt: String(version.createdAt),
      })),
    [versionsQuery.data?.versions],
  );

  async function handleRestore(versionNumber: number) {
    setRestoreError(null);
    setLastRestoreMessage(null);

    try {
      await restoreVersionMutation.mutateAsync({
        shareSlug: props.shareSlug,
        versionNumber,
      });
    } catch {
      setRestoreError("Could not restore this version. Make sure you own this build.");
    }
  }

  return (
    <section className="ptl-surface p-7 sm:p-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Version history</h2>
        <div className="text-xs text-neutral-600">
          {versions.length} snapshot{versions.length === 1 ? "" : "s"}
        </div>
      </div>

      {versions.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-700">
          No saved versions yet. Save this build in the builder to create version snapshots.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {versions.map((version) => (
            <li
              key={version.versionNumber}
              className="rounded-2xl border bg-white/60 p-4"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Version {version.versionNumber}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {formatVersionTimestamp(version.createdAt)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/builds/${props.shareSlug}?version=${version.versionNumber}`}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-neutral-300"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/builder/${props.shareSlug}?version=${version.versionNumber}`}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-neutral-300"
                  >
                    Open in builder
                  </Link>
                  <button
                    type="button"
                    disabled={!isAuthenticated || restoreVersionMutation.isPending}
                    onClick={() => handleRestore(version.versionNumber)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {restoreVersionMutation.isPending ? "Restoring..." : "Restore this version"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isAuthenticated ? (
        <p className="mt-3 text-xs text-neutral-600">
          Sign in as the build owner to use restore.
        </p>
      ) : null}
      {restoreError ? <p className="mt-3 text-sm text-rose-700">{restoreError}</p> : null}
      {lastRestoreMessage ? <p className="mt-3 text-sm text-emerald-800">{lastRestoreMessage}</p> : null}
    </section>
  );
}
