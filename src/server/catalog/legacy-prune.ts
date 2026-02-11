import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import {
  buildItems,
  canonicalEntityMappings,
  normalizationOverrides,
  offers,
  plants,
  priceHistory,
  products,
  userFavorites,
} from "@/server/db/schema";
import { ingestionBackedCanonicalSql } from "@/server/catalog/provenance";
import { refreshOfferSummariesForProductIds } from "@/server/services/offer-summaries";

export type LegacyCatalogPruneTargets = {
  productIds: string[];
  plantIds: string[];
  offerIds: string[];
};

type OfferProductRow = {
  id: string;
  productId: string;
};

export type LegacyCatalogPrunePlan = {
  productIdsToDelete: string[];
  plantIdsToDelete: string[];
  offerIdsToDelete: string[];
  refreshOfferSummaryProductIds: string[];
};

export type LegacyCatalogPruneResult = {
  generatedAt: string;
  candidates: LegacyCatalogPruneTargets;
  plan: {
    productsToDelete: number;
    plantsToDelete: number;
    offersToDelete: number;
    offerSummaryRefreshProducts: number;
  };
  references: {
    buildItemsByProductDeleted: number;
    buildItemsByPlantDeleted: number;
    buildItemsSelectedOfferCleared: number;
    userFavoritesByProductDeleted: number;
    userFavoritesByPlantDeleted: number;
    priceHistoryDeleted: number;
    canonicalMappingsDeleted: number;
    normalizationOverridesDeleted: number;
  };
  deleted: {
    products: number;
    plants: number;
    offers: number;
  };
};

type BuildLegacyCatalogPrunePlanParams = {
  targets: LegacyCatalogPruneTargets;
  offerRows: OfferProductRow[];
};

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function buildLegacyCatalogPrunePlan(
  params: BuildLegacyCatalogPrunePlanParams,
): LegacyCatalogPrunePlan {
  const productIdsToDelete = uniqueSorted(params.targets.productIds);
  const plantIdsToDelete = uniqueSorted(params.targets.plantIds);
  const candidateOfferIds = uniqueSorted(params.targets.offerIds);

  const legacyProductIdSet = new Set(productIdsToDelete);

  const offerIdsFromLegacyProducts = params.offerRows
    .filter((row) => legacyProductIdSet.has(row.productId))
    .map((row) => row.id);

  const offerIdsToDelete = uniqueSorted([
    ...candidateOfferIds,
    ...offerIdsFromLegacyProducts,
  ]);

  const offerIdSet = new Set(offerIdsToDelete);
  const refreshOfferSummaryProductIds = uniqueSorted(
    params.offerRows
      .filter(
        (row) =>
          offerIdSet.has(row.id) && !legacyProductIdSet.has(row.productId),
      )
      .map((row) => row.productId),
  );

  return {
    productIdsToDelete,
    plantIdsToDelete,
    offerIdsToDelete,
    refreshOfferSummaryProductIds,
  };
}

export async function detectLegacyCatalogPruneTargets(
  database: DbClient = db,
): Promise<LegacyCatalogPruneTargets> {
  const productProvenance = ingestionBackedCanonicalSql("product", products.id);
  const plantProvenance = ingestionBackedCanonicalSql("plant", plants.id);
  const offerProvenance = ingestionBackedCanonicalSql("offer", offers.id);

  const legacyProductRows = await database
    .select({ id: products.id })
    .from(products)
    .where(sql`not (${productProvenance})`);

  const legacyPlantRows = await database
    .select({ id: plants.id })
    .from(plants)
    .where(sql`not (${plantProvenance})`);

  const legacyOfferRows = await database
    .select({ id: offers.id })
    .from(offers)
    .where(sql`not (${offerProvenance})`);

  return {
    productIds: uniqueSorted(legacyProductRows.map((row) => row.id)),
    plantIds: uniqueSorted(legacyPlantRows.map((row) => row.id)),
    offerIds: uniqueSorted(legacyOfferRows.map((row) => row.id)),
  };
}

