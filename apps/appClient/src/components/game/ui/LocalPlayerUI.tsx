import { useEffect, useState } from "react";
import { useAppStore } from "../../../stores/useAppStore";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { useVoiceStore } from "../../../hooks/useVoiceChat";
import {
  CHARACTERS,
  SKILLS,
  SKILL_ORDER,
  WEAPONS,
  WEAPON_ORDER,
  formatKeyCode,
} from "@block-shooter/shared";
import { Activity, Eye, EyeOff, Flame, Mic, MicOff, Shield, Zap } from "lucide-react";

const SKILL_ICONS = {
  dash: Zap,
  shield: Shield,
  grenade: Flame,
};

const LocalPlayerUI = () => {
  const localId = useGameStore((state) => state.localId);
  const me = useGameStore((state) => (state.localId ? state.players[state.localId] : null));
  const ping = useGameStore((state) => state.ping);
  const mode = useGameStore((state) => state.mode);
  const playMode = useGameStore((state) => state.sessionConfig.playMode);
  const damageFlashAt = useGameStore((state) => state.damageFlashAt);
  const takenPopups = useGameStore((state) => state.takenPopups);
  const keybindings = useSettingsStore((state) => state.keybindings);
  const perspective = useSettingsStore((state) => state.perspective);
  const theme = useSettingsStore((state) => state.theme);

  const showControls = useAppStore((state) => state.showControls);
  const toggleControls = useAppStore((state) => state.toggleControls);
  const micEnabled = useVoiceStore((state) => state.micEnabled);
  const isTalking = useVoiceStore((state) => state.isTalking);
  const setMicEnabled = useVoiceStore((state) => state.setMicEnabled);

  const [now, setNow] = useState(() => Date.now());
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frames = 0;
    let lastSample = performance.now();
    let rafId = 0;
    const loop = (t: number) => {
      frames += 1;
      const elapsed = t - lastSample;
      if (elapsed >= 500) {
        setFps(Math.min(240, Math.round((frames * 1000) / elapsed)));
        frames = 0;
        lastSample = t;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const stepMs = takenPopups.length > 0 ? 40 : 120;
    const id = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [takenPopups.length]);

  if (!me || !localId) return null;

  const isLight = theme === "light";
  const charCfg = CHARACTERS[me.characterId] || CHARACTERS.striker;
  const maxHealth = me.maxHealth || charCfg.maxHealth || 100;
  const displayHealth = Math.max(0, Math.round(me.health));
  const healthPct = Math.min(100, (displayHealth / maxHealth) * 100);
  const shield = Math.max(0, Math.round(me.shield || 0));
  const shieldPct = Math.min(100, (shield / 45) * 100);
  const activeWeapon = WEAPONS[me.currentWeapon] || WEAPONS.assaultRifle;

  const isHurt = now - damageFlashAt < 280;

  const panelClass = isLight
    ? "bg-white/92 border-slate-300 text-slate-900 shadow-lg"
    : "bg-slate-950/90 border-white/15 text-white shadow-xl";

  return (
    <>
      {/* Damage Red Edge Flash */}
      {isHurt && (
        <div
          className="fixed inset-0 pointer-events-none z-20 transition-opacity duration-200"
          style={{
            boxShadow: "inset 0 0 110px 35px rgba(239, 68, 68, 0.55)",
          }}
        />
      )}

      {/* Enemy Damage Taken Feed (- Drifting DOWNWARD) + Directional Hit Indicator Arcs */}
      {takenPopups.length > 0 && !me.isDead && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center font-tactical">
          {takenPopups.map((tk, idx) => {
            const t = Math.min(1, Math.max(0, (now - tk.createdAt) / 900));
            if (t >= 1) return null;
            const opacity = Math.max(0, 1 - Math.pow(t, 1.8));
            const translateY = 26 + t * 56;
            const laneX = ((idx % 3) - 1) * 28;

            let relAngleDeg: number | null = null;
            if (
              typeof tk.attackerWorldX === "number" &&
              typeof tk.attackerWorldZ === "number"
            ) {
              const dx = tk.attackerWorldX - me.x;
              const dz = tk.attackerWorldZ - me.z;
              const yaw = me.yaw || 0;
              const forwardDot = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
              const rightDot = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
              relAngleDeg = (Math.atan2(rightDot, forwardDot) * 180) / Math.PI;
            }

            return (
              <div key={tk.id} className="absolute inset-0 flex items-center justify-center">
                {/* Incoming Damage Number Drifting Downward */}
                <div
                  className="font-black tracking-wider select-none whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] text-rose-500"
                  style={{
                    opacity,
                    transform: `translate(${laneX}px, ${translateY}px) scale(${tk.isHeadshot ? 1.2 : 1.0})`,
                  }}
                >
                  <span className={tk.isHeadshot ? "text-xl" : "text-base"}>
                    -{Math.round(tk.amount)}
                  </span>
                  {tk.isHeadshot && (
                    <span className="ml-1 text-[10px] uppercase tracking-widest text-rose-300">
                      CRIT
                    </span>
                  )}
                </div>

                {/* Directional Crimson Hit Chevron */}
                {relAngleDeg !== null && (
                  <div
                    className="absolute w-52 h-52 flex items-start justify-center"
                    style={{
                      opacity: opacity * 0.92,
                      transform: `rotate(${relAngleDeg}deg)`,
                    }}
                  >
                    <div className="w-10 h-2.5 bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)] [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Respawn / BR Eliminated Overlay */}
      {me.isDead && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center bg-black/50">
          <div
            className={`border-2 border-red-500 px-10 py-6 text-center shadow-2xl ${
              isLight ? "bg-white text-slate-900" : "bg-slate-950 text-white"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
              Operator Eliminated
            </p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-widest">
              {mode === "br" ? "Spectating Match..." : "Respawning..."}
            </h2>
          </div>
        </div>
      )}

      {/* Quick Top-Left Interactive Controls Toggle + Voice Mic + Live FPS & Ping */}
      <div className="fixed top-4 left-20 z-30 flex items-center gap-2 font-tactical">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-2 border text-[10px] font-black uppercase tabular-nums ${
            isLight
              ? "bg-white/95 border-slate-300 text-slate-800 shadow"
              : "bg-slate-950/90 border-white/20 text-slate-200"
          }`}
        >
          <Activity size={12} className="text-emerald-500" />
          <span className={fps >= 45 ? "text-emerald-500" : "text-amber-500"}>{fps} FPS</span>
          <span className="opacity-40">|</span>
          <span className={ping <= 90 ? "text-sky-500" : ping <= 160 ? "text-amber-500" : "text-rose-500"}>
            {playMode === "solo" ? "LOCAL" : `${ping} MS`}
          </span>
        </div>

        <button
          onClick={toggleControls}
          className={`flex items-center gap-1.5 px-2.5 py-2 border text-[10px] font-black uppercase cursor-pointer ${
            isLight
              ? "bg-white/95 border-slate-300 text-slate-800 hover:border-sky-600 shadow"
              : "bg-slate-950/90 border-white/20 text-slate-200 hover:border-sky-400"
          }`}
          title="Hide / Show Controls Overlay (H)"
        >
          {showControls ? <Eye size={13} className="text-sky-600" /> : <EyeOff size={13} className="text-rose-500" />}
          <span>{showControls ? "Hide HUD [H]" : "Show HUD [H]"}</span>
        </button>

        {playMode !== "solo" && (
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-2 border text-[10px] font-black uppercase cursor-pointer ${
              micEnabled
                ? isTalking
                  ? "bg-emerald-600 border-emerald-400 text-white"
                  : "bg-sky-600 border-sky-400 text-white"
                : isLight
                  ? "bg-white/95 border-slate-300 text-slate-700 shadow"
                  : "bg-slate-950/90 border-white/20 text-slate-300"
            }`}
            title="Toggle Voice Chat Microphone"
          >
            {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            <span>{micEnabled ? (isTalking ? "LIVE" : "MIC ON") : "MIC OFF"}</span>
          </button>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-end z-10 font-tactical">
        <div className="flex flex-wrap justify-between items-end gap-4 w-full">
          {/* BOTTOM LEFT: Operator Health, Shield, Sprint & Perspective */}
          <div className="flex flex-col gap-2 min-w-[260px]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black tracking-widest uppercase bg-sky-600 text-white">
                {charCfg.codename}
              </span>
              <span
                className={`text-lg font-black tracking-wider ${
                  isLight ? "text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" : "text-white drop-shadow"
                }`}
              >
                {me.name}
              </span>
              {me.isSprinting && (
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-500 text-slate-950">
                  SPRINT
                </span>
              )}
              <span
                className={`ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border uppercase ${
                  isLight
                    ? "bg-white/95 border-slate-300 text-slate-700"
                    : "bg-slate-900/90 border-white/15 text-slate-300"
                }`}
              >
                <Eye size={12} className="text-sky-600" />
                {perspective.toUpperCase()} [{formatKeyCode(keybindings.togglePerspective)}]
              </span>
            </div>

            <div className={`border p-3 ${panelClass}`}>
              {/* Shield Bar */}
              {shield > 0 && (
                <div className="mb-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-500 mb-0.5">
                    <span>Tactical Armor</span>
                    <span>+{shield}</span>
                  </div>
                  <div className={`h-1.5 w-full ${isLight ? "bg-slate-200" : "bg-slate-800"} overflow-hidden`}>
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${shieldPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Health Bar */}
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-65">
                  Health / HP
                </span>
                <span
                  className={`text-2xl font-black tabular-nums leading-none ${
                    displayHealth <= 30 ? "text-red-500 animate-pulse" : ""
                  }`}
                >
                  {displayHealth}
                  <span className="text-xs opacity-50 ml-1">/ {maxHealth}</span>
                </span>
              </div>
              <div className={`h-2.5 w-full ${isLight ? "bg-slate-200" : "bg-slate-800"} overflow-hidden`}>
                <div
                  className={`h-full transition-all duration-150 ${
                    displayHealth <= 30
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-sky-600 to-cyan-400"
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM CENTER: 3 Active Skills */}
          {showControls && (
            <div className="flex items-center gap-2.5">
              {SKILL_ORDER.map((skillId) => {
                const skill = SKILLS[skillId];
                const Icon = SKILL_ICONS[skillId];
                const readyAt = me.skillReadyAt?.[skillId] ?? 0;
                const remainingMs = Math.max(0, readyAt - now);
                const isReady = remainingMs <= 0;
                const keyLabel = formatKeyCode(keybindings[skill.keyAction]);

                return (
                  <div
                    key={skillId}
                    className={`relative w-18 h-18 sm:w-20 sm:h-20 flex flex-col items-center justify-center border transition-all ${panelClass} ${
                      isReady ? "opacity-100" : "opacity-65"
                    }`}
                    style={{
                      borderBottomWidth: "3px",
                      borderBottomColor: isReady ? skill.color : "#64748b",
                    }}
                  >
                    <span
                      className={`absolute top-1 left-1.5 text-[10px] font-black px-1 border ${
                        isLight
                          ? "bg-slate-100 border-slate-300 text-slate-800"
                          : "bg-black/70 border-white/15 text-slate-300"
                      }`}
                    >
                      {keyLabel}
                    </span>
                    <Icon
                      size={20}
                      style={{ color: isReady ? skill.color : "#64748b" }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider mt-1">
                      {isReady ? skill.shortName : `${(remainingMs / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* BOTTOM RIGHT: Active Weapon & 10-Slot Tactical Arsenal */}
          <div className="flex flex-col items-end gap-2">
            <div
              className={`border border-r-4 px-5 py-3 min-w-[250px] ${panelClass}`}
              style={{ borderRightColor: activeWeapon.accentColor }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-65">
                    {activeWeapon.category}
                  </div>
                  <div className="text-lg font-black uppercase tracking-wider">
                    {activeWeapon.name}
                  </div>
                </div>

                <div className={`text-right ${me.isReloading ? "opacity-40 animate-pulse" : ""}`}>
                  <span className="text-3xl font-black tabular-nums leading-none">
                    {String(me.ammo).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-bold opacity-60 ml-1">
                    / {String(activeWeapon.magSize).padStart(2, "0")}
                  </span>
                  {me.isReloading && (
                    <div className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                      Reloading
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showControls && (
              <div className="flex flex-wrap justify-end gap-1 max-w-md">
                {WEAPON_ORDER.map((wId, idx) => {
                  const w = WEAPONS[wId];
                  const isSelected = me.currentWeapon === wId;
                  const slotKey = keybindings[`weapon${idx + 1}` as keyof typeof keybindings];

                  return (
                    <div
                      key={wId}
                      className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-wider transition-all ${
                        isSelected
                          ? isLight
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white/15 border-white text-white"
                          : isLight
                            ? "bg-white/90 border-slate-300 text-slate-600"
                            : "bg-slate-950/85 border-white/10 text-slate-400"
                      }`}
                      style={
                        isSelected
                          ? { borderBottomColor: w.accentColor, borderBottomWidth: "2px" }
                          : undefined
                      }
                    >
                      <span className="opacity-60 mr-1">{formatKeyCode(slotKey)}</span>
                      {w.shortName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LocalPlayerUI;
