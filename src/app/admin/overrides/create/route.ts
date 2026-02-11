import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/server/auth";
import { createNormalizationOverride } from "@/server/services/admin/overrides";

export const runtime = "nodejs";

function parseOverrideValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Override value is required.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const actorUserId = session.user.id?.trim();
  if (!actorUserId) {
    const redirectBase = new URL("/admin/overrides", req.url);
    redirectBase.searchParams.set("error", "Admin actor id is required.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  const fd = await req.formData();
  const redirectBase = new URL("/admin/overrides", req.url);

  const parsed = z
    .object({
      canonicalType: z.enum(["product", "plant", "offer"]),
      canonicalId: z.string().uuid(),
      fieldPath: z.string().min(1).max(200),
      valueRaw: z.string().min(1),
      reason: z.string().min(1).max(500),
    })
    .safeParse({
      canonicalType: String(fd.get("canonicalType") ?? "").trim(),
      canonicalId: String(fd.get("canonicalId") ?? "").trim(),
      fieldPath: String(fd.get("fieldPath") ?? "").trim(),
      valueRaw: String(fd.get("value") ?? ""),
      reason: String(fd.get("reason") ?? "").trim(),
    });

  if (!parsed.success) {
    redirectBase.searchParams.set("error", "Invalid override request.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  try {
    const value = parseOverrideValue(parsed.data.valueRaw);

    await createNormalizationOverride({
      canonicalType: parsed.data.canonicalType,
      canonicalId: parsed.data.canonicalId,
      fieldPath: parsed.data.fieldPath,
      value,
      reason: parsed.data.reason,
      actorUserId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create override failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "created");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}
