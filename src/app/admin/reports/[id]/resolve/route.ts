import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { problemReports } from "@/server/db/schema";
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

  const fd = await req.formData();
  const resolution = String(fd.get("resolution") ?? "resolved").trim();
  const note = String(fd.get("note") ?? "").trim();

  await db
    .update(problemReports)
    .set({
      resolvedAt: new Date(),
      resolvedByUserId: session.user.id ?? null,
      resolution: resolution ? resolution : null,
      resolutionNote: note ? note : null,
    })
    .where(and(eq(problemReports.id, id), isNull(problemReports.resolvedAt)));

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "problem_report.resolve",
    targetType: "problem_report",
    targetId: id,
    meta: { resolution, note },
  });

  const u = new URL("/admin/reports", req.url);
  return NextResponse.redirect(u.toString(), { status: 303 });
}
