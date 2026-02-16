import type { Metadata } from "next";

import { VisualBuilderPage } from "@/components/builder/VisualBuilderPage";

export const metadata: Metadata = {
  title: "3D Aquascape Builder",
  description:
    "Design your planted tank in 3D. Select equipment, place plants and hardscape, and get instant compatibility feedback.",
  openGraph: {
    url: "/builder",
  },
};

export default function Page() {
  return <VisualBuilderPage />;
}
