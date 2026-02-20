"use client";

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type LoadedAssetModel = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  bounds: THREE.Vector3;
  triangleCount: number;
};

type AssetLoaderProps = {
  path: string;
  children: (model: LoadedAssetModel) => ReactNode;
};

type AssetLoaderErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
  resetKey?: string;
  onError?: (error: Error) => void;
};

type AssetLoaderErrorBoundaryState = {
  hasError: boolean;
};

const preparedModelCache = new Map<string, LoadedAssetModel>();

type MeshSource = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[] | undefined;
  bounds: THREE.Vector3;
  triangleCount: number;
  volume: number;
};

function countGeometryTriangles(geometry: THREE.BufferGeometry): number {
  const indexCount = geometry.index?.count;
  if (typeof indexCount === "number" && Number.isFinite(indexCount)) {
    return Math.max(0, Math.floor(indexCount / 3));
  }

  const positionCount = geometry.getAttribute("position")?.count;
  if (typeof positionCount === "number" && Number.isFinite(positionCount)) {
    return Math.max(0, Math.floor(positionCount / 3));
  }

  return 0;
}

function transformedMeshGeometry(mesh: THREE.Mesh): THREE.BufferGeometry | null {
  if (!(mesh.geometry instanceof THREE.BufferGeometry)) return null;
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();
  return geometry;
}

function collectMeshSources(scene: THREE.Object3D): MeshSource[] {
  const sources: MeshSource[] = [];
  scene.updateWorldMatrix(true, true);

  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = transformedMeshGeometry(node);
    if (!geometry?.boundingBox) return;

    const bounds = new THREE.Vector3();
    geometry.boundingBox.getSize(bounds);
    bounds.x = Math.max(0.001, bounds.x);
    bounds.y = Math.max(0.001, bounds.y);
    bounds.z = Math.max(0.001, bounds.z);

    sources.push({
      geometry,
      material: node.material,
      bounds,
      triangleCount: countGeometryTriangles(geometry),
      volume: bounds.x * bounds.y * bounds.z,
    });
  });

  return sources;
}

function normalizeMergeAttributes(geometries: THREE.BufferGeometry[]): void {
  const allowed = new Set(["position", "normal", "uv", "color"]);
  for (const geometry of geometries) {
    for (const key of Object.keys(geometry.attributes)) {
      if (!allowed.has(key)) {
        geometry.deleteAttribute(key);
      }
    }
  }

  const keys = ["uv", "color"] as const;
  for (const key of keys) {
    const allHave = geometries.every((geometry) => geometry.getAttribute(key) != null);
    if (allHave) continue;
    for (const geometry of geometries) {
      if (geometry.getAttribute(key) != null) {
        geometry.deleteAttribute(key);
      }
    }
  }

  for (const geometry of geometries) {
    if (geometry.getAttribute("normal") == null) {
      geometry.computeVertexNormals();
    }
  }
}

function mergeMeshSources(sources: MeshSource[]): THREE.BufferGeometry | null {
  if (sources.length === 0) return null;
  if (sources.length === 1) {
    return sources[0]?.geometry.clone() ?? null;
  }

  const geometries = sources.map((source) => source.geometry.clone());
  normalizeMergeAttributes(geometries);
  try {
    return mergeGeometries(geometries, false);
  } catch {
    return null;
  }
}

function pickLargestSource(sources: MeshSource[]): MeshSource | null {
  let largest: MeshSource | null = null;
  for (const source of sources) {
    if (!largest || source.volume > largest.volume) {
      largest = source;
    }
  }
  return largest;
}

function shouldAutoUprightPath(path: string): boolean {
  return /hardscape\/.*(wood|branch|root|spider|manzanita)/i.test(path);
}

function normalizeGeometryForPlacement(source: THREE.BufferGeometry, path: string): {
  geometry: THREE.BufferGeometry;
  bounds: THREE.Vector3;
} {
  const geometry = source.clone();
  geometry.computeBoundingBox();

  if (geometry.boundingBox && shouldAutoUprightPath(path)) {
    const size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    const needsUprightFromX = size.x > size.y * 1.25 && size.x >= size.z;
    const needsUprightFromZ = size.z > size.y * 1.25 && size.z > size.x;
    if (needsUprightFromX) {
      geometry.rotateZ(Math.PI * 0.5);
      geometry.computeBoundingBox();
    } else if (needsUprightFromZ) {
      geometry.rotateX(-Math.PI * 0.5);
      geometry.computeBoundingBox();
    }
  }

  const boundingBox = geometry.boundingBox;
  if (boundingBox) {
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    geometry.translate(-center.x, -boundingBox.min.y, -center.z);
  }

  geometry.computeBoundingBox();

  const bounds = new THREE.Vector3(1, 1, 1);
  if (geometry.boundingBox) {
    geometry.boundingBox.getSize(bounds);
    bounds.x = Math.max(0.001, bounds.x);
    bounds.y = Math.max(0.001, bounds.y);
    bounds.z = Math.max(0.001, bounds.z);
  }

  return { geometry, bounds };
}

function clonePrimaryMaterial(material: THREE.Material | THREE.Material[] | undefined): THREE.Material {
  const sourceMaterial = Array.isArray(material) ? material[0] : material;
  if (sourceMaterial instanceof THREE.Material) {
    return sourceMaterial.clone();
  }

  return new THREE.MeshStandardMaterial({
    color: "#8fb39a",
    roughness: 0.78,
    metalness: 0.04,
  });
}

function prepareModel(path: string, scene: THREE.Object3D): LoadedAssetModel {
  const cached = preparedModelCache.get(path);
  if (cached) return cached;

  const sources = collectMeshSources(scene);
  if (sources.length === 0) {
    throw new Error(`Visual asset at '${path}' does not contain a mesh geometry.`);
  }

  const mergedGeometry = mergeMeshSources(sources);
  const fallbackSource = pickLargestSource(sources);
  const sourceGeometry = mergedGeometry ?? fallbackSource?.geometry.clone();
  const sourceMaterial = fallbackSource?.material;
  if (!sourceGeometry) {
    throw new Error(`Visual asset at '${path}' could not be prepared for placement.`);
  }

  const { geometry, bounds } = normalizeGeometryForPlacement(sourceGeometry, path);
  const material = clonePrimaryMaterial(sourceMaterial);

  const model: LoadedAssetModel = {
    geometry,
    material,
    bounds,
    triangleCount: sources.reduce((sum, source) => sum + source.triangleCount, 0),
  };

  preparedModelCache.set(path, model);
  return model;
}

export function AssetLoader(props: AssetLoaderProps) {
  const gltf = useGLTF(props.path);
  const model = useMemo(() => prepareModel(props.path, gltf.scene), [gltf.scene, props.path]);
  return <>{props.children(model)}</>;
}

export class AssetLoaderErrorBoundary extends Component<
  AssetLoaderErrorBoundaryProps,
  AssetLoaderErrorBoundaryState
> {
  state: AssetLoaderErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AssetLoaderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: AssetLoaderErrorBoundaryProps) {
    if (prevProps.resetKey === this.props.resetKey) return;
    if (!this.state.hasError) return;
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function preloadVisualAsset(path: string): void {
  useGLTF.preload(path);
}
