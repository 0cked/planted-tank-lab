# Visual Builder Asset Pack Spec (v1)

This spec defines exactly what assets to provide so the design-first visual builder can render high-quality layouts.

## 1) Delivery Format

- Archive format: `.zip`
- Root folder in archive: `visual-assets-pack-v1/`
- Color profile: `sRGB IEC61966-2.1`
- Bit depth: `8-bit`
- Alpha: premultiplied alpha not allowed (straight alpha only)
- Naming: lowercase kebab-case only (no spaces)

## 2) File Types

- Hardscape and plants: transparent `.png` (required)
- Optional quality upgrades: matching `.webp` with alpha (same basename)
- Substrate textures: seamless `.png` (required), optional normal maps in `.png`
- Metadata: one `manifest.json` per folder (required)

## 3) Resolution + Canvas Standards

- Hardscape master renders:
  - `2048 x 2048` px transparent canvas
  - Object should occupy 70-90% of frame
  - Bottom of object aligned to canvas baseline
- Plant master renders:
  - `1536 x 2048` px transparent canvas (portrait)
  - Full plant silhouette visible, including roots/rhizome attachment zone if relevant
- Substrate tile textures:
  - `2048 x 2048` px seamless tile
  - No directional highlights baked in

## 4) Required Asset Sets

### 4.1 Hardscape Archetypes (required)

Provide at minimum these archetypes, each with `a`, `b`, `c` shape variants:

1. `seiryu-stone-boulder`
2. `seiryu-stone-accent`
3. `dragon-stone-ridge`
4. `dragon-stone-accent`
5. `lava-rock-cluster`
6. `spider-wood-branch`
7. `spider-wood-twig-set`
8. `manzanita-branch`
9. `mopani-root`
10. `branchwood-arch`

Expected files per archetype:

- `hardscape/<slug>/<slug>-a.png`
- `hardscape/<slug>/<slug>-b.png`
- `hardscape/<slug>/<slug>-c.png`
- `hardscape/<slug>/manifest.json`

### 4.2 Plant Visual Library (required)

Provide visuals for these growth-form groups (minimum 4 variants each):

1. Foreground carpet patches
2. Rosette foreground plants
3. Midground epiphyte clumps
4. Midground crypt clusters
5. Stem bunches (background)
6. Moss clumps / mats
7. Floating plant clusters

Expected files per group:

- `plants/<group-slug>/<group-slug>-01.png` ... `-04.png`
- `plants/<group-slug>/manifest.json`

### 4.3 Substrate Textures (required)

Provide seamless tile sets:

1. `active-soil-dark`
2. `active-soil-brown`
3. `inert-sand-light`
4. `inert-sand-dark`
5. `inert-gravel-black`
6. `inert-gravel-natural`

Expected files:

- `substrate/<slug>/albedo.png`
- `substrate/<slug>/normal.png` (optional but recommended)
- `substrate/<slug>/manifest.json`

## 5) Manifest Schema

Every folder-level `manifest.json` must include:

```json
{
  "id": "seiryu-stone-boulder",
  "displayName": "Seiryu Stone Boulder",
  "category": "hardscape",
  "pivot": { "x": 0.5, "y": 0.98 },
  "physicalSizeIn": { "width": 10.0, "height": 6.4, "depth": 6.5 },
  "defaultScale": 1.0,
  "tags": ["stone", "seiryu", "gray"],
  "license": "owned-by-plantedtanklab",
  "sourceAttribution": "artist-or-photographer-name"
}
```

Notes:

- `pivot.y` should be near bottom (`0.96-0.99`) so objects sit on substrate naturally.
- `physicalSizeIn` is used for compatibility and volume calculations.

## 6) Quality Rules

- Remove white fringes around alpha edges (no halos).
- Keep perspective consistent: side/front-ish profile, not top-down.
- No text/watermarks/logos embedded in PNG.
- Keep lighting neutral so assets blend in the canvas.

## 7) Optional “Premium” Add-ons

- Shadow matte PNG per asset (`<slug>-shadow.png`)
- Height mask PNG for future 3D extrusion (`<slug>-height.png`)
- Occlusion mask PNG (`<slug>-ao.png`)

These are optional now but will accelerate the 3D upgrade path.

