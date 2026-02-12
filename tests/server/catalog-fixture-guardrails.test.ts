import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { CATALOG_PLACEHOLDER_IMAGE_MARKERS } from "@/lib/catalog-guardrails";

const PRODUCTS_DIR = path.resolve(process.cwd(), "data/products");

describe("catalog fixture guardrails", () => {
  test("product fixtures do not contain blocked placeholder image markers", () => {
    const markerSet = new Set<string>(CATALOG_PLACEHOLDER_IMAGE_MARKERS);
    const offenders: Array<{ file: string; slug: string; marker: string }> = [];

    for (const file of readdirSync(PRODUCTS_DIR)) {
      if (!file.endsWith(".json")) continue;
      const absPath = path.join(PRODUCTS_DIR, file);
      const rows = JSON.parse(readFileSync(absPath, "utf8")) as Array<{
        slug?: string;
        image_url?: string;
        image_urls?: string[];
      }>;

      for (const row of rows) {
        const slug = row.slug ?? "unknown";
        const imageCandidates = [
          typeof row.image_url === "string" ? row.image_url : null,
          ...(Array.isArray(row.image_urls) ? row.image_urls : []),
        ].filter((value): value is string => Boolean(value));

        for (const value of imageCandidates) {
          if (markerSet.has(value)) {
            offenders.push({ file, slug, marker: value });
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
