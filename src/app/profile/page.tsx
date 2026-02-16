import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";

import { ProfileBuildGrid } from "./ProfileBuildGrid";
import { SignOutButton } from "./SignOutButton";
import { formatJoinDate, getUserProfileData } from "./profile-data";

export const metadata: Metadata = {
  title: "Profile | PlantedTankLab",
  description: "View your profile stats and saved builds.",
  openGraph: {
    url: "/profile",
  },
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="ptl-surface-strong p-7 sm:p-10">
          <h1 className="ptl-page-title">Your profile</h1>
          <p className="mt-3 ptl-lede text-neutral-700">
            Sign in to save builds, track your progress, and share your aquascapes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="ptl-btn-primary">
              Sign in
            </Link>
            <Link href="/builder" className="ptl-btn-secondary">
              Go to builder
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const profile = await getUserProfileData({
    userId,
    includePrivateBuilds: true,
  });

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="ptl-surface p-7 sm:p-10">
          <h1 className="ptl-page-title">Profile unavailable</h1>
          <p className="mt-3 ptl-lede text-neutral-700">
            We couldn&apos;t load your profile right now. Try refreshing in a moment.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">Your profile</div>
          <h1 className="mt-2 ptl-page-title">{profile.displayName}</h1>
          <div className="mt-3 text-sm text-neutral-700">
            Joined {formatJoinDate(profile.joinedAt)}
          </div>
          <div className="mt-1 text-sm text-neutral-700">
            Signed in as <span className="font-semibold">{profile.email}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/builder" className="ptl-btn-secondary">
            Open builder
          </Link>
          <Link href={`/profile/${profile.userId}`} className="ptl-btn-secondary">
            Public profile
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
        <div className="ptl-surface p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Build count
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Saved builds</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Manage your public and private builds from one place.
            </p>
          </div>
        </div>

        <ProfileBuildGrid
          builds={profile.builds}
          allowManage
          emptyStateMessage="No saved builds yet. Open the builder to create your first setup."
        />
      </section>
    </main>
  );
}
