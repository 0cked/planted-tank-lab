import { describe, expect, test } from "vitest";

import {
  extractBuceplantStaticProductPayload,
  matchUnsVariantForProductSlug,
  selectSpiderwoodVariant,
  unsModelCodeFromProductSlug,
} from "@/server/ingestion/sources/offers-buceplant-variants";

const unsHtml = `
<!doctype html>
<html>
  <body>
    <script type="application/json" data-section-type="static-product">
      {
        "product": {
          "handle": "ultum-clear-rimless-tanks-by-ultum-nature-systems",
          "title": "UNS Ultra Clear Tanks",
          "featured_image": "//buceplant.com/cdn/shop/files/uns-tanks.jpg?v=1",
          "variants": [
            {
              "id": 1,
              "title": "[ 60U ] - 23.62 x 14.17 x 14.17 - 20.5 Gallons",
              "price": 18999,
              "available": true,
              "sku": "UNS60U",
              "option1": "[ 60U ] - 23.62 x 14.17 x 14.17 - 20.5 Gallons"
            },
            {
              "id": 2,
              "title": "[ 90U ] - 35.43 x 22.04 x 22.04 - 74.5 Gallons",
              "price": 32999,
              "available": false,
              "sku": "UNS90U",
              "option1": "[ 90U ] - 35.43 x 22.04 x 22.04 - 74.5 Gallons"
            }
          ]
        }
      }
    </script>
  </body>
</html>
`;

const spiderwoodHtml = `
<!doctype html>
<html>
  <body>
    <script type="application/json" data-section-type="static-product">
      {
        "product": {
          "handle": "spiderwood",
          "title": "Spiderwood",
          "variants": [
            {
              "id": 42807232725192,
              "title": "Medium / 3 Pack",
              "price": 3599,
              "available": true
            },
            {
              "id": 3836994322472,
              "title": "Small / Single",
              "price": 799,
              "available": true
            }
          ]
        }
      }
    </script>
  </body>
</html>
`;

describe("ingestion: buceplant variant parser", () => {
  test("extracts static product payload with variant data", () => {
    const payload = extractBuceplantStaticProductPayload(unsHtml);

    expect(payload).toBeTruthy();
    expect(payload?.handle).toBe("ultum-clear-rimless-tanks-by-ultum-nature-systems");
    expect(payload?.variants.length).toBe(2);
    expect(payload?.featuredImageUrl).toBe("https://buceplant.com/cdn/shop/files/uns-tanks.jpg?v=1");
  });

  test("matches UNS variant by canonical product slug", () => {
    const payload = extractBuceplantStaticProductPayload(unsHtml);
    expect(payload).toBeTruthy();

    const variant60u = matchUnsVariantForProductSlug(payload!.variants, "uns-60u");
    const variant90u = matchUnsVariantForProductSlug(payload!.variants, "uns-90u");

    expect(variant60u?.id).toBe("1");
    expect(variant60u?.priceCents).toBe(18999);
    expect(variant90u?.id).toBe("2");
    expect(variant90u?.available).toBe(false);
    expect(unsModelCodeFromProductSlug("uns-120ss")).toBe("120SS");
  });

  test("selects configured spiderwood preferred variant id", () => {
    const payload = extractBuceplantStaticProductPayload(spiderwoodHtml);
    expect(payload).toBeTruthy();

    const variant = selectSpiderwoodVariant(payload!.variants);
    expect(variant?.id).toBe("3836994322472");
    expect(variant?.priceCents).toBe(799);
  });
});
