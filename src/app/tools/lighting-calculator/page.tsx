import type { Metadata } from "next";

import { LightingCalculatorClient } from "@/app/tools/lighting-calculator/LightingCalculatorClient";

export const metadata: Metadata = {
  title: "Aquarium Lighting Calculator - PAR Estimator for Planted Tanks",
  description:
    "Estimate planted aquarium PAR at substrate depth from light wattage, fixture type, and mounting height. Plan low-tech, medium, or high-tech lighting setups.",
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
      <LightingCalculatorClient />
    </main>
  );
}
