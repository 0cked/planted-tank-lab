import { eq } from "drizzle-orm";

import {
  containsPlaceholderCopy,
  isPlaceholderImageUrl,
} from "@/lib/catalog-guardrails";
import { runCatalogProvenanceAudit, type CatalogProvenanceAudit } from "@/server/catalog/provenance";
import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import { plants, products } from "@/server/db/schema";

type PlaceholderSummary = {
  imageMarkers: number;
  copyMarkers: number;
  total: number;
  sampleSlugs: string[];
};

export type CatalogRegressionAudit = {
  generatedAt: string;
  provenance: CatalogProvenanceAudit;
  placeholders: {
    products: PlaceholderSummary;
    plants: PlaceholderSummary;
    total: number;
  };
  hasPlaceholderViolations: boolean;
  hasViolations: boolean;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function hasPlaceholderImage(imageUrl: string | null, imageUrls: unknown): boolean {
  if (isPlaceholderImageUrl(imageUrl)) return true;
  return toStringArray(imageUrls).some((value) => isPlaceholderImageUrl(value));
}

function hasPlaceholderCopy(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => containsPlaceholderCopy(value));
}

function buildPlaceholderSummary(
  rows: Array<{
    slug: string;
    imageViolation: boolean;
    copyViolation: boolean;
  }>,
): PlaceholderSummary {
  let imageMarkers = 0;
  let copyMarkers = 0;
  const sampleSlugs: string[] = [];

  for (const row of rows) {
    if (row.imageViolation) imageMarkers += 1;
    if (row.copyViolation) copyMarkers += 1;

    if ((row.imageViolation || row.copyViolation) && sampleSlugs.length < 20) {
      sampleSlugs.push(row.slug);
    }
  }

  return {
    imageMarkers,
    copyMarkers,
    total: imageMarkers + copyMarkers,
    sampleSlugs,
  };
}

export async function runCatalogRegressionAudit(
  database: DbClient = db,
): Promise<CatalogRegressionAudit> {
  const provenance = await runCatalogProvenanceAudit(database);

  const activeProducts = await database
    .select({
      slug: products.slug,
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
      description: products.description,
    })
    .from(products)
    .where(eq(products.status, "active"));

  const activePlants = await database
    .select({
      slug: plants.slug,
      imageUrl: plants.imageUrl,
      imageUrls: plants.imageUrls,
      description: plants.description,
      notes: plants.notes,
    })
    .from(plants)
    .where(eq(plants.status, "active"));

  const productSummary = buildPlaceholderSummary(
    activeProducts.map((row) => ({
      slug: row.slug,
      imageViolation: hasPlaceholderImage(row.imageUrl, row.imageUrls),
      copyViolation: hasPlaceholderCopy(row.description),
    })),
  );

  const plantSummary = buildPlaceholderSummary(
    activePlants.map((row) => ({
      slug: row.slug,
      imageViolation: hasPlaceholderImage(row.imageUrl, row.imageUrls),
      copyViolation: hasPlaceholderCopy(row.description, row.notes),
    })),
  );

  const placeholdersTotal = productSummary.total + plantSummary.total;
  const hasPlaceholderViolations = placeholdersTotal > 0;

  return {
    generatedAt: new Date().toISOString(),
    provenance,
    placeholders: {
      products: productSummary,
      plants: plantSummary,
      total: placeholdersTotal,
    },
    hasPlaceholderViolations,
    hasViolations: provenance.hasDisplayedViolations || hasPlaceholderViolations,
  };
}
