import {
  firstCatalogImageUrl as firstCatalogImageUrlFromGuardrails,
  sanitizeCatalogCopy,
} from "@/lib/catalog-guardrails";

export type CatalogEntityKind = "product" | "plant";

type MissingSourceImageCopy = {
  title: string;
  body: string;
};

const MISSING_SOURCE_IMAGE_COPY: Record<CatalogEntityKind, MissingSourceImageCopy> = {
  product: {
    title: "No source image available",
    body: "This product currently has no source-provided image in the catalog.",
  },
  plant: {
    title: "No source image available",
    body: "This plant currently has no source-provided image in the catalog.",
  },
};

export function missingSourceImageCopy(kind: CatalogEntityKind): MissingSourceImageCopy {
  return MISSING_SOURCE_IMAGE_COPY[kind];
}

export function normalizePickerDetails(description: string | null | undefined): string {
  const text = sanitizeCatalogCopy(description);
  if (text) return text;
  return "Source details are not available for this item yet.";
}

export function firstCatalogImageUrl(params: {
  imageUrl: string | null | undefined;
  imageUrls: unknown;
}): string | null {
  return firstCatalogImageUrlFromGuardrails(params.imageUrl, params.imageUrls);
}
