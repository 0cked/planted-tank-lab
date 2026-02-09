import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { plants } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function extFromContentType(ct: string | null): string {
  const v = (ct ?? "").toLowerCase();
  if (v.includes("image/png")) return "png";
  if (v.includes("image/webp")) return "webp";
  if (v.includes("image/avif")) return "avif";
  if (v.includes("image/gif")) return "gif";
  return "jpg";
}

async function ensureBucket(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}): Promise<void> {
  // Best-effort: create public bucket if missing. Ignore "already exists".
  try {
    const res = await fetch(`${params.supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${params.serviceRoleKey}`,
        apikey: params.serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: params.bucket, name: params.bucket, public: true }),
    });
    if (res.ok) return;
    // 409 or 400 indicates it exists or cannot be created; we proceed.
  } catch {
    // ignore
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = params.id;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!supabaseUrl || !serviceRole) {
    const u = new URL(`/admin/plants/${id}`, req.url);
    u.searchParams.set("error", "Supabase Storage is not configured.");
    return NextResponse.redirect(u.toString(), { status: 303 });
  }

  const fd = await req.formData();
  const file = fd.get("file");
  const setPrimary = fd.get("setPrimary") === "on";
  if (!(file instanceof File)) {
    const u = new URL(`/admin/plants/${id}`, req.url);
    u.searchParams.set("error", "Missing file.");
    return NextResponse.redirect(u.toString(), { status: 303 });
  }

  // 8MB limit to avoid huge uploads.
  if (file.size > 8 * 1024 * 1024) {
    const u = new URL(`/admin/plants/${id}`, req.url);
    u.searchParams.set("error", "File too large (max 8MB).");
    return NextResponse.redirect(u.toString(), { status: 303 });
  }

  const plantRows = await db
    .select({ slug: plants.slug, imageUrls: plants.imageUrls })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);
  const plant = plantRows[0];
  if (!plant) return new NextResponse("Not found", { status: 404 });

  const bucket = "ptl-media";
  await ensureBucket({ supabaseUrl, serviceRoleKey: serviceRole, bucket });

  const ext = extFromContentType(file.type);
  const key = `plants/${plant.slug}/${Date.now()}-${nanoid(10)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${key}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buf,
  });

  if (!uploadRes.ok) {
    const u = new URL(`/admin/plants/${id}`, req.url);
    u.searchParams.set("error", `Upload failed (${uploadRes.status}).`);
    return NextResponse.redirect(u.toString(), { status: 303 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;

  const prev = Array.isArray(plant.imageUrls)
    ? plant.imageUrls.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const next = Array.from(new Set([publicUrl, ...prev]));

  await db
    .update(plants)
    .set({
      imageUrls: next,
      ...(setPrimary ? { imageUrl: publicUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(plants.id, id));

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "plant.upload_image",
    targetType: "plant",
    targetId: id,
    meta: { key, url: publicUrl, setPrimary },
  });

  const u = new URL(`/admin/plants/${id}`, req.url);
  u.searchParams.set("uploaded", "1");
  return NextResponse.redirect(u.toString(), { status: 303 });
}
