import type { BuildTagSlug } from "@/lib/build-tags";

export type VisualAssetType = "product" | "plant" | "design";

export type VisualAssetSourceMode =
  | "catalog_product"
  | "catalog_plant"
  | "design_archetype";

export type VisualRetailerLink = {
  label: string;
  url: string;
  retailerSlug?: string;
};

export type VisualAsset = {
  id: string;
  type: VisualAssetType;
  sourceMode: VisualAssetSourceMode;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  defaultScale: number;
  sku: string | null;
  priceCents: number | null;
  estimatedUnitPriceCents?: number | null;
  offerId: string | null;
  goUrl: string | null;
  purchaseUrl: string | null;
  retailerLinks?: VisualRetailerLink[];
  materialType?: string | null;
  tags?: string[];
  bagVolumeLiters?: number | null;
  specs?: Record<string, unknown> | null;
  plantProfile?: {
    difficulty: string;
    lightDemand: string;
    co2Demand: string;
    growthRate: string | null;
    placement: string;
    tempMinF: number | null;
    tempMaxF: number | null;
    phMin: number | null;
    phMax: number | null;
    ghMin: number | null;
    ghMax: number | null;
    khMin: number | null;
    khMax: number | null;
    maxHeightIn: number | null;
  } | null;
};

export type VisualTank = {
  id: string;
  name: string;
  slug: string;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  imageUrl: string | null;
  priceCents: number | null;
  offerId: string | null;
  goUrl: string | null;
  sku?: string | null;
  purchaseUrl?: string | null;
  specs?: Record<string, unknown> | null;
};

export type VisualSubstrateProfile = {
  leftDepthIn: number;
  centerDepthIn: number;
  rightDepthIn: number;
  frontDepthIn: number;
  backDepthIn: number;
  moundHeightIn: number;
  moundPosition: number;
};

export type SubstrateHeightfield = Float32Array;

export type VisualAnchorType = "substrate" | "hardscape" | "glass";

export type VisualDepthZone = "foreground" | "midground" | "background";

export type VisualItemTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type VisualItemConstraintMetadata = {
  snapToSurface: boolean;
  canAttachToHardscape: boolean;
  requiresSubstrate: boolean;
  rotationSnapDeg: number;
  collisionRadiusIn: number;
};

export type VisualCanvasItem = {
  id: string;
  assetId: string;
  assetType: VisualAssetType;
  categorySlug: string;
  sku: string | null;
  variant: string | null;
  x: number;
  y: number;
  // Depth axis: 0 = front glass, 1 = back glass.
  z: number;
  scale: number;
  rotation: number;
  layer: number;
  anchorType: VisualAnchorType;
  depthZone: VisualDepthZone | null;
  constraints: VisualItemConstraintMetadata;
  transform: VisualItemTransform;
};

export type VisualSceneSettings = {
  qualityTier: "auto" | "high" | "medium" | "low";
  postprocessingEnabled: boolean;
  guidesVisible: boolean;
  glassWallsEnabled: boolean;
  ambientParticlesEnabled: boolean;
  audioEnabled: boolean;
  cameraPreset: "step" | "free";
};

export type VisualCanvasState = {
  version: 4;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  substrateHeightfield: SubstrateHeightfield;
  sceneSettings: VisualSceneSettings;
  items: VisualCanvasItem[];
};

export type VisualLineItem = {
  categorySlug: string;
  quantity: number;
  notes?: string;
  selectedOfferId?: string;
  productId?: string;
  plantId?: string;
};

export type VisualBuildPayload = {
  buildId: string | null;
  shareSlug: string | null;
  name: string;
  description: string;
  isPublic: boolean;
  tankId: string | null;
  canvasState: VisualCanvasState;
  lineItems: VisualLineItem[];
  tags: BuildTagSlug[];
  flags: {
    lowTechNoCo2: boolean;
    hasShrimp: boolean;
  };
};
