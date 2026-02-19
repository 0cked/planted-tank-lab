"use client";

import * as THREE from "three";

import type { ProceduralPlantFallbackType } from "@/components/builder/visual/useAsset";

export const PROCEDURAL_PLANT_TYPES: ProceduralPlantFallbackType[] = [
  "rosette",
  "stem",
  "moss",
  "carpet",
  "floating",
];

export type ProceduralPlantModel = {
  geometry: THREE.BufferGeometry;
  bounds: THREE.Vector3;
  baseColor: THREE.Color;
};

type GeometryPart = {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  matrix: THREE.Matrix4;
};

const MODEL_CACHE = new Map<string, ProceduralPlantModel>();

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function proceduralPlantSeedFromString(value: string): number {
  return hashString(value || "plant");
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
  const [x, y, z] = config.position;
  object.position.set(x, y, z);

  if (config.rotation) {
    const [rx, ry, rz] = config.rotation;
    object.rotation.set(rx, ry, rz);
  }

  if (config.scale) {
    const [sx, sy, sz] = config.scale;
    object.scale.set(sx, sy, sz);
  }

  object.updateMatrix();
  return object.matrix.clone();
}

function withColorVariation(baseColor: THREE.Color, rand: () => number, lightBias = 0): THREE.Color {
  const color = baseColor.clone();
  color.offsetHSL(
    randomBetween(rand, -0.025, 0.025),
    randomBetween(rand, -0.08, 0.06),
    randomBetween(rand, -0.08, 0.06) + lightBias,
  );
  return color;
}

function mergeParts(parts: GeometryPart[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

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
      colors.push(part.color.r, part.color.g, part.color.b);
    }

    if (expanded !== transformed) {
      expanded.dispose();
    }
    transformed.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
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

function colorForType(type: ProceduralPlantFallbackType, seed: number): THREE.Color {
  const random = seededRandom(seed ^ 0x9e3779b9);

  const base = new THREE.Color();
  if (type === "rosette") {
    base.setHSL(0.33, 0.42, 0.36);
  } else if (type === "stem") {
    base.setHSL(0.31, 0.44, 0.39);
  } else if (type === "moss") {
    base.setHSL(0.35, 0.5, 0.29);
  } else if (type === "carpet") {
    base.setHSL(0.29, 0.48, 0.41);
  } else {
    base.setHSL(0.27, 0.52, 0.43);
  }

  base.offsetHSL(
    randomBetween(random, -0.02, 0.02),
    randomBetween(random, -0.06, 0.05),
    randomBetween(random, -0.04, 0.04),
  );

  return base;
}

function createRosetteGeometry(seed: number, baseColor: THREE.Color): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0x511e9d73);
  const leafCount = randomInt(random, 10, 16);

  const parts: GeometryPart[] = [];
  for (let index = 0; index < leafCount; index += 1) {
    const angle = (index / leafCount) * Math.PI * 2 + randomBetween(random, -0.14, 0.14);
    const length = randomBetween(random, 0.75, 1.28);
    const width = randomBetween(random, 0.09, 0.16);
    const thickness = randomBetween(random, 0.03, 0.07);

    parts.push({
      geometry: new THREE.SphereGeometry(0.5, 8, 12),
      matrix: composeMatrix({
        position: [Math.cos(angle) * 0.06, length * 0.5, Math.sin(angle) * 0.06],
        rotation: [randomBetween(random, -0.15, 0.18), angle, randomBetween(random, 0.45, 0.92)],
        scale: [width, length, thickness],
      }),
      color: withColorVariation(baseColor, random),
    });
  }

  parts.push({
    geometry: new THREE.SphereGeometry(0.12, 8, 8),
    matrix: composeMatrix({
      position: [0, 0.08, 0],
      scale: [1, 0.8, 1],
    }),
    color: withColorVariation(baseColor, random, -0.08),
  });

  return mergeParts(parts);
}

