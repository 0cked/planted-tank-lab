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
  const text = description?.trim();
  if (text) return text;
  return "Source details are not available for this item yet.";
}