export async function pruneLegacyCatalogRows(params?: {
  database?: DbClient;
  targets?: LegacyCatalogPruneTargets;
}): Promise<LegacyCatalogPruneResult> {
  const database = params?.database ?? db;
  const candidates =
    params?.targets ?? (await detectLegacyCatalogPruneTargets(database));

  const offerRowsById = new Map<string, OfferProductRow>();

  if (candidates.offerIds.length > 0) {
    const directOfferRows = await database
      .select({ id: offers.id, productId: offers.productId })
      .from(offers)
      .where(inArray(offers.id, candidates.offerIds));

    for (const row of directOfferRows) {
      offerRowsById.set(row.id, row);
    }
  }

  if (candidates.productIds.length > 0) {
    const productOfferRows = await database
      .select({ id: offers.id, productId: offers.productId })
      .from(offers)
      .where(inArray(offers.productId, candidates.productIds));

    for (const row of productOfferRows) {
      offerRowsById.set(row.id, row);
    }
  }

  const plan = buildLegacyCatalogPrunePlan({
    targets: candidates,
    offerRows: [...offerRowsById.values()],
  });

  const referencesAndDeletes = await database.transaction(async (tx) => {
    let buildItemsByProductDeleted = 0;
    let buildItemsByPlantDeleted = 0;
    let buildItemsSelectedOfferCleared = 0;
    let userFavoritesByProductDeleted = 0;
    let userFavoritesByPlantDeleted = 0;
    let priceHistoryDeleted = 0;
    let canonicalMappingsDeleted = 0;
    let normalizationOverridesDeleted = 0;
    let offersDeleted = 0;
    let productsDeleted = 0;
    let plantsDeleted = 0;

    if (plan.offerIdsToDelete.length > 0) {
      const clearedOfferRefs = await tx
        .update(buildItems)
        .set({ selectedOfferId: null })
        .where(inArray(buildItems.selectedOfferId, plan.offerIdsToDelete))
        .returning({ id: buildItems.id });
      buildItemsSelectedOfferCleared = clearedOfferRefs.length;
    }

    if (plan.productIdsToDelete.length > 0) {
      const deletedBuildProductRows = await tx
        .delete(buildItems)
        .where(inArray(buildItems.productId, plan.productIdsToDelete))
        .returning({ id: buildItems.id });
      buildItemsByProductDeleted = deletedBuildProductRows.length;
    }

    if (plan.plantIdsToDelete.length > 0) {
      const deletedBuildPlantRows = await tx
        .delete(buildItems)
        .where(inArray(buildItems.plantId, plan.plantIdsToDelete))
        .returning({ id: buildItems.id });
      buildItemsByPlantDeleted = deletedBuildPlantRows.length;
    }

    if (plan.productIdsToDelete.length > 0) {
      const deletedFavoriteProductRows = await tx
        .delete(userFavorites)
        .where(inArray(userFavorites.productId, plan.productIdsToDelete))
        .returning({ userId: userFavorites.userId });
      userFavoritesByProductDeleted = deletedFavoriteProductRows.length;
    }

    if (plan.plantIdsToDelete.length > 0) {
      const deletedFavoritePlantRows = await tx
        .delete(userFavorites)
        .where(inArray(userFavorites.plantId, plan.plantIdsToDelete))
        .returning({ userId: userFavorites.userId });
      userFavoritesByPlantDeleted = deletedFavoritePlantRows.length;
    }

    if (plan.offerIdsToDelete.length > 0) {
      const deletedPriceHistoryRows = await tx
        .delete(priceHistory)
        .where(inArray(priceHistory.offerId, plan.offerIdsToDelete))
        .returning({ id: priceHistory.id });
      priceHistoryDeleted = deletedPriceHistoryRows.length;
    }

    if (plan.offerIdsToDelete.length > 0) {
      const deletedOfferOverrideRows = await tx
        .delete(normalizationOverrides)
        .where(
          and(
            eq(normalizationOverrides.canonicalType, "offer"),
            inArray(normalizationOverrides.canonicalId, plan.offerIdsToDelete),
          ),
        )
        .returning({ id: normalizationOverrides.id });
      normalizationOverridesDeleted += deletedOfferOverrideRows.length;

      const deletedOfferMappingRows = await tx
        .delete(canonicalEntityMappings)
        .where(
          and(
            eq(canonicalEntityMappings.canonicalType, "offer"),
            inArray(canonicalEntityMappings.canonicalId, plan.offerIdsToDelete),
          ),
        )
        .returning({ id: canonicalEntityMappings.id });
      canonicalMappingsDeleted += deletedOfferMappingRows.length;
    }

    if (plan.productIdsToDelete.length > 0) {
      const deletedProductOverrideRows = await tx
        .delete(normalizationOverrides)
        .where(
          and(
            eq(normalizationOverrides.canonicalType, "product"),
            inArray(normalizationOverrides.canonicalId, plan.productIdsToDelete),
          ),
        )
        .returning({ id: normalizationOverrides.id });
      normalizationOverridesDeleted += deletedProductOverrideRows.length;

      const deletedProductMappingRows = await tx
        .delete(canonicalEntityMappings)
        .where(
          and(
            eq(canonicalEntityMappings.canonicalType, "product"),
            inArray(canonicalEntityMappings.canonicalId, plan.productIdsToDelete),
          ),
        )
        .returning({ id: canonicalEntityMappings.id });
      canonicalMappingsDeleted += deletedProductMappingRows.length;
    }

    if (plan.plantIdsToDelete.length > 0) {
      const deletedPlantOverrideRows = await tx
        .delete(normalizationOverrides)
        .where(
          and(
            eq(normalizationOverrides.canonicalType, "plant"),
            inArray(normalizationOverrides.canonicalId, plan.plantIdsToDelete),
          ),
        )
        .returning({ id: normalizationOverrides.id });
      normalizationOverridesDeleted += deletedPlantOverrideRows.length;

      const deletedPlantMappingRows = await tx
        .delete(canonicalEntityMappings)
        .where(
          and(
            eq(canonicalEntityMappings.canonicalType, "plant"),
            inArray(canonicalEntityMappings.canonicalId, plan.plantIdsToDelete),
          ),
        )
        .returning({ id: canonicalEntityMappings.id });
      canonicalMappingsDeleted += deletedPlantMappingRows.length;
    }

    if (plan.offerIdsToDelete.length > 0) {
      const deletedOfferRows = await tx
        .delete(offers)
        .where(inArray(offers.id, plan.offerIdsToDelete))
        .returning({ id: offers.id });
      offersDeleted = deletedOfferRows.length;
    }

    if (plan.productIdsToDelete.length > 0) {
      const deletedProductRows = await tx
        .delete(products)
        .where(inArray(products.id, plan.productIdsToDelete))
        .returning({ id: products.id });
      productsDeleted = deletedProductRows.length;
    }

    if (plan.plantIdsToDelete.length > 0) {
      const deletedPlantRows = await tx
        .delete(plants)
        .where(inArray(plants.id, plan.plantIdsToDelete))
        .returning({ id: plants.id });
      plantsDeleted = deletedPlantRows.length;
    }

    return {
      buildItemsByProductDeleted,
      buildItemsByPlantDeleted,
      buildItemsSelectedOfferCleared,
      userFavoritesByProductDeleted,
      userFavoritesByPlantDeleted,
      priceHistoryDeleted,
      canonicalMappingsDeleted,
      normalizationOverridesDeleted,
      offersDeleted,
      productsDeleted,
      plantsDeleted,
    };
  });

  if (plan.refreshOfferSummaryProductIds.length > 0) {
    await refreshOfferSummariesForProductIds({
      db: database,
      productIds: plan.refreshOfferSummaryProductIds,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    candidates,
    plan: {
      productsToDelete: plan.productIdsToDelete.length,
      plantsToDelete: plan.plantIdsToDelete.length,
      offersToDelete: plan.offerIdsToDelete.length,
      offerSummaryRefreshProducts: plan.refreshOfferSummaryProductIds.length,
    },
    references: {
      buildItemsByProductDeleted: referencesAndDeletes.buildItemsByProductDeleted,
      buildItemsByPlantDeleted: referencesAndDeletes.buildItemsByPlantDeleted,
      buildItemsSelectedOfferCleared:
        referencesAndDeletes.buildItemsSelectedOfferCleared,
      userFavoritesByProductDeleted:
        referencesAndDeletes.userFavoritesByProductDeleted,
      userFavoritesByPlantDeleted: referencesAndDeletes.userFavoritesByPlantDeleted,
      priceHistoryDeleted: referencesAndDeletes.priceHistoryDeleted,
      canonicalMappingsDeleted: referencesAndDeletes.canonicalMappingsDeleted,
      normalizationOverridesDeleted:
        referencesAndDeletes.normalizationOverridesDeleted,
    },
    deleted: {
      products: referencesAndDeletes.productsDeleted,
      plants: referencesAndDeletes.plantsDeleted,
      offers: referencesAndDeletes.offersDeleted,
    },
  };
}
