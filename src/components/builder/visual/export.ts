import type { VisualAsset, VisualCanvasItem, VisualTank } from "@/components/builder/visual/types";

type ExportParams = {
  tank: VisualTank;
  assetsById: Map<string, VisualAsset>;
  items: VisualCanvasItem[];
  fileName?: string;
};

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

  const sorted = [...params.items].sort((a, b) => a.layer - b.layer);

  for (const item of sorted) {
    const asset = params.assetsById.get(item.assetId);
    if (!asset) continue;

    const img = await loadImage(asset.imageUrl);
    const drawWidth = (asset.widthIn / params.tank.widthIn) * canvas.width * item.scale;
    const drawHeight = (asset.heightIn / params.tank.heightIn) * canvas.height * item.scale;
    const cx = item.x * canvas.width;
    const cy = item.y * canvas.height;

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

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) {
        reject(new Error("Failed to generate PNG blob."));
        return;
      }
      resolve(b);
    }, "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = params.fileName ?? `plantedtanklab-visual-build-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
