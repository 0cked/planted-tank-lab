import type { Metadata } from "next";

import { FertilizerCalculatorClient } from "@/app/tools/fertilizer-calculator/FertilizerCalculatorClient";

export const metadata: Metadata = {
  title: "Aquarium Fertilizer Calculator - EI & PPS-Pro Dosing Schedule",
  description:
    "Calculate dry-fertilizer dosing for planted aquariums using EI or PPS-Pro. Get weekly KNO3, KH2PO4, K2SO4, and CSM+B amounts in grams and teaspoons.",
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
      <FertilizerCalculatorClient />
    </main>
  );
}
