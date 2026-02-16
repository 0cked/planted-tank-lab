"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { trpc } from "@/components/TRPCProvider";

const LOGIN_URL = "/login?callbackUrl=%2Fbuilds";

function formatVoteCount(voteCount: number): string {
  const suffix = voteCount === 1 ? "vote" : "votes";
  return `${voteCount.toLocaleString()} ${suffix}`;
}

export function BuildVoteButton(props: {
  buildId: string;
  initialVoteCount: number;
}) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const utils = trpc.useUtils();
  const queryInput = { buildIds: [props.buildId] };

  const votesQuery = trpc.builds.getVotes.useQuery(queryInput, {
    enabled: isAuthenticated,
    initialData: {
      totalsByBuildId: {
        [props.buildId]: props.initialVoteCount,
      },
      viewerVotedBuildIds: [],
    },
    staleTime: 30_000,
  });

  const voteMutation = trpc.builds.vote.useMutation({
    onSuccess: (result) => {
      utils.builds.getVotes.setData(queryInput, (existing) => {
        const viewerVotedBuildIds = new Set(existing?.viewerVotedBuildIds ?? []);
        viewerVotedBuildIds.add(result.buildId);

        return {
          totalsByBuildId: {
            ...(existing?.totalsByBuildId ?? {}),
            [result.buildId]: result.voteCount,
          },
          viewerVotedBuildIds: Array.from(viewerVotedBuildIds),
        };
      });
    },
  });

  const voteCount =
    votesQuery.data?.totalsByBuildId[props.buildId] ?? props.initialVoteCount;
  const hasVoted =
    votesQuery.data?.viewerVotedBuildIds.includes(props.buildId) ?? false;

  if (!isAuthenticated) {
    return (
      <Link
        href={LOGIN_URL}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-white"
      >
        <span aria-hidden>▲</span>
        <span>{formatVoteCount(voteCount)}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        hasVoted
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-neutral-200 bg-white/80 text-neutral-700 hover:bg-white"
      } disabled:cursor-not-allowed disabled:opacity-70`}
      disabled={voteMutation.isPending || hasVoted}
      aria-label={
        hasVoted
          ? `Already upvoted (${formatVoteCount(voteCount)})`
          : `Upvote build (${formatVoteCount(voteCount)})`
      }
      onClick={() => {
        void voteMutation
          .mutateAsync({ buildId: props.buildId })
          .catch(() => undefined);
      }}
    >
      <span aria-hidden>{hasVoted ? "♥" : "▲"}</span>
      <span>{formatVoteCount(voteCount)}</span>
    </button>
  );
}
