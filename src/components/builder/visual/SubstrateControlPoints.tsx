import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { SubstrateHeightfield } from "@/components/builder/visual/types";
import type { SceneDims } from "@/components/builder/visual/scene-utils";
import {
  computeControlGridDimensions,
  interpolateHeightfieldFromControlPoints,
  sampleControlPointHeights,
} from "@/lib/visual/substrate-control-grid";

type SubstrateControlPointsProps = {
  dims: SceneDims;
  heightfield: SubstrateHeightfield;
  onHeightfieldChange: (next: SubstrateHeightfield) => void;
  onStrokeStart: () => void;
  onStrokeEnd: () => void;
  onDragStateChange?: (active: boolean) => void;
};

type DragState = {
  index: number;
  pointerId: number;
  startY: number;
  startHeight: number;
  plane: THREE.Plane;
  allHeights: number[];
};

const DOT_RADIUS = 0.48;
const DOT_HIT_RADIUS = 1.05;
const DOT_MAX_HEIGHT_RATIO = 0.45;
const DOT_MIN_HEIGHT_IN = 0.2;
const DOT_EDGE_INSET_X_NORM = 0.1;
const DOT_EDGE_INSET_Z_NORM = 0.1;
const COLOR_DEFAULT = "#67b8d6";
const COLOR_HOVER = "#a8e4f8";
const COLOR_ACTIVE = "#ffffff";

function controlIndexToNormalizedPosition(index: number, count: number, edgeInsetNorm: number): number {
  if (count <= 1) return 0.5;
  const t = index / (count - 1);
  return edgeInsetNorm + t * (1 - edgeInsetNorm * 2);
}

function ControlDot(props: {
  position: [number, number, number];
  index: number;
  active: boolean;
  onDragStart: (index: number, worldY: number, pointerId: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const color = props.active ? COLOR_ACTIVE : hovered ? COLOR_HOVER : COLOR_DEFAULT;

  return (
    <group
      position={props.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        props.onDragStart(props.index, e.point.y, e.pointerId);
      }}
    >
      <mesh>
        <sphereGeometry args={[DOT_RADIUS, 14, 10]} />
        <meshStandardMaterial
          emissiveIntensity={props.active ? 0.7 : hovered ? 0.4 : 0.2}
          roughness={0.35}
          metalness={0.1}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <mesh renderOrder={100}>
        <sphereGeometry args={[DOT_HIT_RADIUS, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

export function SubstrateControlPoints(props: SubstrateControlPointsProps) {
  const {
    dims,
    heightfield,
    onHeightfieldChange,
    onStrokeStart,
    onStrokeEnd,
    onDragStateChange,
  } = props;
  const { camera, gl } = useThree();
  const dragRef = useRef<DragState | null>(null);
  const [activeDotIndex, setActiveDotIndex] = useState<number | null>(null);

  const { cols, rows } = useMemo(
    () => computeControlGridDimensions(dims.widthIn, dims.depthIn),
    [dims.widthIn, dims.depthIn],
  );

  const controlHeights = useMemo(
    () =>
      sampleControlPointHeights({
        heightfield,
        cols,
        rows,
        tankHeightIn: dims.heightIn,
        edgeInsetXNorm: DOT_EDGE_INSET_X_NORM,
        edgeInsetZNorm: DOT_EDGE_INSET_Z_NORM,
      }),
    [heightfield, cols, rows, dims.heightIn],
  );

  const dotPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const halfW = dims.widthIn * 0.5;
    const halfD = dims.depthIn * 0.5;

    for (let r = 0; r < rows; r++) {
      const nz = controlIndexToNormalizedPosition(r, rows, DOT_EDGE_INSET_Z_NORM);
      for (let c = 0; c < cols; c++) {
        const nx = controlIndexToNormalizedPosition(c, cols, DOT_EDGE_INSET_X_NORM);
        const x = -halfW + nx * dims.widthIn;
        const z = -halfD + nz * dims.depthIn;
        const y = controlHeights[r * cols + c] ?? 0;
        positions.push([x, y, z]);
      }
    }

    return positions;
  }, [cols, rows, dims.widthIn, dims.depthIn, controlHeights]);

  const handleDragStart = useCallback(
    (index: number, worldY: number, pointerId: number) => {
      // Build a vertical plane through the dot position, facing the camera
      const dotPos = dotPositions[index];
      if (!dotPos) return;

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      // Use only XZ component for the plane normal so the plane is vertical
      camDir.y = 0;
      camDir.normalize();
      if (camDir.lengthSq() < 0.001) {
        camDir.set(0, 0, 1);
      }

      const plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(camDir, new THREE.Vector3(dotPos[0], dotPos[1], dotPos[2]));

      dragRef.current = {
        index,
        pointerId,
        startY: worldY,
        startHeight: controlHeights[index] ?? 0,
        plane,
        allHeights: [...controlHeights],
      };

      setActiveDotIndex(index);
      onDragStateChange?.(true);
      onStrokeStart();
    },
    [dotPositions, controlHeights, camera, onStrokeStart, onDragStateChange],
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;

      // Project pointer to the drag plane
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      const intersection = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(drag.plane, intersection);
      if (!hit) return;

      const deltaY = intersection.y - drag.startY;
      const maxHeight = dims.heightIn * DOT_MAX_HEIGHT_RATIO;
      const newHeight = Math.max(DOT_MIN_HEIGHT_IN, Math.min(maxHeight, drag.startHeight + deltaY));

      const nextHeights = [...drag.allHeights];
      nextHeights[drag.index] = newHeight;

      const nextHeightfield = interpolateHeightfieldFromControlPoints({
        heights: nextHeights,
        cols,
        rows,
        tankHeightIn: dims.heightIn,
        edgeInsetXNorm: DOT_EDGE_INSET_X_NORM,
        edgeInsetZNorm: DOT_EDGE_INSET_Z_NORM,
      });

      onHeightfieldChange(nextHeightfield);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      if (e.pointerId !== dragRef.current.pointerId) return;
      dragRef.current = null;
      setActiveDotIndex(null);
      onDragStateChange?.(false);
      onStrokeEnd();
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);

      if (dragRef.current) {
        dragRef.current = null;
        onDragStateChange?.(false);
      }
    };
  }, [gl, camera, cols, rows, dims.heightIn, onHeightfieldChange, onStrokeEnd, onDragStateChange]);

  return (
    <group renderOrder={100}>
      {dotPositions.map((position, index) => (
        <ControlDot
          key={`${index}`}
          position={position}
          index={index}
          active={activeDotIndex === index}
          onDragStart={handleDragStart}
        />
      ))}
    </group>
  );
}