function createStemGeometry(seed: number, baseColor: THREE.Color): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0x3f2d7ea4);

  const stalkHeight = randomBetween(random, 0.95, 1.34);
  const stalkRadius = randomBetween(random, 0.04, 0.065);
  const stalkColor = withColorVariation(baseColor, random, -0.08);

  const parts: GeometryPart[] = [
    {
      geometry: new THREE.CylinderGeometry(stalkRadius * 0.78, stalkRadius, stalkHeight, 8, 1),
      matrix: composeMatrix({
        position: [0, stalkHeight * 0.5, 0],
      }),
      color: stalkColor,
    },
  ];

  const pairCount = randomInt(random, 4, 8);
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const y = stalkHeight * randomBetween(random, 0.16, 0.88);
    const baseAngle = randomBetween(random, 0, Math.PI * 2);

    for (let side = 0; side < 2; side += 1) {
      const angle = baseAngle + side * Math.PI + randomBetween(random, -0.22, 0.22);
      const leafWidth = randomBetween(random, 0.08, 0.13);
      const leafHeight = randomBetween(random, 0.24, 0.38);
      const radialOffset = randomBetween(random, 0.08, 0.12);

      parts.push({
        geometry: new THREE.PlaneGeometry(leafWidth, leafHeight, 1, 1),
        matrix: composeMatrix({
          position: [Math.cos(angle) * radialOffset, y, Math.sin(angle) * radialOffset],
          rotation: [randomBetween(random, -0.35, 0.35), angle + Math.PI * 0.5, randomBetween(random, -0.28, 0.28)],
        }),
        color: withColorVariation(baseColor, random, 0.02),
      });
    }
  }

  return mergeParts(parts);
}

function pseudoNoise3(x: number, y: number, z: number, seed: number): number {
  const value = Math.sin(x * 13.732 + y * 74.233 + z * 37.951 + seed * 0.1931) * 43758.5453;
  const wrapped = value - Math.floor(value);
  return wrapped * 2 - 1;
}

function displaceIcosahedron(
  geometry: THREE.IcosahedronGeometry,
  seed: number,
  strength: number,
): THREE.IcosahedronGeometry {
  const position = geometry.getAttribute("position");
  const vector = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vector.set(position.getX(index), position.getY(index), position.getZ(index));
    const length = Math.max(0.0001, vector.length());
    const normalX = vector.x / length;
    const normalY = vector.y / length;
    const normalZ = vector.z / length;
    const noise = pseudoNoise3(vector.x * 2.2, vector.y * 2.2, vector.z * 2.2, seed + index * 0.12);
    const delta = strength * noise;

    position.setXYZ(
      index,
      vector.x + normalX * delta,
      vector.y + normalY * delta,
      vector.z + normalZ * delta,
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createMossGeometry(seed: number, baseColor: THREE.Color): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0x7c4a62b1);
  const parts: GeometryPart[] = [];
  const blobCount = randomInt(random, 6, 10);

  for (let index = 0; index < blobCount; index += 1) {
    const radius = randomBetween(random, 0.12, 0.24);
    const blob = displaceIcosahedron(new THREE.IcosahedronGeometry(radius, 1), seed + index * 17, radius * 0.18);

    parts.push({
      geometry: blob,
      matrix: composeMatrix({
        position: [
          randomBetween(random, -0.32, 0.32),
          randomBetween(random, 0.08, 0.3),
          randomBetween(random, -0.32, 0.32),
        ],
        rotation: [
          randomBetween(random, -0.4, 0.4),
          randomBetween(random, 0, Math.PI * 2),
          randomBetween(random, -0.4, 0.4),
        ],
      }),
      color: withColorVariation(baseColor, random, -0.02),
    });
  }

  return mergeParts(parts);
}

