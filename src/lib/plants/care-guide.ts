export type CareIndicatorTone = "easy" | "moderate" | "demanding";

export type PlantCareMetric = {
  id: "difficulty" | "light" | "co2" | "growth" | "placement";
  label: string;
  value: string;
  tone: CareIndicatorTone;
  scorePercent: number;
  hint: string;
};

export type PlantCompatibleEquipmentLink = {
  id: string;
  categorySlug: string;
  title: string;
  description: string;
  href: string;
};

export type PlantCareProfileInput = {
  difficulty: string | null | undefined;
  lightDemand: string | null | undefined;
  co2Demand: string | null | undefined;
  growthRate: string | null | undefined;
  placement: string | null | undefined;
  beginnerFriendly?: boolean | null;
};

function normalizeValueText(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";

  const cleaned = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizedToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function toneScore(tone: CareIndicatorTone): number {
  if (tone === "easy") return 28;
  if (tone === "moderate") return 62;
  return 96;
}

function toneFromDifficulty(value: string | null | undefined): CareIndicatorTone {
  const token = normalizedToken(value);
  if (!token) return "moderate";
  if (token.includes("easy") || token.includes("beginner") || token.includes("low")) {
    return "easy";
  }
  if (token.includes("medium") || token.includes("moderate")) {
    return "moderate";
  }
  return "demanding";
}

function toneFromDemand(value: string | null | undefined): CareIndicatorTone {
  const token = normalizedToken(value);
  if (!token) return "moderate";

  if (
    token.includes("low") ||
    token.includes("none") ||
    token.includes("minimal") ||
    token.includes("easy")
  ) {
    return "easy";
  }

  if (token.includes("medium") || token.includes("moderate") || token.includes("mid")) {
    return "moderate";
  }

  return "demanding";
}

function toneFromGrowthRate(value: string | null | undefined): CareIndicatorTone {
  const token = normalizedToken(value);
  if (!token) return "moderate";

  if (token.includes("slow") || token.includes("low")) return "easy";
  if (token.includes("medium") || token.includes("moderate")) return "moderate";

  return "demanding";
}

function toneFromPlacement(value: string | null | undefined): CareIndicatorTone {
  const token = normalizedToken(value);
  if (!token) return "moderate";
  if (token.includes("foreground") || token.includes("carpet") || token.includes("epiphyte")) {
    return "easy";
  }
  if (token.includes("midground") || token.includes("middle") || token.includes("floating")) {
    return "moderate";
  }
  if (token.includes("background")) return "demanding";
  return "moderate";
}

function hasDemandAtLeastModerate(value: string | null | undefined): boolean {
  const tone = toneFromDemand(value);
  return tone === "moderate" || tone === "demanding";
}

function hasDemandHigh(value: string | null | undefined): boolean {
  const token = normalizedToken(value);
  if (!token) return false;
  return token.includes("high") || token.includes("very high") || token.includes("demanding");
}

export function buildPlantCareMetrics(profile: PlantCareProfileInput): PlantCareMetric[] {
  const difficultyTone = toneFromDifficulty(profile.difficulty);
  const lightTone = toneFromDemand(profile.lightDemand);
  const co2Tone = toneFromDemand(profile.co2Demand);
  const growthTone = toneFromGrowthRate(profile.growthRate);
  const placementTone = toneFromPlacement(profile.placement);

  return [
    {
      id: "difficulty",
      label: "Difficulty",
      value: normalizeValueText(profile.difficulty),
      tone: difficultyTone,
      scorePercent: toneScore(difficultyTone),
      hint: "Overall care intensity for stable growth",
    },
    {
      id: "light",
      label: "Light demand",
      value: normalizeValueText(profile.lightDemand),
      tone: lightTone,
      scorePercent: toneScore(lightTone),
      hint: "How much PAR this plant typically expects",
    },
    {
      id: "co2",
      label: "CO₂ demand",
      value: normalizeValueText(profile.co2Demand),
      tone: co2Tone,
      scorePercent: toneScore(co2Tone),
      hint: "Injected CO₂ requirement for best results",
    },
    {
      id: "growth",
      label: "Growth rate",
      value: normalizeValueText(profile.growthRate),
      tone: growthTone,
      scorePercent: toneScore(growthTone),
      hint: "Faster growers need more frequent trims",
    },
    {
      id: "placement",
      label: "Placement",
      value: normalizeValueText(profile.placement),
      tone: placementTone,
      scorePercent: toneScore(placementTone),
      hint: "Where it fits best in a layout",
    },
  ];
}

function compatibilityLinkTitleFromLightDemand(lightDemand: string | null | undefined): {
  title: string;
  description: string;
  href: string;
} {
  const tone = toneFromDemand(lightDemand);

  if (tone === "easy") {
    return {
      title: "Low-light LED fixtures",
      description: "Suitable for low-tech and shade-tolerant species",
      href: "/products/light?parMax=40",
    };
  }

  if (tone === "moderate") {
    return {
      title: "Medium-output planted lights",
      description: "Balanced PAR for medium-demand plants",
      href: "/products/light?parMin=40&parMax=80",
    };
  }

  return {
    title: "High-output LED fixtures",
    description: "Strong PAR support for demanding growth and coloration",
    href: "/products/light?parMin=80",
  };
}

export function buildPlantCompatibleEquipmentLinks(
  profile: PlantCareProfileInput,
): PlantCompatibleEquipmentLink[] {
  const links: PlantCompatibleEquipmentLink[] = [];
  const light = compatibilityLinkTitleFromLightDemand(profile.lightDemand);

  links.push({
    id: "light",
    categorySlug: "light",
    title: light.title,
    description: light.description,
    href: light.href,
  });

  if (hasDemandAtLeastModerate(profile.co2Demand)) {
    links.push({
      id: "co2",
      categorySlug: "co2",
      title: "CO₂ systems",
      description: "Stabilize growth for medium/high CO₂-demand plants",
      href: "/products/co2",
    });
  }

  if (hasDemandAtLeastModerate(profile.growthRate)) {
    links.push({
      id: "fertilizer",
      categorySlug: "fertilizer",
      title: "Fertilizer programs",
      description: "Maintain nutrients for faster growth and denser foliage",
      href: "/products/fertilizer",
    });
  }

  links.push({
    id: "substrate",
    categorySlug: "substrate",
    title: "Plant-friendly substrates",
    description: "Match grain size and nutrient depth to root development",
    href: "/products/substrate",
  });

  if (
    !profile.beginnerFriendly ||
    hasDemandHigh(profile.lightDemand) ||
    hasDemandHigh(profile.co2Demand)
  ) {
    links.push({
      id: "test-kit",
      categorySlug: "test_kit",
      title: "Water test kits",
      description: "Monitor pH, KH, and nutrient stability for sensitive plants",
      href: "/products/test_kit",
    });
  }

  return links;
}

export function careToneClasses(tone: CareIndicatorTone): {
  badge: string;
  bar: string;
  rail: string;
} {
  if (tone === "easy") {
    return {
      badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
      bar: "bg-emerald-500",
      rail: "bg-emerald-50",
    };
  }

  if (tone === "moderate") {
    return {
      badge: "bg-amber-100 text-amber-900 border-amber-200",
      bar: "bg-amber-500",
      rail: "bg-amber-50",
    };
  }

  return {
    badge: "bg-rose-100 text-rose-900 border-rose-200",
    bar: "bg-rose-500",
    rail: "bg-rose-50",
  };
}
