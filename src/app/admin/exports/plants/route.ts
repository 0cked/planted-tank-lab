import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { plants } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";
import { toCsv } from "@/server/services/admin/csv";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select({
      id: plants.id,
      slug: plants.slug,
      commonName: plants.commonName,
      scientificName: plants.scientificName,
      family: plants.family,
      difficulty: plants.difficulty,
      lightDemand: plants.lightDemand,
      co2Demand: plants.co2Demand,
      growthRate: plants.growthRate,
      placement: plants.placement,
      tempMinF: plants.tempMinF,
      tempMaxF: plants.tempMaxF,
      phMin: plants.phMin,
      phMax: plants.phMax,
      ghMin: plants.ghMin,
      ghMax: plants.ghMax,
      khMin: plants.khMin,
      khMax: plants.khMax,
      maxHeightIn: plants.maxHeightIn,
      propagation: plants.propagation,
      substrateType: plants.substrateType,
      shrimpSafe: plants.shrimpSafe,
      beginnerFriendly: plants.beginnerFriendly,
      nativeRegion: plants.nativeRegion,
      description: plants.description,
      notes: plants.notes,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      sources: plants.sources,
      verified: plants.verified,
      status: plants.status,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .orderBy(asc(plants.commonName))
    .limit(20_000);

  await logAdminAction({
    actorUserId: session.user.id ?? null,
    action: "export.plants_csv",
    targetType: "export",
    targetId: null,
    meta: { rows: rows.length },
  });

  const csv = toCsv({
    columns: [
      { header: "id", key: "id" },
      { header: "slug", key: "slug" },
      { header: "common_name", key: "commonName" },
      { header: "scientific_name", key: "scientificName" },
      { header: "family", key: "family" },
      { header: "difficulty", key: "difficulty" },
      { header: "light_demand", key: "lightDemand" },
      { header: "co2_demand", key: "co2Demand" },
      { header: "growth_rate", key: "growthRate" },
      { header: "placement", key: "placement" },
      { header: "temp_min_f", key: "tempMinF" },
      { header: "temp_max_f", key: "tempMaxF" },
      { header: "ph_min", key: "phMin" },
      { header: "ph_max", key: "phMax" },
      { header: "gh_min", key: "ghMin" },
      { header: "gh_max", key: "ghMax" },
      { header: "kh_min", key: "khMin" },
      { header: "kh_max", key: "khMax" },
      { header: "max_height_in", key: "maxHeightIn" },
      { header: "propagation", key: "propagation" },
      { header: "substrate_type", key: "substrateType" },
      { header: "shrimp_safe", key: "shrimpSafe" },
      { header: "beginner_friendly", key: "beginnerFriendly" },
      { header: "native_region", key: "nativeRegion" },
      { header: "description", key: "description" },
      { header: "notes", key: "notes" },
      { header: "image_url", key: "imageUrl" },
      { header: "image_urls_json", key: "imageUrls" },
      { header: "sources_json", key: "sources" },
      { header: "verified", key: "verified" },
      { header: "status", key: "status" },
      { header: "updated_at", key: "updatedAt" },
    ],
    rows,
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="plants.csv"',
      "cache-control": "no-store",
    },
  });
}
