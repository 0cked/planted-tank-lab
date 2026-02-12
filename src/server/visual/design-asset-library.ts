import { z } from "zod";

import rawDesignAssets from "../../../data/visual-assets/design-assets.json";

const retailerLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().url(),
  retailerSlug: z.string().trim().min(1).max(80).optional(),
});

const designAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  categorySlug: z.string().trim().min(1).max(80),
  categoryName: z.string().trim().min(1).max(120),
  imageUrl: z.string().trim().min(1).max(500).nullable().optional(),
  widthIn: z.number().positive().max(300),
  heightIn: z.number().positive().max(300),
  depthIn: z.number().positive().max(300),
  defaultScale: z.number().min(0.1).max(6).default(1),
  materialType: z.string().trim().min(1).max(120).nullable().optional(),
  estimatedUnitPriceCents: z.number().int().min(0).max(500_000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  retailerLinks: z.array(retailerLinkSchema).max(12).default([]),
});

const designAssetLibrarySchema = z.object({
  version: z.literal(1),
  assets: z.array(designAssetSchema).max(1000),
});

export type DesignLibraryAsset = z.infer<typeof designAssetSchema>;

const parsed = designAssetLibrarySchema.parse(rawDesignAssets);

export function getDesignLibraryAssets(): DesignLibraryAsset[] {
  return parsed.assets;
}

