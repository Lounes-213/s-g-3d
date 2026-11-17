import { useEffect, useRef, useState } from "react";
import {
  WEAPON_ORDER,
  combatState,
  movementState,
  type SkillId,
  type WeaponId,
} from "@block-shooter/shared";
import { Crosshair, Eye, Flame, RotateCw, Shield, Zap } from "lucide-react";
import { useAppStore } from "../../../stores/useAppStore";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { soloEngine } from "../../../utils/soloEngine";
import { soundEngine } from "../../../utils/soundEngine";
import { touchInputState } from "../../../utils/touchControlsState";

export default function MobileControlsUI() {
  const showControls = useAppStore((s) => s.showControls);
  const mobileControlsMode = useSettingsStore((s) => s.mobileControlsMode);
  const togglePerspective = useSettingsStore((s) => s.togglePerspective);
  const sensitivity = useSettingsStore((s) => s.mouseSensitivity);
  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localId);
  const channel = useGameStore((s) => s.channel);
  const playMode = useGameStore((s) => s.sessionConfig.playMode);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [sprintOn, setSprintOn] = useState(false);
  const [crouchOn, setCrouchOn] = useState(false);
  const [adsOn, setAdsOn] = useState(false);

  const stickOriginRef = useRef<{ x: number; y: number } | null>(null);
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

  const emitSkill = (skillId: SkillId) => {
    const dir = { dirX: -Math.sin(me.yaw), dirY: Math.sin(me.pitch), dirZ: -Math.cos(me.yaw) };
    if (playMode === "solo") {
      soloEngine.useSkillLocal(skillId, dir);
    } else if (channel) {
      channel.emit("use_skill", { skillId, ...dir });
      soundEngine.playSkill(skillId);
    }
  };

  const emitReload = () => {
    if (playMode === "solo") soloEngine.reloadLocal();
    else if (channel) channel.emit("reload");
  };

  const emitJump = () => {
    window.dispatchEvent(new CustomEvent("local-touch-jump"));
  };

  const cycleWeapon = () => {
    const idx = WEAPON_ORDER.indexOf(me.currentWeapon);
    const nextW: WeaponId = WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length];
    if (playMode === "solo") soloEngine.switchWeaponLocal(nextW);
    else if (channel) channel.emit("switchWeapon", nextW);
  };

  const maxRadius = 40;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none font-tactical">
      {/* Right Half Touch Look Pad */}
      <div
        className="absolute top-16 right-0 bottom-36 left-1/2 pointer-events-auto touch-none"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (t) lookPrevRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchMove={(e) => {
          const t = e.changedTouches[0];
          if (!t || !lookPrevRef.current) return;
          const dx = t.clientX - lookPrevRef.current.x;
          const dy = t.clientY - lookPrevRef.current.y;
          lookPrevRef.current = { x: t.clientX, y: t.clientY };
          const sens = 0.0045 * sensitivity;
          touchInputState.lookYawDelta -= dx * sens;
          touchInputState.lookPitchDelta -= dy * sens;
        }}
        onTouchEnd={() => {
          lookPrevRef.current = null;
        }}
      />

      {/* Left Virtual Movement Joystick */}
      <div className="absolute bottom-28 left-6 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            const next = !sprintOn;
            setSprintOn(next);
            touchInputState.sprintActive = next;
          }}
          className={`px-3 py-1 text-[10px] font-black uppercase border cursor-pointer ${
            sprintOn
              ? "bg-emerald-500 text-slate-950 border-emerald-300"
              : "bg-slate-950/75 text-white border-white/25"
          }`}
        >
          {sprintOn ? "SPRINT: ON" : "SPRINT"}
        </button>

        <div
          className="relative w-28 h-28 rounded-full bg-slate-950/50 border-2 border-white/30 touch-none flex items-center justify-center"
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
          }}
          onTouchEnd={() => {
            stickOriginRef.current = null;
            setKnobOffset({ x: 0, y: 0 });
            touchInputState.moveX = 0;
            touchInputState.moveY = 0;
          }}
        >
          <div
            className="w-11 h-11 rounded-full bg-sky-400/80 border-2 border-white shadow-lg"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Action Buttons Cluster */}
      <div className="absolute bottom-28 right-5 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Skill & Utility Mini Bar */}
        <div className="flex gap-2">
          <button
            onClick={() => emitSkill("dash")}
            className="w-10 h-10 bg-slate-950/80 border border-sky-400/50 text-sky-300 flex items-center justify-center cursor-pointer"
            title="Dash"
          >
            <Zap size={16} />
          </button>
          <button
            onClick={() => emitSkill("shield")}
            className="w-10 h-10 bg-slate-950/80 border border-emerald-400/50 text-emerald-300 flex items-center justify-center cursor-pointer"
            title="Shield"
          >
            <Shield size={16} />
          </button>
          <button
            onClick={() => emitSkill("grenade")}
            className="w-10 h-10 bg-slate-950/80 border border-amber-400/50 text-amber-300 flex items-center justify-center cursor-pointer"
            title="Grenade"
          >
            <Flame size={16} />
          </button>
          <button
            onClick={togglePerspective}
            className="w-10 h-10 bg-slate-950/80 border border-white/25 text-white flex items-center justify-center cursor-pointer"
            title="1P/3P"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Combat Controls Row */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const next = !crouchOn;
              setCrouchOn(next);
              movementState.crouch = next;
            }}
            className={`px-3 py-2 text-[10px] font-black uppercase border cursor-pointer ${
              crouchOn
                ? "bg-amber-400 text-slate-950 border-amber-200"
                : "bg-slate-950/80 text-white border-white/25"
            }`}
          >
            CROUCH
          </button>
          <button
            onClick={cycleWeapon}
            className="px-3 py-2 text-[10px] font-black uppercase bg-slate-950/80 text-white border border-white/25 cursor-pointer"
          >
            GUN
          </button>
          <button
            onClick={emitReload}
            className="w-11 h-11 bg-slate-950/80 border border-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={() => {
              const next = !adsOn;
              setAdsOn(next);
              combatState.isAiming = next;
            }}
            className={`w-12 h-12 border font-black text-xs cursor-pointer ${
              adsOn
                ? "bg-sky-400 text-slate-950 border-white"
                : "bg-slate-950/80 text-sky-300 border-sky-400/40"
            }`}
          >
            ADS
          </button>
          <button
            onClick={emitJump}
            className="w-12 h-12 bg-slate-950/80 border border-white/30 text-white font-black text-xs cursor-pointer"
          >
            JUMP
          </button>
          {/* Large Fire Trigger */}
          <button
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
            className="w-16 h-16 rounded-full bg-rose-600/90 active:bg-rose-500 border-2 border-white text-white flex items-center justify-center shadow-xl cursor-pointer"
          >
            <Crosshair size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
