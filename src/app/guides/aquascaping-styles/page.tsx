import type { Metadata } from "next";
import Link from "next/link";

import { buildTagLabel } from "@/lib/build-tags";
import { AQUASCAPING_STYLE_GUIDE } from "@/lib/guides/aquascaping-styles";

const GUIDE_TITLE = "Aquascaping Styles Guide";
const GUIDE_DESCRIPTION =
  "Explore five planted aquarium layout styles with practical cues for plants, hardscape, tank sizing, and difficulty.";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  openGraph: {
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url: "/guides/aquascaping-styles",
  },
};

function difficultyChipClasses(rating: number, index: number): string {
  return index < rating ? "bg-emerald-500" : "bg-neutral-200";
}

export default function AquascapingStylesGuidePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-14">
      <section className="ptl-surface p-7 sm:p-9">
        <p className="ptl-kicker">Guides</p>
        <h1 className="mt-3 ptl-page-title">Aquascaping styles guide</h1>
        <p className="mt-4 max-w-[78ch] ptl-lede text-neutral-700">
          Compare five classic aquascaping directions and jump straight into matching community
          builds. Each section includes core composition traits, plant starting points, hardscape
          direction, and a realistic difficulty target.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AQUASCAPING_STYLE_GUIDE.map((style) => (
            <a
              key={style.id}
              href={`#${style.id}`}
              className="rounded-xl border bg-white/75 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-white"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {style.name}
            </a>
          ))}
        </div>
      </section>

      {AQUASCAPING_STYLE_GUIDE.map((style) => (
        <section key={style.id} id={style.id} className="ptl-surface p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{style.name}</h2>
              <p className="mt-2 max-w-[78ch] text-sm text-neutral-700">{style.description}</p>
            </div>

            <Link
              href={`/builds?tag=${style.buildTag}`}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              Browse {buildTagLabel(style.buildTag)} builds
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <article
              className="rounded-2xl border bg-white/75 p-4"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <h3 className="text-sm font-semibold text-neutral-900">Key characteristics</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {style.keyCharacteristics.map((item) => (
                  <li key={`${style.id}-${item}`}>{item}</li>
                ))}
              </ul>

              <h3 className="mt-4 text-sm font-semibold text-neutral-900">Recommended hardscape</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {style.recommendedHardscape.map((item) => (
                  <li key={`${style.id}-hardscape-${item}`}>{item}</li>
                ))}
              </ul>
            </article>

            <article
              className="rounded-2xl border bg-white/75 p-4"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              <h3 className="text-sm font-semibold text-neutral-900">Recommended plants</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {style.recommendedPlants.map((plant) => (
                  <Link
                    key={`${style.id}-${plant.label}`}
                    href={plant.href}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300"
                  >
                    {plant.label}
                  </Link>
                ))}
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Example tank dimensions
                  </dt>
                  <dd className="mt-1 font-medium text-neutral-900">{style.exampleTankDimensions}</dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Difficulty rating
                  </dt>
                  <dd className="mt-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => (
                        <span
                          key={`${style.id}-difficulty-${index}`}
                          className={`h-2 w-6 rounded-full ${difficultyChipClasses(style.difficulty.rating, index)}`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 font-semibold text-neutral-900">
                      {style.difficulty.label} ({style.difficulty.rating}/5)
                    </div>
                    <p className="mt-1 text-neutral-700">{style.difficulty.summary}</p>
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      ))}
    </main>
  );
}
