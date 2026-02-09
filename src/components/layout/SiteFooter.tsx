import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="mt-16 border-t bg-white/60"
      style={{ borderColor: "var(--ptl-border)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
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
              <div className="text-xs font-medium text-neutral-700">
                Build planted tanks with confidence
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-neutral-700">
              Compatibility-first planning for planted aquariums: pick gear,
              choose plants that match your light and CO2, and share builds.
            </p>
            <p className="mt-4 text-xs text-neutral-600">
              Affiliate disclosure: PlantedTankLab may earn from qualifying purchases.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Site
              </div>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/builder" className="text-neutral-700 hover:text-neutral-900">
                    Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    className="text-neutral-700 hover:text-neutral-900"
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <Link href="/plants" className="text-neutral-700 hover:text-neutral-900">
                    Plants
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Info
              </div>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/about" className="text-neutral-700 hover:text-neutral-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-neutral-700 hover:text-neutral-900"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-neutral-700 hover:text-neutral-900"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--ptl-border)" }}>
          <div>© {new Date().getFullYear()} PlantedTankLab</div>
          <div className="text-neutral-600">
            Built for planted-tank planning. Prices may change.
          </div>
        </div>
      </div>
    </footer>
  );
}
