"use client";

import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[rgba(12,19,22,0.82)] text-white/85 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-[rgba(28,42,38,0.58)] p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-col gap-2">
                <Image
                  src="/brand/ptl-logo.svg"
                  alt="PlantedTankLab"
                  width={220}
                  height={40}
                  className="h-7 w-auto"
                />
                <div className="text-xs font-medium text-white/70">
                  Build planted tanks with confidence
                </div>
              </div>
              <p className="mt-3 max-w-md text-sm text-white/80">
                Compatibility-first planning for planted aquariums: pick gear,
                choose plants that match your light and CO2, and share builds.
              </p>
              <p className="mt-4 text-xs text-white/62">
                Affiliate disclosure: PlantedTankLab may earn from qualifying purchases.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/58">
                  Site
                </div>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link href="/builder" className="text-white/80 transition hover:text-white">
                      Builder
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className="text-white/80 transition hover:text-white">
                      Products
                    </Link>
                  </li>
                  <li>
                    <Link href="/plants" className="text-white/80 transition hover:text-white">
                      Plants
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/58">
                  Info
                </div>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link href="/about" className="text-white/80 transition hover:text-white">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-white/80 transition hover:text-white">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-white/80 transition hover:text-white">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href="/report" className="text-white/80 transition hover:text-white">
                      Report a problem
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-white/80 transition hover:text-white">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/12 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} PlantedTankLab</div>
            <div>Built for planted-tank planning. Prices may change.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
