import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { clampLightMountHeightIn } from "@/components/builder/visual/light-simulation";
import type { SceneDims } from "@/components/builder/visual/scene-utils";
import type { VisualAsset } from "@/components/builder/visual/types";

type EquipmentVisualRole = "filter" | "light" | "co2" | "heater" | "other";

type EquipmentVisualSlots = {
  filter: VisualAsset | null;
  light: VisualAsset | null;
  co2: VisualAsset | null;
  heater: VisualAsset | null;
  others: VisualAsset[];
};

type EquipmentVisualLayout = {
  waterLineY: number;
  backWallZ: number;
  sideWallX: number;
  filterAnchor: [number, number, number];
  co2Anchor: [number, number, number];
  heaterAnchor: [number, number, number];
  heaterHeight: number;
  lightAnchor: [number, number, number];
};

type EquipmentVisualsProps = {
  dims: SceneDims;
  equipmentAssets: VisualAsset[];
  lightMountHeightIn: number;
};

type ParticleSample = {
  phase: number;
  speed: number;
  wobble: number;
  wobbleFreq: number;
};

const DISABLED_MESH_RAYCAST: THREE.Mesh["raycast"] = () => undefined;
const DISABLED_POINTS_RAYCAST: THREE.Points["raycast"] = () => undefined;
const SHOW_WATER_PARTICLE_EFFECTS = false;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function equipmentVisualRoleForSlug(categorySlug: string): EquipmentVisualRole {
  const slug = categorySlug.toLowerCase();

  if (slug === "filter" || slug.includes("filter")) return "filter";
  if (slug === "light" || slug.includes("light")) return "light";
  if (slug === "co2" || slug.includes("co2") || slug.includes("carbon")) {
    return "co2";
  }
  if (slug === "heater" || slug.includes("heater")) return "heater";

  return "other";
}

export function resolveEquipmentVisualAssets(assets: VisualAsset[]): EquipmentVisualSlots {
  const slots: EquipmentVisualSlots = {
    filter: null,
    light: null,
    co2: null,
    heater: null,
    others: [],
  };

  for (const asset of assets) {
    const role = equipmentVisualRoleForSlug(asset.categorySlug);

    if (role === "filter") {
      slots.filter ??= asset;
      continue;
    }
    if (role === "light") {
      slots.light ??= asset;
      continue;
    }
    if (role === "co2") {
      slots.co2 ??= asset;
      continue;
    }
    if (role === "heater") {
      slots.heater ??= asset;
      continue;
    }

    slots.others.push(asset);
  }

  return slots;
}

export function resolveEquipmentVisualLayout(params: {
  dims: SceneDims;
  lightMountHeightIn: number;
}): EquipmentVisualLayout {
  const waterLineY = params.dims.heightIn * 0.94;
  const backWallZ = -params.dims.depthIn * 0.455;
  const sideWallX = params.dims.widthIn * 0.46;

  const filterAnchor: [number, number, number] = [
    params.dims.widthIn * 0.36,
    Math.max(1.4, Math.min(waterLineY - 0.9, params.dims.heightIn * 0.72)),
    backWallZ + 0.08,
  ];

  const co2Anchor: [number, number, number] = [
    -params.dims.widthIn * 0.34,
    Math.max(0.95, params.dims.heightIn * 0.2),
    backWallZ + 0.08,
  ];

  const heaterHeight = Math.max(2.8, params.dims.heightIn * 0.42);
  const heaterAnchor: [number, number, number] = [
    sideWallX - 0.08,
    Math.max(heaterHeight * 0.5 + 0.3, params.dims.heightIn * 0.3),
    params.dims.depthIn * 0.2,
  ];

  const lightAnchor: [number, number, number] = [
    0,
    waterLineY + clampLightMountHeightIn(params.lightMountHeightIn),
    0,
  ];

  return {
    waterLineY,
    backWallZ,
    sideWallX,
    filterAnchor,
    co2Anchor,
    heaterAnchor,
    heaterHeight,
    lightAnchor,
  };
}

