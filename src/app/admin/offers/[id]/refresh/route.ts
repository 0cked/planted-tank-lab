import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth";
import { enqueueIngestionJob } from "@/server/ingestion/job-queue";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const minuteBucket = Math.floor(Date.now() / 60000);
  const queued = await enqueueIngestionJob({
    kind: "offers.head_refresh.one",
    payload: { offerId: id, timeoutMs: 6000 },
    idempotencyKey: `offers.head_refresh.one:${id}:${minuteBucket}`,
    priority: 10,
  });

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "offer.refresh",
    targetType: "offer",
    targetId: id,
    meta: { jobId: queued.id, deduped: queued.deduped },
  });

  const u = new URL("/admin/offers", req.url);
  return NextResponse.redirect(u.toString(), { status: 303 });
}
