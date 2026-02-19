"use client";

import * as THREE from "three";

export type ProceduralRockFallbackType = "rounded" | "jagged" | "slate";
export type ProceduralWoodFallbackType = "spider" | "flowing";

export const PROCEDURAL_ROCK_TYPES: ProceduralRockFallbackType[] = [
  "rounded",
  "jagged",
  "slate",
];

export const PROCEDURAL_WOOD_TYPES: ProceduralWoodFallbackType[] = ["spider", "flowing"];

export type ProceduralHardscapeModel = {
  geometry: THREE.BufferGeometry;
  bounds: THREE.Vector3;
  baseColor: THREE.Color;
};

type GeometryPart = {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
};

const MODEL_CACHE = new Map<string, ProceduralHardscapeModel>();

const SIMPLEX_GRADIENTS: ReadonlyArray<[number, number, number]> = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

const SIMPLEX_F3 = 1 / 3;
const SIMPLEX_G3 = 1 / 6;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function proceduralHardscapeSeedFromString(value: string): number {
  return hashString(value || "hardscape");
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand();
}

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(randomBetween(rand, min, max + 1));
}

function composeMatrix(config: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}): THREE.Matrix4 {
  const object = new THREE.Object3D();
  object.position.set(config.position[0], config.position[1], config.position[2]);

  if (config.rotation) {
    object.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
  }

  if (config.scale) {
    object.scale.set(config.scale[0], config.scale[1], config.scale[2]);
  }

  object.updateMatrix();
  return object.matrix.clone();
}

function mergeGeometryParts(parts: GeometryPart[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];

  for (const part of parts) {
    const transformed = part.geometry.clone();
    transformed.applyMatrix4(part.matrix);

    const expanded = transformed.index ? transformed.toNonIndexed() : transformed;
    expanded.computeVertexNormals();

    const position = expanded.getAttribute("position");
    const normal = expanded.getAttribute("normal");

    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      normals.push(
        normal?.getX(index) ?? 0,
        normal?.getY(index) ?? 1,
        normal?.getZ(index) ?? 0,
      );
    }

    if (expanded !== transformed) {
      expanded.dispose();
    }
    transformed.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function normalizeGeometry(geometry: THREE.BufferGeometry): THREE.Vector3 {
  geometry.computeBoundingBox();

  const bounds = new THREE.Vector3(1, 1, 1);
  if (geometry.boundingBox) {
    const centerX = (geometry.boundingBox.min.x + geometry.boundingBox.max.x) * 0.5;
    const centerZ = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) * 0.5;
    geometry.translate(-centerX, -geometry.boundingBox.min.y, -centerZ);
    geometry.computeBoundingBox();
  }

  if (geometry.boundingBox) {
    geometry.boundingBox.getSize(bounds);
    bounds.x = Math.max(0.001, bounds.x);
    bounds.y = Math.max(0.001, bounds.y);
    bounds.z = Math.max(0.001, bounds.z);
  }

  geometry.computeBoundingSphere();
  return bounds;
}

function buildPermutation(seed: number): Uint8Array {
  const values = Array.from({ length: 256 }, (_, index) => index);
  const rand = seededRandom(seed ^ 0x9e3779b9);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    const next = values[index] ?? 0;
    values[index] = values[swapIndex] ?? 0;
    values[swapIndex] = next;
  }

  const permutation = new Uint8Array(512);
  for (let index = 0; index < permutation.length; index += 1) {
    permutation[index] = values[index & 255] ?? 0;
  }
  return permutation;
}

function simplexDot(gradient: [number, number, number], x: number, y: number, z: number): number {
  return gradient[0] * x + gradient[1] * y + gradient[2] * z;
}

function createSimplexNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const permutation = buildPermutation(seed);

  const perm = (index: number): number => permutation[index & 511] ?? 0;

  return (x: number, y: number, z: number): number => {
    const skew = (x + y + z) * SIMPLEX_F3;
    const i = Math.floor(x + skew);
    const j = Math.floor(y + skew);
    const k = Math.floor(z + skew);

    const unskew = (i + j + k) * SIMPLEX_G3;
    const x0 = x - (i - unskew);
    const y0 = y - (j - unskew);
    const z0 = z - (k - unskew);

    let i1 = 0;
    let j1 = 0;
    let k1 = 0;
    let i2 = 0;
    let j2 = 0;
    let k2 = 0;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        i2 = 1;
        j2 = 1;
      } else if (x0 >= z0) {
        i1 = 1;
        i2 = 1;
        k2 = 1;
      } else {
        k1 = 1;
        i2 = 1;
        k2 = 1;
      }
    } else if (y0 < z0) {
      k1 = 1;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      j1 = 1;
      j2 = 1;
      k2 = 1;
    } else {
      j1 = 1;
      i2 = 1;
      j2 = 1;
    }

    const x1 = x0 - i1 + SIMPLEX_G3;
    const y1 = y0 - j1 + SIMPLEX_G3;
    const z1 = z0 - k1 + SIMPLEX_G3;

    const x2 = x0 - i2 + SIMPLEX_G3 * 2;
    const y2 = y0 - j2 + SIMPLEX_G3 * 2;
    const z2 = z0 - k2 + SIMPLEX_G3 * 2;

    const x3 = x0 - 1 + SIMPLEX_G3 * 3;
    const y3 = y0 - 1 + SIMPLEX_G3 * 3;
    const z3 = z0 - 1 + SIMPLEX_G3 * 3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = perm(ii + perm(jj + perm(kk))) % 12;
    const gi1 = perm(ii + i1 + perm(jj + j1 + perm(kk + k1))) % 12;
    const gi2 = perm(ii + i2 + perm(jj + j2 + perm(kk + k2))) % 12;
    const gi3 = perm(ii + 1 + perm(jj + 1 + perm(kk + 1))) % 12;

    const t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    const t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    const t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    const t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    let n3 = 0;

    if (t0 > 0) {
      const t0Squared = t0 * t0;
      n0 = t0Squared * t0Squared * simplexDot(SIMPLEX_GRADIENTS[gi0] ?? [1, 1, 0], x0, y0, z0);
    }

    if (t1 > 0) {
      const t1Squared = t1 * t1;
      n1 = t1Squared * t1Squared * simplexDot(SIMPLEX_GRADIENTS[gi1] ?? [1, 1, 0], x1, y1, z1);
    }

    if (t2 > 0) {
      const t2Squared = t2 * t2;
      n2 = t2Squared * t2Squared * simplexDot(SIMPLEX_GRADIENTS[gi2] ?? [1, 1, 0], x2, y2, z2);
    }

    if (t3 > 0) {
      const t3Squared = t3 * t3;
      n3 = t3Squared * t3Squared * simplexDot(SIMPLEX_GRADIENTS[gi3] ?? [1, 1, 0], x3, y3, z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  };
}

