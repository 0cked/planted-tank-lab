import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { plants } from "@/server/db/schema";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
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

function numOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function decimalOrNull(raw: FormDataEntryValue | null): string | null {
  const n = numOrNull(raw);
  if (n == null) return null;
  return String(n);
}

function intOrNull(raw: FormDataEntryValue | null): number | null {
  const n = numOrNull(raw);
  if (n == null) return null;
  return Number.isInteger(n) ? n : Math.round(n);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = params.id;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const commonName = String(fd.get("commonName") ?? "").trim();
  const scientificName = String(fd.get("scientificName") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim();
  const family = String(fd.get("family") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const notes = String(fd.get("notes") ?? "").trim();
  const nativeRegion = String(fd.get("nativeRegion") ?? "").trim();
  const propagation = String(fd.get("propagation") ?? "").trim();
  const substrateType = String(fd.get("substrateType") ?? "").trim();
  const imageUrl = String(fd.get("imageUrl") ?? "").trim();

  const difficulty = String(fd.get("difficulty") ?? "").trim();
  const lightDemand = String(fd.get("lightDemand") ?? "").trim();
  const co2Demand = String(fd.get("co2Demand") ?? "").trim();
  const growthRate = String(fd.get("growthRate") ?? "").trim();
  const placement = String(fd.get("placement") ?? "").trim();
  const status = String(fd.get("status") ?? "").trim();

  const shrimpSafe = fd.get("shrimpSafe") === "on";
  const beginnerFriendly = fd.get("beginnerFriendly") === "on";
  const verified = fd.get("verified") === "on";

  const imageUrlsJson = String(fd.get("imageUrlsJson") ?? "");
  const sourcesJson = String(fd.get("sourcesJson") ?? "");

  const safe = z
    .object({
      commonName: z.string().min(1).max(300),
      slug: z.string().min(1).max(300),
      difficulty: z.enum(["easy", "medium", "hard"]),
      lightDemand: z.enum(["low", "medium", "high"]),
      co2Demand: z.enum(["low", "medium", "high", "required"]),
      placement: z.enum(["foreground", "midground", "background", "epiphyte", "floating"]),
      status: z.enum(["active", "inactive", "archived"]),
      growthRate: z.enum(["", "slow", "medium", "fast"]).optional(),
    })
    .parse({
      commonName,
      slug,
      difficulty,
      lightDemand,
      co2Demand,
      placement,
      status,
      growthRate,
    });

  const redirectBase = new URL(`/admin/plants/${id}`, req.url);

  try {
    const imageUrls = parseJson(
      imageUrlsJson.trim() ? imageUrlsJson : "[]",
      z.array(z.string().min(1)),
      "Image URLs",
    );
    const sources = parseJson(
      sourcesJson.trim() ? sourcesJson : "[]",
      z.array(z.string().url()),
      "Sources",
    );

    await db
      .update(plants)
      .set({
        commonName: safe.commonName,
        scientificName: scientificName ? scientificName : null,
        slug: safe.slug,
        family: family ? family : null,
        description: description ? description : null,
        notes: notes ? notes : null,
        nativeRegion: nativeRegion ? nativeRegion : null,
        propagation: propagation ? propagation : null,
        substrateType: substrateType ? substrateType : null,
        imageUrl: imageUrl ? imageUrl : null,
        imageUrls,
        sources,

        difficulty: safe.difficulty,
        lightDemand: safe.lightDemand,
        co2Demand: safe.co2Demand,
        growthRate: safe.growthRate === "" ? null : (safe.growthRate ?? null),
        placement: safe.placement,

        tempMinF: decimalOrNull(fd.get("tempMinF")),
        tempMaxF: decimalOrNull(fd.get("tempMaxF")),
        phMin: decimalOrNull(fd.get("phMin")),
        phMax: decimalOrNull(fd.get("phMax")),
        ghMin: intOrNull(fd.get("ghMin")),
        ghMax: intOrNull(fd.get("ghMax")),
        khMin: intOrNull(fd.get("khMin")),
        khMax: intOrNull(fd.get("khMax")),

        maxHeightIn: decimalOrNull(fd.get("maxHeightIn")),

        shrimpSafe,
        beginnerFriendly,
        verified,
        status: safe.status,

        updatedAt: new Date(),
      })
      .where(eq(plants.id, id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Save failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "1");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}
