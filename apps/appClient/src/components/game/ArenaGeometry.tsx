import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Texture } from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getProceduralBumpMap, getProceduralTexture } from "../../utils/proceduralTextures";
import { arenaPhysics, type DynamicPropDesc } from "../../utils/cannonPhysics";
import {
  MAPS,
  type LootPickup,
  type MapBox,
  type MapId,
  type MapMaterialKind,
  type MapProp,
} from "@block-shooter/shared";
import { useGameStore } from "../../stores/useGameStore";

const MATERIAL_STYLES: Record<
  MapMaterialKind,
  { color: string; roughness: number; metalness: number }
> = {
  floor_grid: { color: "#94a3b8", roughness: 0.78, metalness: 0.15 },
  concrete: { color: "#cbd5e1", roughness: 0.85, metalness: 0.06 },
  metal_dark: { color: "#64748b", roughness: 0.45, metalness: 0.55 },
  container_blue: { color: "#2563eb", roughness: 0.55, metalness: 0.35 },
  container_red: { color: "#dc2626", roughness: 0.55, metalness: 0.35 },
  crate_orange: { color: "#d97706", roughness: 0.72, metalness: 0.12 },
  cyber_glow: { color: "#1e293b", roughness: 0.3, metalness: 0.78 },
  stone_sand: { color: "#e6c99b", roughness: 0.88, metalness: 0.04 },
  brick_wall: { color: "#c96e54", roughness: 0.86, metalness: 0.04 },
  plaster_wall: { color: "#f3eadb", roughness: 0.84, metalness: 0.02 },
  wood_plank: { color: "#9e6a40", roughness: 0.78, metalness: 0.05 },
  asphalt: { color: "#768599", roughness: 0.9, metalness: 0.04 },
  grass_terrain: { color: "#6eb356", roughness: 0.94, metalness: 0.0 },
};

