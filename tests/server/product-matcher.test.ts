import { describe, expect, test } from "vitest";

import {
  PRODUCT_MATCH_CONFIDENCE,
  matchCanonicalProduct,
} from "@/server/normalization/matchers/product";

describe("product matcher", () => {
  test("uses identifier exact match first", () => {
    const result = matchCanonicalProduct({
      existingEntityCanonicalId: null,
      slug: "fluval-plant-3-0-15",
      sourceEntityId: "fluval-plant-3-0-15",
      brandId: "brand-fluval",
      name: "Fluval Plant Spectrum 3.0 LED (15\")",
      model: null,
      modelNumber: null,
      sku: null,
      upc: null,
      ean: null,
      gtin: null,
      mpn: null,
      asin: null,
      identifiers: null,
      existingProducts: [
        {
          id: "product-1",
          slug: "fluval-plant-3-0-15",
          brandId: "brand-fluval",
          name: "Fluval Plant Spectrum 3.0 LED (15\")",
          meta: {},
        },
        {
          id: "product-2",
          slug: "fluval-plant-3-0-24",
          brandId: "brand-fluval",
          name: "Fluval Plant Spectrum 3.0 LED (24\")",
          meta: {},
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "product-1",
      matchMethod: "identifier_exact",
      confidence: PRODUCT_MATCH_CONFIDENCE.identifierExact,
    });
  });

  test("falls back to brand/model fingerprint when identifiers miss", () => {
    const result = matchCanonicalProduct({
      existingEntityCanonicalId: null,
      slug: "chihiros-wrgb-ii-60-v2",
      sourceEntityId: "source-chihiros-wrgb-ii-60-v2",
      brandId: "brand-chihiros",
      name: "Chihiros WRGB II 60",
      model: null,
      modelNumber: null,
      sku: null,
      upc: null,
      ean: null,
      gtin: null,
      mpn: null,
      asin: null,
      identifiers: null,
      existingProducts: [
        {
          id: "product-10",
          slug: "chihiros-wrgb-ii-60",
          brandId: "brand-chihiros",
          name: "Chihiros WRGB II 60",
          meta: {},
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: "product-10",
      matchMethod: "brand_model_fingerprint",
      confidence: PRODUCT_MATCH_CONFIDENCE.brandModelFingerprint,
    });
  });

  test("creates new canonical when no deterministic match exists", () => {
    const result = matchCanonicalProduct({
      existingEntityCanonicalId: null,
      slug: "new-sku-900",
      sourceEntityId: "new-sku-900",
      brandId: "brand-new",
      name: "Brand New Fixture 900",
      model: null,
      modelNumber: null,
      sku: null,
      upc: null,
      ean: null,
      gtin: null,
      mpn: null,
      asin: null,
      identifiers: null,
      existingProducts: [
        {
          id: "product-existing",
          slug: "old-sku-100",
          brandId: "brand-old",
          name: "Old Fixture 100",
          meta: {},
        },
      ],
    });

    expect(result).toEqual({
      canonicalId: null,
      matchMethod: "new_canonical",
      confidence: PRODUCT_MATCH_CONFIDENCE.newCanonical,
    });
  });
});
