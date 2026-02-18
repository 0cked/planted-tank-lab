"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { trpc } from "@/components/TRPCProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

type BuildCommentReply = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

type BuildCommentThread = BuildCommentReply & {
  replies: BuildCommentReply[];
};

type BuildCommentsSectionProps = {
  shareSlug: string;
  initialComments: BuildCommentThread[];
};

function formatCommentTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function BuildCommentsSectionContent(props: BuildCommentsSectionProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [commentBody, setCommentBody] = useState("");
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<Record<string, string>>({});
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const commentsQuery = trpc.builds.listComments.useQuery(
    { shareSlug: props.shareSlug },
    {
      initialData: {
        comments: props.initialComments,
      },
      staleTime: 15_000,
    },
  );

  const addCommentMutation = trpc.builds.addComment.useMutation({
    onSuccess: async () => {
      await utils.builds.listComments.invalidate({ shareSlug: props.shareSlug });
    },
  });

  const loginHref = useMemo(
    () => `/login?callbackUrl=${encodeURIComponent(`/builds/${props.shareSlug}`)}`,
    [props.shareSlug],
  );

  if (commentsQuery.error && !commentsQuery.isFetching) {
    throw commentsQuery.error;
  }

  const comments = commentsQuery.data?.comments ?? props.initialComments;
  const totalCommentCount = comments.reduce((total, thread) => total + 1 + thread.replies.length, 0);

  async function submitComment(params: { body: string; parentId?: string }) {
    const trimmedBody = params.body.trim();
    if (!trimmedBody) return;

    setSubmitError(null);

    try {
      await addCommentMutation.mutateAsync({
        shareSlug: props.shareSlug,
        body: trimmedBody,
        parentId: params.parentId,
      });
    } catch {
      setSubmitError("Could not post your comment. Please try again.");
      return;
    }

    if (params.parentId) {
      setReplyDraftByCommentId((current) => ({
        ...current,
        [params.parentId!]: "",
      }));
      setActiveReplyCommentId(null);
      return;
    }

    setCommentBody("");
  }

  return (
    <section className="ptl-surface p-7 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Comments</h2>
        <div className="text-xs text-neutral-600">
          {totalCommentCount.toLocaleString()} comment{totalCommentCount === 1 ? "" : "s"}
        </div>
      </div>

      {isAuthenticated ? (
        <form
          className="mt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await submitComment({ body: commentBody });
          }}
        >
          <label htmlFor="build-comment-body" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="build-comment-body"
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Share feedback, ideas, or questions about this build"
            className="h-28 w-full resize-none rounded-2xl border bg-white/80 p-3 text-sm text-neutral-900 outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="ptl-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={addCommentMutation.isPending || commentBody.trim().length === 0}
            >
              {addCommentMutation.isPending ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div
          className="mt-4 rounded-2xl border bg-white/70 p-4 text-sm text-neutral-700"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <Link href={loginHref} className="font-semibold text-emerald-800 hover:underline">
            Sign in
          </Link>{" "}
          to comment on this build.
        </div>
      )}

      {submitError ? <div className="mt-3 text-sm text-rose-700">{submitError}</div> : null}

      {comments.length === 0 ? (
        <div
          className="mt-6 rounded-2xl border bg-white/65 p-5 text-sm text-neutral-700"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          No comments yet. Be the first to share feedback on this aquascape.
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-2xl border bg-white/65 p-4"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-900">{comment.author.name}</div>
                <time className="text-xs text-neutral-600">{formatCommentTimestamp(comment.createdAt)}</time>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{comment.body}</p>

              {isAuthenticated ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                    onClick={() => setActiveReplyCommentId((current) => (current === comment.id ? null : comment.id))}
                  >
                    {activeReplyCommentId === comment.id ? "Cancel" : "Reply"}
                  </button>
                </div>
              ) : null}

              {isAuthenticated && activeReplyCommentId === comment.id ? (
                <form
                  className="mt-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await submitComment({
                      body: replyDraftByCommentId[comment.id] ?? "",
                      parentId: comment.id,
                    });
                  }}
                >
                  <label htmlFor={`reply-${comment.id}`} className="sr-only">
                    Reply to comment
                  </label>
                  <textarea
                    id={`reply-${comment.id}`}
                    value={replyDraftByCommentId[comment.id] ?? ""}
                    onChange={(event) =>
                      setReplyDraftByCommentId((current) => ({
                        ...current,
                        [comment.id]: event.target.value,
                      }))
                    }
                    placeholder="Write a reply"
                    className="h-24 w-full resize-none rounded-2xl border bg-white/85 p-3 text-sm text-neutral-900 outline-none focus:border-[color:var(--ptl-accent)]"
                    style={{ borderColor: "var(--ptl-border)" }}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      className="ptl-btn-secondary !text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        addCommentMutation.isPending ||
                        (replyDraftByCommentId[comment.id] ?? "").trim().length === 0
                      }
                    >
                      {addCommentMutation.isPending ? "Posting..." : "Post reply"}
                    </button>
                  </div>
                </form>
              ) : null}

              {comment.replies.length > 0 ? (
                <ol className="mt-4 space-y-3 border-l pl-4" style={{ borderColor: "var(--ptl-border)" }}>
                  {comment.replies.map((reply) => (
                    <li
                      key={reply.id}
                      className="rounded-xl border bg-white/75 p-3"
                      style={{ borderColor: "var(--ptl-border)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-neutral-900">{reply.author.name}</div>
                        <time className="text-[11px] text-neutral-600">
                          {formatCommentTimestamp(reply.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{reply.body}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function BuildCommentsSection(props: BuildCommentsSectionProps) {
  const utils = trpc.useUtils();

  return (
    <ErrorBoundary
      onRetry={() => {
        void utils.builds.listComments.invalidate({ shareSlug: props.shareSlug });
      }}
      fallback={({ retry }) => (
        <section className="ptl-surface p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Comments</h2>
          </div>
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Failed to load comments.
          </div>
          <button type="button" onClick={retry} className="mt-3 ptl-btn-secondary">
            Retry
          </button>
        </section>
      )}
    >
      <BuildCommentsSectionContent {...props} />
    </ErrorBoundary>
  );
}
