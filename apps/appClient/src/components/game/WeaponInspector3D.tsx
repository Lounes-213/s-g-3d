import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  GRIPS,
  GRIP_ORDER,
  MAGS,
  MAG_ORDER,
  MUZZLES,
  MUZZLE_ORDER,
  SCOPES,
  SCOPE_ORDER,
  WEAPONS,
  WEAPON_ORDER,
  computeEffectiveWeaponStats,
  getDefaultAttachments,
  type SkinId,
  type WeaponAttachments,
  type WeaponId,
} from "@block-shooter/shared";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { WeaponModel3D } from "./WeaponModels3D";
import { soundEngine } from "../../utils/soundEngine";
import {
  Crosshair,
  Flame,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Wrench,
  X,
} from "lucide-react";

interface WeaponStageProps {
  weaponId: WeaponId;
  skinId: SkinId;
  attachments: WeaponAttachments;
  autoRotate: boolean;
  kickTrigger: number;
}

function WeaponTurntable({
  weaponId,
  skinId,
  attachments,
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
        rootRef.current.rotation.y += dt * 0.48;
      }
      rootRef.current.position.z = k * 0.08;
      rootRef.current.rotation.x = k * 0.14;
    }
    if (muzzleRef.current) {
      const flashVisible = kickProgress.current > 0.7 && attachments.muzzle !== "suppressor";
      muzzleRef.current.visible = flashVisible;
      muzzleRef.current.scale.setScalar(flashVisible ? 0.9 + Math.random() * 0.6 : 0.01);
    }
  });

  const wpn = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  const barrelZ =
    weaponId === "pistol" || weaponId === "revolver"
      ? -0.34
      : weaponId === "sniper" || weaponId === "kar98" || weaponId === "dmr"
        ? -0.94
        : -0.68;

  return (
    <group>
      <group
        ref={rootRef}
        rotation={[0.04, Math.PI * 0.28, 0]}
        position={[0, 0.08, 0]}
        scale={1.45}
      >
        <WeaponModel3D
          weaponId={weaponId}
          skinId={skinId}
          attachments={attachments}
        />
        <mesh ref={muzzleRef} position={[0, 0.04, barrelZ]} visible={false}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial color={wpn.tracerColor} />
        </mesh>
      </group>

      {/* Reflective Tactical Gunsmith Pedestal */}
      <mesh position={[0, -0.36, 0]} receiveShadow>
        <cylinderGeometry args={[0.78, 0.88, 0.06, 36]} />
        <meshStandardMaterial color="#0b101b" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.328, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.77, 48]} />
        <meshBasicMaterial color="#f59e0b" />
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

type GunsmithSlot = "scope" | "muzzle" | "grip" | "mag";

