import { describe, expect, test } from "vitest";

import {
  OFFER_MATCH_CONFIDENCE,
  matchCanonicalOffer,
  normalizeOfferUrl,
} from "@/server/normalization/matchers/offer";

describe("offer matcher", () => {
  test("keeps existing canonical mapping first", () => {
    const result = matchCanonicalOffer({
      existingEntityCanonicalId: "offer-existing",
      productId: "product-1",
      retailerId: "retailer-1",
      url: "https://retailer.example.com/item",
      existingOffers: [
        {
          id: "offer-existing",
          productId: "product-1",
          retailerId: "retailer-1",
          url: "https://retailer.example.com/item",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "offer-existing",
      matchMethod: "identifier_exact",
      confidence: OFFER_MATCH_CONFIDENCE.identifierExact,
    });
  });

  test("normalizes URLs for deterministic fingerprinting", () => {
    const normalized = normalizeOfferUrl(
      "HTTPS://Retailer.Example.com:443/products/item/?b=2&a=1#tracking",
    );

    expect(normalized).toBe("https://retailer.example.com/products/item?a=1&b=2");
  });

  test("matches by product+retailer+normalized-url fingerprint", () => {
    const result = matchCanonicalOffer({
      existingEntityCanonicalId: null,
      productId: "product-1",
      retailerId: "retailer-1",
      url: "https://retailer.example.com/item?a=1&b=2",
      existingOffers: [
        {
          id: "offer-1",
          productId: "product-1",
          retailerId: "retailer-1",
          url: "https://retailer.example.com/item/?b=2&a=1",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "offer-1",
      matchMethod: "product_retailer_url_fingerprint",
      confidence: OFFER_MATCH_CONFIDENCE.productRetailerUrlFingerprint,
    });
  });

  test("returns new canonical when no deterministic offer match exists", () => {
    const result = matchCanonicalOffer({
      existingEntityCanonicalId: null,
      productId: "product-a",
      retailerId: "retailer-a",
      url: "https://retailer.example.com/item-a",
      existingOffers: [
        {
          id: "offer-existing",
          productId: "product-a",
          retailerId: "retailer-a",
          url: "https://retailer.example.com/item-b",
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: null,
      matchMethod: "new_canonical",
      confidence: OFFER_MATCH_CONFIDENCE.newCanonical,
    });
  });
});
