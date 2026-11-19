import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useGameStore } from "../../stores/useGameStore";

function TracerLine({
  from,
  to,
  color,
  hitSurface,
  createdAt,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  hitSurface: boolean;
  createdAt: number;
}) {
  const slugRef = useRef<THREE.Mesh>(null);
  const tailMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { start, end, mid, quaternion, length } = useMemo(() => {
    const s = new THREE.Vector3(...from);
    const e = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = Math.max(0.15, dir.length());
    const m = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { start: s, end: e, mid: m, quaternion: q, length: len };
  }, [from, to]);

  const slugPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const ageMs = Date.now() - createdAt;
    // Fast ballistic bullet slug exits muzzle & streaks to target across first 85ms
    const travelT = Math.min(1, Math.max(0, ageMs / 85));
    const fadeT = Math.min(1, Math.max(0, ageMs / 210));
    if (slugRef.current) {
      slugPos.lerpVectors(start, end, travelT);
      slugRef.current.position.copy(slugPos);
      slugRef.current.visible = travelT < 1;
    }
    if (tailMatRef.current) {
      tailMatRef.current.opacity = Math.max(0, (1 - fadeT) * 0.72);
    }
  });

  return (
    <group>
      {/* Traveling glowing bullet slug exiting muzzle */}
      <mesh ref={slugRef} position={from} quaternion={quaternion}>
        <capsuleGeometry args={[0.026, 0.42, 4, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Fading ballistic air trail */}
      <mesh position={mid} quaternion={quaternion}>
        <cylinderGeometry args={[0.014, 0.008, length, 5]} />
        <meshBasicMaterial ref={tailMatRef} color={color} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      {hitSurface && (
        <mesh position={to}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

function MuzzleFlashBurst({
  x,
  y,
  z,
  color,
  createdAt,
}: {
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const flareMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const t = Math.min(1, Math.max(0, (Date.now() - createdAt) / 95));
    const s = 1.15 - t * 0.65;
    const opacity = Math.max(0, 1 - t);
    if (groupRef.current) {
      groupRef.current.scale.setScalar(s);
    }
    if (coreMatRef.current) coreMatRef.current.opacity = opacity;
    if (flareMatRef.current) flareMatRef.current.opacity = opacity * 0.72;
  });

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          ref={coreMatRef}
          color="#fffbeb"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial
          ref={flareMatRef}
          color={color}
          transparent
          opacity={0.72}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

const SPARK_DIRS: Array<[number, number, number]> = [
  [0.95, 0.45, 0.25],
  [-0.85, 0.6, 0.35],
  [0.3, 0.9, -0.75],
  [-0.4, 0.3, -0.92],
  [0.65, -0.25, 0.7],
  [-0.7, -0.15, -0.55],
];

function HitSparkBurst({
  x,
  y,
  z,
  color,
  isHeadshot,
  isArmorBreak,
  createdAt,
}: {
  x: number;
  y: number;
  z: number;
  color: string;
  isHeadshot: boolean;
  isArmorBreak?: boolean;
  createdAt: number;
}) {
  const shardRefs = useRef<Array<THREE.Mesh | null>>([]);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const dur = isHeadshot || isArmorBreak ? 440 : 340;
    const age = Math.min(1, Math.max(0, (Date.now() - createdAt) / dur));
    const spread = (isArmorBreak ? 1.65 : isHeadshot ? 1.45 : 0.85) * age;
    const scale = Math.max(0.01, (1 - age) * (isArmorBreak ? 1.7 : isHeadshot ? 1.65 : 1.0));
    SPARK_DIRS.forEach(([dx, dy, dz], i) => {
      const m = shardRefs.current[i];
      if (!m) return;
      m.position.set(
        dx * spread,
        dy * spread - age * age * 0.58,
        dz * spread,
      );
      m.scale.setScalar(scale);
    });
    if (ringRef.current && ringMatRef.current) {
      const rs = 0.25 + age * 1.55;
      ringRef.current.scale.setScalar(rs);
      ringMatRef.current.opacity = Math.max(0, (1 - age) * 0.88);
    }
  });

  const shardColor = isArmorBreak ? "#22d3ee" : isHeadshot ? "#fde047" : color;

  return (
    <group position={[x, y, z]}>
      {SPARK_DIRS.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            shardRefs.current[idx] = el;
          }}
        >
          <octahedronGeometry args={[isArmorBreak ? 0.095 : isHeadshot ? 0.08 : 0.06, 0]} />
          <meshBasicMaterial
            color={shardColor}
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {(isHeadshot || isArmorBreak) && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.54, 16]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color={isArmorBreak ? "#06b6d4" : "#fbbf24"}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

function ShellCasingMesh({
  x,
  y,
  z,
  vx,
  vy,
  vz,
  isShotgun,
  createdAt,
}: {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  isShotgun?: boolean;
  createdAt: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const t = Math.max(0, (Date.now() - createdAt) / 1000);
    const px = x + vx * t;
    let py = y + vy * t - 4.9 * t * t;
    const pz = z + vz * t;
    if (py < 0.04) {
      py = 0.04 + Math.abs(Math.sin(t * 14)) * 0.04 * Math.max(0, 1 - t);
    }
    ref.current.position.set(px, py, pz);
    ref.current.rotation.set(t * 18, t * 22, t * 14);
  });

  return (
    <mesh ref={ref} position={[x, y, z]}>
      <cylinderGeometry args={[isShotgun ? 0.016 : 0.009, isShotgun ? 0.016 : 0.009, isShotgun ? 0.065 : 0.042, 6]} />
      <meshStandardMaterial
        color={isShotgun ? "#dc2626" : "#eab308"}
        metalness={isShotgun ? 0.28 : 0.88}
        roughness={isShotgun ? 0.45 : 0.22}
      />
    </mesh>
  );
}

function FloatingDamageNumber({
  x,
  y,
  z,
  amount,
  isHeadshot,
  isFromLocal,
  createdAt,
}: {
  x: number;
  y: number;
  z: number;
  amount: number;
  isHeadshot: boolean;
  isFromLocal?: boolean;
  createdAt: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const t = Math.min(1, Math.max(0, (Date.now() - createdAt) / 760));
    if (groupRef.current) {
      const yOffset = isFromLocal ? t * 1.15 : 0.55 - t * 0.95;
      groupRef.current.position.set(x, y + yOffset, z);
    }
    if (labelRef.current) {
      labelRef.current.style.opacity = `${Math.max(0, 1 - Math.pow(t, 1.8))}`;
      const baseScale = isHeadshot ? 1.32 - t * 0.2 : 1.0 - t * 0.14;
      labelRef.current.style.transform = `scale(${baseScale})`;
    }
  });

  const rounded = Math.round(amount);
  const text = isFromLocal
    ? isHeadshot
      ? `+${rounded} HS!`
      : `+${rounded}`
    : isHeadshot
      ? `-${rounded} CRIT`
      : `-${rounded}`;

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <Html center distanceFactor={13} style={{ pointerEvents: "none" }}>
        <div
          ref={labelRef}
          className={`px-1.5 py-0.5 font-black tracking-wider select-none whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${
            isFromLocal
              ? isHeadshot
                ? "text-amber-300 text-base"
                : "text-emerald-300 text-xs"
              : isHeadshot
                ? "text-rose-400 text-sm"
                : "text-rose-500 text-xs"
          }`}
        >
          {text}
        </div>
      </Html>
    </group>
  );
}

