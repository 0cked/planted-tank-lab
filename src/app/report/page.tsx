import type { Metadata } from "next";

import { Suspense } from "react";

import { ReportProblemForm } from "@/app/report/ReportProblemForm";

export const metadata: Metadata = {
  title: "Report a problem | PlantedTankLab",
  description: "Report incorrect data, broken links, or other issues on PlantedTankLab.",
};

export default function ReportProblemPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <Suspense
        fallback={<div className="ptl-surface-strong p-7 sm:p-10">Loading…</div>}
      >
        <ReportProblemForm />
      </Suspense>
    </main>
  );
}
