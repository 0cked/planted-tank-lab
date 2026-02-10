#!/usr/bin/env tsx
/**
 * Fill missing plant.sources entries in data/plants.json.
 *
 * Strategy:
 * - Find a likely Wikipedia page via the search API using the scientific name, then common name.
 * - Store the canonical page URL as a baseline citation.
 *
 * Note: this is intentionally conservative and only fills missing sources; it does not overwrite.
 */

import fs from "node:fs";
import path from "node:path";

type Plant = {
  slug: string;
  common_name?: string;
  scientific_name?: string;
  sources?: string[];
  [k: string]: unknown;
};

const plantsPath = path.join(process.cwd(), "data", "plants.json");

function hasSources(p: Plant): boolean {
  return (
    Array.isArray(p.sources) &&
    p.sources.filter((s) => typeof s === "string" && s.trim().length > 0).length > 0
  );
}

async function wikiSearch(query: string): Promise<string | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: "1",
      format: "json",
    }).toString();

  const res = await fetch(url, {
    headers: {
      "user-agent": "planted-tank-lab (plants-fill-sources)",
      accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as unknown;
  const title = (json as { query?: { search?: Array<{ title?: unknown }> } } | null)?.query
    ?.search?.[0]?.title;
  if (typeof title === "string" && title.trim() !== "") return title.trim();
  return null;
}

function wikiUrlFromTitle(title: string): string {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  return `https://en.wikipedia.org/wiki/${encoded}`;
}

function sourceCandidates(p: Plant): string[] {
  const out: string[] = [];
  const sci = String(p.scientific_name ?? "").trim();
  const common = String(p.common_name ?? "").trim();
  if (sci && !/\bsp\.?\b/i.test(sci)) out.push(sci);
  if (common && common.toLowerCase() !== sci.toLowerCase()) out.push(common);
  return out;
}

async function main() {
  const plants = JSON.parse(fs.readFileSync(plantsPath, "utf8")) as Plant[];
  const missing = plants.filter((p) => !hasSources(p));
  if (missing.length === 0) {
    console.log("No missing sources entries.");
    return;
  }

  console.log(`Plants: ${plants.length}. Missing sources: ${missing.length}.`);

  let filled = 0;
  for (const p of missing) {
    let title: string | null = null;
    for (const cand of sourceCandidates(p)) {
      title = await wikiSearch(cand);
      if (title) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    const chosen = title ? wikiUrlFromTitle(title) : null;
    if (!chosen) continue;

    p.sources = [chosen];
    filled++;
    console.log(`✓ ${p.slug}: ${chosen}`);
  }

  fs.writeFileSync(plantsPath, JSON.stringify(plants, null, 2) + "\n");
  console.log(`Done. Filled: ${filled}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

