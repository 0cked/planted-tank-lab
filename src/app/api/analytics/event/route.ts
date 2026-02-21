import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";

import { db } from "@/server/db";
import { analyticsEvents } from "@/server/db/schema";
import { authOptions } from "@/server/auth";
import { hasAnalyticsConsentFromCookieHeader } from "@/server/services/analytics";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.enum(["builder_started", "share_created", "signup_completed"]),
  buildId: z.string().uuid().optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  // No consent -> do nothing (204) so callers can fire-and-forget.
  const hasConsent = hasAnalyticsConsentFromCookieHeader(req.headers.get("cookie"));
  if (!hasConsent) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  try {
    await db.insert(analyticsEvents).values({
      name: parsed.data.name,
      userId,
      buildId: parsed.data.buildId ?? null,
      meta: parsed.data.meta ?? {},
    });
  } catch {
    // Best-effort; don't fail the page.
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ ok: true });
}
