import Image from "next/image";
import Link from "next/link";

import { SmartImage } from "@/components/SmartImage";
import { firstCatalogImageUrl, missingSourceImageCopy } from "@/lib/catalog-no-data";
import { getServerCaller } from "@/server/trpc/server-caller";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Pick your gear",
    description:
      "Choose your tank, light, filter, substrate, and hardscape from the curated catalog.",
    href: "/products",
    cta: "Browse products",
    icon: "🧰",
  },
  {
    title: "Check compatibility",
    description:
      "Get instant warnings and confidence checks while you build, so issues surface before you buy.",
    href: "/builder",
    cta: "Open visual builder",
    icon: "🧪",
  },
  {
    title: "Share your build",
    description:
      "Publish your layout, collect community votes, and remix ideas into your next scape.",
    href: "/builds",
    cta: "Explore community builds",
    icon: "📸",
  },
] as const;

function buildThumbnailSrc(
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

export default async function HomePage() {
  const caller = await getServerCaller();

  const [featuredBuilds, beginnerPlants] = await Promise.all([
    caller.builds.listPublic({ limit: 3 }),
    caller.plants.search({ beginnerFriendly: true, limit: 12 }),
  ]);

  const previewPlants = [...beginnerPlants];

  if (previewPlants.length < 6) {
    const fallbackPlants = await caller.plants.search({ limit: 12 });
    const seenPlantIds = new Set(previewPlants.map((plant) => plant.id));

    for (const plant of fallbackPlants) {
      if (seenPlantIds.has(plant.id)) continue;
      previewPlants.push(plant);
      seenPlantIds.add(plant.id);
      if (previewPlants.length >= 6) break;
    }
  }

  const featuredPlants = previewPlants.slice(0, 6);
  const missingPlantImage = missingSourceImageCopy("plant");

  return (
    <main>
      <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/images/home-hero-2560.jpg"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,19,22,0.86),rgba(18,30,33,0.72)_45%,rgba(18,30,33,0.36))]" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_680px_at_70%_8%,rgba(95,137,145,0.26),transparent_62%),radial-gradient(800px_500px_at_12%_88%,rgba(111,158,131,0.22),transparent_58%)]" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-8 px-6 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="max-w-2xl">
            <p className="ptl-kicker text-white/70">Aquascape Builder</p>
            <h1 className="ptl-hero-title mt-4 text-white">
              Design planted tanks with calm precision.
            </h1>

            <p className="mt-6 max-w-xl text-base text-white/82 sm:text-lg">
              Compose layouts, test compatibility, and plan a full setup in one flow built for
              aquascaping. Premium tools without the noise.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/builder" className="ptl-btn-primary">
                Start building
              </Link>
              <Link href="/products" className="ptl-btn-secondary !bg-white/85">
                Browse products
              </Link>
              <Link href="/plants" className="ptl-btn-secondary !bg-white/85">
                Explore plants
              </Link>
            </div>
          </div>

          <div className="ptl-surface-glass hidden p-4 text-[color:var(--ptl-ink-strong)] lg:block">
            <div className="rounded-2xl border border-[color:var(--ptl-border)] bg-[rgba(237,244,240,0.8)] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ptl-ink-muted)]">
                Preview Scene
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--ptl-border)]">
                <Image
                  src="/images/home-hero-2560.jpg"
                  alt="Planted tank preview"
                  width={760}
                  height={520}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--ptl-ink-muted)]">
                <span>Compatibility checks</span>
                <span className="ptl-chip !text-[10px]">Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ptl-page py-20">
        <div className="max-w-3xl">
          <p className="ptl-kicker">How it works</p>
          <h2 className="mt-3 ptl-section-title text-[color:var(--ptl-ink-strong)]">From first idea to shared aquascape</h2>
          <p className="mt-4 ptl-lede">
            Three steps: dial in your setup, validate it quickly, then publish and iterate with the
            community.
          </p>
        </div>

        <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li key={step.title} className="ptl-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-[rgba(236,243,240,0.72)] text-xl"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  {step.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ptl-ink-muted)]">
                  Step {index + 1}
                </span>
              </div>

              <h3 className="mt-5 ptl-card-title text-[color:var(--ptl-ink-strong)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--ptl-ink-muted)]">{step.description}</p>
              <Link
                href={step.href}
                className="mt-4 inline-flex text-xs font-semibold uppercase tracking-wide text-[color:var(--ptl-accent-ink)] hover:text-[color:var(--ptl-ink-strong)]"
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="ptl-page pb-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ptl-kicker">Featured builds</p>
            <h2 className="mt-3 ptl-section-title text-[color:var(--ptl-ink-strong)]">Most-loved community layouts</h2>
            <p className="mt-4 max-w-2xl ptl-lede">
              Top voted public builds, straight from the gallery. Open one and remix it into your own
              tank.
            </p>
          </div>
          <Link href="/builds" className="ptl-btn-secondary">
            Browse all builds
          </Link>
        </div>

        {featuredBuilds.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {featuredBuilds.map((build) => {
              const buildHref = build.shareSlug ? `/builds/${build.shareSlug}` : "/builder";
              const thumbnailSrc = buildThumbnailSrc(build.coverImageUrl, build.updatedAt);

              return (
                <article key={build.id} className="ptl-surface overflow-hidden">
                  <Link href={buildHref} className="group block ptl-hover-lift">
                    <div className="relative aspect-[16/10] border-b" style={{ borderColor: "var(--ptl-border)" }}>
                      {thumbnailSrc ? (
                        <SmartImage
                          src={thumbnailSrc}
                          alt={`${build.name} screenshot`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 px-6 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Screenshot preview available after save
                        </div>
                      )}

                      <div className="absolute right-3 top-3 rounded-full border bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-800" style={{ borderColor: "var(--ptl-border)" }}>
                        {build.voteCount ?? 0} vote{(build.voteCount ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="ptl-card-title text-neutral-900">{build.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-700">
                        {build.description ?? "Community build snapshot"}
                      </p>
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Open build
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 ptl-surface p-7 text-sm text-neutral-700">
            Public builds will appear here once people start sharing. Be first:
            <Link href="/builder" className="ml-2 font-semibold text-emerald-800 hover:text-emerald-900">
              create a build
            </Link>
            .
          </div>
        )}
      </section>

      <section className="ptl-page pb-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ptl-kicker">Browse plants</p>
            <h2 className="mt-3 ptl-section-title text-[color:var(--ptl-ink-strong)]">Popular species to start with</h2>
            <p className="mt-4 max-w-2xl ptl-lede">
              Beginner-friendly picks from the live catalog. Tap any card for care details and
              placement tips.
            </p>
          </div>
          <Link href="/plants" className="ptl-btn-secondary">
            View plant library
          </Link>
        </div>

        {featuredPlants.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPlants.map((plant) => {
              const imageUrl = firstCatalogImageUrl({
                imageUrl: plant.imageUrl ?? null,
                imageUrls: plant.imageUrls,
              });
              const hasImage = Boolean(imageUrl);

              return (
                <li key={plant.id}>
                  <Link
                    href={`/plants/${plant.slug}`}
                    className="group block overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-sm transition hover:bg-white/75 ptl-hover-lift"
                    style={{ borderColor: "var(--ptl-border)" }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {hasImage ? (
                        <SmartImage
                          src={imageUrl as string}
                          alt={plant.commonName}
                          fill
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="ptl-image-ph absolute inset-0 p-3">
                          <span className="inline-flex rounded-full border border-neutral-300/60 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
                            {missingPlantImage.title}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="truncate text-sm font-semibold text-white">{plant.commonName}</div>
                        {plant.scientificName ? (
                          <div className="truncate text-xs text-white/80">{plant.scientificName}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-neutral-800">
                        <span
                          className="rounded-full border bg-white/70 px-2 py-1"
                          style={{ borderColor: "var(--ptl-border)" }}
                        >
                          {plant.difficulty}
                        </span>
                        <span
                          className="rounded-full border bg-white/70 px-2 py-1"
                          style={{ borderColor: "var(--ptl-border)" }}
                        >
                          {plant.lightDemand} light
                        </span>
                        <span
                          className="rounded-full border bg-white/70 px-2 py-1"
                          style={{ borderColor: "var(--ptl-border)" }}
                        >
                          {plant.placement}
                        </span>
                      </div>

                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        View plant
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-8 ptl-surface p-7 text-sm text-neutral-700">
            Plant previews are loading from the catalog. You can browse the full library now:
            <Link href="/plants" className="ml-2 font-semibold text-emerald-800 hover:text-emerald-900">
              open plants
            </Link>
            .
          </div>
        )}
      </section>

      <section className="ptl-page pb-24">
        <div className="ptl-surface-slate p-8 sm:p-10 lg:p-12">
          <p className="ptl-kicker text-white/75">Ready to build?</p>
          <h2 className="mt-3 ptl-section-title text-white">Start building your planted tank now</h2>
          <p className="mt-4 max-w-2xl text-sm text-white/85 sm:text-base">
            Jump into the visual builder, place your hardscape and plants, and get instant feedback
            on compatibility while you design.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/builder" className="ptl-btn-primary">
              Start building
            </Link>
            <Link
              href="/builds"
              className="ptl-btn-ghost"
            >
              See community builds
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
