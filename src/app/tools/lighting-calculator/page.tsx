import type { Metadata } from "next";

import { LightingCalculatorClient } from "@/app/tools/lighting-calculator/LightingCalculatorClient";

const BASE_URL = "https://plantedtanklab.com";
const TOOL_URL = `${BASE_URL}/tools/lighting-calculator`;
const TOOL_NAME = "PlantedTankLab Lighting Calculator";
const TOOL_DESCRIPTION =
  "Estimate planted aquarium PAR at substrate depth from light wattage, fixture type, and mounting height. Plan low-tech, medium, or high-tech lighting setups.";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  url: TOOL_URL,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
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
};

export const metadata: Metadata = {
  title: "Aquarium Lighting Calculator - PAR Estimator for Planted Tanks",
  description: TOOL_DESCRIPTION,
  openGraph: {
    url: "/tools/lighting-calculator",
    title: "Aquarium Lighting Calculator - PAR Estimator for Planted Tanks",
    description:
      "Calculate estimated substrate PAR for LED, T5, and T8 fixtures with a quick planted-tank lighting model.",
  },
};

export default function LightingCalculatorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <LightingCalculatorClient />
    </main>
  );
}
