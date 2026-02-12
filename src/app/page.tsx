import Link from "next/link";
import Image from "next/image";

import { HeroWaterFxV2 } from "@/components/home/water-fx/HeroWaterFxV2";
import { isHeroWaterFxV2Enabled } from "@/components/home/water-fx/feature-flag";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const waterFxV2Enabled = isHeroWaterFxV2Enabled({
    searchParams,
    envFlag: process.env.HERO_WATER_FX_V2,
  });

  return (
    <main>
      <section
        id="hero-water-root"
        className={`relative min-h-[calc(100vh-8rem)] overflow-hidden ${waterFxV2Enabled ? "hero-water-fx-v2-enabled" : ""}`}
        style={{ borderColor: "var(--ptl-border)" }}
      >
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
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,250,244,0.88),rgba(246,250,244,0.68)_42%,rgba(246,250,244,0.22))]" />
        </div>

        <HeroWaterFxV2 enabled={waterFxV2Enabled} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div id="hero-water-text" className="will-change-transform">
              <h1 id="hero-water-heading" className="ptl-hero-title">
                Build a planted tank setup that actually makes sense.
              </h1>

              <p id="hero-water-lede" className="mt-6 max-w-xl ptl-hero-lede">
                Pick your tank, light, filter, CO2, substrate, and plants, then get instant
                compatibility feedback. Build low-tech jungle tanks or go full high-tech.
              </p>
            </div>

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
          </div>
        </div>
      </section>
    </main>
  );
}
