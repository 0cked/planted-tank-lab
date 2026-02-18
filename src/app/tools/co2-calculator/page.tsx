import type { Metadata } from "next";

import { Co2CalculatorClient } from "@/app/tools/co2-calculator/Co2CalculatorClient";

const BASE_URL = "https://plantedtanklab.com";
const TOOL_URL = `${BASE_URL}/tools/co2-calculator`;
const TOOL_NAME = "PlantedTankLab CO2 Calculator";
const TOOL_DESCRIPTION =
  "Estimate planted tank CO2 targets from tank volume, KH, and desired ppm. Get pH target, starting bubble rate, and daily consumption.";

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
  title: "Aquarium CO2 Calculator - Target pH, Bubble Rate & Consumption",
  description: TOOL_DESCRIPTION,
  openGraph: {
    url: "/tools/co2-calculator",
    title: "Aquarium CO2 Calculator - Target pH, Bubble Rate & Consumption",
    description:
      "Calculate your planted aquarium CO2 pH target and get practical dosing estimates.",
  },
};

export default function Co2CalculatorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <Co2CalculatorClient />
    </main>
  );
}
