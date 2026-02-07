import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { offers } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function intOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function dateOrNull(raw: FormDataEntryValue | null): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const url = String(fd.get("url") ?? "").trim();
  const affiliateUrl = String(fd.get("affiliateUrl") ?? "").trim();
  const currency = String(fd.get("currency") ?? "USD").trim();
  const inStock = fd.get("inStock") === "on";
  const priceCents = intOrNull(fd.get("priceCents"));
  const lastCheckedAt = dateOrNull(fd.get("lastCheckedAt"));

  const safe = z
    .object({
      url: z.string().url(),
      currency: z.string().min(3).max(3),
    })
    .parse({ url, currency });

  const redirectBase = new URL(`/admin/offers/${id}`, req.url);

  try {
    await db
      .update(offers)
      .set({
        url: safe.url,
        affiliateUrl: affiliateUrl ? affiliateUrl : null,
        currency: safe.currency,
        inStock,
        priceCents,
        lastCheckedAt,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id));

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "offer.update",
      targetType: "offer",
      targetId: id,
      meta: { inStock, priceCents, currency: safe.currency },
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

