import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import {
  categories,
  offers,
  priceAlerts,
  products,
  retailers,
  users,
} from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdProductIds: string[] = [];
const createdRetailerIds: string[] = [];
const createdOfferIds: string[] = [];
const createdAlertIds: string[] = [];

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

async function createUser() {
  const email = `price-alert-${randomSuffix()}@example.com`;
  const inserted = await db
    .insert(users)
    .values({ email, authProvider: "email" })
    .returning({ id: users.id, email: users.email });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create user fixture.");
  }

  createdUserIds.push(row.id);
  return row;
}

async function createProductWithOffer(priceCents: number) {
  const suffix = randomSuffix();

  const categoryInserted = await db
    .insert(categories)
    .values({
      slug: `price-alert-category-${suffix}`,
      name: `Price Alert Category ${suffix}`,
      displayOrder: 9_500,
    })
    .returning({ id: categories.id });

  const category = categoryInserted[0];
  if (!category) {
    throw new Error("Failed to create category fixture.");
  }
  createdCategoryIds.push(category.id);

  const productInserted = await db
    .insert(products)
    .values({
      categoryId: category.id,
      name: `Price Alert Product ${suffix}`,
      slug: `price-alert-product-${suffix}`,
      status: "active",
    })
    .returning({ id: products.id });

  const product = productInserted[0];
  if (!product) {
    throw new Error("Failed to create product fixture.");
  }
  createdProductIds.push(product.id);

  const retailerInserted = await db
    .insert(retailers)
    .values({
      name: `Price Alert Retailer ${suffix}`,
      slug: `price-alert-retailer-${suffix}`,
      websiteUrl: "https://example.com",
    })
    .returning({ id: retailers.id });

  const retailer = retailerInserted[0];
  if (!retailer) {
    throw new Error("Failed to create retailer fixture.");
  }
  createdRetailerIds.push(retailer.id);

  const offerInserted = await db
    .insert(offers)
    .values({
      productId: product.id,
      retailerId: retailer.id,
      priceCents,
      inStock: true,
      url: "https://example.com/product",
    })
    .returning({ id: offers.id });

  const offer = offerInserted[0];
  if (!offer) {
    throw new Error("Failed to create offer fixture.");
  }
  createdOfferIds.push(offer.id);

  return {
    productId: product.id,
  };
}

function createAuthedCaller(user: { id: string; email: string }) {
  return appRouter.createCaller({
    db,
    req: new Request("http://localhost"),
    session: {
      user: {
        id: user.id,
        email: user.email,
        role: "user",
      },
    },
  });
}

afterEach(async () => {
  if (createdAlertIds.length > 0) {
    await db.delete(priceAlerts).where(inArray(priceAlerts.id, createdAlertIds));
    createdAlertIds.length = 0;
  }

  if (createdOfferIds.length > 0) {
    await db.delete(offers).where(inArray(offers.id, createdOfferIds));
    createdOfferIds.length = 0;
  }

  if (createdProductIds.length > 0) {
    await db.delete(products).where(inArray(products.id, createdProductIds));
    createdProductIds.length = 0;
  }

  if (createdCategoryIds.length > 0) {
    await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
    createdCategoryIds.length = 0;
  }

  if (createdRetailerIds.length > 0) {
    await db.delete(retailers).where(inArray(retailers.id, createdRetailerIds));
    createdRetailerIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

describe("tRPC price alerts", () => {
  it("upserts a price alert and keeps one active alert per product", async () => {
    const user = await createUser();
    const fixture = await createProductWithOffer(2_499);
    const caller = createAuthedCaller(user);

    const first = await caller.priceAlerts.upsert({
      productId: fixture.productId,
      targetPrice: 20,
    });
    createdAlertIds.push(first.id);

    expect(first.targetPriceCents).toBe(2_000);

    const second = await caller.priceAlerts.upsert({
      productId: fixture.productId,
      targetPrice: 18.5,
    });

    expect(second.id).toBe(first.id);
    expect(second.targetPriceCents).toBe(1_850);

    const alerts = await caller.priceAlerts.listMine();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.targetPriceCents).toBe(1_850);
  });

  it("marks alerts as triggered when best offer is below target and waits 24h before retriggering", async () => {
    const user = await createUser();
    const fixture = await createProductWithOffer(1_500);
    const caller = createAuthedCaller(user);

    const alert = await caller.priceAlerts.upsert({
      productId: fixture.productId,
      targetPrice: 20,
    });
    createdAlertIds.push(alert.id);

    const firstCheck = await caller.priceAlerts.checkAndTrigger();
    expect(firstCheck.triggeredCount).toBe(1);
    expect(firstCheck.triggeredAlertIds).toContain(alert.id);

    const triggeredAlerts = await caller.priceAlerts.listMine({ onlyTriggered: true });
    expect(triggeredAlerts).toHaveLength(1);
    expect(triggeredAlerts[0]?.bestPriceCents).toBe(1_500);

    const secondCheck = await caller.priceAlerts.checkAndTrigger();
    expect(secondCheck.triggeredCount).toBe(0);

    await db
      .update(priceAlerts)
      .set({
        lastNotifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      })
      .where(eq(priceAlerts.id, alert.id));

    const thirdCheck = await caller.priceAlerts.checkAndTrigger();
    expect(thirdCheck.triggeredCount).toBe(1);
    expect(thirdCheck.triggeredAlertIds).toContain(alert.id);
  });
});
