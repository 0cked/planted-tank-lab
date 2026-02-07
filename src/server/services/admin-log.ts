import { db } from "@/server/db";
import { adminLogs } from "@/server/db/schema";

export async function logAdminAction(params: {
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(adminLogs).values({
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      meta: params.meta ?? {},
    });
  } catch {
    // Best-effort logging: do not break admin workflows if logging fails.
  }
}