function PropRenderer({
  prop,
  roofTex,
  roofBump,
  woodTex,
}: {
  prop: MapProp;
  roofTex: THREE.CanvasTexture;
  roofBump: THREE.CanvasTexture;
  woodTex: THREE.CanvasTexture;
}) {
  const rotY = prop.rotY || 0;

  if (prop.kind === "house_cottage" || prop.kind === "house_two_story") {
    const rawW = prop.width || 11;
    const rawD = prop.depth || 9;
    const w = rawW + 1.4;
    const d = rawD + 1.4;
    const h = prop.height || 3.6;
    const roofBaseY = prop.kind === "house_two_story" ? h + 1.45 : h + 0.58;
    const roofHeight = prop.kind === "house_two_story" ? 2.4 : 2.1;

    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        <mesh receiveShadow position={[0, 0.12, 0]}>
          <boxGeometry args={[rawW + 0.35, 0.24, rawD + 0.35]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} />
        </mesh>
        {[
          [-rawW / 2 + 0.08, -rawD / 2 + 0.08],
          [rawW / 2 - 0.08, -rawD / 2 + 0.08],
          [-rawW / 2 + 0.08, rawD / 2 - 0.08],
          [rawW / 2 - 0.08, rawD / 2 - 0.08],
        ].map(([cx, cz], cidx) => (
          <mesh key={`corner_${cidx}`} castShadow position={[cx, roofBaseY / 2, cz]}>
            <boxGeometry args={[0.26, roofBaseY, 0.26]} />
            <meshStandardMaterial color="#5c422c" roughness={0.86} />
          </mesh>
        ))}

        <mesh position={[-1.08, 1.32, -rawD / 2 - 0.02]}>
          <boxGeometry args={[0.18, 2.6, 0.28]} />
          <meshStandardMaterial color="#5c422c" roughness={0.84} />
        </mesh>
        <mesh position={[1.08, 1.32, -rawD / 2 - 0.02]}>
          <boxGeometry args={[0.18, 2.6, 0.28]} />
          <meshStandardMaterial color="#5c422c" roughness={0.84} />
        </mesh>
        <mesh position={[0, 2.62, -rawD / 2 - 0.02]}>
          <boxGeometry args={[2.34, 0.22, 0.3]} />
          <meshStandardMaterial color="#5c422c" roughness={0.84} />
        </mesh>

        <mesh castShadow receiveShadow position={[0, roofBaseY - 0.08, 0]}>
          <boxGeometry args={[w + 0.2, 0.24, d + 0.2]} />
          <meshStandardMaterial color="#4a3525" roughness={0.85} />
        </mesh>

        <mesh
          castShadow
          receiveShadow
          position={[0, roofBaseY + roofHeight / 2, 0]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <coneGeometry args={[Math.max(w, d) * 0.72, roofHeight, 4]} />
          <meshStandardMaterial
            map={roofTex}
            bumpMap={roofBump}
            bumpScale={0.07}
            color={prop.color || "#b45309"}
            roughness={0.8}
          />
        </mesh>

        <mesh castShadow position={[w * 0.24, roofBaseY + roofHeight * 0.7, -d * 0.18]}>
          <boxGeometry args={[0.9, 1.85, 0.9]} />
          <meshStandardMaterial color="#991b1b" roughness={0.88} />
        </mesh>

        <mesh castShadow position={[0, 2.75, -rawD / 2 - 0.65]} rotation={[0.14, 0, 0]}>
          <boxGeometry args={[3.8, 0.16, 1.55]} />
          <meshStandardMaterial map={roofTex} color={prop.color || "#b45309"} roughness={0.8} />
        </mesh>
        {[-1.55, 1.55].map((px, pidx) => (
          <mesh key={pidx} castShadow position={[px, 1.42, -rawD / 2 - 1.25]}>
            <cylinderGeometry args={[0.1, 0.12, 2.65, 8]} />
            <meshStandardMaterial color="#6b4426" roughness={0.88} />
          </mesh>
        ))}

        {[-d * 0.24, d * 0.24].map((zOff, idx) => (
          <group key={idx}>
            <mesh position={[-rawW / 2 + 0.08, 1.8, zOff]}>
              <boxGeometry args={[0.14, 1.05, 1.45]} />
              <meshStandardMaterial color="#bae6fd" emissive="#fef08a" emissiveIntensity={0.25} roughness={0.2} />
            </mesh>
            <mesh position={[rawW / 2 - 0.08, 1.8, zOff]}>
              <boxGeometry args={[0.14, 1.05, 1.45]} />
              <meshStandardMaterial color="#bae6fd" emissive="#fef08a" emissiveIntensity={0.25} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (prop.kind === "tree_pine") {
    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.32, 0.45, 3.6, 7]} />
          <meshStandardMaterial color="#654321" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0, 4.2, 0]}>
          <coneGeometry args={[2.5, 3.4, 8]} />
          <meshStandardMaterial color="#236b3c" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[0, 6.0, 0]}>
          <coneGeometry args={[1.95, 2.9, 8]} />
          <meshStandardMaterial color="#2f854d" roughness={0.88} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "tree_oak") {
    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow position={[0, 1.9, 0]}>
          <cylinderGeometry args={[0.38, 0.55, 3.8, 8]} />
          <meshStandardMaterial color="#6b4423" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0, 4.8, 0]}>
          <dodecahedronGeometry args={[2.4, 0]} />
          <meshStandardMaterial color="#468c38" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[-1.1, 4.2, 0.6]}>
          <dodecahedronGeometry args={[1.4, 0]} />
          <meshStandardMaterial color="#55a344" roughness={0.88} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "vehicle_jeep" || prop.kind === "ph_car") {
    const bodyCol = prop.color || (prop.kind === "ph_car" ? "#475569" : "#4d7c0f");
    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.7, 0.1]}>
          <boxGeometry args={[2.1, 0.72, 4.1]} />
          <meshStandardMaterial color={bodyCol} roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh castShadow position={[0, 1.38, 0.25]}>
          <boxGeometry args={[1.9, 0.7, 2.25]} />
          <meshStandardMaterial color={bodyCol} roughness={0.5} metalness={0.32} />
        </mesh>
        <mesh position={[0, 1.38, -0.9]}>
          <boxGeometry args={[1.76, 0.52, 0.08]} />
          <meshStandardMaterial color="#93c5fd" roughness={0.14} metalness={0.8} />
        </mesh>
        <mesh position={[-0.75, 0.78, -2.06]}>
          <boxGeometry args={[0.25, 0.16, 0.06]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.75, 0.78, -2.06]}>
          <boxGeometry args={[0.25, 0.16, 0.06]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.2} />
        </mesh>
        {[
          [-1.08, 0.4, -1.35],
          [1.08, 0.4, -1.35],
          [-1.08, 0.4, 1.35],
          [1.08, 0.4, 1.35],
        ].map(([wx, wy, wz], idx) => (
          <mesh key={idx} castShadow position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.4, 0.4, 0.32, 12]} />
            <meshStandardMaterial color="#1f2937" roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }

  if (prop.kind === "vehicle_truck") {
    const cabCol = prop.color || "#4b5a3f";
    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow position={[0, 1.4, -2.0]}>
          <boxGeometry args={[2.7, 1.68, 2.3]} />
          <meshStandardMaterial color={cabCol} roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.68, -3.18]}>
          <boxGeometry args={[2.25, 0.65, 0.08]} />
          <meshStandardMaterial color="#93c5fd" roughness={0.15} metalness={0.85} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.82, 1.35]}>
          <boxGeometry args={[2.94, 2.2, 4.35]} />
          <meshStandardMaterial color="#8c837a" roughness={0.82} />
        </mesh>
        {[
          [-1.4, 0.48, -2.1],
          [1.4, 0.48, -2.1],
          [-1.4, 0.48, 0.6],
          [1.4, 0.48, 0.6],
          [-1.4, 0.48, 2.4],
          [1.4, 0.48, 2.4],
        ].map(([wx, wy, wz], idx) => (
          <mesh key={idx} castShadow position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.36, 12]} />
            <meshStandardMaterial color="#1f2937" roughness={0.88} />
          </mesh>
        ))}
      </group>
    );
  }

  if (prop.kind === "sandbags") {
    return (
      <group position={[prop.x, 0, prop.z]} rotation={[0, rotY, 0]}>
        {[-1.3, 0, 1.3].map((xOff, i) => (
          <group key={i}>
            <mesh castShadow position={[xOff, 0.25, 0]}>
              <capsuleGeometry args={[0.25, 0.8, 3, 7]} />
              <meshStandardMaterial color="#bfa57a" roughness={0.9} />
            </mesh>
            <mesh castShadow position={[xOff, 0.65, 0.05]}>
              <capsuleGeometry args={[0.23, 0.75, 3, 7]} />
              <meshStandardMaterial color="#b0956a" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (prop.kind === "jersey_barrier") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[2.6, 0.4, 0.85]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.86} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
          <boxGeometry args={[2.56, 0.65, 0.46]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.84} />
        </mesh>
        <mesh position={[0, 0.96, 0]}>
          <boxGeometry args={[2.58, 0.14, 0.48]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "barrel" || prop.kind === "ph_propane") {
    const col = prop.color || "#dc2626";
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 1.3, 12]} />
          <meshStandardMaterial color={col} roughness={0.48} metalness={0.42} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.44, 0.44, 0.12, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "streetlamp") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.09, 0.14, 5.2, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0.45, 5.1, 0]}>
          <boxGeometry args={[1.05, 0.12, 0.28]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0.85, 5.0, 0]}>
          <boxGeometry args={[0.38, 0.08, 0.24]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.6} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "ph_crate_wood") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[1.25, 1.2, 1.25]} />
          <meshStandardMaterial map={woodTex} color="#b58152" roughness={0.78} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.08, 1.68, -0.05]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshStandardMaterial map={woodTex} color="#c48e5d" roughness={0.78} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "ph_crate_ammo") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.35, 0.9, 0.82]} />
          <meshStandardMaterial color="#4d6b3c" roughness={0.62} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[1.38, 0.12, 0.85]} />
          <meshStandardMaterial color="#3f5930" roughness={0.55} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[1.37, 0.12, 0.24]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "ph_generator") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
          <boxGeometry args={[1.65, 1.35, 1.05]} />
          <meshStandardMaterial color="#d97706" roughness={0.52} metalness={0.42} />
        </mesh>
        <mesh position={[0.62, 0.75, 0]}>
          <boxGeometry args={[0.45, 0.88, 0.9]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.6} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "ph_rock_moss") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.75, 0]} scale={[1.4, 0.95, 1.2]}>
          <dodecahedronGeometry args={[1.15, 0]} />
          <meshStandardMaterial color="#7c8796" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "ph_tyre") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        {[0.2, 0.56, 0.92].map((yPos, idx) => (
          <mesh
            key={idx}
            castShadow
            position={[(idx - 1) * 0.08, yPos, 0]}
            rotation={[Math.PI / 2, 0, idx * 0.4]}
          >
            <torusGeometry args={[0.42, 0.16, 8, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.86} />
          </mesh>
        ))}
      </group>
    );
  }

  if (prop.kind === "ph_utility_box") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
          <boxGeometry args={[1.05, 1.7, 0.75]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.48} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.25, -0.39]}>
          <boxGeometry args={[0.55, 0.35, 0.04]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "watchtower") {
    const h = prop.height || 7.2;
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        {[
          [-1.55, -1.55],
          [1.55, -1.55],
          [-1.55, 1.55],
          [1.55, 1.55],
        ].map(([px, pz], i) => (
          <mesh key={i} castShadow receiveShadow position={[px, h / 2, pz]}>
            <boxGeometry args={[0.24, h, 0.24]} />
            <meshStandardMaterial color="#475569" roughness={0.62} metalness={0.5} />
          </mesh>
        ))}
        {/* Cross bracing */}
        <mesh position={[0, h * 0.35, -1.55]} rotation={[0, 0, 0.65]}>
          <boxGeometry args={[3.8, 0.12, 0.12]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh position={[0, h * 0.35, 1.55]} rotation={[0, 0, -0.65]}>
          <boxGeometry args={[3.8, 0.12, 0.12]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.55} />
        </mesh>
        {/* Observation Deck */}
        <mesh castShadow receiveShadow position={[0, h - 1.6, 0]}>
          <boxGeometry args={[3.8, 0.28, 3.8]} />
          <meshStandardMaterial map={woodTex} color="#8f623c" roughness={0.82} />
        </mesh>
        {/* Parapet Half-Walls */}
        <mesh castShadow position={[0, h - 0.9, -1.8]}>
          <boxGeometry args={[3.8, 1.1, 0.18]} />
          <meshStandardMaterial map={woodTex} color="#6b4b32" roughness={0.82} />
        </mesh>
        <mesh castShadow position={[0, h - 0.9, 1.8]}>
          <boxGeometry args={[3.8, 1.1, 0.18]} />
          <meshStandardMaterial map={woodTex} color="#6b4b32" roughness={0.82} />
        </mesh>
        <mesh castShadow position={[-1.8, h - 0.9, 0]}>
          <boxGeometry args={[0.18, 1.1, 3.6]} />
          <meshStandardMaterial map={woodTex} color="#6b4b32" roughness={0.82} />
        </mesh>
        <mesh castShadow position={[1.8, h - 0.9, 0]}>
          <boxGeometry args={[0.18, 1.1, 3.6]} />
          <meshStandardMaterial map={woodTex} color="#6b4b32" roughness={0.82} />
        </mesh>
        {/* Corrugated Roof */}
        <mesh castShadow receiveShadow position={[0, h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[3.2, 1.35, 4]} />
          <meshStandardMaterial map={roofTex} bumpMap={roofBump} bumpScale={0.06} color="#52525b" roughness={0.75} />
        </mesh>
        {/* Red aviation warning beacon */}
        <mesh position={[0, h + 1.35, 0]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.2} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "gas_canopy") {
    const w = prop.width || 16;
    const d = prop.depth || 9;
    const h = prop.height || 5.2;
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        {/* Main Fuel Station Canopy Slab */}
        <mesh castShadow receiveShadow position={[0, h, 0]}>
          <boxGeometry args={[w, 0.72, d]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.35} />
        </mesh>
        {/* Glowing Amber & Cyan Fascia Stripe */}
        <mesh position={[0, h, d / 2 + 0.04]}>
          <boxGeometry args={[w + 0.1, 0.34, 0.08]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.85} />
        </mesh>
        <mesh position={[0, h, -d / 2 - 0.04]}>
          <boxGeometry args={[w + 0.1, 0.34, 0.08]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.85} />
        </mesh>
        {/* 4 Support Columns */}
        {[
          [-w * 0.34, -d * 0.28],
          [w * 0.34, -d * 0.28],
          [-w * 0.34, d * 0.28],
          [w * 0.34, d * 0.28],
        ].map(([cx, cz], idx) => (
          <mesh key={idx} castShadow receiveShadow position={[cx, h / 2, cz]}>
            <boxGeometry args={[0.55, h, 0.55]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        {/* Fuel Pump Islands */}
        {[-w * 0.22, w * 0.22].map((px, idx) => (
          <group key={idx} position={[px, 0, 0]}>
            <mesh castShadow receiveShadow position={[0, 0.14, 0]}>
              <boxGeometry args={[1.6, 0.28, 3.6]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.86} />
            </mesh>
            <mesh castShadow position={[0, 1.05, -0.8]}>
              <boxGeometry args={[0.72, 1.55, 0.52]} />
              <meshStandardMaterial color="#dc2626" roughness={0.45} metalness={0.35} />
            </mesh>
            <mesh position={[0, 1.32, -0.52]}>
              <boxGeometry args={[0.52, 0.36, 0.04]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.9} />
            </mesh>
            <mesh castShadow position={[0, 1.05, 0.8]}>
              <boxGeometry args={[0.72, 1.55, 0.52]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.45} metalness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (prop.kind === "palm_tree") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        {/* Curved multi-segment palm trunk */}
        <mesh castShadow position={[0, 1.5, 0]} rotation={[0.04, 0, 0.04]}>
          <cylinderGeometry args={[0.24, 0.36, 3.0, 7]} />
          <meshStandardMaterial color="#78563a" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0.14, 4.3, 0.1]} rotation={[0.07, 0, -0.05]}>
          <cylinderGeometry args={[0.18, 0.24, 3.0, 7]} />
          <meshStandardMaterial color="#876243" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0.22, 6.7, 0.16]} rotation={[0.05, 0, -0.02]}>
          <cylinderGeometry args={[0.14, 0.18, 2.2, 7]} />
          <meshStandardMaterial color="#946c4a" roughness={0.92} />
        </mesh>
        {/* Tropical palm fronds */}
        <group position={[0.26, 7.6, 0.18]}>
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
            const ang = (idx / 7) * Math.PI * 2;
            return (
              <group key={idx} rotation={[0, ang, 0]}>
                <mesh castShadow position={[1.45, 0.15, 0]} rotation={[0, 0, -0.35]}>
                  <boxGeometry args={[2.8, 0.09, 0.55]} />
                  <meshStandardMaterial color={idx % 2 === 0 ? "#2e7d32" : "#388e3c"} roughness={0.86} />
                </mesh>
                <mesh castShadow position={[2.8, -0.45, 0]} rotation={[0, 0, -0.78]}>
                  <boxGeometry args={[1.35, 0.07, 0.36]} />
                  <meshStandardMaterial color="#43a047" roughness={0.86} />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    );
  }

  if (prop.kind === "boulder_cluster") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow position={[0, 1.05, 0]} scale={[1.65, 1.1, 1.35]}>
          <dodecahedronGeometry args={[1.25, 0]} />
          <meshStandardMaterial color="#6b7280" roughness={0.92} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.35, 0.65, 0.65]} scale={[1.1, 0.85, 1.0]}>
          <dodecahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial color="#7b8494" roughness={0.9} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.1, 0.52, -0.75]} scale={[0.95, 0.72, 1.15]}>
          <dodecahedronGeometry args={[0.85, 0]} />
          <meshStandardMaterial color="#5b6370" roughness={0.92} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "billboard") {
    return (
      <group position={[prop.x, prop.y, prop.z]} rotation={[0, rotY, 0]}>
        {/* Steel twin pillars */}
        <mesh castShadow position={[-3.2, 3.6, 0]}>
          <cylinderGeometry args={[0.24, 0.3, 7.2, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.38} />
        </mesh>
        <mesh castShadow position={[3.2, 3.6, 0]}>
          <cylinderGeometry args={[0.24, 0.3, 7.2, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.38} />
        </mesh>
        {/* Main Signboard Frame */}
        <mesh castShadow receiveShadow position={[0, 6.2, 0]}>
          <boxGeometry args={[9.4, 3.5, 0.42]} />
          <meshStandardMaterial color="#0f172a" roughness={0.45} metalness={0.5} />
        </mesh>
        {/* Glowing Highway Ad Graphic */}
        <mesh position={[0, 6.2, 0.23]}>
          <boxGeometry args={[8.9, 3.0, 0.04]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.75} roughness={0.35} />
        </mesh>
        <mesh position={[0, 6.2, -0.23]}>
          <boxGeometry args={[8.9, 3.0, 0.04]} />
          <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.65} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === "heli_pad") {
    return (
      <group position={[prop.x, prop.y + 0.08, prop.z]} rotation={[0, rotY, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[6.2, 6.5, 0.16, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[4.6, 5.15, 32]} />
          <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.35} roughness={0.6} />
        </mesh>
        {/* H Letter markings */}
        <mesh position={[-1.4, 0.11, 0]}>
          <boxGeometry args={[0.55, 0.03, 3.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
        <mesh position={[1.4, 0.11, 0]}>
          <boxGeometry args={[0.55, 0.03, 3.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[2.8, 0.03, 0.55]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
      </group>
    );
  }

  return null;
}

function DynamicPhysicsProps({
  mapId,
  woodTex,
}: {
  mapId: MapId;
  woodTex: THREE.CanvasTexture;
}) {
  const [props] = useState<DynamicPropDesc[]>(() => {
    arenaPhysics.initMap(mapId);
    return arenaPhysics.dynamicProps;
  });
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const syncedSleepingRef = useRef<boolean[]>([]);

  useFrame(() => {
    for (let i = 0; i < props.length; i++) {
      const grp = groupRefs.current[i];
      const prop = props[i];
      if (!grp || !prop) continue;

      const sleeping = arenaPhysics.isBodySleeping(prop.body);
      if (sleeping && syncedSleepingRef.current[i]) continue;

      grp.position.set(
        prop.body.position.x,
        prop.body.position.y,
        prop.body.position.z,
      );
      grp.quaternion.set(
        prop.body.quaternion.x,
        prop.body.quaternion.y,
        prop.body.quaternion.z,
        prop.body.quaternion.w,
      );
      syncedSleepingRef.current[i] = sleeping;
    }
  });

  return (
    <group>
      {props.map((prop, idx) => (
        <group
          key={prop.id}
          ref={(el) => {
            groupRefs.current[idx] = el;
          }}
          position={[
            prop.body.position.x,
            prop.body.position.y,
            prop.body.position.z,
          ]}
        >
          {prop.kind === "crate" ? (
            <mesh castShadow receiveShadow>
              <boxGeometry args={[prop.halfW * 2, prop.halfH * 2, prop.halfD * 2]} />
              <meshStandardMaterial
                map={woodTex}
                color={prop.color}
                roughness={0.76}
                metalness={0.08}
              />
            </mesh>
          ) : (
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[prop.halfW, prop.halfW, prop.halfH * 2, 12]} />
                <meshStandardMaterial color={prop.color} roughness={0.44} metalness={0.45} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[prop.halfW * 1.03, prop.halfW * 1.03, 0.12, 12]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.38} metalness={0.55} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

const RARITY_COLORS: Record<NonNullable<LootPickup["rarity"]>, string> = {
  common: "#94a3b8",
  rare: "#06b6d4",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

function LootPickupMesh({ item }: { item: LootPickup }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      if (!item.isAirdrop && !item.isDeathBox) {
        ref.current.rotation.y += 0.025;
        ref.current.position.y = item.y + 0.42 + Math.sin(state.clock.elapsedTime * 3.2 + item.x) * 0.11;
      }
    }
  });

  if (!item.active) return null;

  const colorMap: Record<LootPickup["kind"], string> = {
    medkit: "#22c55e",
    armor: "#38bdf8",
    ammo: "#eab308",
    weapon: "#a855f7",
    scope: "#06b6d4",
    attachment: "#f97316",
    airdrop: "#ef4444",
  };
  const col = item.rarity ? RARITY_COLORS[item.rarity] : colorMap[item.kind];
  const beamHeight = item.isAirdrop ? 42 : item.rarity === "legendary" ? 8.5 : item.rarity === "epic" ? 5.2 : 2.8;

  if (item.isAirdrop) {
    return (
      <group position={[item.x, item.y, item.z]}>
        {/* Heavy Military Supply Drop Crate */}
        <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
          <boxGeometry args={[1.45, 1.35, 1.45]} />
          <meshStandardMaterial color="#991b1b" roughness={0.48} metalness={0.42} />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[1.52, 0.14, 1.52]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[1.49, 0.22, 1.49]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* High-visibility red/gold airdrop flare column */}
        <mesh position={[0, beamHeight / 2 + 1.2, 0]}>
          <cylinderGeometry args={[0.14, 0.42, beamHeight, 10, 1, true]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[1.25, 1.55, 24]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
        </mesh>
      </group>
    );
  }

  if (item.isDeathBox) {
    return (
      <group position={[item.x, item.y, item.z]}>
        {/* Eliminated Enemy Tactical Death Box */}
        <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
          <boxGeometry args={[0.92, 0.56, 0.62]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[0.95, 0.08, 0.65]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[0.04, 0.18, 5.2, 8, 1, true]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.68, 0.86, 18]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.78} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[item.x, item.y, item.z]}>
      {/* Vertical rarity loot pillar */}
      <mesh position={[0, beamHeight / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.14, beamHeight, 8, 1, true]} />
        <meshBasicMaterial color={col} transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.52, 0.68, 18]} />
        <meshBasicMaterial color={col} transparent opacity={0.72} />
      </mesh>
      <group ref={ref} position={[0, 0.42, 0]}>
        {item.kind === "weapon" ? (
          <group>
            <mesh castShadow>
              <boxGeometry args={[0.96, 0.22, 0.24]} />
              <meshStandardMaterial color="#1f2937" roughness={0.38} metalness={0.62} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <boxGeometry args={[0.42, 0.08, 0.12]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} />
            </mesh>
          </group>
        ) : item.kind === "scope" || item.kind === "attachment" ? (
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.16, 0.56, 10]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.65} roughness={0.32} metalness={0.6} />
          </mesh>
        ) : (
          <mesh castShadow>
            <boxGeometry args={[0.64, 0.44, 0.64]} />
            <meshStandardMaterial
              color={col}
              emissive={col}
              emissiveIntensity={0.65}
              roughness={0.35}
              metalness={0.4}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function PerimeterHorizonProps({
  mapId,
  halfW,
  halfD,
}: {
  mapId: string;
  halfW: number;
  halfD: number;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);

  const isDesert = mapId === "outpost_02";
  const isCyber =
    mapId === "nexus_03" ||
    mapId === "titan_harbor" ||
    mapId === "aether_skyport" ||
    mapId === "crimson_foundry";

  const { treeTransforms, rockTransforms } = useMemo(() => {
    const trees: Array<{ x: number; z: number; scale: number; rotY: number }> = [];
    const rocks: Array<{ x: number; z: number; sx: number; sy: number; sz: number; rotY: number }> = [];
    const minDist = Math.max(halfW, halfD) + 8;

    for (let i = 0; i < 48; i++) {
      const s1 = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 78.233 + 1.732) * 43758.5453;
      const r2 = s2 - Math.floor(s2);

      const angle = (i / 48) * Math.PI * 2 + r1 * 0.14;
      const radius = minDist + 8 + r2 * 44;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (i % 3 === 0 || isDesert || isCyber) {
        rocks.push({
          x,
          z,
          sx: 2.2 + r1 * 4.5,
          sy: 1.4 + r2 * 3.8,
          sz: 2.0 + ((r1 + r2) % 1) * 4.2,
          rotY: r1 * Math.PI * 2,
        });
      }
      if (!isCyber && !isDesert && i % 3 !== 0) {
        trees.push({
          x,
          z,
          scale: 0.9 + r1 * 0.85,
          rotY: r2 * Math.PI * 2,
        });
      }
    }
    return { treeTransforms: trees, rockTransforms: rocks };
  }, [halfW, halfD, isDesert, isCyber]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    if (trunkRef.current && canopyRef.current) {
      treeTransforms.forEach((t, idx) => {
        dummy.position.set(t.x, -0.75 + 2.0 * t.scale, t.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        trunkRef.current!.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(t.x, -0.75 + 5.4 * t.scale, t.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        canopyRef.current!.setMatrixAt(idx, dummy.matrix);
        color.setHSL(0.36 + (idx % 5) * 0.012, 0.45, 0.28 + (idx % 3) * 0.035);
        canopyRef.current!.setColorAt(idx, color);
      });
      trunkRef.current.instanceMatrix.needsUpdate = true;
      trunkRef.current.computeBoundingSphere();
      canopyRef.current.instanceMatrix.needsUpdate = true;
      if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true;
      canopyRef.current.computeBoundingSphere();
    }

    if (rockRef.current) {
      rockTransforms.forEach((r, idx) => {
        dummy.position.set(r.x, -0.75 + r.sy * 0.35, r.z);
        dummy.rotation.set(0.15, r.rotY, 0.1);
        dummy.scale.set(r.sx, r.sy, r.sz);
        dummy.updateMatrix();
        rockRef.current!.setMatrixAt(idx, dummy.matrix);
        const shade = 0.88 + (idx % 4) * 0.06;
        color.setRGB(shade, shade, shade);
        rockRef.current!.setColorAt(idx, color);
      });
      rockRef.current.instanceMatrix.needsUpdate = true;
      if (rockRef.current.instanceColor) rockRef.current.instanceColor.needsUpdate = true;
      rockRef.current.computeBoundingSphere();
    }
  }, [treeTransforms, rockTransforms]);

  return (
    <group>
      {treeTransforms.length > 0 && (
        <>
          <instancedMesh
            ref={trunkRef}
            args={[undefined, undefined, treeTransforms.length]}
            receiveShadow
          >
            <cylinderGeometry args={[0.35, 0.5, 4.0, 6]} />
            <meshStandardMaterial color="#6b4423" roughness={0.94} />
          </instancedMesh>
          <instancedMesh
            ref={canopyRef}
            args={[undefined, undefined, treeTransforms.length]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[2.8, 6.2, 7]} />
            <meshStandardMaterial color="#2a6f3f" roughness={0.9} />
          </instancedMesh>
        </>
      )}
      {rockTransforms.length > 0 && (
        <instancedMesh
          ref={rockRef}
          args={[undefined, undefined, rockTransforms.length]}
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={isDesert ? "#cca46e" : isCyber ? "#334155" : "#7c8899"}
            roughness={0.92}
          />
        </instancedMesh>
      )}
    </group>
  );
}

const ArenaGeometry = () => {
  const mapId = useGameStore((state) => state.mapId);
  const mode = useGameStore((state) => state.mode);
  const dominationOwner = useGameStore((state) => state.dominationOwner);
  const stormZone = useGameStore((state) => state.stormZone);
  const lootPickups = useGameStore((state) => state.lootPickups);

  const currentMap = MAPS[mapId] || MAPS.royale_valley;
  const floorScale = Math.max(1, currentMap.floor.width / 100);

  const procTextures = useMemo(() => {
    const cloneWithRepeat = (
      kind: Parameters<typeof getProceduralTexture>[0],
      rx: number,
      ry: number,
    ) => {
      const t = getProceduralTexture(kind).clone();
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      return t;
    };
    const cloneBumpWithRepeat = (
      kind: Parameters<typeof getProceduralBumpMap>[0],
      rx: number,
      ry: number,
    ) => {
      const b = getProceduralBumpMap(kind).clone();
      b.repeat.set(rx, ry);
      b.needsUpdate = true;
      return b;
    };
    return {
      brick: cloneWithRepeat("brick_wall", 2, 1),
      plaster: cloneWithRepeat("plaster_wall", 2, 1),
      wood: cloneWithRepeat("wood_plank", 2, 2),
      asphalt: cloneWithRepeat("asphalt", Math.round(18 * floorScale), Math.round(18 * floorScale)),
      roadBox: cloneWithRepeat("asphalt", 4, 4),
      grass: cloneWithRepeat("grass_terrain", Math.round(22 * floorScale), Math.round(22 * floorScale)),
      sand: cloneWithRepeat("stone_sand", Math.round(14 * floorScale), Math.round(14 * floorScale)),
      concreteFloor: cloneWithRepeat("concrete", Math.round(24 * floorScale), Math.round(24 * floorScale)),
      concrete: cloneWithRepeat("concrete", 3, 2),
      metalFloor: cloneWithRepeat("metal_panel", Math.round(18 * floorScale), Math.round(18 * floorScale)),
      metal: cloneWithRepeat("metal_panel", 2, 2),
      roof: cloneWithRepeat("roof_shingle", 4, 3),
      brickBump: cloneBumpWithRepeat("brick_wall", 2, 1),
      roofBump: cloneBumpWithRepeat("roof_shingle", 4, 3),
    };
  }, [floorScale]);

  // Bright, readable ground surface textures (never dark numbered prototype grids)
  const floorTex = useMemo(() => {
    if (currentMap.floorMaterial === "grass_terrain") return procTextures.grass;
    if (currentMap.floorMaterial === "asphalt") return procTextures.asphalt;
    if (currentMap.floorMaterial === "stone_sand") return procTextures.sand;
    if (currentMap.floorMaterial === "metal_dark" || currentMap.id === "nexus_03") {
      return procTextures.metalFloor;
    }
    return procTextures.concreteFloor;
  }, [currentMap.floorMaterial, currentMap.id, procTextures]);

  const wallTex = useMemo(
    () =>
      currentMap.id === "nexus_03"
        ? procTextures.metal
        : procTextures.concrete,
    [currentMap.id, procTextures],
  );

  const renderBox = (box: MapBox) => {
    if (box.hidden) return null;
    const style = MATERIAL_STYLES[box.material] || MATERIAL_STYLES.concrete;
    let mapTex: Texture | undefined;
    let bumpTex: Texture | undefined;
    let bumpScale = 0.04;

    if (box.material === "crate_orange") mapTex = procTextures.wood;
    else if (box.material === "cyber_glow" || box.material === "metal_dark") mapTex = procTextures.metal;
    else if (box.material === "floor_grid") mapTex = procTextures.concrete;
    else if (box.material === "brick_wall") {
      mapTex = procTextures.brick;
      bumpTex = procTextures.brickBump;
      bumpScale = 0.07;
    } else if (box.material === "plaster_wall") {
      mapTex = procTextures.plaster;
    } else if (box.material === "wood_plank") {
      mapTex = procTextures.wood;
    } else if (box.material === "asphalt") {
      mapTex = procTextures.roadBox;
    } else if (box.material === "stone_sand") {
      mapTex = procTextures.sand;
    } else if (box.material === "concrete") {
      mapTex = procTextures.concrete;
    }

    return (
      <mesh
        key={box.name}
        position={[box.x, box.y, box.z]}
        receiveShadow
        castShadow={box.material !== "asphalt"}
      >
        <boxGeometry args={[box.width, box.height, box.depth]} />
        <meshStandardMaterial
          color={box.color || style.color}
          map={mapTex}
          bumpMap={bumpTex}
          bumpScale={bumpTex ? bumpScale : 0}
          roughness={style.roughness}
          metalness={style.metalness}
          emissive={box.emissive || "#000000"}
          emissiveIntensity={box.emissive ? 0.55 : 0}
        />
      </mesh>
    );
  };

  const zoneColor =
    dominationOwner === "red"
      ? "#ef4444"
      : dominationOwner === "blue"
        ? "#3b82f6"
        : "#38bdf8";

  const floorTint =
    currentMap.floorMaterial === "grass_terrain"
      ? "#7bc462"
      : currentMap.floorMaterial === "stone_sand"
        ? "#edd2a6"
        : currentMap.floorMaterial === "asphalt"
          ? "#8594a8"
          : currentMap.floorMaterial === "metal_dark"
            ? "#64748b"
            : "#dbe4ee";

  return (
    <group>
      {/* Extended Exterior Horizon Terrain Skirt & Instanced Perimeter Scenery */}
      <mesh position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[760, 760]} />
        <meshStandardMaterial
          color={
            currentMap.id === "outpost_02"
              ? "#cfa974"
              : currentMap.id === "nexus_03"
                ? "#1e293b"
                : currentMap.id === "titan_harbor"
                  ? "#1e4d6b"
                  : currentMap.id === "aether_skyport"
                    ? "#cbd5e1"
                    : currentMap.id === "crimson_foundry"
                      ? "#291918"
                      : "#5e914f"
          }
          roughness={currentMap.id === "titan_harbor" ? 0.35 : 0.94}
          metalness={currentMap.id === "titan_harbor" ? 0.2 : 0.02}
        />
      </mesh>
      <PerimeterHorizonProps
        mapId={currentMap.id}
        halfW={currentMap.floor.width / 2}
        halfD={currentMap.floor.depth / 2}
      />

      {/* Main Arena Floor — Clean, Bright, Zero Numbered Prototype Grids */}
      <mesh
        position={[currentMap.floor.x, currentMap.floor.y, currentMap.floor.z]}
        receiveShadow
      >
        <boxGeometry
          args={[
            currentMap.floor.width,
            currentMap.floor.thickness,
            currentMap.floor.depth,
          ]}
        />
        <meshStandardMaterial
          map={floorTex}
          color={floorTint}
          roughness={0.85}
          metalness={currentMap.floorMaterial === "metal_dark" ? 0.35 : 0.05}
        />
      </mesh>

      {/* Sidewalk Curbs Flanking Crossroads */}
      {(currentMap.id === "veridian_04" || currentMap.id === "compound_05") && (
        <group>
          {[-5.5, 5.5].map((xPos, i) => (
            <group key={`curb_ns_${i}`}>
              <mesh receiveShadow position={[xPos, 0.08, -32]}>
                <boxGeometry args={[0.42, 0.16, 48]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
              </mesh>
              <mesh receiveShadow position={[xPos, 0.08, 32]}>
                <boxGeometry args={[0.42, 0.16, 48]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
              </mesh>
            </group>
          ))}
          {[-5.5, 5.5].map((zPos, i) => (
            <group key={`curb_ew_${i}`}>
              <mesh receiveShadow position={[-32, 0.08, zPos]}>
                <boxGeometry args={[48, 0.16, 0.42]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
              </mesh>
              <mesh receiveShadow position={[32, 0.08, zPos]}>
                <boxGeometry args={[48, 0.16, 0.42]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Perimeter Walls */}
      {currentMap.walls.map((wall) => (
        <mesh
          key={wall.name}
          position={[wall.x, wall.y, wall.z]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[wall.width, wall.height, wall.depth]} />
          <meshStandardMaterial
            map={wallTex}
            color={currentMap.isDaylight ? "#cbd5e1" : "#475569"}
            roughness={0.78}
          />
        </mesh>
      ))}

      {/* Walkable Buildings, Roads, Stairs & Cover */}
      {currentMap.structures.map(renderBox)}

      {/* Lightweight Architectural Roofs, Trees, Vehicles & Tactical Cover */}
      <Suspense fallback={null}>
        {currentMap.props.map((prop) => (
          <PropRenderer
            key={prop.id}
            prop={prop}
            roofTex={procTextures.roof}
            roofBump={procTextures.roofBump}
            woodTex={procTextures.wood}
          />
        ))}
      </Suspense>

      {/* Dynamic Cannon-es Tactical Physics Crates & Barrels */}
      <DynamicPhysicsProps key={mapId} mapId={mapId} woodTex={procTextures.wood} />

      {/* Jump Pads */}
      {currentMap.jumpPads.map((pad) => (
        <group key={pad.id} position={[pad.x, pad.y, pad.z]}>
          <mesh receiveShadow>
            <cylinderGeometry args={[pad.radius, pad.radius * 1.15, 0.22, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[pad.radius * 0.72, pad.radius * 0.72, 0.06, 16]} />
            <meshStandardMaterial
              color={pad.color}
              emissive={pad.color}
              emissiveIntensity={2.4}
            />
          </mesh>
        </group>
      ))}

      {/* Ground Loot Pickups */}
      {lootPickups.map((item) => (
        <LootPickupMesh key={item.id} item={item} />
      ))}

      {/* Domination Capture Zone Ring */}
      {mode === "domination" && (
        <group
          position={[
            currentMap.captureZone.x,
            currentMap.captureZone.y,
            currentMap.captureZone.z,
          ]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[
                currentMap.captureZone.radius - 0.35,
                currentMap.captureZone.radius,
                40,
              ]}
            />
            <meshBasicMaterial color={zoneColor} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <circleGeometry args={[currentMap.captureZone.radius, 40]} />
            <meshBasicMaterial color={zoneColor} transparent opacity={0.14} />
          </mesh>
        </group>
      )}

      {/* Battle Royale Shrinking Storm Barrier */}
      {mode === "br" && stormZone && (
        <mesh position={[stormZone.centerX, 18, stormZone.centerZ]}>
          <cylinderGeometry
            args={[
              Math.max(4, stormZone.currentRadius),
              Math.max(4, stormZone.currentRadius),
              38,
              40,
              1,
              true,
            ]}
          />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default ArenaGeometry;