function createCarpetGeometry(seed: number, baseColor: THREE.Color): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0x2de0b49f);

  const parts: GeometryPart[] = [
    {
      geometry: new THREE.CylinderGeometry(0.62, 0.66, 0.08, 18, 1),
      matrix: composeMatrix({
        position: [0, 0.04, 0],
      }),
      color: withColorVariation(baseColor, random, -0.1),
    },
  ];

  const grid = randomInt(random, 6, 8);
  for (let xIndex = 0; xIndex < grid; xIndex += 1) {
    for (let zIndex = 0; zIndex < grid; zIndex += 1) {
      const xNorm = xIndex / Math.max(1, grid - 1);
      const zNorm = zIndex / Math.max(1, grid - 1);
      const x = (xNorm - 0.5) * 1.02;
      const z = (zNorm - 0.5) * 1.02;

      if (Math.hypot(x, z) > randomBetween(random, 0.45, 0.58)) {
        continue;
      }

      const leafWidth = randomBetween(random, 0.035, 0.065);
      const leafHeight = randomBetween(random, 0.16, 0.26);

      parts.push({
        geometry: new THREE.PlaneGeometry(leafWidth, leafHeight, 1, 1),
        matrix: composeMatrix({
          position: [
            x + randomBetween(random, -0.03, 0.03),
            randomBetween(random, 0.06, 0.14),
            z + randomBetween(random, -0.03, 0.03),
          ],
          rotation: [
            randomBetween(random, -0.2, 0.2),
            randomBetween(random, 0, Math.PI * 2),
            randomBetween(random, -0.16, 0.16),
          ],
        }),
        color: withColorVariation(baseColor, random, 0.04),
      });
    }
  }

  return mergeParts(parts);
}

function createFloatingGeometry(seed: number, baseColor: THREE.Color): THREE.BufferGeometry {
  const random = seededRandom(seed ^ 0x61c88647);

  const parts: GeometryPart[] = [
    {
      geometry: new THREE.CylinderGeometry(0.3, 0.34, 0.05, 16, 1),
      matrix: composeMatrix({ position: [0, 0.05, 0] }),
      color: withColorVariation(baseColor, random, 0.04),
    },
  ];

  const leafCount = randomInt(random, 9, 14);
  for (let index = 0; index < leafCount; index += 1) {
    const angle = (index / leafCount) * Math.PI * 2 + randomBetween(random, -0.12, 0.12);
    const radius = randomBetween(random, 0.2, 0.48);
    const leafRadius = randomBetween(random, 0.07, 0.12);

    parts.push({
      geometry: new THREE.CircleGeometry(leafRadius, 10),
      matrix: composeMatrix({
        position: [Math.cos(angle) * radius, randomBetween(random, 0.06, 0.09), Math.sin(angle) * radius],
        rotation: [Math.PI * 0.5 + randomBetween(random, -0.08, 0.08), angle, 0],
      }),
      color: withColorVariation(baseColor, random, 0.06),
    });
  }

  return mergeParts(parts);
}

function createGeometryForType(
  type: ProceduralPlantFallbackType,
  seed: number,
  baseColor: THREE.Color,
): THREE.BufferGeometry {
  if (type === "rosette") {
    return createRosetteGeometry(seed, baseColor);
  }
  if (type === "stem") {
    return createStemGeometry(seed, baseColor);
  }
  if (type === "moss") {
    return createMossGeometry(seed, baseColor);
  }
  if (type === "carpet") {
    return createCarpetGeometry(seed, baseColor);
  }
  return createFloatingGeometry(seed, baseColor);
}

export function getProceduralPlantModel(params: {
  type: ProceduralPlantFallbackType;
  seed: number;
}): ProceduralPlantModel {
  const key = `${params.type}:${params.seed >>> 0}`;
  const cached = MODEL_CACHE.get(key);
  if (cached) return cached;

  const baseColor = colorForType(params.type, params.seed);
  const geometry = createGeometryForType(params.type, params.seed, baseColor);
  const bounds = normalizeGeometry(geometry);

  const model: ProceduralPlantModel = {
    geometry,
    bounds,
    baseColor,
  };

  MODEL_CACHE.set(key, model);
  return model;
}
