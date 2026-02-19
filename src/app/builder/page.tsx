import type { Metadata } from "next";

import { BuilderPageClient } from "./BuilderPageClient";

export const metadata: Metadata = {
  title: "2D Aquascape Builder",
  description:
    "Design your planted tank in a fast 2D scaper workspace. Pick a tank, place plants and hardscape, and remix shared builds.",
  openGraph: {
    url: "/builder",
  },
};

export default function Page() {
  return <BuilderPageClient />;
}
