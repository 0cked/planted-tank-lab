import type { Metadata } from "next";

import { FertilizerCalculatorClient } from "@/app/tools/fertilizer-calculator/FertilizerCalculatorClient";

const BASE_URL = "https://plantedtanklab.com";
const TOOL_URL = `${BASE_URL}/tools/fertilizer-calculator`;
const TOOL_NAME = "PlantedTankLab Fertilizer Calculator";
const TOOL_DESCRIPTION =
  "Calculate dry-fertilizer dosing for planted aquariums using EI or PPS-Pro. Get weekly KNO3, KH2PO4, K2SO4, and CSM+B amounts in grams and teaspoons.";

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
  title: "Aquarium Fertilizer Calculator - EI & PPS-Pro Dosing Schedule",
  description: TOOL_DESCRIPTION,
  openGraph: {
    url: "/tools/fertilizer-calculator",
    title: "Aquarium Fertilizer Calculator - EI & PPS-Pro Dosing Schedule",
    description:
      "Generate a printable weekly planted-tank fertilizer plan with EI or PPS-Pro dosing targets.",
  },
};

export default function FertilizerCalculatorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <FertilizerCalculatorClient />
    </main>
  );
}
