import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  WEAPONS,
  WEAPON_ORDER,
  type SkinId,
  type WeaponId,
} from "@block-shooter/shared";
import { WeaponModel3D } from "./WeaponModels3D";
import { soundEngine } from "../../utils/soundEngine";
import { Crosshair, Flame, Maximize2, Pause, Play, RotateCw, X } from "lucide-react";

interface WeaponStageProps {
  weaponId: WeaponId;
  skinId: SkinId;
  autoRotate: boolean;
  kickTrigger: number;
}

function WeaponTurntable({
  weaponId,
  skinId,
  autoRotate,
  kickTrigger,
}: WeaponStageProps) {
  const rootRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);
  const lastKickHandled = useRef(0);
  const kickProgress = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (kickTrigger !== lastKickHandled.current) {
      lastKickHandled.current = kickTrigger;
      kickProgress.current = 1.0;
    }

    if (kickProgress.current > 0) {
      kickProgress.current = Math.max(0, kickProgress.current - dt * 5.2);
    }

    const k = Math.sin(kickProgress.current * Math.PI);
    if (rootRef.current) {
      if (autoRotate && kickProgress.current <= 0.05) {
        rootRef.current.rotation.y += dt * 0.55;
      }
      rootRef.current.position.z = k * 0.08;
      rootRef.current.rotation.x = k * 0.14;
    }
    if (muzzleRef.current) {
      const flashVisible = kickProgress.current > 0.7;
      muzzleRef.current.visible = flashVisible;
      muzzleRef.current.scale.setScalar(flashVisible ? 0.9 + Math.random() * 0.6 : 0.01);
    }
  });

  const wpn = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  const barrelZ = weaponId === "pistol" || weaponId === "revolver" ? -0.34 : weaponId === "sniper" || weaponId === "dmr" ? -0.9 : -0.66;

  return (
    <group>
      <group
        ref={rootRef}
        rotation={[0.04, Math.PI * 0.25, 0]}
        position={[0, 0.08, 0]}
        scale={1.45}
      >
        <WeaponModel3D weaponId={weaponId} skinId={skinId} />
        <mesh ref={muzzleRef} position={[0, 0.04, barrelZ]} visible={false}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial color={wpn.tracerColor} />
        </mesh>
      </group>

      {/* Reflective Tactical Display Pedestal */}
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.06, 36]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.308, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.71, 48]} />
        <meshBasicMaterial color={wpn.accentColor} />
      </mesh>
    </group>
  );
}

interface WeaponInspector3DProps {
  weaponId: WeaponId;
  onSelectWeapon?: (id: WeaponId) => void;
  skinId?: SkinId;
  compact?: boolean;
  onExpand?: () => void;
}

export function WeaponInspector3D({
  weaponId,
  onSelectWeapon,
  skinId = "urban_ops",
  compact = false,
  onExpand,
}: WeaponInspector3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [kickTrigger, setKickTrigger] = useState(0);

  const wpn = WEAPONS[weaponId] || WEAPONS.assaultRifle;

  const handleTestFire = () => {
    soundEngine.playWeaponFire(weaponId);
    setKickTrigger((c) => c + 1);
  };

  const dmgPct = Math.min(100, Math.round((wpn.damage * wpn.pellets) / 140 * 100));
  const rpmPct = Math.min(100, Math.round(((1000 / Math.max(50, wpn.fireRate)) / 16) * 100));
  const rangePct = Math.min(100, Math.round((wpn.range / 280) * 100));
  const mobilityPct = Math.min(100, Math.round(((wpn.moveSpeedMult - 0.75) / 0.35) * 100));

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className={`relative flex-1 ${compact ? "min-h-[260px]" : "min-h-[380px]"}`}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [1.35, 0.45, 1.45], fov: 36 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.05} />
          <directionalLight position={[4, 6, 4]} intensity={2.2} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={1.1} color={wpn.accentColor} />
          <pointLight position={[0, 1.8, 0]} intensity={1.2} color="#ffffff" />

          <Suspense fallback={null}>
            <WeaponTurntable
              weaponId={weaponId}
              skinId={skinId}
              autoRotate={autoRotate}
              kickTrigger={kickTrigger}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={0.75}
            maxDistance={2.8}
            minPolarAngle={0.25}
            maxPolarAngle={Math.PI * 0.54}
          />
        </Canvas>

        {/* Top Badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="px-2.5 py-1 bg-slate-950/80 border border-slate-700/80 rounded-lg text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
            <RotateCw size={12} className={autoRotate ? "animate-spin" : ""} />
            360° Drag & Zoom
          </div>
        </div>

        {/* Action Controls Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            title={autoRotate ? "Pause Rotation" : "Auto Rotate"}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
            <span className="hidden sm:inline">{autoRotate ? "Spinning" : "Paused"}</span>
          </button>
          <button
            type="button"
            onClick={handleTestFire}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <Flame size={12} />
            Test Fire
          </button>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              title="Open Full 360° Armory"
              className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-sky-500 border border-slate-700 text-white cursor-pointer transition-colors"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Weapon Telemetry & Ballistics Bar */}
      <div className="px-3.5 py-3 bg-slate-950/90 border-t border-slate-800/80 rounded-b-xl text-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                {wpn.name}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                style={{ backgroundColor: `${wpn.accentColor}26`, color: wpn.accentColor }}
              >
                {wpn.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{wpn.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] font-black text-amber-400">
              {wpn.magSize} MAG • {wpn.adsZoom.toFixed(1)}x ZOOM
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">
              {wpn.mode} • {wpn.range}m
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[9px] font-black uppercase tracking-wider">
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Power</span>
              <span className="text-white">{wpn.damage}{wpn.pellets > 1 ? `x${wpn.pellets}` : ""}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${dmgPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Fire Rate</span>
              <span className="text-white">{Math.round(60000 / wpn.fireRate)}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${rpmPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Range</span>
              <span className="text-white">{wpn.range}m</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${rangePct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Mobility</span>
              <span className="text-white">{Math.round(wpn.moveSpeedMult * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${mobilityPct}%` }} />
            </div>
          </div>
        </div>

        {onSelectWeapon && !compact && (
          <div className="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {WEAPON_ORDER.map((id) => {
              const item = WEAPONS[id];
              const active = id === weaponId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectWeapon(id)}
                  className={`px-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    active
                      ? "bg-sky-500 text-slate-950 border-sky-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {item.shortName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeaponArmoryModal({
  isOpen,
  onClose,
  weaponId,
  onSelectWeapon,
  skinId,
}: {
  isOpen: boolean;
  onClose: () => void;
  weaponId: WeaponId;
  onSelectWeapon: (id: WeaponId) => void;
  skinId: SkinId;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crosshair size={18} className="text-sky-400" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-white">
              360° Weapons Armory & Ballistics Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="h-[72vh] max-h-[620px]">
          <WeaponInspector3D
            weaponId={weaponId}
            onSelectWeapon={onSelectWeapon}
            skinId={skinId}
          />
        </div>
      </div>
    </div>
  );
}
