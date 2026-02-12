import { describe, expect, test } from "vitest";

import { missingSourceImageCopy, normalizePickerDetails } from "@/lib/catalog-no-data";

describe("catalog no-data helpers", () => {
  test("returns explicit source-image copy for product and plant", () => {
    const product = missingSourceImageCopy("product");
    const plant = missingSourceImageCopy("plant");

    expect(product.title).toBe("No source image available");
    expect(product.body).toContain("product");

    expect(plant.title).toBe("No source image available");
    expect(plant.body).toContain("plant");
  });

  test("normalizes picker details and falls back when missing", () => {
    expect(normalizePickerDetails("  Compact canister with quiet operation.  "))
      .toBe("Compact canister with quiet operation.");

    expect(normalizePickerDetails("")).toBe("Source details are not available for this item yet.");
    expect(normalizePickerDetails("   "))
      .toBe("Source details are not available for this item yet.");
    expect(normalizePickerDetails(null))
      .toBe("Source details are not available for this item yet.");
  });
});