function wrapHue(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function applyVertexColors(params: {
  geometry: THREE.BufferGeometry;
  baseColor: THREE.Color;
  seed: number;
  frequency: number;
  hueRange: number;
  saturationRange: number;
  lightRange: number;
  verticalLightInfluence: number;
  grainInfluence: number;
}): void {
  params.geometry.computeBoundingBox();

  const position = params.geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const noise = createSimplexNoise3D(params.seed ^ 0xa511e9b3);
  const detailNoise = createSimplexNoise3D(params.seed ^ 0x63d83595);

  const hsl = { h: 0, s: 0, l: 0 };
  params.baseColor.getHSL(hsl);

  const minY = params.geometry.boundingBox?.min.y ?? 0;
  const maxY = params.geometry.boundingBox?.max.y ?? 1;
  const yRange = Math.max(0.0001, maxY - minY);

  const color = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const yNorm = (y - minY) / yRange;

    const primary = noise(x * params.frequency, y * params.frequency, z * params.frequency);
    const secondary = detailNoise(
      x * params.frequency * 2.31 + 11.7,
      y * params.frequency * 2.31 - 7.1,
      z * params.frequency * 2.31 + 5.3,
    );
    const grain = Math.sin((x + z) * 9.3 + y * 14.1 + params.seed * 0.00073);

    const hue = wrapHue(hsl.h + primary * params.hueRange);
    const saturation = THREE.MathUtils.clamp(
      hsl.s + secondary * params.saturationRange,
      0,
      1,
    );
    const lightness = THREE.MathUtils.clamp(
      hsl.l +
        primary * params.lightRange +
        (yNorm - 0.5) * params.verticalLightInfluence +
        grain * params.grainInfluence,
      0,
      1,
    );

    color.setHSL(hue, saturation, lightness);
    const offset = index * 3;
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  params.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function rockBaseColor(type: ProceduralRockFallbackType, seed: number): THREE.Color {
  const color = new THREE.Color();
  const random = seededRandom(seed ^ 0x9f97f3f5);

  if (type === "rounded") {
    color.setHSL(0.09, 0.09, 0.43);
  } else if (type === "jagged") {
    color.setHSL(0.57, 0.11, 0.4);
  } else {
    color.setHSL(0.08, 0.06, 0.37);
  }

  color.offsetHSL(
    randomBetween(random, -0.012, 0.012),
    randomBetween(random, -0.04, 0.03),
    randomBetween(random, -0.05, 0.05),
  );

  return color;
}

function woodBaseColor(type: ProceduralWoodFallbackType, seed: number): THREE.Color {
  const color = new THREE.Color();
  const random = seededRandom(seed ^ 0x85157af5);

  if (type === "spider") {
    color.setHSL(0.08, 0.34, 0.31);
  } else {
    color.setHSL(0.085, 0.37, 0.36);
  }

  color.offsetHSL(
    randomBetween(random, -0.01, 0.01),
    randomBetween(random, -0.06, 0.04),
    randomBetween(random, -0.04, 0.04),
  );

  return color;
}

function createRockGeometry(type: ProceduralRockFallbackType, seed: number): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0xcf1bbcd5);
  const baseRadius = randomBetween(random, 0.46, 0.64);
  const detail = type === "slate" ? 1 : 2;
  const geometry = new THREE.IcosahedronGeometry(baseRadius, detail);

  const axisScaleX =
    type === "rounded"
      ? randomBetween(random, 0.96, 1.15)
      : type === "jagged"
        ? randomBetween(random, 0.88, 1.24)
        : randomBetween(random, 1.18, 1.36);
  const axisScaleY =
    type === "rounded"
      ? randomBetween(random, 0.9, 1.08)
      : type === "jagged"
        ? randomBetween(random, 0.82, 1.1)
        : randomBetween(random, 0.42, 0.62);
  const axisScaleZ =
    type === "rounded"
      ? randomBetween(random, 0.94, 1.12)
      : type === "jagged"
        ? randomBetween(random, 0.9, 1.28)
        : randomBetween(random, 0.94, 1.18);

  const roughness = type === "rounded" ? 0.14 : type === "jagged" ? 0.24 : 0.12;
  const frequency = type === "rounded" ? 1.55 : type === "jagged" ? 2.45 : 2.1;
  const ridged = type !== "rounded";

  const primaryNoise = createSimplexNoise3D(seed ^ 0x5f356495);
  const detailNoise = createSimplexNoise3D(seed ^ 0xa4896f11);

  const position = geometry.getAttribute("position");
  const vector = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vector
      .set(position.getX(index), position.getY(index), position.getZ(index))
      .set(vector.x * axisScaleX, vector.y * axisScaleY, vector.z * axisScaleZ);

    normal.copy(vector).normalize();

    const primary = primaryNoise(vector.x * frequency, vector.y * frequency, vector.z * frequency);
    const detailValue = detailNoise(
      vector.x * frequency * 2.2 + 17.9,
      vector.y * frequency * 2.2 - 5.3,
      vector.z * frequency * 2.2 + 11.4,
    );

    let displacement = primary * 0.72 + detailValue * 0.28;
    if (ridged) {
      const sign = displacement < 0 ? -1 : 1;
      displacement = sign * Math.pow(Math.abs(displacement), 0.58);
    }

    if (type === "slate") {
      const stratification = Math.sin(vector.y * 7.2 + vector.x * 1.7 + vector.z * 1.3);
      displacement += stratification * 0.08;
    }

    vector.addScaledVector(normal, displacement * roughness);
    position.setXYZ(index, vector.x, vector.y, vector.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createTwistedCylinder(params: {
  seed: number;
  height: number;
  radiusTop: number;
  radiusBottom: number;
  radialSegments: number;
  heightSegments: number;
  twist: number;
  bend: number;
  roughness: number;
  frequency: number;
}): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    params.radiusTop,
    params.radiusBottom,
    params.height,
    params.radialSegments,
    params.heightSegments,
    false,
  );

  const noise = createSimplexNoise3D(params.seed ^ 0xdb4f0b91);
  const detailNoise = createSimplexNoise3D(params.seed ^ 0x5d64f2c9);

  const position = geometry.getAttribute("position");

  for (let index = 0; index < position.count; index += 1) {
    const originalX = position.getX(index);
    const originalY = position.getY(index);
    const originalZ = position.getZ(index);

    const yNorm = originalY / params.height + 0.5;
    const twistAngle = params.twist * (yNorm - 0.5);
    const cos = Math.cos(twistAngle);
    const sin = Math.sin(twistAngle);

    let x = originalX * cos - originalZ * sin;
    let z = originalX * sin + originalZ * cos;

    x += Math.sin(yNorm * Math.PI * 1.2) * params.bend;
    z += Math.sin(yNorm * Math.PI * 0.85 + 1.05) * params.bend * 0.58;

    const radialLength = Math.hypot(x, z);
    if (radialLength > 0.0001) {
      const radialX = x / radialLength;
      const radialZ = z / radialLength;

      const bark = noise(
        x * params.frequency + 13.1,
        yNorm * params.frequency * 1.18,
        z * params.frequency - 8.2,
      );
      const knots = detailNoise(
        x * params.frequency * 2.2,
        yNorm * params.frequency * 2.6 + 17.4,
        z * params.frequency * 2.2,
      );

      const barkDelta = (bark * 0.66 + knots * 0.34) * params.roughness * (0.4 + yNorm * 0.6);
      x += radialX * barkDelta;
      z += radialZ * barkDelta;
    }

    position.setXYZ(index, x, originalY, z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createDriftwoodGeometry(type: ProceduralWoodFallbackType, seed: number): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0xf1ea5eed);

  const trunkHeight =
    type === "spider" ? randomBetween(random, 1.2, 1.54) : randomBetween(random, 1.35, 1.72);
  const trunk = createTwistedCylinder({
    seed: seed ^ 0x7f4a7c15,
    height: trunkHeight,
    radiusBottom: randomBetween(random, 0.13, 0.19),
    radiusTop: randomBetween(random, 0.055, 0.1),
    radialSegments: 10,
    heightSegments: 22,
    twist: type === "spider" ? randomBetween(random, 0.95, 1.55) : randomBetween(random, 0.38, 0.78),
    bend: type === "spider" ? randomBetween(random, 0.1, 0.2) : randomBetween(random, 0.22, 0.36),
    roughness: type === "spider" ? 0.065 : 0.05,
    frequency: type === "spider" ? 2.3 : 1.78,
  });

  const parts: GeometryPart[] = [{ geometry: trunk, matrix: new THREE.Matrix4() }];
  const branchCount = type === "spider" ? randomInt(random, 3, 4) : randomInt(random, 2, 3);

  for (let index = 0; index < branchCount; index += 1) {
    const branch = createTwistedCylinder({
      seed: seed ^ (0x3c6ef372 + index * 97),
      height: type === "spider" ? randomBetween(random, 0.62, 1.08) : randomBetween(random, 0.88, 1.34),
      radiusBottom: randomBetween(random, 0.045, 0.09),
      radiusTop: randomBetween(random, 0.01, 0.04),
      radialSegments: 8,
      heightSegments: 16,
      twist:
        type === "spider"
          ? randomBetween(random, 1.05, 1.85)
          : randomBetween(random, 0.36, 0.92),
      bend: type === "spider" ? randomBetween(random, 0.09, 0.18) : randomBetween(random, 0.2, 0.34),
      roughness: type === "spider" ? 0.052 : 0.038,
      frequency: type === "spider" ? 2.4 : 1.7,
    });

    const yaw = randomBetween(random, 0, Math.PI * 2);
    const pitch =
      type === "spider" ? randomBetween(random, -0.08, 0.68) : randomBetween(random, 0.2, 0.52);
    const roll =
      type === "spider" ? randomBetween(random, -0.34, 0.34) : randomBetween(random, -0.16, 0.16);

    const attachY =
      type === "spider"
        ? randomBetween(random, -trunkHeight * 0.08, trunkHeight * 0.34)
        : randomBetween(random, trunkHeight * 0.02, trunkHeight * 0.42);
    const radialOffset =
      type === "spider" ? randomBetween(random, 0.02, 0.12) : randomBetween(random, 0.01, 0.06);

    parts.push({
      geometry: branch,
      matrix: composeMatrix({
        position: [Math.cos(yaw) * radialOffset, attachY, Math.sin(yaw) * radialOffset],
        rotation: [pitch, yaw, roll],
      }),
    });
  }

  const merged = mergeGeometryParts(parts);

  if (type === "flowing") {
    const position = merged.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const yNorm = y / Math.max(0.001, trunkHeight) + 0.5;

      const sweepX = Math.sin(yNorm * Math.PI * 1.1) * 0.08;
      const sweepZ = Math.cos(yNorm * Math.PI * 0.8 + 0.4) * 0.05;
      position.setXYZ(index, x + sweepX, y, z + sweepZ);
    }

    position.needsUpdate = true;
    merged.computeVertexNormals();
  }

  return merged;
}

