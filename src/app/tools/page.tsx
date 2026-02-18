import type { Metadata } from "next";
import Link from "next/link";

const BASE_URL = "https://plantedtanklab.com";

type ToolCard = {
  href: string;
  title: string;
  description: string;
  icon: string;
};

const TOOL_CARDS: ToolCard[] = [
  {
    href: "/tools/substrate-calculator",
    title: "Substrate calculator",
    description:
      "Estimate liters and bag weight for sloped aquasoil, sand, or gravel layouts.",
    icon: "🪨",
  },
  {
    href: "/tools/co2-calculator",
    title: "CO2 calculator",
    description:
      "Find target pH, starting bubble rate, and daily consumption from volume + KH.",
    icon: "🫧",
  },
  {
    href: "/tools/lighting-calculator",
    title: "Lighting calculator",
    description:
      "Estimate PAR at substrate depth and classify low-tech vs high-tech lighting setups.",
    icon: "💡",
  },
  {
    href: "/tools/fertilizer-calculator",
    title: "Fertilizer calculator",
    description:
      "Generate EI or PPS-Pro dosing plans in grams and teaspoons for your tank volume.",
    icon: "🧪",
  },
  {
    href: "/tools/stocking-calculator",
    title: "Stocking calculator",
    description:
      "Model fish and shrimp bioload with species modifiers and compatibility warnings.",
    icon: "🐟",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": TOOL_CARDS.map((tool) => ({
    "@type": "WebApplication",
    name: `PlantedTankLab ${tool.title}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    url: `${BASE_URL}${tool.href}`,
    description: tool.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: "PlantedTankLab",
      url: BASE_URL,
    },
  })),
};

export const metadata: Metadata = {
  title: "Aquarium Tools & Calculators",
  description:
    "Plan your planted tank with free aquarium calculators for substrate, CO2, lighting, fertilizer dosing, and stocking.",
  openGraph: {
    url: "/tools",
    title: "Aquarium Tools & Calculators",
    description:
      "Free planted-tank calculators for substrate volume, CO2 targets, PAR estimates, fertilizer dosing, and stocking.",
  },
};

export default function ToolsIndexPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <section className="ptl-surface-strong p-7 sm:p-10">
        <p className="ptl-kicker">Tools</p>
        <h1 className="mt-3 ptl-page-title">Aquarium calculators for planted tank planning</h1>
        <p className="mt-3 ptl-lede text-neutral-700">
          Fast planning tools for substrate, CO2, lighting, fertilizer dosing, and fish stocking.
          Use them as quick checks before you buy or make layout changes.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_CARDS.map((tool) => (
            <article key={tool.href} className="ptl-surface overflow-hidden p-5">
              <Link href={tool.href} className="group block ptl-hover-lift">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/70 text-xl" style={{ borderColor: "var(--ptl-border)" }}>
                  <span aria-hidden="true">{tool.icon}</span>
                </div>
                <h2 className="mt-4 ptl-card-title text-neutral-900">{tool.title}</h2>
                <p className="mt-2 text-sm text-neutral-700">{tool.description}</p>
                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Open tool
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