function ExplosionSphere({
  x,
  y,
  z,
  radius,
  color,
  createdAt,
}: {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  createdAt: number;
}) {
  const wireMeshRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const age = (Date.now() - createdAt) / 750;
    const scale = Math.max(0.1, Math.min(1, age * 2.2) * radius);
    const opacity = Math.max(0, 1 - age);

    if (wireMeshRef.current) wireMeshRef.current.scale.setScalar(scale);
    if (coreMeshRef.current) coreMeshRef.current.scale.setScalar(scale * 0.65);
    if (ringMeshRef.current) ringMeshRef.current.scale.setScalar(scale * 1.15);
    if (wireMatRef.current) wireMatRef.current.opacity = opacity * 0.5;
    if (coreMatRef.current) coreMatRef.current.opacity = opacity * 0.85;
    if (ringMatRef.current) ringMatRef.current.opacity = opacity * 0.65;
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={wireMeshRef}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial ref={wireMatRef} color={color} transparent opacity={0.5} wireframe />
      </mesh>
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial ref={coreMatRef} color="#fef08a" transparent opacity={0.85} />
      </mesh>
      <mesh ref={ringMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 1.0, 20]} />
        <meshBasicMaterial ref={ringMatRef} color={color} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function CombatVFX() {
  const tracers = useGameStore((state) => state.tracers);
  const explosions = useGameStore((state) => state.explosions);
  const muzzleFlashes = useGameStore((state) => state.muzzleFlashes);
  const hitSparks = useGameStore((state) => state.hitSparks);
  const damagePopups = useGameStore((state) => state.damagePopups);
  const shellCasings = useGameStore((state) => state.shellCasings);
  const pruneVfx = useGameStore((state) => state.pruneVfx);

  useEffect(() => {
    const id = setInterval(pruneVfx, 90);
    return () => clearInterval(id);
  }, [pruneVfx]);

  return (
    <group>
      {tracers.map((t) => (
        <TracerLine
          key={t.id}
          from={t.from}
          to={t.to}
          color={t.color}
          hitSurface={t.hitSurface}
          createdAt={t.createdAt}
        />
      ))}
      {muzzleFlashes.map((m) => (
        <MuzzleFlashBurst
          key={m.id}
          x={m.x}
          y={m.y}
          z={m.z}
          color={m.color}
          createdAt={m.createdAt}
        />
      ))}
      {hitSparks.map((s) => (
        <HitSparkBurst
          key={s.id}
          x={s.x}
          y={s.y}
          z={s.z}
          color={s.color}
          isHeadshot={s.isHeadshot}
          isArmorBreak={s.isArmorBreak}
          createdAt={s.createdAt}
        />
      ))}
      {shellCasings.map((c) => (
        <ShellCasingMesh
          key={c.id}
          x={c.x}
          y={c.y}
          z={c.z}
          vx={c.vx}
          vy={c.vy}
          vz={c.vz}
          isShotgun={c.isShotgun}
          createdAt={c.createdAt}
        />
      ))}
      {damagePopups.map((d) => (
        <FloatingDamageNumber
          key={d.id}
          x={d.x}
          y={d.y}
          z={d.z}
          amount={d.amount}
          isHeadshot={d.isHeadshot}
          isFromLocal={d.isFromLocal}
          createdAt={d.createdAt}
        />
      ))}
      {explosions.map((e) => (
        <ExplosionSphere
          key={e.id}
          x={e.x}
          y={e.y}
          z={e.z}
          radius={e.radius}
          color={e.color}
          createdAt={e.createdAt}
        />
      ))}
    </group>
  );
}
