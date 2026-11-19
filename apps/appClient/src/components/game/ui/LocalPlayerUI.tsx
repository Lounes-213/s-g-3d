import { useEffect, useState } from "react";
import { useAppStore } from "../../../stores/useAppStore";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { useVoiceStore } from "../../../hooks/useVoiceChat";
import {
  CHARACTERS,
  MUZZLES,
  SCOPES,
  SKILLS,
  SKILL_ORDER,
  WEAPONS,
  WEAPON_ORDER,
  computeEffectiveWeaponStats,
  formatKeyCode,
  getDefaultAttachments,
  type LootRarity,
} from "@block-shooter/shared";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Mic,
  MicOff,
  Package,
  Shield,
  ShieldPlus,
  Users,
  Zap,
} from "lucide-react";

const SKILL_ICONS = {
  dash: Zap,
  shield: Shield,
  grenade: Flame,
};

const RARITY_STYLES: Record<LootRarity, { border: string; text: string; bg: string }> = {
  common: { border: "border-slate-400/50", text: "text-slate-200", bg: "bg-slate-800/90" },
  rare: { border: "border-cyan-400/70", text: "text-cyan-300", bg: "bg-cyan-950/90" },
  epic: { border: "border-purple-400/80", text: "text-purple-300", bg: "bg-purple-950/90" },
  legendary: { border: "border-amber-400", text: "text-amber-300", bg: "bg-amber-950/90" },
};

