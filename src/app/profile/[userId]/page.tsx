import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions } from "@/server/auth";

import { ProfileBuildGrid } from "../ProfileBuildGrid";
import { formatJoinDate, getUserProfileData } from "../profile-data";

export async function generateMetadata(props: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await props.params;
  const profile = await getUserProfileData({
    userId,
    includePrivateBuilds: false,
  });

  if (!profile) {
    return {
      title: "Profile | PlantedTankLab",
      description: "View planted tank builds from the community.",
    };
  }

  return {
    title: `${profile.displayName} | Profile | PlantedTankLab`,
    description: `See ${profile.displayName}'s planted tank builds and community stats.`,
    openGraph: {
      url: `/profile/${profile.userId}`,
    },
  };
}

export default async function PublicProfilePage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;

  const [profile, session] = await Promise.all([
    getUserProfileData({
      userId,
      includePrivateBuilds: false,
    }),
    getServerSession(authOptions),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnerView = session?.user?.id === profile.userId;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">Community profile</div>
          <h1 className="mt-2 ptl-page-title">{profile.displayName}</h1>
          <div className="mt-3 text-sm text-neutral-700">
            Joined {formatJoinDate(profile.joinedAt)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwnerView ? (
            <Link href="/profile" className="ptl-btn-secondary">
              Manage profile
            </Link>
          ) : null}
          <Link href="/builder" className="ptl-btn-primary">
            Start your own build
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
        <div className="ptl-surface p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Public builds
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">{profile.buildCount}</div>
        </div>

        <div className="ptl-surface p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Total votes
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">{profile.voteCount}</div>
        </div>
      </div>

      <section className="mt-10">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Public builds</h2>
          <p className="mt-1 text-sm text-neutral-700">
            Shared build snapshots from this hobbyist.
          </p>
        </div>

        <ProfileBuildGrid
          builds={profile.builds}
          emptyStateMessage="No public builds shared yet."
        />
      </section>
    </main>
  );
}
