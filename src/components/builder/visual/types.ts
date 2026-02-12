export type VisualAssetType = "product" | "plant";

export type VisualAsset = {
  id: string;
  type: VisualAssetType;
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
  offerId: string | null;
  goUrl: string | null;
  purchaseUrl: string | null;
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

export type VisualCanvasItem = {
  id: string;
  assetId: string;
  assetType: VisualAssetType;
  categorySlug: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
};

export type VisualCanvasState = {
  version: 1;
  widthIn: number;
  heightIn: number;
  depthIn: number;
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
  flags: {
    lowTechNoCo2: boolean;
    hasShrimp: boolean;
  };
};
