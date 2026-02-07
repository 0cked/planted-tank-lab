import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { compatibilityRules } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const code = `R${nanoid(6)}`.toUpperCase().slice(0, 20);

  const rows = await db
    .insert(compatibilityRules)
    .values({
      code,
      name: "New rule",
      description: null,
      severity: "warning",
      categoriesInvolved: ["tank"],
      conditionLogic: { type: "missing_selection", category: "tank", blocks_selection: false },
      messageTemplate: "Example message.",
      fixSuggestion: null,
      active: false,
      version: 1,
      updatedAt: new Date(),
    })
    .returning({ id: compatibilityRules.id });

  const id = rows[0]?.id;
  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "rule.create",
    targetType: "compatibility_rule",
    targetId: id ?? null,
    meta: { code },
  });

  const u = new URL(`/admin/rules/${id}`, req.url);
  return NextResponse.redirect(u.toString(), { status: 303 });
}

