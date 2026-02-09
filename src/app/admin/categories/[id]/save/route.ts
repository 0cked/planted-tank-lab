import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = params.id;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const slug = String(fd.get("slug") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  const iconRaw = String(fd.get("icon") ?? "").trim();
  const displayOrderRaw = String(fd.get("displayOrder") ?? "").trim();
  const builderRequired = fd.get("builderRequired") === "on";

  const redirectBase = new URL("/admin/categories", req.url);

  try {
    const safe = z
      .object({
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9_]+$/i, "Slug must be alphanumeric/underscore."),
        name: z.string().min(1).max(100),
        displayOrder: z.number().int().min(1),
      })
      .parse({
        slug,
        name,
        displayOrder: Number(displayOrderRaw),
      });

    await db
      .update(categories)
      .set({
        slug: safe.slug,
        name: safe.name,
        displayOrder: safe.displayOrder,
        builderRequired,
        icon: iconRaw ? iconRaw.slice(0, 50) : null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "category.update",
      targetType: "category",
      targetId: id,
      meta: { slug: safe.slug, builderRequired, displayOrder: safe.displayOrder },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Save failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "1");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}