export function WeaponInspector3D({
  weaponId,
  onSelectWeapon,
  skinId = "urban_ops",
  compact = false,
  onExpand,
}: WeaponInspector3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [kickTrigger, setKickTrigger] = useState(0);
  const [slotTab, setSlotTab] = useState<GunsmithSlot>("scope");

  const allAttachments = useSettingsStore((s) => s.weaponAttachments);
  const setWeaponAttachment = useSettingsStore((s) => s.setWeaponAttachment);
  const resetWeaponAttachments = useSettingsStore((s) => s.resetWeaponAttachments);

  const attachments: WeaponAttachments =
    allAttachments[weaponId] || getDefaultAttachments(weaponId);
  const eff = computeEffectiveWeaponStats(weaponId, attachments);

  const handleTestFire = () => {
    soundEngine.playWeaponFire(weaponId, eff.isSuppressed);
    setKickTrigger((c) => c + 1);
  };

  const dmgPct = Math.min(100, Math.round(((eff.damage * eff.pellets) / 145) * 100));
  const rpmPct = Math.min(100, Math.round((1000 / Math.max(50, eff.fireRate) / 16) * 100));
  const rangePct = Math.min(100, Math.round((eff.range / 310) * 100));
  const controlPct = Math.min(100, Math.max(15, Math.round((1 - eff.recoilKick / 1.35) * 100)));
  const mobilityPct = Math.min(100, Math.round(((eff.moveSpeedMult - 0.72) / 0.38) * 100));

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080b12] text-white font-tactical">
      {/* 3D Interactive Stage */}
      <div className={`relative flex-1 ${compact ? "min-h-[240px]" : "min-h-[260px]"}`}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [1.35, 0.42, 1.48], fov: 36 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[4, 6, 4]} intensity={2.3} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#f59e0b" />
          <pointLight position={[0, 1.8, 0]} intensity={1.2} color="#38bdf8" />

          <Suspense fallback={null}>
            <WeaponTurntable
              weaponId={weaponId}
              skinId={skinId}
              attachments={attachments}
              autoRotate={autoRotate}
              kickTrigger={kickTrigger}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={0.75}
            maxDistance={2.8}
            minPolarAngle={0.22}
            maxPolarAngle={Math.PI * 0.54}
          />
        </Canvas>

        {/* Top Left Hint */}
        <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
          <div className="px-2.5 py-1 bg-[#0a0e17]/90 border border-white/15 text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 clip-tactical-sm">
            <RotateCw size={12} />
            360° Drag & Zoom
          </div>
          {eff.isSuppressed && (
            <div className="px-2 py-1 bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              SUPPRESSED
            </div>
          )}
        </div>

        {/* Action Controls Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="px-2.5 py-1.5 bg-[#0d121d]/90 hover:bg-slate-800 border border-white/15 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
            <span className="hidden sm:inline">{autoRotate ? "Pause" : "Spin"}</span>
          </button>
          <button
            type="button"
            onClick={handleTestFire}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer clip-tactical-btn"
          >
            <Flame size={12} />
            Test Fire
          </button>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="p-1.5 bg-[#0d121d]/90 hover:bg-amber-500 hover:text-slate-950 border border-white/15 text-white cursor-pointer"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* GUNSMITH ATTACHMENTS WORKBENCH (Full Armory Mode) */}
      {!compact && (
        <div className="px-4 py-3 bg-[#0c101a] border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Wrench size={14} className="text-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">
                Gunsmith Attachments
              </span>
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: "scope", label: `Optic: ${SCOPES[attachments.scope].shortName}` },
                  { id: "muzzle", label: `Muzzle: ${MUZZLES[attachments.muzzle].shortName}` },
                  { id: "grip", label: `Grip: ${GRIPS[attachments.grip].shortName}` },
                  { id: "mag", label: `Mag: ${MAGS[attachments.mag].shortName}` },
                ] as Array<{ id: GunsmithSlot; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSlotTab(t.id);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                    slotTab === t.id
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-[#131926] text-slate-300 border-white/10 hover:border-amber-400/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  resetWeaponAttachments(weaponId);
                }}
                title="Reset weapon attachments"
                className="p-1.5 bg-[#131926] border border-white/10 hover:border-rose-400 text-slate-400 hover:text-rose-300 cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Attachment Option Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            {slotTab === "scope" &&
              SCOPE_ORDER.map((sId) => {
                const sc = SCOPES[sId];
                const active = attachments.scope === sId;
                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => {
                      setWeaponAttachment(weaponId, "scope", sId);
                      soundEngine.playScopeZoom();
                    }}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      active
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase flex items-center justify-between">
                      <span>{sc.shortName}</span>
                      <span className="text-amber-400 font-mono">{sc.zoom.toFixed(1)}x</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{sc.name}</div>
                  </button>
                );
              })}

            {slotTab === "muzzle" &&
              MUZZLE_ORDER.map((mId) => {
                const mz = MUZZLES[mId];
                const active = attachments.muzzle === mId;
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => {
                      setWeaponAttachment(weaponId, "muzzle", mId);
                      soundEngine.playClick();
                    }}
                    className={`p-2 border text-left cursor-pointer transition-all sm:col-span-1 ${
                      active
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase">{mz.shortName}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{mz.desc}</div>
                  </button>
                );
              })}

            {slotTab === "grip" &&
              GRIP_ORDER.map((gId) => {
                const gr = GRIPS[gId];
                const active = attachments.grip === gId;
                return (
                  <button
                    key={gId}
                    type="button"
                    onClick={() => {
                      setWeaponAttachment(weaponId, "grip", gId);
                      soundEngine.playClick();
                    }}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      active
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase">{gr.shortName}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{gr.desc}</div>
                  </button>
                );
              })}

            {slotTab === "mag" &&
              MAG_ORDER.map((mgId) => {
                const mg = MAGS[mgId];
                const active = attachments.mag === mgId;
                return (
                  <button
                    key={mgId}
                    type="button"
                    onClick={() => {
                      setWeaponAttachment(weaponId, "mag", mgId);
                      soundEngine.playClick();
                    }}
                    className={`p-2 border text-left cursor-pointer transition-all sm:col-span-2 ${
                      active
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase">{mg.name}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{mg.desc}</div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Ballistics Telemetry & 14-Weapon Selector */}
      <div className="px-4 py-3 bg-[#090d16] border-t border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black uppercase tracking-wider text-white">
                {eff.name}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                {eff.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{eff.description}</p>
          </div>
          <div className="text-right shrink-0 font-mono">
            <div className="text-xs font-black text-amber-400">
              {eff.magSize} MAG • {eff.adsZoom.toFixed(1)}x ZOOM
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">
              {eff.mode} • {eff.range}m • {(eff.reloadTime / 1000).toFixed(2)}s RLD
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2.5 text-[9px] font-black uppercase tracking-wider font-mono">
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Damage</span>
              <span className="text-white">
                {eff.damage}
                {eff.pellets > 1 ? `x${eff.pellets}` : ""}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-rose-500 transition-all" style={{ width: `${dmgPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>RPM</span>
              <span className="text-white">{Math.round(60000 / eff.fireRate)}</span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${rpmPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Range</span>
              <span className="text-white">{eff.range}m</span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${rangePct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Control</span>
              <span className="text-white">{controlPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${controlPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Mobility</span>
              <span className="text-white">{Math.round(eff.moveSpeedMult * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full bg-sky-400 transition-all" style={{ width: `${mobilityPct}%` }} />
            </div>
          </div>
        </div>

        {onSelectWeapon && !compact && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex gap-1.5 overflow-x-auto pb-1">
            {WEAPON_ORDER.map((id) => {
              const item = WEAPONS[id];
              const active = id === weaponId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectWeapon(id);
                    soundEngine.playClick();
                  }}
                  className={`shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    active
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-[#111622] text-slate-300 border-white/10 hover:border-amber-400/50"
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
  const theme = useSettingsStore((s) => s.theme);
  const isLight = theme === "light";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-2 sm:p-5">
      <div className={`w-full max-w-5xl h-[92dvh] max-h-[760px] border shadow-2xl overflow-hidden flex flex-col clip-tactical ${
        isLight
          ? "bg-slate-50 text-slate-900 border-slate-300"
          : "bg-[#090d16] text-white border-amber-500/35"
      }`}>
        <div className={`px-5 py-3 border-b flex items-center justify-between shrink-0 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0c101b] border-white/10"
        }`}>
          <div className="flex items-center gap-2.5">
            <Crosshair size={18} className="text-amber-500" />
            <h2 className={`text-sm sm:text-base font-black uppercase tracking-[0.2em] ${isLight ? "text-slate-900" : "text-white"}`}>
              3D Gunsmith & Tactical Armory ({WEAPON_ORDER.length} Weapons)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black/5 hover:bg-amber-500 hover:text-slate-950 text-slate-400 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
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
