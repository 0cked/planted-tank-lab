import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | PlantedTankLab",
  description: "What PlantedTankLab is building and why.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          About
        </h1>
        <p className="mt-4 text-sm text-neutral-700">
          PlantedTankLab is building a PCPartPicker-style planner for planted aquariums.
          The goal is simple: help you choose gear and plants that make sense together,
          and catch common “looks fine on paper” mistakes before you spend money.
        </p>
        <p className="mt-3 text-sm text-neutral-700">
          This is still an early build. Data will expand over time and the compatibility
          engine will get smarter as more rules and products are added.
        </p>
      </div>
    </main>
  );
}
