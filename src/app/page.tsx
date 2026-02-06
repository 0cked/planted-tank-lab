import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold" style={{ borderColor: "var(--ptl-border)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--ptl-accent)" }} />
            Compatibility-first planted tank planning
          </div>

          <h1
            className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Build a planted tank setup that actually makes sense.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-neutral-700 sm:text-lg">
            Pick your tank, light, filter, CO2, substrate, and plants, then get instant
            compatibility feedback. Share builds. Keep it simple, or go full high-tech.
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

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="ptl-surface p-5">
              <div className="text-sm font-semibold">Compatibility</div>
              <div className="mt-2 text-sm text-neutral-700">
                Catch common mistakes: wrong-size lights, missing CO2 for carpets,
                heater sizing, and more.
              </div>
            </div>
            <div className="ptl-surface p-5">
              <div className="text-sm font-semibold">Specs you can compare</div>
              <div className="mt-2 text-sm text-neutral-700">
                Think in numbers: PAR, tank length fit, flow, heater watts-per-gallon.
              </div>
            </div>
            <div className="ptl-surface p-5">
              <div className="text-sm font-semibold">Shopping list output</div>
              <div className="mt-2 text-sm text-neutral-700">
                Build once, then use the saved list to buy parts when you are ready.
              </div>
            </div>
          </div>
        </section>

        <aside className="ptl-surface overflow-hidden">
          <div className="relative">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 520px at 30% 10%, rgba(27, 127, 90, 0.22), transparent 60%), radial-gradient(700px 520px at 80% 30%, rgba(122, 163, 66, 0.18), transparent 55%)",
              }}
            />
            <div className="relative p-6">
              <div className="text-sm font-semibold">Aquascape-themed MVP</div>
              <div className="mt-2 text-sm text-neutral-700">
                Seeded dataset is live and growing. If your exact product is missing,
                pick the closest match and use warnings as guidance.
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border bg-white/70 p-4" style={{ borderColor: "var(--ptl-border)" }}>
                  <div className="text-xs font-semibold text-neutral-600">Seeded products</div>
                  <div className="mt-1 text-2xl font-semibold">124</div>
                </div>
                <div className="rounded-xl border bg-white/70 p-4" style={{ borderColor: "var(--ptl-border)" }}>
                  <div className="text-xs font-semibold text-neutral-600">Seeded plants</div>
                  <div className="mt-1 text-2xl font-semibold">70</div>
                </div>
              </div>
            </div>

            <div className="relative border-t bg-white/60 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <Image
                src="/images/aquascape-hero-16-by-9.svg"
                alt=""
                aria-hidden="true"
                width={1600}
                height={900}
                priority
                className="h-auto w-full rounded-xl"
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
