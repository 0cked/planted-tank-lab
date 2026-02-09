import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const slug = String(fd.get("slug") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  const iconRaw = String(fd.get("icon") ?? "").trim();
  const displayOrderRaw = String(fd.get("displayOrder") ?? "").trim();
  const builderRequired = fd.get("builderRequired") === "on";

  const redirectBase = new URL("/admin/categories", req.url);

  let displayOrder = Number(displayOrderRaw);
  if (!displayOrderRaw) {
    const last = await db
      .select({ displayOrder: categories.displayOrder })
      .from(categories)
      .orderBy(categories.displayOrder)
      .limit(500);
    displayOrder = (last[last.length - 1]?.displayOrder ?? 0) + 1;
  }

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
        displayOrder,
      });

    const rows = await db
      .insert(categories)
      .values({
        slug: safe.slug,
        name: safe.name,
        displayOrder: safe.displayOrder,
        builderRequired,
        icon: iconRaw ? iconRaw.slice(0, 50) : null,
        updatedAt: new Date(),
      })
      .returning({ id: categories.id });

    const id = rows[0]?.id ?? null;
    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "category.create",
      targetType: "category",
      targetId: id,
      meta: { slug: safe.slug, builderRequired, displayOrder: safe.displayOrder },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("created", "1");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}

