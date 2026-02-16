"use client";

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, useMemo } from "react";
import * as THREE from "three";

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

function extractPrimaryMesh(scene: THREE.Object3D): THREE.Mesh | null {
  let firstMesh: THREE.Mesh | null = null;

  scene.traverse((node) => {
    if (firstMesh) return;
    if (!(node instanceof THREE.Mesh)) return;
    if (!(node.geometry instanceof THREE.BufferGeometry)) return;
    firstMesh = node;
  });

  return firstMesh;
}

function normalizeGeometryForPlacement(source: THREE.BufferGeometry): {
  geometry: THREE.BufferGeometry;
  bounds: THREE.Vector3;
} {
  const geometry = source.clone();
  geometry.computeBoundingBox();

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

  const mesh = extractPrimaryMesh(scene);
  if (!mesh || !(mesh.geometry instanceof THREE.BufferGeometry)) {
    throw new Error(`Visual asset at '${path}' does not contain a mesh geometry.`);
  }

  const { geometry, bounds } = normalizeGeometryForPlacement(mesh.geometry);
  const material = clonePrimaryMaterial(mesh.material);

  const model: LoadedAssetModel = {
    geometry,
    material,
    bounds,
    triangleCount: countGeometryTriangles(geometry),
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