function buildRockModel(type: ProceduralRockFallbackType, seed: number): ProceduralHardscapeModel {
  const baseColor = rockBaseColor(type, seed);
  const geometry = createRockGeometry(type, seed);
  const bounds = normalizeGeometry(geometry);

  applyVertexColors({
    geometry,
    baseColor,
    seed,
    frequency: type === "jagged" ? 1.4 : 1.1,
    hueRange: type === "jagged" ? 0.014 : 0.01,
    saturationRange: type === "jagged" ? 0.07 : 0.05,
    lightRange: type === "jagged" ? 0.07 : 0.06,
    verticalLightInfluence: type === "slate" ? 0.09 : 0.06,
    grainInfluence: type === "jagged" ? 0.012 : 0.008,
  });

  return {
    geometry,
    bounds,
    baseColor,
  };
}

function buildWoodModel(type: ProceduralWoodFallbackType, seed: number): ProceduralHardscapeModel {
  const baseColor = woodBaseColor(type, seed);
  const geometry = createDriftwoodGeometry(type, seed);
  const bounds = normalizeGeometry(geometry);

  applyVertexColors({
    geometry,
    baseColor,
    seed,
    frequency: type === "spider" ? 1.65 : 1.25,
    hueRange: 0.01,
    saturationRange: type === "spider" ? 0.08 : 0.06,
    lightRange: 0.08,
    verticalLightInfluence: 0.07,
    grainInfluence: 0.018,
  });

  return {
    geometry,
    bounds,
    baseColor,
  };
}

export function getProceduralRockModel(params: {
  type: ProceduralRockFallbackType;
  seed: number;
}): ProceduralHardscapeModel {
  const key = `rock:${params.type}:${params.seed >>> 0}`;
  const cached = MODEL_CACHE.get(key);
  if (cached) return cached;

  const model = buildRockModel(params.type, params.seed);
  MODEL_CACHE.set(key, model);
  return model;
}

export function getProceduralWoodModel(params: {
  type: ProceduralWoodFallbackType;
  seed: number;
}): ProceduralHardscapeModel {
  const key = `wood:${params.type}:${params.seed >>> 0}`;
  const cached = MODEL_CACHE.get(key);
  if (cached) return cached;

  const model = buildWoodModel(params.type, params.seed);
  MODEL_CACHE.set(key, model);
  return model;
}
