import type { Metadata } from "next";

import { SubstrateCalculatorClient } from "@/app/tools/substrate-calculator/SubstrateCalculatorClient";

const BASE_URL = "https://plantedtanklab.com";
const TOOL_URL = `${BASE_URL}/tools/substrate-calculator`;
const TOOL_NAME = "PlantedTankLab Substrate Calculator";
const TOOL_DESCRIPTION =
  "Estimate planted aquarium substrate volume from tank dimensions and front/back slope. Get liters and weight estimates for aquasoil, sand, and gravel.";

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
  title: "Aquarium Substrate Calculator - How Much Substrate Do I Need?",
  description: TOOL_DESCRIPTION,
  openGraph: {
    url: "/tools/substrate-calculator",
    title: "Aquarium Substrate Calculator - How Much Substrate Do I Need?",
    description:
      "Calculate substrate volume and weight for sloped aquarium layouts in inches or centimeters.",
  },
};

export default function SubstrateCalculatorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <SubstrateCalculatorClient />
    </main>
  );
}
