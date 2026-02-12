import { NextResponse } from "next/server";

function toNumber(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export const dynamic = "force-static";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const lengthIn = clamp(toNumber(url.searchParams.get("l"), 24), 1, 300);
  const widthIn = clamp(toNumber(url.searchParams.get("w"), 14), 1, 300);
  const heightIn = clamp(toNumber(url.searchParams.get("h"), 14), 1, 300);
  const label = (url.searchParams.get("label") ?? "UNS").trim().slice(0, 24);

  const svgWidth = 1200;
  const targetHeight = (heightIn / lengthIn) * svgWidth;
  const svgHeight = Math.round(clamp(targetHeight, 420, 900));

  const depthPanePct = clamp((widthIn / lengthIn) * 32, 10, 26);
  const depthPaneWidth = (depthPanePct / 100) * svgWidth;

  const glassX = 54;
  const glassY = 34;
  const glassW = svgWidth - 108;
  const glassH = svgHeight - 84;
  const waterlineY = glassY + glassH * 0.15;
  const substrateTopLeft = glassY + glassH * 0.82;
  const substrateTopCenter = glassY + glassH * 0.74;
  const substrateTopRight = glassY + glassH * 0.8;
  const volumeGal = Math.round(((lengthIn * widthIn * heightIn) / 231) * 10) / 10;

  const dimsText = `${lengthIn.toFixed(2)} x ${widthIn.toFixed(2)} x ${heightIn.toFixed(2)} in`;
  const volText = `${volumeGal.toFixed(1)} gal`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${label} rimless tank illustration">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#eff7f6"/>
      <stop offset="100%" stop-color="#dbeee8"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dff2fb" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#b6ddef" stop-opacity="0.94"/>
    </linearGradient>
    <linearGradient id="depth-pane" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0%" stop-color="#86acbe" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#86acbe" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="substrate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c9b48d" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#8f7348" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#173236" flood-opacity="0.20"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#bg)"/>

  <g filter="url(#softShadow)">
    <rect x="${glassX}" y="${glassY}" width="${glassW}" height="${glassH}" rx="30" fill="url(#water)" stroke="#6a9099" stroke-opacity="0.82" stroke-width="6"/>
    <rect x="${glassX}" y="${glassY}" width="${glassW}" height="${glassH}" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.72" stroke-width="2"/>
    <line x1="${glassX + 18}" y1="${waterlineY}" x2="${glassX + glassW - 18}" y2="${waterlineY}" stroke="#ffffff" stroke-opacity="0.92" stroke-width="2"/>
    <rect x="${glassX + glassW - depthPaneWidth}" y="${glassY + 16}" width="${depthPaneWidth - 16}" height="${glassH - 32}" fill="url(#depth-pane)" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5"/>
    <path d="M ${glassX} ${glassY + glassH} L ${glassX} ${substrateTopLeft} C ${glassX + glassW * 0.32} ${substrateTopCenter}, ${glassX + glassW * 0.58} ${substrateTopCenter + 10}, ${glassX + glassW} ${substrateTopRight} L ${glassX + glassW} ${glassY + glassH} Z" fill="url(#substrate)"/>
  </g>

  <text x="${glassX + 24}" y="${glassY + 34}" fill="#17333a" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="30" font-weight="700">${label}</text>
  <text x="${glassX + 24}" y="${glassY + 66}" fill="#2e5962" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="21" font-weight="600">${dimsText}</text>
  <text x="${glassX + 24}" y="${glassY + 94}" fill="#3e6b74" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="18" font-weight="600">${volText}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}

