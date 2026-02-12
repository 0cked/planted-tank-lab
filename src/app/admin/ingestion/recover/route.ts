import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/server/auth";
import {
  applyIngestionRecoveryAction,
  type IngestionRecoveryAction,
} from "@/server/services/admin/ingestion-ops";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

const RecoverySchema = z.object({
  action: z.enum([
    "retry_failed_jobs",
    "requeue_stale_queued_jobs",
    "recover_stuck_running_jobs",
    "enqueue_freshness_refresh",
  ]),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  staleQueuedMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
  stuckRunningMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const redirectBase = new URL("/admin/ingestion", req.url);
  const fd = await req.formData();

  const parsed = RecoverySchema.safeParse({
    action: String(fd.get("action") ?? "").trim() as IngestionRecoveryAction,
    limit: fd.get("limit") ?? undefined,
    staleQueuedMinutes: fd.get("staleQueuedMinutes") ?? undefined,
    stuckRunningMinutes: fd.get("stuckRunningMinutes") ?? undefined,
  });

  if (!parsed.success) {
    redirectBase.searchParams.set("error", "Invalid ingestion recovery action.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  try {
    const result = await applyIngestionRecoveryAction(parsed.data);

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: `ingestion.recover.${result.action}`,
      targetType: "ingestion_job",
      targetId: null,
      meta: {
        affectedCount: result.affectedCount,
        affectedJobIds: result.affectedJobIds,
        limit: result.limit,
        staleQueuedMinutes: result.staleQueuedMinutes,
        stuckRunningMinutes: result.stuckRunningMinutes,
        enqueued: result.enqueued ?? null,
      },
    });

    redirectBase.searchParams.delete("error");
    redirectBase.searchParams.set("saved", "recovery");
    redirectBase.searchParams.set("recoveryAction", result.action);
    redirectBase.searchParams.set("recoveryCount", String(result.affectedCount));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 220) : "Recovery action failed.";
    redirectBase.searchParams.set("error", message);
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }
}
