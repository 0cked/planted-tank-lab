"use client";

import dynamic from "next/dynamic";

import { BuilderLoadingSkeleton } from "@/components/builder/visual/BuilderLoadingSkeleton";

const VisualBuilderPage = dynamic(
  () => import("@/components/builder/VisualBuilderPage").then((module) => module.VisualBuilderPage),
  {
    ssr: false,
    loading: () => <BuilderLoadingSkeleton />,
  },
);

export function BuilderPageClient() {
  return <VisualBuilderPage />;
}
