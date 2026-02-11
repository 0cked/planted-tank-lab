import { and, eq, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import {
  buildItems,
  canonicalEntityMappings,
  categories,
  ingestionEntities,
  offers,
  plants,
  products,
} from "@/server/db/schema";

export type CanonicalEntityType = "product" | "plant" | "offer";

export type CatalogProvenanceAudit = {
  generatedAt: string;
  canonicalWithoutProvenance: {
    products: number;
    plants: number;
    offers: number;
    categories: number;
  };
  displayedWithoutProvenance: {
    products: number;
    plants: number;
    offers: number;
    categories: number;
  };
  buildPartsReferencingNonProvenance: {
    products: number;
    plants: number;
    total: number;
  };
  hasDisplayedViolations: boolean;
};

function mappedEntityType(canonicalType: CanonicalEntityType): CanonicalEntityType {
  return canonicalType;
}

export function ingestionBackedCanonicalSql(
  canonicalType: CanonicalEntityType,
  canonicalIdColumn: AnyColumn,
): SQL<boolean> {
  const entityType = mappedEntityType(canonicalType);

  return sql<boolean>`
    exists (
      select 1
      from ${canonicalEntityMappings}
      inner join ${ingestionEntities}
        on ${ingestionEntities.id} = ${canonicalEntityMappings.entityId}
      where ${canonicalEntityMappings.canonicalType} = ${canonicalType}
        and ${ingestionEntities.entityType} = ${entityType}
        and ${canonicalEntityMappings.canonicalId} = ${canonicalIdColumn}
    )
  `;
}

function toCount(rows: Array<{ c: number }>): number {
  return Number(rows[0]?.c ?? 0);
}

export async function runCatalogProvenanceAudit(
  database: DbClient = db,
): Promise<CatalogProvenanceAudit> {
  const productProvenance = ingestionBackedCanonicalSql("product", products.id);
  const plantProvenance = ingestionBackedCanonicalSql("plant", plants.id);
  const offerProvenance = ingestionBackedCanonicalSql("offer", offers.id);

  const canonicalProductsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(sql`not (${productProvenance})`);

  const canonicalPlantsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(plants)
    .where(sql`not (${plantProvenance})`);

  const canonicalOffersWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(offers)
    .where(sql`not (${offerProvenance})`);

  const canonicalCategoriesWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(distinct ${categories.id})::int` })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(sql`not (${productProvenance})`);

  const displayedProductsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.status, "active"), sql`not (${productProvenance})`));

  const displayedPlantsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(plants)
    .where(and(eq(plants.status, "active"), sql`not (${plantProvenance})`));

  const displayedOffersWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .where(
      and(
        eq(products.status, "active"),
        sql`(not (${productProvenance}) or not (${offerProvenance}))`,
      ),
    );

  const displayedCategoriesWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(distinct ${categories.id})::int` })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(and(eq(products.status, "active"), sql`not (${productProvenance})`));

  const productBuildPartsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(buildItems)
    .innerJoin(products, eq(buildItems.productId, products.id))
    .where(sql`not (${productProvenance})`);

  const plantBuildPartsWithoutProvenanceRows = await database
    .select({ c: sql<number>`count(*)::int` })
    .from(buildItems)
    .innerJoin(plants, eq(buildItems.plantId, plants.id))
    .where(sql`not (${plantProvenance})`);

  const canonicalWithoutProvenance = {
    products: toCount(canonicalProductsWithoutProvenanceRows),
    plants: toCount(canonicalPlantsWithoutProvenanceRows),
    offers: toCount(canonicalOffersWithoutProvenanceRows),
    categories: toCount(canonicalCategoriesWithoutProvenanceRows),
  };

  const displayedWithoutProvenance = {
    products: toCount(displayedProductsWithoutProvenanceRows),
    plants: toCount(displayedPlantsWithoutProvenanceRows),
    offers: toCount(displayedOffersWithoutProvenanceRows),
    categories: toCount(displayedCategoriesWithoutProvenanceRows),
  };

  const buildPartsReferencingNonProvenance = {
    products: toCount(productBuildPartsWithoutProvenanceRows),
    plants: toCount(plantBuildPartsWithoutProvenanceRows),
    total:
      toCount(productBuildPartsWithoutProvenanceRows) +
      toCount(plantBuildPartsWithoutProvenanceRows),
  };

  const hasDisplayedViolations =
    displayedWithoutProvenance.products > 0 ||
    displayedWithoutProvenance.plants > 0 ||
    displayedWithoutProvenance.offers > 0 ||
    displayedWithoutProvenance.categories > 0 ||
    buildPartsReferencingNonProvenance.total > 0;

  return {
    generatedAt: new Date().toISOString(),
    canonicalWithoutProvenance,
    displayedWithoutProvenance,
    buildPartsReferencingNonProvenance,
    hasDisplayedViolations,
  };
}
