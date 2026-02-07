import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { retailers } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function intOrZero(raw: FormDataEntryValue | null): number {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  return schema.parse(parsed);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const name = String(fd.get("name") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim();
  const websiteUrl = String(fd.get("websiteUrl") ?? "").trim();
  const logoUrl = String(fd.get("logoUrl") ?? "").trim();
  const logoAssetPath = String(fd.get("logoAssetPath") ?? "").trim();
  const affiliateNetwork = String(fd.get("affiliateNetwork") ?? "").trim();
  const affiliateTag = String(fd.get("affiliateTag") ?? "").trim();
  const affiliateTagParam = String(fd.get("affiliateTagParam") ?? "").trim();
  const affiliateDeeplinkTemplate = String(fd.get("affiliateDeeplinkTemplate") ?? "").trim();
  const allowedHostsJson = String(fd.get("allowedHostsJson") ?? "");
  const metaJson = String(fd.get("metaJson") ?? "");
  const priority = intOrZero(fd.get("priority"));
  const active = fd.get("active") === "on";

  const safe = z
    .object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(200),
      websiteUrl: z.string().url().optional(),
      logoUrl: z.string().url().optional(),
      affiliateTagParam: z.string().min(1).max(50),
    })
    .parse({
      name,
      slug,
      websiteUrl: websiteUrl ? websiteUrl : undefined,
      logoUrl: logoUrl ? logoUrl : undefined,
      affiliateTagParam: affiliateTagParam ? affiliateTagParam : "tag",
    });

  const redirectBase = new URL(`/admin/offers/retailers/${id}`, req.url);

  try {
    const allowedHosts = parseJson(
      allowedHostsJson.trim() ? allowedHostsJson : "[]",
      z.array(z.string().min(1)),
      "Allowed hosts",
    );
    const meta = parseJson(metaJson.trim() ? metaJson : "{}", z.record(z.string(), z.unknown()), "Meta");

    // Enforce unique slug.
    const dup = await db
      .select({ id: retailers.id })
      .from(retailers)
      .where(and(eq(retailers.slug, safe.slug), ne(retailers.id, id)))
      .limit(1);
    if (dup[0]?.id) throw new Error("Slug is already used by another retailer.");

    await db
      .update(retailers)
      .set({
        name: safe.name,
        slug: safe.slug,
        websiteUrl: safe.websiteUrl ?? null,
        logoUrl: safe.logoUrl ?? null,
        logoAssetPath: logoAssetPath ? logoAssetPath : null,
        priority,
        affiliateNetwork: affiliateNetwork ? affiliateNetwork : null,
        affiliateTag: affiliateTag ? affiliateTag : null,
        affiliateTagParam: safe.affiliateTagParam,
        affiliateDeeplinkTemplate: affiliateDeeplinkTemplate ? affiliateDeeplinkTemplate : null,
        allowedHosts,
        meta,
        active,
        updatedAt: new Date(),
      })
      .where(eq(retailers.id, id));

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "retailer.update",
      targetType: "retailer",
      targetId: id,
      meta: { slug: safe.slug, active, priority },
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

