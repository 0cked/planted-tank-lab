import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--ptl-border)" }}>
        <div className="absolute inset-0">
          <Image
            src="/images/aquascape-hero-2400.jpg"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_45%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,250,244,0.98),rgba(246,250,244,0.82)_42%,rgba(246,250,244,0.18))]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_12%,rgba(27,127,90,0.22),transparent_60%),radial-gradient(740px_560px_at_55%_6%,rgba(122,163,66,0.18),transparent_62%),radial-gradient(900px_600px_at_88%_90%,rgba(239,231,208,0.32),transparent_60%)]" />
        </div>

        <div className="relative">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pb-14 sm:pt-24">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--ptl-accent)" }} />
                Compatibility-first planted tank planning
              </div>

              <h1
                className="mt-6 text-balance text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Build a planted tank setup that actually makes sense.
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base text-neutral-800/85 sm:text-lg">
                Pick your tank, light, filter, CO2, substrate, and plants, then get instant
                compatibility feedback. Build low-tech jungle tanks or go full high-tech.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/builder" className="ptl-btn-primary">
                  Start building
                </Link>
                <Link href="/products" className="ptl-btn-secondary">
                  Browse products
                </Link>
                <Link href="/plants" className="ptl-btn-secondary">
                  Explore plants
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="ptl-pill">124 products ready</span>
                <span className="ptl-pill">70 plants with care data</span>
                <span className="ptl-pill">Curated picks on by default</span>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-14">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="ptl-surface-glass p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  Compatibility
                </div>
                <div
                  className="mt-2 text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Mistake-proof your setup.
                </div>
                <div className="mt-2 text-sm text-neutral-800/80">
                  Wrong-size lights, missing CO2 for carpets, stand capacity, and more.
                </div>
              </div>
              <div className="ptl-surface-stone p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  Compare
                </div>
                <div
                  className="mt-2 text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Think in real specs.
                </div>
                <div className="mt-2 text-sm text-neutral-800/80">
                  PAR, tank length fit, flow, heater watts-per-gallon, and plant demands.
                </div>
              </div>
              <div className="ptl-surface-sand p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  Share
                </div>
                <div
                  className="mt-2 text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Save a shopping list.
                </div>
                <div className="mt-2 text-sm text-neutral-800/80">
                  Build once, share a link, then buy parts when you are ready.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="ptl-surface-stone p-7">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              How it works
            </div>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A builder that feels like a scape plan.
            </h2>
            <ol className="mt-6 space-y-4 text-sm text-neutral-800/85">
              <li>
                <span className="font-semibold text-neutral-900">1.</span>{" "}
                Pick your core gear (tank, light, filter, CO2).
              </li>
              <li>
                <span className="font-semibold text-neutral-900">2.</span>{" "}
                Add substrate and plants that match your light and CO2.
              </li>
              <li>
                <span className="font-semibold text-neutral-900">3.</span>{" "}
                Get compatibility warnings and a price total as you go.
              </li>
            </ol>
          </div>

          <div className="ptl-surface-slate p-7">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
              This week
            </div>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Live now, improving daily.
            </h2>
            <p className="mt-4 text-sm text-white/85">
              We are prioritizing visual browsing, curated gear, and reliable plant care
              sources. If you do not see your exact product yet, pick the closest match and
              use warnings as guidance.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/builder" className="ptl-btn-primary">
                Open the builder
              </Link>
              <Link href="/plants" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/15">
                Browse plant care
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
