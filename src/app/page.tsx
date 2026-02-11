import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main>
      <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden" style={{ borderColor: "var(--ptl-border)" }}>
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

        <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="ptl-hero-title">Build a planted tank setup that actually makes sense.</h1>

            <p className="mt-6 max-w-xl ptl-hero-lede">
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
          </div>
        </div>
      </section>
    </main>
  );
}
