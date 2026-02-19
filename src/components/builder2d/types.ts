export type Builder2DStep = "tank" | "compose";

export type TankPreset = {
  id: string;
  name: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  liters: number;
};

export type AssetGroup = "plants" | "hardscape";

export type AssetVariant = "rosette" | "stem" | "carpet" | "rock" | "wood";

export type LibraryAsset = {
  id: string;
  name: string;
  group: AssetGroup;
  variant: AssetVariant;
  colorA: string;
  colorB: string;
};

export type StageItem = {
  id: string;
  assetId: string;
  xPct: number;
  yPct: number;
  scale: number;
  rotationDeg: number;
  visible: boolean;
  locked: boolean;
};

export type Builder2DState = {
  step: Builder2DStep;
  selectedTankId: string;
  activeGroup: AssetGroup;
  search: string;
  items: StageItem[];
  selectedItemId: string | null;
};

export type Builder2DSharedLineItem = {
  id: string;
  categorySlug: string;
  quantity: number;
  productName: string | null;
  plantName: string | null;
};

export type Builder2DInitialBuild = {
  shareSlug: string;
  name: string;
  description: string | null;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  lineItems: Builder2DSharedLineItem[];
};
