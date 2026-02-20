import type { VisualAsset, VisualCanvasItem, VisualTank } from "@/components/builder/visual/types";

type ExportParams = {
  tank: VisualTank;
  assetsById: Map<string, VisualAsset>;
  items: VisualCanvasItem[];
  fileName?: string;
};

type SceneCanvasExportParams = {
  canvas: HTMLCanvasElement;
  buildName?: string | null;
  fileName?: string;
};

export type SceneGalleryDataUrls = {
  front: string;
  top: string;
  threeQuarter: string;
};

const DEPTH_SIDE_INSET = 0.18;
const DEPTH_TOP_LIFT = 0.2;
const DEPTH_SCALE_DECAY = 0.28;
const SCENE_EXPORT_SCALE = 2;
const WATERMARK_TEXT = "PlantedTankLab.com";
const MAX_CAPTURE_WIDTH = 960;

function projectCanvasPoint(point: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  scale: number;
} {
  const z = Math.min(1, Math.max(0, point.z));
  const inset = z * DEPTH_SIDE_INSET;
  const widthFactor = Math.max(0.2, 1 - inset * 2);
  const projectedX = inset + point.x * widthFactor;
  const projectedY = point.y - z * DEPTH_TOP_LIFT * 0.62;
  const projectedScale = 1 - z * DEPTH_SCALE_DECAY;
  return {
    x: Math.min(1, Math.max(0, projectedX)),
    y: Math.min(1, Math.max(0, projectedY)),
    scale: Math.min(1.25, Math.max(0.55, projectedScale)),
  };
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const key = src.trim();
  if (!key) return Promise.resolve(null);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const next = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = key;
  });

  imageCache.set(key, next);
  return next;
}

function sanitizeBuildNameForFileName(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "visual-build";
}

export function buildImageExportFileName(buildName: string | null | undefined): string {
  return `${sanitizeBuildNameForFileName(buildName)}-plantedtanklab.png`;
}

function downscaledSize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, MAX_CAPTURE_WIDTH / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawVariant(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  variant: "front" | "top" | "threeQuarter",
): void {
  const width = context.canvas.width;
  const height = context.canvas.height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (variant === "front") {
    context.drawImage(image, 0, 0, width, height);
    return;
  }

  if (variant === "top") {
    context.save();
    context.translate(width * 0.5, height * 0.08);
    context.transform(1, -0.32, 0, 0.74, 0, 0);
    context.drawImage(image, -width / 2, 0, width, height);
    context.restore();
    return;
  }

  context.save();
  context.translate(width * 0.03, height * 0.02);
  context.transform(0.96, 0, -0.2, 0.96, width * 0.06, 0);
  context.drawImage(image, 0, 0, width, height);
  context.restore();
}

async function captureSceneVariantDataUrl(
  sourceCanvas: HTMLCanvasElement,
  sourceImage: HTMLImageElement | null,
  variant: "front" | "top" | "threeQuarter",
): Promise<string | null> {
  const { width, height } = downscaledSize(sourceCanvas.width, sourceCanvas.height);
  if (width <= 0 || height <= 0) return null;

  const output = createCanvas(width, height);
  const context = output.getContext("2d");
  if (!context) return null;

  drawVariant(context, sourceImage ?? sourceCanvas, variant);

  try {
    return output.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function captureSceneGalleryDataUrls(
  canvas: HTMLCanvasElement | null,
): Promise<SceneGalleryDataUrls | null> {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
  let sourceDataUrl: string;
  try {
    sourceDataUrl = canvas.toDataURL("image/png");
  } catch {
    return null;
  }

  const sourceImage = await loadImage(sourceDataUrl);
  const [front, top, threeQuarter] = await Promise.all([
    captureSceneVariantDataUrl(canvas, sourceImage, "front"),
    captureSceneVariantDataUrl(canvas, sourceImage, "top"),
    captureSceneVariantDataUrl(canvas, sourceImage, "threeQuarter"),
  ]);

  if (!front || !top || !threeQuarter) return null;
  return { front, top, threeQuarter };
}

export async function captureSceneThumbnailDataUrl(
  canvas: HTMLCanvasElement | null,
): Promise<string | undefined> {
  const gallery = await captureSceneGalleryDataUrls(canvas);
  return gallery?.front;
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const fontSize = Math.max(20, Math.round(Math.min(width, height) * 0.024));
  const padding = Math.max(20, Math.round(fontSize * 0.75));
  ctx.save();
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(WATERMARK_TEXT, width - padding, height - padding);
  ctx.restore();
}

async function downloadCanvasPng(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Failed to generate PNG blob."));
        return;
      }
      resolve(nextBlob);
    }, "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportSceneCanvasPng(params: SceneCanvasExportParams): Promise<void> {
  const sourceCanvas = params.canvas;
  if (sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
    throw new Error("Unable to export scene image.");
  }

  // Capture directly from the live renderer canvas.
  const sceneDataUrl = sourceCanvas.toDataURL("image/png");
  const sceneImage = await loadImage(sceneDataUrl);

  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(sourceCanvas.width * SCENE_EXPORT_SCALE));
  output.height = Math.max(1, Math.round(sourceCanvas.height * SCENE_EXPORT_SCALE));

  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("Canvas export context unavailable.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (sceneImage) {
    ctx.drawImage(sceneImage, 0, 0, output.width, output.height);
  } else {
    ctx.drawImage(sourceCanvas, 0, 0, output.width, output.height);
  }

  drawWatermark(ctx, output.width, output.height);
  await downloadCanvasPng(output, params.fileName ?? buildImageExportFileName(params.buildName));
}

export async function exportVisualLayoutPng(params: ExportParams): Promise<void> {
  const width = 2000;
  const height = Math.round((params.tank.heightIn / params.tank.widthIn) * width);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(800, height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export context unavailable.");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0b1116");
  gradient.addColorStop(0.5, "#0f1722");
  gradient.addColorStop(1, "#0a1216");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Glass frame accent.
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  const sorted = [...params.items].sort((a, b) => (a.z - b.z) || (a.layer - b.layer));

  for (const item of sorted) {
    const asset = params.assetsById.get(item.assetId);
    if (!asset) continue;

    const img = await loadImage(asset.imageUrl);
    const projection = projectCanvasPoint({
      x: item.x,
      y: item.y,
      z: typeof item.z === "number" ? item.z : 0.5,
    });
    const drawWidth =
      (asset.widthIn / params.tank.widthIn) * canvas.width * item.scale * projection.scale;
    const drawHeight =
      (asset.heightIn / params.tank.heightIn) * canvas.height * item.scale * projection.scale;
    const cx = projection.x * canvas.width;
    const cy = projection.y * canvas.height;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((item.rotation * Math.PI) / 180);

    if (img) {
      ctx.globalAlpha = 0.98;
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = "rgba(120,160,145,0.5)";
      ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(asset.name, 0, 0);
    }

    ctx.restore();
  }

  drawWatermark(ctx, canvas.width, canvas.height);
  await downloadCanvasPng(canvas, params.fileName ?? buildImageExportFileName("visual-build"));
}
