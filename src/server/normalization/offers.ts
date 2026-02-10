import { eq } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import { offers, priceHistory } from "@/server/db/schema";

export async function applyOfferHeadObservation(params: {
  db: DbClient;
  offerId: string;
  ok: boolean;
  checkedAt: Date;
}): Promise<void> {
  // Update the canonical offer status.
  const rows = await params.db
    .update(offers)
    .set({
      inStock: params.ok,
      lastCheckedAt: params.checkedAt,
      updatedAt: params.checkedAt,
    })
    .where(eq(offers.id, params.offerId))
    .returning({ priceCents: offers.priceCents });

  const priceCents = rows[0]?.priceCents ?? null;
  if (priceCents == null) return;

  await params.db.insert(priceHistory).values({
    offerId: params.offerId,
    priceCents,
    inStock: params.ok,
    recordedAt: params.checkedAt,
  });
}

