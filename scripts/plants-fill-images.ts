#!/usr/bin/env tsx
/**
 * Fill missing plant.image_url entries in data/plants.json.
 *
 * Strategy:
 * - Try Wikipedia REST summary for the scientific name, then common name.
 * - If that fails, use Wikipedia search API to find a likely page title, then retry summary.
 * - If we get a thumbnail, use it.
 * - Otherwise, fall back to a local placeholder image path.
 */

import fs from "node:fs";
import path from "node:path";

type Plant = {
  slug: string;
  common_name?: string;
  scientific_name?: string;
  image_url?: string;
  [k: string]: unknown;
};

const plantsPath = path.join(process.cwd(), "data", "plants.json");
const placeholder = "/images/aquascape-hero-2400.jpg";

function titleCandidates(p: Plant): string[] {
  const out: string[] = [];
  const sci = String(p.scientific_name ?? "").trim();
  const common = String(p.common_name ?? "").trim();
  if (sci) out.push(sci);
  if (common && common.toLowerCase() !== sci.toLowerCase()) out.push(common);

  // If common name includes parentheses, also try the part before.
  const paren = common.split("(")[0]?.trim();
  if (paren && paren !== common && !out.includes(paren)) out.push(paren);

  // If scientific name includes cultivar-ish suffix, also try first two words.
  const sciWords = sci.split(/\s+/).filter(Boolean);
  if (sciWords.length >= 2) {
    const binomial = `${sciWords[0]} ${sciWords[1]}`;
    if (!out.includes(binomial)) out.push(binomial);
  }

  return out;
}

async function wikiThumb(title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "planted-tank-lab (plants-fill-images)",
      accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as unknown;
  const thumb = (json as { thumbnail?: { source?: unknown } } | null)?.thumbnail?.source;
  if (typeof thumb === "string" && thumb.startsWith("http")) return thumb;
  return null;
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
      "user-agent": "planted-tank-lab (plants-fill-images)",
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

async function main() {
  const plants = JSON.parse(fs.readFileSync(plantsPath, "utf8")) as Plant[];

  const missing = plants.filter((p) => !p.image_url || p.image_url === placeholder);
  if (missing.length === 0) {
    console.log("No missing image_url entries.");
    return;
  }

  console.log(`Plants: ${plants.length}. Missing images: ${missing.length}.`);

  let filled = 0;
  let placeholders = 0;

  for (const p of missing) {
    let found: string | null = null;

    // Skip clearly non-wiki-friendly scientific names.
    const sci = String(p.scientific_name ?? "");
    const looksNonSpecific = /\bsp\.?\b/i.test(sci) || /'/.test(sci);

    if (!looksNonSpecific) {
      for (const cand of titleCandidates(p)) {
        found = await wikiThumb(cand);
        if (!found) {
          const suggested = await wikiSearch(cand);
          if (suggested && suggested.toLowerCase() !== cand.toLowerCase()) {
            found = await wikiThumb(suggested);
          }
        }
        if (found) break;
        // Gentle pacing.
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    if (found) {
      p.image_url = found;
      filled++;
      console.log(`✓ ${p.slug}: ${found}`);
    } else {
      p.image_url = placeholder;
      placeholders++;
      console.log(`• ${p.slug}: placeholder`);
    }
  }

  fs.writeFileSync(plantsPath, JSON.stringify(plants, null, 2) + "\n");
  console.log(`Done. Filled via wiki: ${filled}. Placeholder: ${placeholders}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
