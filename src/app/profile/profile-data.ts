import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { builds, buildVotes, users } from "@/server/db/schema";

export type ProfileBuildSummary = {
  id: string;
  name: string;
  shareSlug: string | null;
  updatedAt: Date;
  coverImageUrl: string | null;
  itemCount: number;
  totalPriceCents: number;
  isPublic: boolean;
  voteCount: number;
};

export type UserProfileData = {
  userId: string;
  displayName: string;
  email: string;
  joinedAt: Date;
  buildCount: number;
  voteCount: number;
  builds: ProfileBuildSummary[];
};

function resolveDisplayName(params: {
  displayName: string | null;
  email: string | null;
}): string {
  const trimmedDisplayName = params.displayName?.trim();
  if (trimmedDisplayName) {
    return trimmedDisplayName;
  }

  const emailLocalPart = params.email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim();

  if (emailLocalPart) {
    return emailLocalPart.slice(0, 1).toUpperCase() + emailLocalPart.slice(1);
  }

  return "Aquascaper";
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function formatJoinDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function buildThumbnailSrc(
  coverImageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): string | null {
  if (!coverImageUrl) return null;

  const timestamp =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === "string"
        ? Date.parse(updatedAt)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) return coverImageUrl;

  const separator = coverImageUrl.includes("?") ? "&" : "?";
  return `${coverImageUrl}${separator}v=${timestamp}`;
}

export async function getUserProfileData(params: {
  userId: string;
  includePrivateBuilds: boolean;
}): Promise<UserProfileData | null> {
  const userRows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) return null;

  const visibilityClause = params.includePrivateBuilds
    ? eq(builds.userId, user.id)
    : and(eq(builds.userId, user.id), eq(builds.isPublic, true));

  const voteCountSql = sql<number>`coalesce(count(${buildVotes.userId}), 0)::int`;

  const buildRows = await db
    .select({
      id: builds.id,
      name: builds.name,
      shareSlug: builds.shareSlug,
      updatedAt: builds.updatedAt,
      coverImageUrl: builds.coverImageUrl,
      itemCount: builds.itemCount,
      totalPriceCents: builds.totalPriceCents,
      isPublic: builds.isPublic,
      voteCount: voteCountSql.as("voteCount"),
    })
    .from(builds)
    .leftJoin(buildVotes, eq(buildVotes.buildId, builds.id))
    .where(visibilityClause)
    .groupBy(
      builds.id,
      builds.name,
      builds.shareSlug,
      builds.updatedAt,
      builds.coverImageUrl,
      builds.itemCount,
      builds.totalPriceCents,
      builds.isPublic,
    )
    .orderBy(desc(builds.updatedAt));

  const profileBuilds: ProfileBuildSummary[] = buildRows.map((buildRow) => ({
    ...buildRow,
    voteCount: buildRow.voteCount ?? 0,
  }));

  const totalVotes = profileBuilds.reduce((sum, buildRow) => sum + buildRow.voteCount, 0);

  return {
    userId: user.id,
    displayName: resolveDisplayName({
      displayName: user.displayName,
      email: user.email,
    }),
    email: user.email,
    joinedAt: user.createdAt,
    buildCount: profileBuilds.length,
    voteCount: totalVotes,
    builds: profileBuilds,
  };
}
