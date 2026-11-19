import { useEffect, useRef, useState } from "react";
import {
  SCOPES,
  WEAPONS,
  WEAPON_ORDER,
  combatState,
  movementState,
  type SkillId,
  type WeaponId,
} from "@block-shooter/shared";
import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Eye,
  Flame,
  Heart,
  Package,
  RotateCw,
  Shield,
  ShieldPlus,
  Sliders,
  Zap,
  ZoomIn,
} from "lucide-react";
import { useAppStore } from "../../../stores/useAppStore";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore, type MobileControlId } from "../../../stores/useSettingsStore";
import { soloEngine } from "../../../utils/soloEngine";
import { soundEngine } from "../../../utils/soundEngine";
import { touchInputState } from "../../../utils/touchControlsState";

export default function MobileControlsUI() {
  const showControls = useAppStore((s) => s.showControls);
  const mobileControlsMode = useSettingsStore((s) => s.mobileControlsMode);
  const layout = useSettingsStore((s) => s.mobileHudLayout);
  const togglePerspective = useSettingsStore((s) => s.togglePerspective);
  const sensitivity = useSettingsStore((s) => s.mouseSensitivity);
  const allAttachments = useSettingsStore((s) => s.weaponAttachments);

  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localId);
  const channel = useGameStore((s) => s.channel);
  const playMode = useGameStore((s) => s.sessionConfig.playMode);
  const nearbyLoot = useGameStore((s) => s.nearbyLoot);
  const armorPlates = useGameStore((s) => s.armorPlates);
  const medkits = useGameStore((s) => s.medkits);
  const setMobileHudEditorOpen = useGameStore((s) => s.setMobileHudEditorOpen);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [autoSprintLocked, setAutoSprintLocked] = useState(false);
  const [crouchOn, setCrouchOn] = useState(false);
  const [adsOn, setAdsOn] = useState(false);

  const stickOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lookPrevRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window);
    const timer = window.setTimeout(() => setIsTouchDevice(Boolean(coarse)), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!showControls) return null;
  if (mobileControlsMode === "off") return null;
  if (mobileControlsMode === "auto" && !isTouchDevice) return null;

  const me = localId ? players[localId] : null;
  if (!me || me.isDead) return null;

  const activeWeapon = WEAPONS[me.currentWeapon] || WEAPONS.assaultRifle;
  const activeScope = allAttachments[me.currentWeapon]?.scope || "red_dot";

  const emitSkill = (skillId: SkillId) => {
    const dir = {
      dirX: -Math.sin(me.yaw),
      dirY: Math.sin(me.pitch),
      dirZ: -Math.cos(me.yaw),
    };
    if (playMode === "solo") {
      soloEngine.useSkillLocal(skillId, dir);
    } else if (channel) {
      channel.emit("use_skill", { skillId, ...dir });
      soundEngine.playSkill(skillId);
    }
  };

  const emitReload = () => {
    combatState.isAiming = false;
    setAdsOn(false);
    if (playMode === "solo") soloEngine.reloadLocal();
    else if (channel) channel.emit("reload");
  };

  const cycleWeapon = () => {
    const idx = WEAPON_ORDER.indexOf(me.currentWeapon);
    const nextW: WeaponId = WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length];
    soundEngine.playClick();
    if (playMode === "solo") soloEngine.switchWeaponLocal(nextW);
    else if (channel) channel.emit("switchWeapon", nextW);
  };

  const styleFor = (id: MobileControlId) => {
    const c = layout[id];
    return {
      left: `${c.x}%`,
      top: `${c.y}%`,
      transform: `translate(-50%, -50%) scale(${c.scale})`,
      opacity: c.opacity,
    };
  };

  const maxRadius = 42;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none font-tactical overflow-hidden">
      {/* Right Half Full Touch Aim Pad */}
      <div
        className="absolute top-12 right-0 bottom-0 left-[38%] pointer-events-auto touch-none"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (!t) return;
          lookTouchIdRef.current = t.identifier;
          lookPrevRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchMove={(e) => {
          if (lookTouchIdRef.current === null || !lookPrevRef.current) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchIdRef.current) {
              const dx = t.clientX - lookPrevRef.current.x;
              const dy = t.clientY - lookPrevRef.current.y;
              lookPrevRef.current = { x: t.clientX, y: t.clientY };
              const sens = 0.0048 * sensitivity;
              touchInputState.lookYawDelta -= dx * sens;
              touchInputState.lookPitchDelta -= dy * sens;
              break;
            }
          }
        }}
        onTouchEnd={(e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
              lookTouchIdRef.current = null;
              lookPrevRef.current = null;
              break;
            }
          }
        }}
      />

      {/* Quick Customize Mobile HUD Button (Top Right Below Minimap) */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playClick();
          setMobileHudEditorOpen(true);
        }}
        className="fixed top-4 right-4 z-40 pointer-events-auto px-2.5 py-1.5 bg-[#0a0d14]/90 border border-amber-500/45 text-amber-400 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer clip-tactical-sm"
      >
        <Sliders size={12} /> HUD
      </button>

      {/* MOVEMENT JOYSTICK with Push-Up Auto-Sprint Lock */}
      {layout.joystick.visible && (
        <div
          style={styleFor("joystick")}
          className="absolute pointer-events-auto touch-none flex flex-col items-center"
        >
          {autoSprintLocked && (
            <div className="mb-1 px-2 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-widest">
              SPRINT
            </div>
          )}
          <div
            className="relative w-28 h-28 rounded-full bg-[#090d16]/60 border-2 border-white/25 flex items-center justify-center"
            onTouchStart={(e) => {
              const t = e.changedTouches[0];
              if (!t) return;
              const rect = e.currentTarget.getBoundingClientRect();
              stickOriginRef.current = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              };
            }}
            onTouchMove={(e) => {
              const t = e.changedTouches[0];
              if (!t || !stickOriginRef.current) return;
              const dx = t.clientX - stickOriginRef.current.x;
              const dy = t.clientY - stickOriginRef.current.y;
              const dist = Math.min(maxRadius, Math.hypot(dx, dy));
              const angle = Math.atan2(dy, dx);
              const clampedX = Math.cos(angle) * dist;
              const clampedY = Math.sin(angle) * dist;
              setKnobOffset({ x: clampedX, y: clampedY });
              touchInputState.moveX = clampedX / maxRadius;
              touchInputState.moveY = -clampedY / maxRadius;
              const sprinting = -clampedY / maxRadius > 0.78;
              setAutoSprintLocked(sprinting);
              touchInputState.sprintActive = sprinting;
            }}
            onTouchEnd={() => {
              stickOriginRef.current = null;
              setKnobOffset({ x: 0, y: 0 });
              touchInputState.moveX = 0;
              touchInputState.moveY = 0;
              setAutoSprintLocked(false);
              touchInputState.sprintActive = false;
            }}
          >
            <div
              className="w-11 h-11 rounded-full bg-amber-400/85 border-2 border-white shadow-lg"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>
        </div>
      )}

      {/* PRIMARY FIRE TRIGGER */}
      {layout.fire.visible && (
        <button
          type="button"
          style={styleFor("fire")}
          onTouchStart={(e) => {
            e.preventDefault();
            combatState.isShooting = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            combatState.isShooting = false;
          }}
          onMouseDown={() => {
            combatState.isShooting = true;
          }}
          onMouseUp={() => {
            combatState.isShooting = false;
          }}
          className="absolute pointer-events-auto w-16 h-16 rounded-full bg-amber-500/90 active:bg-amber-400 border-2 border-white text-slate-950 flex items-center justify-center shadow-xl cursor-pointer"
        >
          <Crosshair size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* SECONDARY LEFT CLAW FIRE TRIGGER */}
      {layout.fireLeft.visible && (
        <button
          type="button"
          style={styleFor("fireLeft")}
          onTouchStart={(e) => {
            e.preventDefault();
            combatState.isShooting = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            combatState.isShooting = false;
          }}
          onMouseDown={() => {
            combatState.isShooting = true;
          }}
          onMouseUp={() => {
            combatState.isShooting = false;
          }}
          className="absolute pointer-events-auto w-14 h-14 rounded-full bg-rose-600/85 active:bg-rose-500 border-2 border-white/80 text-white flex items-center justify-center shadow-lg cursor-pointer"
        >
          <Crosshair size={22} />
        </button>
      )}

      {/* ADS / SCOPE TOGGLE */}
      {layout.ads.visible && (
        <button
          type="button"
          style={styleFor("ads")}
          onClick={() => {
            const next = !adsOn;
            setAdsOn(next);
            combatState.isAiming = next;
          }}
          className={`absolute pointer-events-auto w-12 h-12 border-2 font-black text-[11px] flex flex-col items-center justify-center cursor-pointer clip-tactical-sm ${
            adsOn
              ? "bg-cyan-400 text-slate-950 border-white"
              : "bg-[#0b101b]/85 text-cyan-300 border-cyan-400/50"
          }`}
        >
          <span>ADS</span>
          <span className="text-[8px] font-mono">{SCOPES[activeScope].zoom.toFixed(1)}x</span>
        </button>
      )}

      {/* CYCLE SCOPE ZOOM */}
      {layout.scopeCycle.visible && (
        <button
          type="button"
          style={styleFor("scopeCycle")}
          onClick={() => window.dispatchEvent(new CustomEvent("local-cycle-scope"))}
          className="absolute pointer-events-auto w-11 h-11 bg-[#0b101b]/85 border border-cyan-400/45 text-cyan-300 flex flex-col items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <ZoomIn size={14} />
          <span className="text-[7px] font-black uppercase">ZOOM</span>
        </button>
      )}

      {/* JUMP */}
      {layout.jump.visible && (
        <button
          type="button"
          style={styleFor("jump")}
          onClick={() => window.dispatchEvent(new CustomEvent("local-touch-jump"))}
          className="absolute pointer-events-auto w-12 h-12 bg-[#0b101b]/85 border border-white/30 text-white font-black text-[10px] uppercase flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          JUMP
        </button>
      )}

      {/* CROUCH / TACTICAL SLIDE */}
      {layout.crouch.visible && (
        <button
          type="button"
          style={styleFor("crouch")}
          onClick={() => {
            if (touchInputState.sprintActive || autoSprintLocked) {
              window.dispatchEvent(new CustomEvent("local-touch-slide"));
              return;
            }
            const next = !crouchOn;
            setCrouchOn(next);
            movementState.crouch = next;
          }}
          className={`absolute pointer-events-auto w-12 h-11 border font-black text-[9px] uppercase flex items-center justify-center cursor-pointer clip-tactical-sm ${
            crouchOn
              ? "bg-amber-400 text-slate-950 border-amber-200"
              : "bg-[#0b101b]/85 text-white border-white/25"
          }`}
        >
          {autoSprintLocked ? "SLIDE" : "CROUCH"}
        </button>
      )}

      {/* RELOAD */}
      {layout.reload.visible && (
        <button
          type="button"
          style={styleFor("reload")}
          onClick={emitReload}
          className="absolute pointer-events-auto w-11 h-11 bg-[#0b101b]/85 border border-white/25 text-white flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <RotateCw size={18} />
        </button>
      )}

      {/* CONTEXTUAL LOOT PICKUP BUTTON (Highlights brightly when near loot!) */}
      {layout.loot.visible && nearbyLoot && (
        <button
          type="button"
          style={styleFor("loot")}
          onClick={() => window.dispatchEvent(new CustomEvent("local-loot-interact"))}
          className="absolute pointer-events-auto px-3.5 py-2 bg-amber-500 active:bg-amber-400 border-2 border-white text-slate-950 flex items-center gap-1.5 shadow-xl cursor-pointer clip-tactical-btn"
        >
          <Package size={15} />
          <span className="text-[10px] font-black uppercase whitespace-nowrap max-w-[140px] truncate">
            LOOT: {nearbyLoot.label || nearbyLoot.kind}
          </span>
        </button>
      )}

      {/* ARMOR PLATE */}
      {layout.armor.visible && (
        <button
          type="button"
          style={styleFor("armor")}
          onClick={() => window.dispatchEvent(new CustomEvent("local-armor-plate"))}
          className="absolute pointer-events-auto w-11 h-11 bg-[#0b101b]/85 border border-cyan-400/50 text-cyan-300 flex flex-col items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <ShieldPlus size={15} />
          <span className="text-[8px] font-black font-mono">x{armorPlates}</span>
        </button>
      )}

      {/* MEDKIT */}
      {layout.medkit.visible && (
        <button
          type="button"
          style={styleFor("medkit")}
          onClick={() => window.dispatchEvent(new CustomEvent("local-medkit"))}
          className="absolute pointer-events-auto w-11 h-11 bg-[#0b101b]/85 border border-emerald-400/50 text-emerald-400 flex flex-col items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <Heart size={15} />
          <span className="text-[8px] font-black font-mono">x{medkits}</span>
        </button>
      )}

      {/* LEAN LEFT / RIGHT */}
      {layout.leanLeft.visible && (
        <button
          type="button"
          style={styleFor("leanLeft")}
          onClick={() =>
            window.dispatchEvent(new CustomEvent("local-lean-toggle", { detail: { dir: -1 } }))
          }
          className={`absolute pointer-events-auto w-10 h-10 border flex items-center justify-center cursor-pointer ${
            movementState.lean === -1
              ? "bg-amber-500 text-slate-950 border-white"
              : "bg-[#0b101b]/80 text-white border-white/25"
          }`}
        >
          <ArrowLeft size={16} />
        </button>
      )}
      {layout.leanRight.visible && (
        <button
          type="button"
          style={styleFor("leanRight")}
          onClick={() =>
            window.dispatchEvent(new CustomEvent("local-lean-toggle", { detail: { dir: 1 } }))
          }
          className={`absolute pointer-events-auto w-10 h-10 border flex items-center justify-center cursor-pointer ${
            movementState.lean === 1
              ? "bg-amber-500 text-slate-950 border-white"
              : "bg-[#0b101b]/80 text-white border-white/25"
          }`}
        >
          <ArrowRight size={16} />
        </button>
      )}

      {/* SKILLS */}
      {layout.skillDash.visible && (
        <button
          type="button"
          style={styleFor("skillDash")}
          onClick={() => emitSkill("dash")}
          className="absolute pointer-events-auto w-10 h-10 bg-[#0b101b]/85 border border-sky-400/50 text-sky-300 flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <Zap size={16} />
        </button>
      )}
      {layout.skillShield.visible && (
        <button
          type="button"
          style={styleFor("skillShield")}
          onClick={() => emitSkill("shield")}
          className="absolute pointer-events-auto w-10 h-10 bg-[#0b101b]/85 border border-emerald-400/50 text-emerald-300 flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <Shield size={16} />
        </button>
      )}
      {layout.skillGrenade.visible && (
        <button
          type="button"
          style={styleFor("skillGrenade")}
          onClick={() => emitSkill("grenade")}
          className="absolute pointer-events-auto w-10 h-10 bg-[#0b101b]/85 border border-amber-400/50 text-amber-300 flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <Flame size={16} />
        </button>
      )}

      {/* 1P/3P CAMERA */}
      {layout.camera.visible && (
        <button
          type="button"
          style={styleFor("camera")}
          onClick={() => {
            soundEngine.playClick();
            togglePerspective();
          }}
          className="absolute pointer-events-auto w-10 h-10 bg-[#0b101b]/85 border border-white/25 text-white flex items-center justify-center cursor-pointer clip-tactical-sm"
        >
          <Eye size={15} />
        </button>
      )}

      {/* WEAPON SWITCHER */}
      {layout.weaponSwitch.visible && (
        <button
          type="button"
          style={styleFor("weaponSwitch")}
          onClick={cycleWeapon}
          className="absolute pointer-events-auto px-3 py-2 bg-[#0b101b]/90 border border-amber-500/45 text-white flex flex-col items-center cursor-pointer clip-tactical-sm"
        >
          <span className="text-[10px] font-black uppercase text-amber-400">
            {activeWeapon.shortName}
          </span>
          <span className="text-[8px] font-mono text-slate-300">
            {me.ammo} RDS • SWAP
          </span>
        </button>
      )}
    </div>
  );
}
