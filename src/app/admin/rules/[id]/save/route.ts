import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { compatibilityRules } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

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

  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const severity = String(fd.get("severity") ?? "").trim();
  const versionRaw = String(fd.get("version") ?? "").trim();
  const messageTemplate = String(fd.get("messageTemplate") ?? "").trim();
  const fixSuggestion = String(fd.get("fixSuggestion") ?? "").trim();
  const active = fd.get("active") === "on";

  const categoriesInvolvedJson = String(fd.get("categoriesInvolvedJson") ?? "");
  const conditionLogicJson = String(fd.get("conditionLogicJson") ?? "");

  const safe = z
    .object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(300),
      severity: z.enum(["error", "warning", "recommendation", "completeness"]),
      version: z.number().int().positive(),
      messageTemplate: z.string().min(1),
    })
    .parse({
      code,
      name,
      severity,
      version: Number(versionRaw),
      messageTemplate,
    });

  const redirectBase = new URL(`/admin/rules/${id}`, req.url);

  try {
    const categories = parseJson(
      categoriesInvolvedJson.trim() ? categoriesInvolvedJson : "[]",
      z.array(z.string().min(1)).min(1),
      "Categories involved",
    );
    const logic = parseJson(
      conditionLogicJson.trim() ? conditionLogicJson : "{}",
      z.record(z.string(), z.unknown()),
      "Condition logic",
    );

    // Enforce unique code across rules.
    const dup = await db
      .select({ id: compatibilityRules.id })
      .from(compatibilityRules)
      .where(and(eq(compatibilityRules.code, safe.code), ne(compatibilityRules.id, id)))
      .limit(1);
    if (dup[0]?.id) throw new Error("Code is already used by another rule.");

    await db
      .update(compatibilityRules)
      .set({
        code: safe.code,
        name: safe.name,
        description: description ? description : null,
        severity: safe.severity,
        categoriesInvolved: categories,
        conditionLogic: logic,
        messageTemplate: safe.messageTemplate,
        fixSuggestion: fixSuggestion ? fixSuggestion : null,
        active,
        version: safe.version,
        updatedAt: new Date(),
      })
      .where(eq(compatibilityRules.id, id));

    await logAdminAction({
      actorUserId: session.user.id ?? null,
      action: "rule.update",
      targetType: "compatibility_rule",
      targetId: id,
      meta: { code: safe.code, active, severity: safe.severity, version: safe.version },
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

