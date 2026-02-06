import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { plants } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const suffix = nanoid(6).toLowerCase();
  const slug = `new-plant-${suffix}`;

  const rows = await db
    .insert(plants)
    .values({
      commonName: "New plant",
      scientificName: null,
      slug,
      family: null,
      description: null,
      imageUrl: null,
      imageUrls: [],
      sources: [],
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "low",
      growthRate: "slow",
      placement: "midground",
      shrimpSafe: true,
      beginnerFriendly: true,
      nativeRegion: null,
      notes: null,
      verified: false,
      status: "active",
      updatedAt: new Date(),
    })
    .returning({ id: plants.id });

  const id = rows[0]?.id;
  const u = new URL(`/admin/plants/${id}`, req.url);
  return NextResponse.redirect(u.toString(), { status: 303 });
}

