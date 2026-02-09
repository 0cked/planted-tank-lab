import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();
  const id = String(fd.get("id") ?? "").trim();
  const direction = String(fd.get("direction") ?? "").trim();

  const redirectBase = new URL("/admin/categories", req.url);

  let safe: { id: string; direction: "up" | "down" };
  try {
    safe = z
      .object({
        id: z.string().uuid(),
        direction: z.enum(["up", "down"]),
      })
      .parse({ id, direction });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bad request.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      displayOrder: categories.displayOrder,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name))
    .limit(500);

  const idx = rows.findIndex((r) => r.id === safe.id);
  const neighborIdx = safe.direction === "up" ? idx - 1 : idx + 1;

  if (idx < 0 || neighborIdx < 0 || neighborIdx >= rows.length) {
    redirectBase.searchParams.set("error", "Cannot reorder this category.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  const a = rows[idx]!;
  const b = rows[neighborIdx]!;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({ displayOrder: b.displayOrder, updatedAt: new Date() })
        .where(eq(categories.id, a.id));
      await tx
        .update(categories)
        .set({ displayOrder: a.displayOrder, updatedAt: new Date() })
        .where(eq(categories.id, b.id));
    });

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "category.reorder",
      targetType: "category",
      targetId: safe.id,
      meta: { direction: safe.direction, swapWith: b.id },
    });
  } catch {
    redirectBase.searchParams.set("error", "Reorder failed.");
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "1");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}

