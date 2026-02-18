import type { Metadata } from "next";

import { StockingCalculatorClient } from "@/app/tools/stocking-calculator/StockingCalculatorClient";

const BASE_URL = "https://plantedtanklab.com";
const TOOL_URL = `${BASE_URL}/tools/stocking-calculator`;
const TOOL_NAME = "PlantedTankLab Stocking Calculator";
const TOOL_DESCRIPTION =
  "Estimate planted tank stocking percentage using the 1 inch per gallon baseline with species modifiers. Includes fish and shrimp compatibility warnings.";

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
  title: "Aquarium Stocking Calculator - Fish & Shrimp Bioload Planner",
  description: TOOL_DESCRIPTION,
  openGraph: {
    url: "/tools/stocking-calculator",
    title: "Aquarium Stocking Calculator - Fish & Shrimp Bioload Planner",
    description:
      "Plan fish and shrimp stocking with species-specific bioload ratings, space modifiers, and compatibility checks.",
  },
};

export default function StockingCalculatorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <StockingCalculatorClient />
    </main>
  );
}
