import type { Metadata } from "next";

import { StockingCalculatorClient } from "@/app/tools/stocking-calculator/StockingCalculatorClient";

export const metadata: Metadata = {
  title: "Aquarium Stocking Calculator - Fish & Shrimp Bioload Planner",
  description:
    "Estimate planted tank stocking percentage using the 1 inch per gallon baseline with species modifiers. Includes fish and shrimp compatibility warnings.",
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
      <StockingCalculatorClient />
    </main>
  );
}
