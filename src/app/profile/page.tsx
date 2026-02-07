import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { builds, plants, products, userFavorites } from "@/server/db/schema";

import { SignOutButton } from "./SignOutButton";
import { PublishToggle } from "./PublishToggle";

export const metadata: Metadata = {
  title: "Profile | PlantedTankLab",
  description: "View your builds, favorites, and account settings.",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="ptl-surface-strong p-7 sm:p-10">
          <h1
            className="ptl-page-title"
          >
            Your profile
          </h1>
          <p className="mt-3 ptl-lede text-neutral-700">
            Sign in to save builds, sync across devices, and manage favorites.
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

  const [myBuilds, favoriteProducts, favoritePlants] = await Promise.all([
    db
      .select({
        id: builds.id,
        name: builds.name,
        shareSlug: builds.shareSlug,
        updatedAt: builds.updatedAt,
        isPublic: builds.isPublic,
      })
      .from(builds)
      .where(eq(builds.userId, userId))
      .orderBy(desc(builds.updatedAt))
      .limit(50),

    db
      .select({
        favoriteId: userFavorites.productId,
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
      })
      .from(userFavorites)
      .innerJoin(products, eq(products.id, userFavorites.productId))
      .where(and(eq(userFavorites.userId, userId), isNotNull(userFavorites.productId)))
      .limit(50),

    db
      .select({
        favoriteId: userFavorites.plantId,
        id: plants.id,
        commonName: plants.commonName,
        slug: plants.slug,
        imageUrl: plants.imageUrl,
      })
      .from(userFavorites)
      .innerJoin(plants, eq(plants.id, userFavorites.plantId))
      .where(and(eq(userFavorites.userId, userId), isNotNull(userFavorites.plantId)))
      .limit(50),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="ptl-page-title"
          >
            Your profile
          </h1>
          <div className="mt-2 text-sm text-neutral-700">
            Signed in as <span className="font-semibold">{session.user?.email}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/builder" className="ptl-btn-secondary">
            Open builder
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="ptl-surface p-7 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Builds</h2>
            <Link href="/builder" className="text-sm font-semibold text-emerald-800 hover:underline">
              New build
            </Link>
          </div>

          {myBuilds.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">
              No saved builds yet. Share a build from the builder to create your first snapshot.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {myBuilds.map((b) => (
                <li key={b.id} className="rounded-2xl border bg-white/55 p-4" style={{ borderColor: "var(--ptl-border)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-neutral-900">{b.name}</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        Updated {b.updatedAt.toISOString().slice(0, 10)} ·{" "}
                        {b.isPublic ? "Public" : "Private"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <PublishToggle buildId={b.id} isPublic={b.isPublic} />
                      {b.shareSlug ? (
                        <Link href={`/builds/${b.shareSlug}`} className="ptl-btn-secondary shrink-0">
                          View
                        </Link>
                      ) : (
                        <Link href="/builder" className="ptl-btn-secondary shrink-0">
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ptl-surface p-7 sm:p-10">
          <h2 className="text-lg font-semibold">Favorites</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Favorites will show up here once you start saving plants and gear.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <div className="text-sm font-semibold">Plants</div>
              {favoritePlants.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-700">No favorite plants yet.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {favoritePlants.map((p) => (
                    <li key={p.id}>
                      <Link href={`/plants/${p.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                        {p.commonName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold">Products</div>
              {favoriteProducts.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-700">No favorite products yet.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {favoriteProducts.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