function createParticleSamples(params: {
  count: number;
  seed: number;
  speedMin: number;
  speedMax: number;
  wobbleMin: number;
  wobbleMax: number;
  wobbleFrequencyMin: number;
  wobbleFrequencyMax: number;
}): ParticleSample[] {
  const random = seededRandom(params.seed);
  const samples: ParticleSample[] = [];

  for (let index = 0; index < params.count; index += 1) {
    samples.push({
      phase: random(),
      speed: THREE.MathUtils.lerp(params.speedMin, params.speedMax, random()),
      wobble: THREE.MathUtils.lerp(params.wobbleMin, params.wobbleMax, random()),
      wobbleFreq: THREE.MathUtils.lerp(
        params.wobbleFrequencyMin,
        params.wobbleFrequencyMax,
        random(),
      ),
    });
  }

  return samples;
}

function FilterFlowParticles(props: {
  dims: SceneDims;
  anchor: [number, number, number];
}) {
  const particleCount = 14;

  const particleSamples = useMemo(
    () =>
      createParticleSamples({
        count: particleCount,
        seed:
          0x4f1c2b9a ^
          Math.round(props.dims.widthIn * 43) ^
          Math.round(props.dims.depthIn * 59),
        speedMin: 0.16,
        speedMax: 0.28,
        wobbleMin: 0.008,
        wobbleMax: 0.03,
        wobbleFrequencyMin: 0.9,
        wobbleFrequencyMax: 1.8,
      }),
    [props.dims.depthIn, props.dims.widthIn],
  );

  const particleField = useMemo(
    () => ({ positions: new Float32Array(particleCount * 3) }),
    [particleCount],
  );
  const particleFieldRef = useRef(particleField);
  const positionAttributeRef = useRef<THREE.BufferAttribute>(null);

  const [anchorX, anchorY, anchorZ] = props.anchor;

  const startX = anchorX - 0.28;
  const startY = anchorY + 0.34;
  const startZ = anchorZ + 0.16;

  const controlX = anchorX - 0.68;
  const controlY = anchorY + 0.62;
  const controlZ = anchorZ + props.dims.depthIn * 0.14;

  const endX = anchorX - 1.22;
  const endY = anchorY + 0.12;
  const endZ = anchorZ + props.dims.depthIn * 0.28;

  useEffect(() => {
    particleFieldRef.current = particleField;
  }, [particleField]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const positions = particleFieldRef.current.positions;

    for (let index = 0; index < particleSamples.length; index += 1) {
      const sample = particleSamples[index];
      if (!sample) continue;

      const progress = (sample.phase + time * sample.speed) % 1;
      const oneMinus = 1 - progress;
      const offset = index * 3;
      const wobble = Math.sin(time * sample.wobbleFreq + sample.phase * Math.PI * 2) * sample.wobble;

      positions[offset] =
        oneMinus * oneMinus * startX +
        2 * oneMinus * progress * controlX +
        progress * progress * endX +
        wobble;
      positions[offset + 1] =
        oneMinus * oneMinus * startY +
        2 * oneMinus * progress * controlY +
        progress * progress * endY;
      positions[offset + 2] =
        oneMinus * oneMinus * startZ +
        2 * oneMinus * progress * controlZ +
        progress * progress * endZ;
    }

    const positionAttribute = positionAttributeRef.current;
    if (positionAttribute) {
      positionAttribute.needsUpdate = true;
    }
  });

  return (
    <points raycast={DISABLED_POINTS_RAYCAST} renderOrder={34} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[particleField.positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#b7f2ff"
        size={2.1}
        sizeAttenuation={false}
        transparent
        opacity={0.54}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function Co2Bubbles(props: {
  dims: SceneDims;
  anchor: [number, number, number];
  waterLineY: number;
}) {
  const particleCount = 16;
  const particleSamples = useMemo(
    () =>
      createParticleSamples({
        count: particleCount,
        seed:
          0x8a13d44f ^
          Math.round(props.anchor[0] * 100) ^
          Math.round(props.anchor[1] * 100) ^
          Math.round(props.anchor[2] * 100),
        speedMin: 0.09,
        speedMax: 0.18,
        wobbleMin: 0.016,
        wobbleMax: 0.06,
        wobbleFrequencyMin: 0.7,
        wobbleFrequencyMax: 1.5,
      }),
    [props.anchor],
  );

  const particleField = useMemo(
    () => ({ positions: new Float32Array(particleCount * 3) }),
    [particleCount],
  );
  const particleFieldRef = useRef(particleField);
  const positionAttributeRef = useRef<THREE.BufferAttribute>(null);

  const startY = props.anchor[1] + 0.2;
  const maxY = Math.max(startY + 0.8, props.waterLineY - 0.1);
  const riseHeight = Math.max(0.8, maxY - startY);

  useEffect(() => {
    particleFieldRef.current = particleField;
  }, [particleField]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const positions = particleFieldRef.current.positions;

    for (let index = 0; index < particleSamples.length; index += 1) {
      const sample = particleSamples[index];
      if (!sample) continue;

      const progress = (sample.phase + time * sample.speed) % 1;
      const wobblePhase = time * sample.wobbleFreq + sample.phase * Math.PI * 2;
      const offset = index * 3;

      positions[offset] = props.anchor[0] + Math.sin(wobblePhase) * sample.wobble;
      positions[offset + 1] = startY + progress * riseHeight;
      positions[offset + 2] = props.anchor[2] + Math.cos(wobblePhase * 0.8) * sample.wobble * 0.7;
    }

    const positionAttribute = positionAttributeRef.current;
    if (positionAttribute) {
      positionAttribute.needsUpdate = true;
    }
  });

  return (
    <points raycast={DISABLED_POINTS_RAYCAST} renderOrder={34} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[particleField.positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#e8f8ff"
        size={2}
        sizeAttenuation={false}
        transparent
        opacity={0.58}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function FilterVisual(props: {
  dims: SceneDims;
  anchor: [number, number, number];
}) {
  const [x, y, z] = props.anchor;

  return (
    <group>
      <mesh
        position={[x, y, z]}
        castShadow
        raycast={DISABLED_MESH_RAYCAST}
      >
        <boxGeometry args={[0.96, 1.65, 0.55]} />
        <meshStandardMaterial color="#8697ab" roughness={0.46} metalness={0.32} />
      </mesh>
      <mesh
        position={[x - 0.26, y + 0.27, z + 0.19]}
        castShadow
        raycast={DISABLED_MESH_RAYCAST}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.54, 14]} />
        <meshStandardMaterial color="#a9bfd4" roughness={0.34} metalness={0.4} />
      </mesh>
      {SHOW_WATER_PARTICLE_EFFECTS ? (
        <FilterFlowParticles dims={props.dims} anchor={props.anchor} />
      ) : null}
    </group>
  );
}

function LightFixtureVisual(props: {
  dims: SceneDims;
  anchor: [number, number, number];
}) {
  const fixtureWidth = THREE.MathUtils.clamp(props.dims.widthIn * 0.64, 10, 30);
  const fixtureDepth = THREE.MathUtils.clamp(props.dims.depthIn * 0.32, 4, 10);
  const [x, y, z] = props.anchor;

  return (
    <group>
      <mesh position={[x, y, z]} castShadow raycast={DISABLED_MESH_RAYCAST}>
        <boxGeometry args={[fixtureWidth, 0.24, fixtureDepth]} />
        <meshStandardMaterial
          color="#dbe2eb"
          roughness={0.22}
          metalness={0.6}
          emissive="#8bb3ff"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh
        position={[x, y - 0.14, z]}
        raycast={DISABLED_MESH_RAYCAST}
      >
        <boxGeometry args={[fixtureWidth * 0.92, 0.06, fixtureDepth * 0.9]} />
        <meshStandardMaterial
          color="#edf2ff"
          roughness={0.12}
          metalness={0.18}
          emissive="#d2e6ff"
          emissiveIntensity={0.24}
        />
      </mesh>
    </group>
  );
}

function Co2DiffuserVisual(props: {
  dims: SceneDims;
  anchor: [number, number, number];
  waterLineY: number;
}) {
  const [x, y, z] = props.anchor;

  return (
    <group>
      <mesh position={[x, y, z]} castShadow raycast={DISABLED_MESH_RAYCAST}>
        <cylinderGeometry args={[0.16, 0.16, 1.02, 16]} />
        <meshStandardMaterial color="#a4afbf" roughness={0.42} metalness={0.48} />
      </mesh>
      <mesh
        position={[x, y + 0.38, z + 0.08]}
        raycast={DISABLED_MESH_RAYCAST}
      >
        <cylinderGeometry args={[0.11, 0.11, 0.11, 16]} />
        <meshStandardMaterial color="#d8e4ef" roughness={0.28} metalness={0.14} />
      </mesh>
      {SHOW_WATER_PARTICLE_EFFECTS ? (
        <Co2Bubbles
          dims={props.dims}
          anchor={[x, y + 0.48, z + 0.04]}
          waterLineY={props.waterLineY}
        />
      ) : null}
    </group>
  );
}

function HeaterVisual(props: {
  anchor: [number, number, number];
  heaterHeight: number;
}) {
  const [x, y, z] = props.anchor;

  return (
    <group>
      <mesh position={[x, y, z]} castShadow raycast={DISABLED_MESH_RAYCAST}>
        <cylinderGeometry args={[0.14, 0.14, props.heaterHeight, 14]} />
        <meshStandardMaterial color="#4f5963" roughness={0.44} metalness={0.36} />
      </mesh>
      <mesh
        position={[x, y + props.heaterHeight * 0.5 - 0.14, z]}
        raycast={DISABLED_MESH_RAYCAST}
      >
        <cylinderGeometry args={[0.16, 0.16, 0.22, 14]} />
        <meshStandardMaterial color="#727f8c" roughness={0.34} metalness={0.28} />
      </mesh>
    </group>
  );
}

function GenericEquipmentVisuals(props: {
  dims: SceneDims;
  backWallZ: number;
  assets: VisualAsset[];
}) {
  if (props.assets.length === 0) return null;

  return (
    <group>
      {props.assets.map((asset, index) => {
        const laneProgress = (index + 1) / (props.assets.length + 1);
        const x = THREE.MathUtils.lerp(-props.dims.widthIn * 0.2, props.dims.widthIn * 0.2, laneProgress);
        const y = Math.max(1, props.dims.heightIn * 0.24 + (index % 2) * 0.42);

        return (
          <mesh
            key={`equipment-generic-${asset.id}`}
            position={[x, y, props.backWallZ + 0.08]}
            castShadow
            raycast={DISABLED_MESH_RAYCAST}
          >
            <boxGeometry args={[0.6, 0.9, 0.42]} />
            <meshStandardMaterial color="#96a5b8" roughness={0.5} metalness={0.32} />
          </mesh>
        );
      })}
    </group>
  );
}

export function EquipmentVisuals(props: EquipmentVisualsProps) {
  const slots = useMemo(
    () => resolveEquipmentVisualAssets(props.equipmentAssets),
    [props.equipmentAssets],
  );

  const layout = useMemo(
    () =>
      resolveEquipmentVisualLayout({
        dims: props.dims,
        lightMountHeightIn: props.lightMountHeightIn,
      }),
    [props.dims, props.lightMountHeightIn],
  );

  if (
    !slots.filter &&
    !slots.light &&
    !slots.co2 &&
    !slots.heater &&
    slots.others.length === 0
  ) {
    return null;
  }

  return (
    <group>
      {slots.filter ? (
        <FilterVisual
          dims={props.dims}
          anchor={layout.filterAnchor}
        />
      ) : null}

      {slots.light ? (
        <LightFixtureVisual
          dims={props.dims}
          anchor={layout.lightAnchor}
        />
      ) : null}

      {slots.co2 ? (
        <Co2DiffuserVisual
          dims={props.dims}
          anchor={layout.co2Anchor}
          waterLineY={layout.waterLineY}
        />
      ) : null}

      {slots.heater ? (
        <HeaterVisual
          anchor={layout.heaterAnchor}
          heaterHeight={layout.heaterHeight}
        />
      ) : null}

      <GenericEquipmentVisuals
        dims={props.dims}
        backWallZ={layout.backWallZ}
        assets={slots.others}
      />
    </group>
  );
}
