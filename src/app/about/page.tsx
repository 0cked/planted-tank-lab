import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | PlantedTankLab",
  description: "What PlantedTankLab is building and why.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1 className="ptl-page-title">About</h1>
        <div className="mt-4 ptl-prose">
          <p>
            PlantedTankLab is building a PCPartPicker-style planner for planted aquariums. The
            goal is simple: help you choose gear and plants that make sense together, and
            catch common “looks fine on paper” mistakes before you spend money.
          </p>
          <p>
            This is still an early build. Data will expand over time and the compatibility
            engine will get smarter as more rules and products are added.
          </p>
        </div>
      </div>
    </main>
  );
}