const LocalPlayerUI = () => {
  const localId = useGameStore((state) => state.localId);
  const players = useGameStore((state) => state.players);
  const me = localId ? players[localId] : null;
  const mode = useGameStore((state) => state.mode);
  const stormZone = useGameStore((state) => state.stormZone);
  const playMode = useGameStore((state) => state.sessionConfig.playMode);
  const damageFlashAt = useGameStore((state) => state.damageFlashAt);
  const takenPopups = useGameStore((state) => state.takenPopups);
  const nearbyLoot = useGameStore((state) => state.nearbyLoot);
  const lastLootToast = useGameStore((state) => state.lastLootToast);
  const armorPlates = useGameStore((state) => state.armorPlates);
  const medkits = useGameStore((state) => state.medkits);
  const overdriveCharge = useGameStore((state) => state.overdriveCharge);
  const overdriveUntil = useGameStore((state) => state.overdriveUntil);

  const keybindings = useSettingsStore((state) => state.keybindings);
  const perspective = useSettingsStore((state) => state.perspective);
  const allAttachments = useSettingsStore((state) => state.weaponAttachments);

  const showControls = useAppStore((state) => state.showControls);
  const toggleControls = useAppStore((state) => state.toggleControls);
  const micEnabled = useVoiceStore((state) => state.micEnabled);
  const isTalking = useVoiceStore((state) => state.isTalking);
  const setMicEnabled = useVoiceStore((state) => state.setMicEnabled);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stepMs = takenPopups.length > 0 ? 40 : 120;
    const id = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [takenPopups.length]);

  if (!me || !localId) return null;

  const charCfg = CHARACTERS[me.characterId] || CHARACTERS.striker;
  const maxHealth = me.maxHealth || charCfg.maxHealth || 100;
  const displayHealth = Math.max(0, Math.round(me.health));
  const healthPct = Math.min(100, (displayHealth / maxHealth) * 100);
  const shield = Math.max(0, Math.round(me.shield || 0));
  const shieldPct = Math.min(100, (shield / 100) * 100);

  const activeAtt = allAttachments[me.currentWeapon] || getDefaultAttachments(me.currentWeapon);
  const effWeapon = computeEffectiveWeaponStats(me.currentWeapon, activeAtt);
  const scopeMeta = SCOPES[activeAtt.scope] || SCOPES.red_dot;
  const muzzleMeta = MUZZLES[activeAtt.muzzle] || MUZZLES.standard;

  const isHurt = now - damageFlashAt < 280;
  const isOverdrive = overdriveUntil > now;
  const showLootToast = lastLootToast && now - lastLootToast.at < 3200;

  const aliveCount = Object.values(players).filter((p) => !p.isDead).length;
  const distFromStorm =
    mode === "br" && stormZone
      ? Math.hypot(me.x - stormZone.centerX, me.z - stormZone.centerZ)
      : 0;
  const outsideStorm = Boolean(mode === "br" && stormZone && distFromStorm > stormZone.currentRadius);

  const panelClass = "bg-[#0a0d14]/90 border border-white/15 text-white shadow-xl clip-tactical-sm";

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

      {/* Overdrive Surge Edge Glow */}
      {isOverdrive && !me.isDead && (
        <div
          className="fixed inset-0 pointer-events-none z-15"
          style={{
            boxShadow: "inset 0 0 70px 16px rgba(245, 158, 11, 0.28)",
          }}
        />
      )}

      {/* Storm Zone Warning Banner */}
      {outsideStorm && !me.isDead && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-1.5 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 clip-tactical-sm">
          <AlertTriangle size={14} className="text-rose-400" />
          OUTSIDE SAFE ZONE • MOVE TO CENTER ({Math.round(distFromStorm - (stormZone?.currentRadius || 0))}m)
        </div>
      )}

      {/* Loot / Overdrive / Airdrop Toast Notice */}
      {showLootToast && lastLootToast && (
        <div
          className={`fixed top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-1.5 border text-[11px] font-black uppercase tracking-[0.18em] clip-tactical-sm ${
            RARITY_STYLES[lastLootToast.rarity].bg
          } ${RARITY_STYLES[lastLootToast.rarity].border} ${RARITY_STYLES[lastLootToast.rarity].text}`}
        >
          {lastLootToast.text}
        </div>
      )}

      {/* Proximity Field Loot Pickup Prompt */}
      {nearbyLoot && !me.isDead && (
        <div className="fixed bottom-44 left-1/2 -translate-x-1/2 z-30 pointer-events-none font-tactical">
          <div
            className={`px-4 py-2 border flex items-center gap-3 shadow-2xl clip-tactical-sm ${
              RARITY_STYLES[nearbyLoot.rarity || "common"].bg
            } ${RARITY_STYLES[nearbyLoot.rarity || "common"].border}`}
          >
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-xs font-black font-mono">
              {formatKeyCode(keybindings.interact)}
            </span>
            <Package size={15} className={RARITY_STYLES[nearbyLoot.rarity || "common"].text} />
            <div>
              <div className={`text-xs font-black uppercase tracking-wider ${RARITY_STYLES[nearbyLoot.rarity || "common"].text}`}>
                {nearbyLoot.label || nearbyLoot.kind}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {(nearbyLoot.rarity || "common").toUpperCase()} LOOT • PRESS [{formatKeyCode(keybindings.interact)}] TO PICK UP
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enemy Damage Taken Feed + Directional Hit Chevrons */}
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
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center bg-black/55">
          <div className="border-2 border-red-500 px-10 py-6 text-center shadow-2xl bg-[#090d16] text-white clip-tactical">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400">
              Operator Down
            </p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-widest">
              {mode === "br" ? "Match Spectate" : "Redeploying..."}
            </h2>
          </div>
        </div>
      )}

      {/* Top-Left Clean Utility Controls + BR Alive Counter */}
      <div className="fixed top-4 left-20 z-30 flex items-center gap-2 font-tactical">
        {mode === "br" && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0a0d14]/92 border border-amber-500/45 text-amber-300 text-[11px] font-black uppercase clip-tactical-sm">
            <Users size={13} className="text-amber-400" />
            <span>ALIVE {aliveCount}</span>
            {stormZone && (
              <span className="text-cyan-300 ml-1 font-mono">
                PHASE {stormZone.phase}
              </span>
            )}
          </div>
        )}

        <button
          onClick={toggleControls}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 bg-[#0a0d14]/90 border border-white/15 hover:border-amber-400 text-slate-200 text-[10px] font-black uppercase cursor-pointer clip-tactical-sm"
          title="Hide / Show Controls Overlay (H)"
        >
          {showControls ? <Eye size={13} className="text-amber-400" /> : <EyeOff size={13} className="text-rose-400" />}
          <span>{showControls ? "HUD [H]" : "SHOW [H]"}</span>
        </button>

        {playMode !== "solo" && (
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-2 border text-[10px] font-black uppercase cursor-pointer clip-tactical-sm ${
              micEnabled
                ? isTalking
                  ? "bg-emerald-600 border-emerald-400 text-white"
                  : "bg-cyan-600 border-cyan-400 text-white"
                : "bg-[#0a0d14]/90 border-white/15 text-slate-300"
            }`}
          >
            {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            <span>{micEnabled ? (isTalking ? "LIVE" : "MIC") : "MUTED"}</span>
          </button>
        )}
      </div>

      {/* BOTTOM TACTICAL HUD BAR */}
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-end z-10 font-tactical">
        <div className="flex flex-wrap justify-between items-end gap-3 w-full">
          {/* BOTTOM LEFT: Operator Armor, Health, Plates, Medkits & Overdrive Surge */}
          <div className="flex flex-col gap-1.5 min-w-[235px] sm:min-w-[285px]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black tracking-widest uppercase bg-amber-500 text-slate-950">
                {charCfg.codename}
              </span>
              <span className="text-sm sm:text-base font-black tracking-wider text-white drop-shadow">
                {me.name}
              </span>
              {me.isSliding && (
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-cyan-400 text-slate-950">
                  SLIDE
                </span>
              )}
              <span className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#0a0d14]/90 border border-white/15 text-slate-300 uppercase font-mono">
                <Eye size={11} className="text-amber-400" />
                {perspective.toUpperCase()}
              </span>
            </div>

            <div className={`p-3 ${panelClass}`}>
              {/* Ballistic Armor Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-cyan-300 mb-0.5 font-mono">
                  <span className="flex items-center gap-1">
                    <Shield size={11} /> ARMOR
                  </span>
                  <span>{shield} / 100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-150"
                    style={{ width: `${shieldPct}%` }}
                  />
                </div>
              </div>

              {/* Health Bar */}
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  HEALTH
                </span>
                <span
                  className={`text-2xl font-black tabular-nums leading-none font-mono ${
                    displayHealth <= 30 ? "text-rose-400" : "text-white"
                  }`}
                >
                  {displayHealth}
                  <span className="text-xs text-slate-400 ml-1">/ {maxHealth}</span>
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    displayHealth <= 30
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-amber-500 to-amber-300"
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>

              {/* Survival Quick Slots + Overdrive Surge */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] font-black uppercase font-mono">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <ShieldPlus size={12} />
                  <span>[{formatKeyCode(keybindings.armorPlate)}] x{armorPlates}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Heart size={12} />
                  <span>[{formatKeyCode(keybindings.medkit)}] x{medkits}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className={isOverdrive ? "text-amber-400" : "text-slate-400"} />
                  <span className={isOverdrive ? "text-amber-400" : "text-slate-400"}>
                    {isOverdrive ? "SURGE!" : `${Math.round(overdriveCharge)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CENTER: 3 Active Tactical Skills (Hidden on narrow mobile phones so controls stay uncluttered) */}
          {showControls && (
            <div className="hidden md:flex items-center gap-2">
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
                    className={`relative w-16 h-16 flex flex-col items-center justify-center transition-all ${panelClass} ${
                      isReady ? "opacity-100" : "opacity-60"
                    }`}
                    style={{
                      borderBottomWidth: "3px",
                      borderBottomColor: isReady ? skill.color : "#475569",
                    }}
                  >
                    <span className="absolute top-1 left-1.5 text-[9px] font-black text-slate-400 font-mono">
                      {keyLabel}
                    </span>
                    <Icon
                      size={18}
                      style={{ color: isReady ? skill.color : "#64748b" }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1">
                      {isReady ? skill.shortName : `${(remainingMs / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* BOTTOM RIGHT: Active Weapon + Live Attachments + Arsenal Strip */}
          <div className="flex flex-col items-end gap-1.5">
            <div
              className={`px-4 py-2.5 min-w-[230px] sm:min-w-[270px] border-r-4 ${panelClass}`}
              style={{ borderRightColor: effWeapon.accentColor }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
                    {effWeapon.category} • {scopeMeta.shortName} {effWeapon.adsZoom.toFixed(1)}x
                  </div>
                  <div className="text-base sm:text-lg font-black uppercase tracking-wider leading-tight">
                    {effWeapon.name}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">
                    {muzzleMeta.shortName} • [{formatKeyCode(keybindings.cycleScope)}] OPTIC
                  </div>
                </div>

                <div className={`text-right font-mono ${me.isReloading ? "opacity-45" : ""}`}>
                  <span className="text-2xl sm:text-3xl font-black tabular-nums leading-none">
                    {String(me.ammo).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-slate-400 ml-1">
                    / {String(effWeapon.magSize).padStart(2, "0")}
                  </span>
                  {me.isReloading && (
                    <div className="text-[9px] font-black uppercase text-amber-400 tracking-widest">
                      RELOADING
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showControls && (
              <div className="hidden lg:flex flex-wrap justify-end gap-1 max-w-lg">
                {WEAPON_ORDER.slice(0, 10).map((wId, idx) => {
                  const w = WEAPONS[wId];
                  const isSelected = me.currentWeapon === wId;
                  const slotKey = keybindings[`weapon${idx + 1}` as keyof typeof keybindings];

                  return (
                    <div
                      key={wId}
                      className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-wider ${
                        isSelected
                          ? "bg-amber-500 border-amber-400 text-slate-950"
                          : "bg-[#0a0d14]/85 border-white/10 text-slate-400"
                      }`}
                    >
                      <span className="opacity-70 mr-1 font-mono">{formatKeyCode(slotKey)}</span>
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
