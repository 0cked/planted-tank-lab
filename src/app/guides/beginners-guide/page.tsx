import type { Metadata } from "next";
import Link from "next/link";

import {
  BEGINNER_FIRST_PLANTS_LINK,
  BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT,
  BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE,
  BEGINNER_GUIDE_NITROGEN_CYCLE,
  BEGINNER_GUIDE_QUICK_LINKS,
  BEGINNER_GUIDE_SETUP_STEPS,
} from "@/lib/guides/beginners-guide";

const GUIDE_TITLE = "Beginner's Planted Tank Guide | PlantedTankLab";
const GUIDE_DESCRIPTION =
  "A practical starter roadmap for planted aquariums: equipment checklist, first plants, setup steps, nitrogen cycle basics, and a week-by-week first month routine.";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  openGraph: {
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url: "/guides/beginners-guide",
  },
};

function SectionHeading(props: { emoji: string; title: string; subtitle: string }) {
  return (
    <header>
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-800">
        <span aria-hidden className="text-xl">
          {props.emoji}
        </span>
        <span>{props.title}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-700">{props.subtitle}</p>
    </header>
  );
}

export default function BeginnersGuidePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-14">
      <section className="ptl-surface p-7 sm:p-9">
        <p className="ptl-kicker">Guides</p>
        <h1 className="mt-3 ptl-page-title">Beginner&apos;s planted tank guide</h1>
        <p className="mt-4 max-w-[76ch] ptl-lede text-neutral-700">
          New to aquascaping? This guide walks you from first equipment choices to a stable first
          month, with practical links to the{" "}
          <Link href="/builder" className="font-semibold text-emerald-800 hover:underline">
            visual builder
          </Link>
          ,{" "}
          <Link href="/products" className="font-semibold text-emerald-800 hover:underline">
            product catalog
          </Link>
          , and calculators in{" "}
          <Link href="/tools" className="font-semibold text-emerald-800 hover:underline">
            Tools
          </Link>
          .
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BEGINNER_GUIDE_QUICK_LINKS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-xl border bg-white/70 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-white"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </section>

      <section id="what-is-a-planted-tank" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="🌱"
          title="What is a planted tank?"
          subtitle="A planted tank is a balanced ecosystem where plants, substrate, bacteria, and filtration work together."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-sm font-semibold text-neutral-900">Living filtration</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Healthy plant mass consumes nitrate and competes with algae. You still use a filter,
              but plants become part of your water quality strategy.
            </p>
          </article>

          <article className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-sm font-semibold text-neutral-900">Layered aquascape</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Foreground, midground, and background placement creates depth. Use the{" "}
              <Link href="/guides/plant-placement" className="font-semibold text-emerald-800 hover:underline">
                placement guide
              </Link>{" "}
              to choose zones quickly.
            </p>
          </article>

          <article className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-sm font-semibold text-neutral-900">Routine-driven success</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Consistent light, weekly maintenance, and gradual stocking outperform aggressive
              changes. Stability beats chasing quick fixes.
            </p>
          </article>
        </div>
      </section>

      <section id="essential-equipment" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="🧰"
          title="Essential equipment"
          subtitle="These six categories are enough to launch your first planted tank with room to grow later."
        />

        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-xl border bg-white/75 p-4 transition hover:border-neutral-300 hover:bg-white"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-xl">
                    {item.emoji}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">{item.label}</h2>
                    <p className="mt-1 text-sm text-neutral-700">{item.description}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="choosing-your-first-plants" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="🪴"
          title="Choosing your first plants"
          subtitle="Pick easy species first, then expand complexity once your routine is stable."
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <article className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-sm font-semibold text-neutral-900">Starter shortlist</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
              <li>Anubias and Java fern for hardscape attachment (slow, forgiving growth)</li>
              <li>Cryptocoryne for rooted midground structure</li>
              <li>Simple stem plants for quick nutrient uptake in the back</li>
              <li>Optional low carpet species once trimming routine is established</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={BEGINNER_FIRST_PLANTS_LINK} className="ptl-btn-secondary text-xs">
                Browse easy plants
              </Link>
              <Link href="/plants/compare" className="ptl-btn-secondary text-xs">
                Compare species
              </Link>
            </div>
          </article>

          <article className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
            <h2 className="text-sm font-semibold text-neutral-900">Match plants to equipment</h2>
            <p className="mt-2 text-sm text-neutral-700">
              If your light is low and you are not injecting CO₂ yet, avoid high-demand red stems.
              Use the care indicators on plant pages and verify your light zone with the{" "}
              <Link href="/tools/lighting-calculator" className="font-semibold text-emerald-800 hover:underline">
                lighting calculator
              </Link>
              .
            </p>
          </article>
        </div>
      </section>

      <section id="setting-up-the-tank" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="🛠️"
          title="Setting up the tank"
          subtitle="Follow this order to avoid rework and protect water clarity during startup."
        />

        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {BEGINNER_GUIDE_SETUP_STEPS.map((step) => (
            <li key={step.step} className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Step {step.step}
              </div>
              <h2 className="mt-1 text-sm font-semibold text-neutral-900">{step.title}</h2>
              <p className="mt-2 text-sm text-neutral-700">{step.description}</p>
              {step.resources && step.resources.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.resources.map((resource) => (
                    <Link
                      key={`${step.step}-${resource.href}`}
                      href={resource.href}
                      className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300"
                    >
                      {resource.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section id="the-nitrogen-cycle" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="🔄"
          title="The nitrogen cycle"
          subtitle="Cycle awareness prevents rushed stocking and avoids most beginner crashes."
        />

        <div className="mt-4 space-y-3">
          <div className="flex h-2 overflow-hidden rounded-full border border-neutral-200 bg-white/70">
            <div className="w-1/3 bg-amber-300" />
            <div className="w-1/3 bg-orange-300" />
            <div className="w-1/3 bg-emerald-300" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {BEGINNER_GUIDE_NITROGEN_CYCLE.map((stage) => (
              <article
                key={stage.id}
                className="rounded-xl border bg-white/75 p-4"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {stage.window}
                </div>
                <h2 className="mt-1 text-sm font-semibold text-neutral-900">{stage.title}</h2>
                <p className="mt-2 text-sm text-neutral-700">{stage.description}</p>
              </article>
            ))}
          </div>

          <p className="text-sm text-neutral-700">
            Check livestock plans with the{" "}
            <Link href="/tools/stocking-calculator" className="font-semibold text-emerald-800 hover:underline">
              stocking calculator
            </Link>{" "}
            and validate chemistry progress with reliable{" "}
            <Link href="/products/test_kit" className="font-semibold text-emerald-800 hover:underline">
              water test kits
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="first-month-care-schedule" className="ptl-surface p-6 sm:p-7">
        <SectionHeading
          emoji="📅"
          title="First month care schedule"
          subtitle="Treat month one as observation + consistency training. These weekly checkpoints keep beginners on track."
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE.map((week) => (
            <article key={week.week} className="rounded-xl border bg-white/75 p-4" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {week.focus}
              </div>
              <h2 className="mt-1 text-sm font-semibold text-neutral-900">{week.title}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {week.checklist.map((item, index) => (
                  <li key={`${week.week}-${index}`}>{item}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {week.resources.map((resource) => (
                  <Link
                    key={`${week.week}-${resource.href}`}
                    href={resource.href}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300"
                  >
                    {resource.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
