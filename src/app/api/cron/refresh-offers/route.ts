import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { refreshOffersJob } from "@/server/jobs/refresh-offers";

export const runtime = "nodejs";

function getBearerToken(h: Headers): string | null {
  const auth = h.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? null;
  if (secret) {
    const h = req.headers;
    const token = h.get("x-cron-secret")?.trim() || getBearerToken(h);
    if (!token || token !== secret) return new NextResponse("Unauthorized", { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    return new NextResponse("Cron secret not configured", { status: 501 });
  }

  const url = new URL(req.url);
  const olderThanDays = Number(url.searchParams.get("olderThanDays") ?? "2");
  const limit = Number(url.searchParams.get("limit") ?? "30");

  const result = await refreshOffersJob({
    db,
    olderThanDays: Number.isFinite(olderThanDays) ? Math.max(1, olderThanDays) : 2,
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 30,
    timeoutMs: 6000,
  });

  return NextResponse.json({
    ok: true,
    ...result,
    ranAt: new Date().toISOString(),
  });
}

