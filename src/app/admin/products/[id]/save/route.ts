import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { products, specDefinitions } from "@/server/db/schema";

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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = params.id;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const fd = await req.formData();

  const name = String(fd.get("name") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim();
  const descriptionRaw = String(fd.get("description") ?? "").trim();
  const status = String(fd.get("status") ?? "active").trim();
  const imageUrlRaw = String(fd.get("imageUrl") ?? "").trim();
  const verified = fd.get("verified") === "on";

  const imageUrlsJson = String(fd.get("imageUrlsJson") ?? "");
  const specsJson = String(fd.get("specsJson") ?? "");
  const metaJson = String(fd.get("metaJson") ?? "");

  const safe = z
    .object({
      name: z.string().min(1).max(500),
      slug: z.string().min(1).max(500),
      status: z.enum(["active", "inactive", "archived"]),
    })
    .parse({ name, slug, status });

  const redirectBase = new URL(`/admin/products/${id}`, req.url);

  try {
    const imageUrls = parseJson(
      imageUrlsJson.trim() ? imageUrlsJson : "[]",
      z.array(z.string().min(1)),
      "Image URLs",
    );
    const specs = parseJson(
      specsJson.trim() ? specsJson : "{}",
      z.record(z.string(), z.unknown()),
      "Specs",
    );
    const meta = parseJson(
      metaJson.trim() ? metaJson : "{}",
      z.record(z.string(), z.unknown()),
      "Meta",
    );

    // Spec-driven overrides (optional).
    const prod = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    const categoryId = prod[0]?.categoryId ?? null;

    if (categoryId) {
      const defs = await db
        .select({
          key: specDefinitions.key,
          dataType: specDefinitions.dataType,
          enumValues: specDefinitions.enumValues,
        })
        .from(specDefinitions)
        .where(eq(specDefinitions.categoryId, categoryId))
        .limit(500);

      for (const d of defs) {
        const key = d.key;
        const fieldName = `spec__${key}`;

        if (d.dataType === "boolean") {
          specs[key] = fd.get(fieldName) === "on";
          continue;
        }

        const raw = String(fd.get(fieldName) ?? "").trim();
        if (!raw) {
          delete specs[key];
          continue;
        }

        if (d.dataType === "number") {
          const n = Number(raw);
          if (!Number.isFinite(n)) throw new Error(`Spec '${key}' must be a number.`);
          specs[key] = n;
          continue;
        }

        if (d.dataType === "enum" && Array.isArray(d.enumValues)) {
          const allowed = new Set(
            d.enumValues.filter((x): x is string => typeof x === "string" && x.length > 0),
          );
          if (!allowed.has(raw)) throw new Error(`Spec '${key}' must be one of the allowed values.`);
          specs[key] = raw;
          continue;
        }

        specs[key] = raw;
      }
    }

    await db
      .update(products)
      .set({
        name: safe.name,
        slug: safe.slug,
        description: descriptionRaw ? descriptionRaw : null,
        status: safe.status,
        verified,
        imageUrl: imageUrlRaw ? imageUrlRaw : null,
        imageUrls,
        specs,
        meta,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Save failed.";
    redirectBase.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(redirectBase.toString(), { status: 303 });
  }

  redirectBase.searchParams.delete("error");
  redirectBase.searchParams.set("saved", "1");
  return NextResponse.redirect(redirectBase.toString(), { status: 303 });
}

