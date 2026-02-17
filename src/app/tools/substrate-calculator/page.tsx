import type { Metadata } from "next";

import { SubstrateCalculatorClient } from "@/app/tools/substrate-calculator/SubstrateCalculatorClient";

export const metadata: Metadata = {
  title: "Aquarium Substrate Calculator - How Much Substrate Do I Need?",
  description:
    "Estimate planted aquarium substrate volume from tank dimensions and front/back slope. Get liters and weight estimates for aquasoil, sand, and gravel.",
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
      <SubstrateCalculatorClient />
    </main>
  );
}
