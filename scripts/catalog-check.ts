import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { missingRequiredSpecs, requiredSpecsForCategory } from "@/engine/required-specs";
import type { CompatibilityRule } from "@/engine/types";

const productSeedSchema = z.object({
  category_slug: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  image_url: z.string().optional(),
  image_urls: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.unknown()),
  curated_rank: z.number().int().positive().optional(),
});

const offerSeedSchema = z.object({
  product_slug: z.string().min(1),
  retailer_slug: z.string().min(1),
  url: z.string().min(1),
});

const ruleSeedSchema = z.object({
  code: z.string().min(1),
  active: z.boolean().optional(),
  condition_logic: z.record(z.string(), z.unknown()),
});

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf8")) as T;
}

function hasImage(p: z.infer<typeof productSeedSchema>): boolean {
  const one = (p.image_url ?? "").trim();
  const many = p.image_urls ?? [];
  return one.length > 0 || many.length > 0;
}

function offersBySlug(offers: Array<z.infer<typeof offerSeedSchema>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of offers) m.set(o.product_slug, (m.get(o.product_slug) ?? 0) + 1);
  return m;
}

async function main() {
  const categories = readJson<Array<{ slug: string; builder_required: boolean }>>("data/categories.json");
  const core = new Set(categories.filter((c) => c.builder_required).map((c) => c.slug));

  const rawRules = ruleSeedSchema.array().parse(readJson<unknown>("data/rules.json"));
  const rules: CompatibilityRule[] = rawRules.map((r) => ({
    code: r.code,
    name: r.code,
    description: null,
    severity: "error",
    categoriesInvolved: [],
    conditionLogic: r.condition_logic,
    messageTemplate: "",
    fixSuggestion: null,
    active: r.active ?? true,
    version: 1,
  }));

  const offers = offerSeedSchema.array().parse(readJson<unknown>("data/offers.json"));
  const offerCountBySlug = offersBySlug(offers);

  const prodDir = join(process.cwd(), "data/products");
  const productFiles = readdirSync(prodDir).filter((f) => f.endsWith(".json"));

  const issues: Array<{ slug: string; category: string; problems: string[]; file: string }> = [];
  let curatedCore = 0;

  for (const f of productFiles) {
    const items = productSeedSchema.array().parse(
      JSON.parse(readFileSync(join(prodDir, f), "utf8")) as unknown,
    );

    for (const p of items) {
      if (!p.curated_rank) continue;
      if (!core.has(p.category_slug)) continue;
      curatedCore++;

      const problems: string[] = [];

      if (!hasImage(p)) problems.push("missing image_url/image_urls");
      const offersN = offerCountBySlug.get(p.slug) ?? 0;
      if (offersN < 1) problems.push("missing offers");

      const required = requiredSpecsForCategory(rules, p.category_slug);
      const missing = missingRequiredSpecs(p.specs, required);
      if (missing.length > 0) problems.push(`missing required specs: ${missing.join(", ")}`);

      if (problems.length > 0) {
        issues.push({ slug: p.slug, category: p.category_slug, problems, file: f });
      }
    }
  }

  if (issues.length === 0) {
    console.log(`catalog-check: OK (curated core products: ${curatedCore})`);
    return;
  }

  console.log(
    `catalog-check: FAIL (curated core products: ${curatedCore}, issues: ${issues.length})`,
  );
  for (const i of issues) {
    console.log(`- [${i.category}] ${i.slug} (${i.file}): ${i.problems.join("; ")}`);
  }

  process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
