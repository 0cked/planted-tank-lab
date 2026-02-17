import type { Metadata } from "next";

import { Co2CalculatorClient } from "@/app/tools/co2-calculator/Co2CalculatorClient";

export const metadata: Metadata = {
  title: "Aquarium CO2 Calculator - Target pH, Bubble Rate & Consumption",
  description:
    "Estimate planted tank CO2 targets from tank volume, KH, and desired ppm. Get pH target, starting bubble rate, and daily consumption.",
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
      <Co2CalculatorClient />
    </main>
  );
}
