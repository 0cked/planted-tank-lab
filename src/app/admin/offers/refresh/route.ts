import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth";
import { enqueueIngestionJob } from "@/server/ingestion/job-queue";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();
  const olderThanDays = Number(String(fd.get("olderThanDays") ?? "0"));
  const limit = Number(String(fd.get("limit") ?? "30"));

  const parsedOlder = Number.isFinite(olderThanDays) ? Math.max(0, olderThanDays) : 0;
  const parsedLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, limit)) : 30;

  const queued = await enqueueIngestionJob({
    kind: "offers.detail_refresh.bulk",
    payload: { olderThanDays: parsedOlder, limit: parsedLimit, timeoutMs: 12000 },
    priority: 5,
  });

  const minuteBucket = new Date().toISOString().slice(0, 16);
  const buceQueued = await enqueueIngestionJob({
    kind: "offers.buceplant_variants_refresh",
    payload: { timeoutMs: 15000 },
    idempotencyKey: `admin:offers.buceplant_variants_refresh:${minuteBucket}`,
    priority: 8,
  });

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "offers.refresh.bulk",
    targetType: "offers",
    targetId: null,
    meta: {
      jobId: queued.id,
      deduped: queued.deduped,
      buceVariantJobId: buceQueued.id,
      buceVariantDeduped: buceQueued.deduped,
      olderThanDays: parsedOlder,
      limit: parsedLimit,
    },
  });

  const u = new URL("/admin/offers", req.url);
  u.searchParams.set("queued", queued.id ?? "1");
  return NextResponse.redirect(u.toString(), { status: 303 });
}
