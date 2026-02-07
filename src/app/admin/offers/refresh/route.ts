import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { refreshOffersJob } from "@/server/jobs/refresh-offers";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();
  const olderThanDays = Number(String(fd.get("olderThanDays") ?? "0"));
  const limit = Number(String(fd.get("limit") ?? "30"));

  const result = await refreshOffersJob({
    db,
    olderThanDays: Number.isFinite(olderThanDays) ? Math.max(0, olderThanDays) : 0,
    limit: Number.isFinite(limit) ? Math.min(200, Math.max(1, limit)) : 30,
    timeoutMs: 6000,
  });

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "offers.refresh.bulk",
    targetType: "offers",
    targetId: null,
    meta: result,
  });

  const u = new URL("/admin/offers", req.url);
  u.searchParams.set("refreshed", String(result.updated));
  return NextResponse.redirect(u.toString(), { status: 303 });
}

