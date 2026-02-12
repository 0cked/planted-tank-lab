import { describe, expect, test } from "vitest";

import {
  containsPlaceholderCopy,
  firstCatalogImageUrl,
  isPlaceholderImageUrl,
  sanitizeCatalogCopy,
  sanitizeCatalogImageUrl,
  sanitizeCatalogImageUrls,
} from "@/lib/catalog-guardrails";

describe("catalog guardrails", () => {
  test("detects and sanitizes placeholder image URLs", () => {
    expect(isPlaceholderImageUrl("/images/aquascape-hero-2400.jpg")).toBe(true);
    expect(isPlaceholderImageUrl("https://example.com/images/aquascape-hero-2400.jpg?x=1")).toBe(
      true,
    );
    expect(isPlaceholderImageUrl("https://cdn.example.com/real-image.jpg")).toBe(false);

    expect(sanitizeCatalogImageUrl(" /images/aquascape-hero-2400.jpg ")).toBeNull();
    expect(sanitizeCatalogImageUrl("https://cdn.example.com/real-image.jpg")).toBe(
      "https://cdn.example.com/real-image.jpg",
    );
  });

  test("sanitizes and de-duplicates image url arrays", () => {
    expect(
      sanitizeCatalogImageUrls([
        "/images/aquascape-hero-2400.jpg",
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/a.jpg",
        "",
        null,
      ]),
    ).toEqual(["https://cdn.example.com/a.jpg"]);
  });

  test("detects and sanitizes placeholder copy", () => {
    expect(containsPlaceholderCopy("Photo coming soon")).toBe(true);
    expect(containsPlaceholderCopy("No details yet for this listing")).toBe(true);
    expect(containsPlaceholderCopy("Great beginner stem plant.")).toBe(false);

    expect(sanitizeCatalogCopy("  still filling  ")).toBeNull();
    expect(sanitizeCatalogCopy("Low-profile canister filter")).toBe(
      "Low-profile canister filter",
    );
  });

  test("returns first usable catalog image", () => {
    expect(
      firstCatalogImageUrl("/images/aquascape-hero-2400.jpg", [
        "/images/aquascape-hero-2400.jpg",
        "https://cdn.example.com/usable.jpg",
      ]),
    ).toBe("https://cdn.example.com/usable.jpg");

    expect(
      firstCatalogImageUrl(null, ["/images/aquascape-hero-2400.jpg", "   "]),
    ).toBeNull();
  });
});
