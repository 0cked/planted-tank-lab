"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/components/TRPCProvider";

export function PublishToggle(props: { buildId: string; isPublic: boolean }) {
  const router = useRouter();
  const m = trpc.builds.setPublic.useMutation();

  return (
    <button
      type="button"
      className="rounded-full border bg-white/70 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ borderColor: "var(--ptl-border)" }}
      disabled={m.isPending}
      onClick={async () => {
        try {
          await m.mutateAsync({ buildId: props.buildId, isPublic: !props.isPublic });
          router.refresh();
        } catch {
          // Keep silent; UI refresh is best-effort.
        }
      }}
    >
      {m.isPending ? "Updating..." : props.isPublic ? "Unpublish" : "Publish"}
    </button>
  );
}

