import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/server/auth";
import { mapIngestionEntityToCanonical } from "@/server/services/admin/mappings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const fd = await req.formData();
  const redirectBase = new URL("/admin/ingestion", req.url);

  const parsed = z
    .object({
      entityId: z.string().uuid(),
      canonicalType: z.enum(["product", "plant", "offer"]),
      canonicalId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    })
    .safeParse({
      entityId: String(fd.get("entityId") ?? "").trim(),
      canonicalType: String(fd.get("canonicalType") ?? "").trim(),
      canonicalId: String(fd.get("canonicalId") ?? "").trim(),
      reason: String(fd.get("reason") ?? "").trim() || undefined,
    });

  if (!parsed.success) {
    redirectBase.searchParams.set("error", "Invalid mapping request.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  try {
    await mapIngestionEntityToCanonical({
      entityId: parsed.data.entityId,
      canonicalType: parsed.data.canonicalType,
      canonicalId: parsed.data.canonicalId,
      actorUserId: session.user.id ?? null,
      reason: parsed.data.reason ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mapping failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "mapped");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}
