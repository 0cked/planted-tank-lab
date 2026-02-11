import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth";
import { deleteNormalizationOverride } from "@/server/services/admin/overrides";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const actorUserId = session.user.id?.trim();
  const redirectBase = new URL("/admin/overrides", req.url);
  if (!actorUserId) {
    redirectBase.searchParams.set("error", "Admin actor id is required.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  const params = await ctx.params;
  if (!isUuid(params.id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await deleteNormalizationOverride({
      overrideId: params.id,
      actorUserId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete override failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "deleted");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}
