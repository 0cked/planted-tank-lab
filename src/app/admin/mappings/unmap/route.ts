import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/server/auth";
import { unmapIngestionEntity } from "@/server/services/admin/mappings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const fd = await req.formData();
  const redirectBase = new URL("/admin/ingestion", req.url);

  const parsed = z
    .object({ entityId: z.string().uuid() })
    .safeParse({ entityId: String(fd.get("entityId") ?? "").trim() });

  if (!parsed.success) {
    redirectBase.searchParams.set("error", "Invalid unmap request.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  try {
    await unmapIngestionEntity({
      entityId: parsed.data.entityId,
      actorUserId: session.user.id ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unmap failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "unmapped");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}
