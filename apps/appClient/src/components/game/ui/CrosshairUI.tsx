import { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import {
  SCOPES,
  WEAPONS,
  combatState,
  computeEffectiveWeaponStats,
  formatKeyCode,
  movementState,
  type ScopeId,
  type WeaponId,
} from "@block-shooter/shared";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Crosshair, RotateCw, ShieldAlert } from "lucide-react";

const CrosshairUI = () => {
  const spread = useGameStore((state) => state.crosshairSpread);
  const isLocked = useGameStore((state) => state.isLocked);
  const matchState = useGameStore((state) => state.matchState);
  const localId = useGameStore((state) => state.localId);
  const players = useGameStore((state) => state.players);
  const dealtPopups = useGameStore((state) => state.dealtPopups);
  const streakBanner = useGameStore((state) => state.streakBanner);
  const scoreboardKey = useSettingsStore((state) => state.keybindings.scoreboard);
  const cycleScopeKey = useSettingsStore((state) => state.keybindings.cycleScope);
  const crosshairStyle = useSettingsStore((state) => state.crosshairStyle);
  const crosshairColor = useSettingsStore((state) => state.crosshairColor);
  const showDamageNumbers = useSettingsStore((state) => state.showDamageNumbers);

  const me = localId ? players[localId] : null;
  const isReloading = me?.isReloading || false;
  const isDead = me?.isDead || false;

  const [isHoldingTab, setIsHoldingTab] = useState(false);
  const [aimState, setAimState] = useState<{
    isAiming: boolean;
    weaponId: WeaponId;
    scopeId: ScopeId;
    zoom: number;
    holdBreath: boolean;
  }>({
    isAiming: false,
    weaponId: "assaultRifle",
    scopeId: "red_dot",
    zoom: 1.45,
    holdBreath: false,
  });
  const [showHit, setShowHit] = useState<{
    active: boolean;
    hs: boolean;
    armorBreak: boolean;
  }>({
    active: false,
    hs: false,
    armorBreak: false,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const crosshairGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === scoreboardKey || e.key === "Tab") setIsHoldingTab(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === scoreboardKey || e.key === "Tab") setIsHoldingTab(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [scoreboardKey]);

  // Poll ADS zoom / optic & hold-breath state cleanly
  useEffect(() => {
    const id = setInterval(() => {
      const st = useGameStore.getState();
      const player = st.localId ? st.players[st.localId] : null;
      const wId = player?.currentWeapon || "assaultRifle";
      const att = useSettingsStore.getState().getWeaponAttachments(wId);
      const eff = computeEffectiveWeaponStats(wId, att);
      const aiming = Boolean(combatState.isAiming && (st.isLocked || "ontouchstart" in window));
      setAimState({
        isAiming: aiming,
        weaponId: wId,
        scopeId: att.scope,
        zoom: eff.adsZoom,
        holdBreath: Boolean(movementState.holdBreath),
      });
    }, 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (dealtPopups.length === 0 && !streakBanner) return;
    const syncId = requestAnimationFrame(() => setNowMs(Date.now()));
    const id = setInterval(() => setNowMs(Date.now()), 33);
    return () => {
      cancelAnimationFrame(syncId);
      clearInterval(id);
    };
  }, [dealtPopups.length, streakBanner]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.hitMarker && state.hitMarker !== prev.hitMarker) {
        setShowHit({
          active: true,
          hs: state.hitMarker.isHeadshot,
          armorBreak: Boolean(state.hitMarker.isArmorBreak),
        });
        if (timer) clearTimeout(timer);
        timer = setTimeout(
          () => setShowHit({ active: false, hs: false, armorBreak: false }),
          state.hitMarker.isHeadshot || state.hitMarker.isArmorBreak ? 280 : 165,
        );
      }
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useGSAP(() => {
    if (!topRef.current || !bottomRef.current || !leftRef.current || !rightRef.current)
      return;
    const baseOffset = aimState.isAiming ? 4 : 7;
    const currentOffset = baseOffset + spread;
    const config = { duration: 0.11, ease: "power2.out", overwrite: "auto" as const };
    gsap.to(topRef.current, { y: -currentOffset, ...config });
    gsap.to(bottomRef.current, { y: currentOffset, ...config });
    gsap.to(leftRef.current, { x: -currentOffset, ...config });
    gsap.to(rightRef.current, { x: currentOffset, ...config });
  }, [spread, aimState.isAiming]);

  useGSAP(() => {
    if (!crosshairGroupRef.current) return;
    gsap.to(crosshairGroupRef.current, {
      opacity: isReloading ? 0 : 1,
      duration: 0.2,
      ease: "power2.inOut",
    });
  }, [isReloading]);

  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  if ((!isLocked && !isTouch) || matchState === "ended" || isHoldingTab || isDead) return null;

  const showStreak = streakBanner && nowMs - streakBanner.at < 2600;
  const scopeMeta = SCOPES[aimState.scopeId] || SCOPES.red_dot;
  const weaponMeta = WEAPONS[aimState.weaponId] || WEAPONS.assaultRifle;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 font-tactical">
      {/* Killstreak / Headshot Elimination Callout Banner */}
      {showStreak && streakBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#0a0d14]/92 border-y-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.4)] flex items-center gap-2.5 clip-tactical-sm">
          <Crosshair size={16} className="text-amber-400" />
          <span className="text-sm sm:text-base font-black uppercase tracking-[0.26em] text-amber-300">
            {streakBanner.label}
          </span>
        </div>
      )}

      {/* AUTHENTIC MULTI-SCOPE OPTICS */}
      {aimState.isAiming && aimState.scopeId === "sniper_8x" ? (
        /* 8x Long-Range Variable Mil-Dot Sniper Scope */
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, transparent 34%, rgba(3,5,10,0.95) 36.5%)",
            }}
          >
            <div className="relative w-[70vmin] h-[70vmin] rounded-full border-2 border-slate-500/70 shadow-[inset_0_0_48px_rgba(0,0,0,0.88)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 h-[1px] bg-slate-950/85" />
              <div className="absolute inset-y-0 w-[1px] bg-slate-950/85" />
              <div className="absolute left-0 w-[26%] h-[3px] bg-slate-950" />
              <div className="absolute right-0 w-[26%] h-[3px] bg-slate-950" />
              <div className="absolute bottom-0 h-[26%] w-[3px] bg-slate-950" />

              {[-36, -24, -12, 12, 24, 36].map((pct) => (
                <div
                  key={`hx_${pct}`}
                  className="absolute w-[2px] h-2.5 bg-slate-950"
                  style={{ left: `calc(50% + ${pct}%)` }}
                />
              ))}
              {[10, 20, 30, 40].map((pct, i) => (
                <div
                  key={`vy_${pct}`}
                  className="absolute h-[2px] bg-slate-950"
                  style={{
                    top: `calc(50% + ${pct}%)`,
                    width: `${16 - i * 2}px`,
                  }}
                />
              ))}

              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
              <div className="absolute bottom-7 flex items-center gap-2 px-3 py-1 bg-[#080b12]/90 border border-amber-500/45 text-[10px] font-black tracking-widest text-amber-300 uppercase font-mono">
                <span>{weaponMeta.shortName}</span>
                <span className="text-cyan-400">{aimState.zoom.toFixed(1)}x</span>
                <span className="text-slate-400">
                  {aimState.holdBreath ? "BREATH STEADY" : "SHIFT: STEADY"}
                </span>
              </div>
              <div className="absolute top-6 text-[9px] font-bold tracking-widest text-slate-300/80 uppercase font-mono">
                [{formatKeyCode(cycleScopeKey)}] SWITCH OPTIC
              </div>
            </div>
          </div>
        </div>
      ) : aimState.isAiming && aimState.scopeId === "acog_4x" ? (
        /* 4x ACOG Emerald BDC Chevron Optic */
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, transparent 27%, rgba(5,8,15,0.82) 31%)",
            }}
          >
            <div className="relative w-[54vmin] h-[54vmin] rounded-full border-2 border-emerald-400/60 shadow-[inset_0_0_32px_rgba(0,0,0,0.75)] flex items-center justify-center">
              <div className="absolute inset-x-6 h-[1px] bg-emerald-400/35" />
              <div className="absolute bottom-6 h-[40%] w-[1.5px] bg-emerald-400/60" />
              {[12, 22, 32].map((pct, i) => (
                <div
                  key={`acog_${pct}`}
                  className="absolute h-[1.5px] bg-emerald-400/75"
                  style={{ top: `calc(50% + ${pct}%)`, width: `${18 - i * 4}px` }}
                />
              ))}
              <div className="w-3 h-3 border-t-2 border-l-2 border-emerald-400 rotate-45 translate-y-1 shadow-[0_0_8px_#34d399]" />
              <div className="absolute bottom-4 px-2.5 py-0.5 bg-[#080b12]/90 border border-emerald-400/45 text-[9px] font-black tracking-widest text-emerald-300 uppercase font-mono">
                4x ACOG • {aimState.zoom.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>
      ) : aimState.isAiming && aimState.scopeId === "prism_2x" ? (
        /* 2.5x Tactical Amber Horseshoe Prism Optic */
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, transparent 22%, rgba(5,8,15,0.62) 28%)",
            }}
          >
            <div className="relative w-[44vmin] h-[44vmin] rounded-full border border-amber-400/55 shadow-[inset_0_0_24px_rgba(0,0,0,0.55)] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-b-transparent flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              </div>
              <div className="absolute bottom-4 px-2 py-0.5 bg-[#080b12]/85 border border-amber-400/40 text-[9px] font-black tracking-widest text-amber-300 uppercase font-mono">
                2.5x PRISM • {aimState.zoom.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>
      ) : aimState.isAiming && aimState.scopeId === "holo" ? (
        /* EOTech Cyan Holographic Segmented Reticle */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-16 h-16 rounded-full border-2 border-cyan-400/75 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <div className="absolute -top-1.5 w-0.5 h-2.5 bg-cyan-400" />
            <div className="absolute -bottom-1.5 w-0.5 h-2.5 bg-cyan-400" />
            <div className="absolute -left-1.5 h-0.5 w-2.5 bg-cyan-400" />
            <div className="absolute -right-1.5 h-0.5 w-2.5 bg-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
          </div>
          <div className="absolute translate-y-12 px-2 py-0.5 bg-[#080b12]/80 border border-cyan-400/40 text-[9px] font-black tracking-widest text-cyan-300 uppercase font-mono">
            HOLO {aimState.zoom.toFixed(1)}x
          </div>
        </div>
      ) : aimState.isAiming && aimState.scopeId === "red_dot" ? (
        /* Open Reflex Crimson Red Dot Sight */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-rose-500/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
          </div>
          <div className="absolute translate-y-10 px-2 py-0.5 bg-[#080b12]/75 border border-rose-500/35 text-[9px] font-black tracking-widest text-rose-300 uppercase font-mono">
            {scopeMeta.shortName} {aimState.zoom.toFixed(1)}x
          </div>
        </div>
      ) : aimState.isAiming ? (
        /* Crisp Tactical Iron Sight Alignment */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
          <div className="absolute -left-5 w-3 h-0.5 bg-white/80" />
          <div className="absolute -right-5 w-3 h-0.5 bg-white/80" />
          <div className="absolute translate-y-4 w-0.5 h-3 bg-white/80" />
        </div>
      ) : (
        /* Customizable Hipfire Reticle */
        <>
          {crosshairStyle === "circle" ? (
            <div
              ref={crosshairGroupRef}
              className="absolute rounded-full border-2 transition-all duration-75 flex items-center justify-center"
              style={{
                width: `${Math.max(18, 20 + spread * 1.4)}px`,
                height: `${Math.max(18, 20 + spread * 1.4)}px`,
                borderColor: crosshairColor,
                boxShadow: "0 0 4px rgba(0,0,0,0.85)",
              }}
            >
              <div
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: crosshairColor }}
              />
            </div>
          ) : crosshairStyle === "dot" ? (
            <div
              ref={crosshairGroupRef}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: crosshairColor,
                boxShadow: `0 0 6px ${crosshairColor}, 0 0 2px rgba(0,0,0,0.95)`,
              }}
            />
          ) : (
            <div
              ref={crosshairGroupRef}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                ref={topRef}
                className="absolute w-0.5 h-3 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: crosshairColor }}
              />
              <div
                ref={bottomRef}
                className="absolute w-0.5 h-3 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: crosshairColor }}
              />
              <div
                ref={leftRef}
                className="absolute w-3 h-0.5 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: crosshairColor }}
              />
              <div
                ref={rightRef}
                className="absolute w-3 h-0.5 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: crosshairColor }}
              />
              {crosshairStyle === "tactical" && (
                <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_3px_rgba(0,0,0,0.9)]" />
              )}
            </div>
          )}
        </>
      )}

      {/* Hitmarker X (White = Body, Cyan = Armor Cracked, Gold = Headshot) */}
      {showHit.active && (
        <div className="absolute flex items-center justify-center">
          <div
            className={`${
              showHit.armorBreak
                ? "w-8 h-[3px] bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
                : showHit.hs
                  ? "w-8 h-[3px] bg-amber-300 shadow-[0_0_12px_#fbbf24]"
                  : "w-5 h-0.5 bg-white"
            } rotate-45`}
          />
          <div
            className={`absolute ${
              showHit.armorBreak
                ? "w-8 h-[3px] bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
                : showHit.hs
                  ? "w-8 h-[3px] bg-amber-300 shadow-[0_0_12px_#fbbf24]"
                  : "w-5 h-0.5 bg-white"
            } -rotate-45`}
          />
          {showHit.armorBreak ? (
            <span className="absolute translate-y-6 flex items-center gap-1 text-[10px] font-black tracking-[0.2em] text-cyan-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              <ShieldAlert size={11} /> ARMOR BROKEN
            </span>
          ) : showHit.hs ? (
            <span className="absolute translate-y-6 text-[10px] font-black tracking-[0.22em] text-amber-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              HEADSHOT
            </span>
          ) : null}
        </div>
      )}

      {/* Near-Crosshair Damage Dealt Popups */}
      {showDamageNumbers &&
        dealtPopups.map((p, idx) => {
          const t = Math.min(1, Math.max(0, (nowMs - p.createdAt) / 880));
          if (t >= 1) return null;
          const opacity = Math.max(0, 1 - Math.pow(t, 1.9));
          const translateY = -20 - t * 50;
          const laneX = ((idx % 3) - 1) * 26 + (p.isHeadshot ? 0 : 12);
          const scale = p.isHeadshot ? 1.28 - t * 0.12 : 1.0 - t * 0.08;

          return (
            <div
              key={p.id}
              className="absolute flex flex-col items-center select-none whitespace-nowrap"
              style={{
                opacity,
                transform: `translate(${laneX}px, ${translateY}px) scale(${scale})`,
              }}
            >
              <div
                className={`font-black tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${
                  p.isHeadshot
                    ? "text-xl sm:text-2xl text-amber-300"
                    : "text-base text-emerald-300"
                }`}
              >
                +{Math.round(p.amount)}
                {p.isHeadshot ? " HS" : ""}
              </div>
              {(p.distanceMeters || p.killed) && (
                <div className="text-[9px] font-black uppercase tracking-widest text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  {p.distanceMeters ? `${p.distanceMeters}m` : ""}
                  {p.killed ? " ELIM" : ""}
                </div>
              )}
            </div>
          );
        })}

      {/* Reload Spinner */}
      <div
        className={`absolute transition-opacity duration-200 ${
          isReloading ? "opacity-100" : "opacity-0"
        }`}
      >
        <RotateCw size={24} strokeWidth={2.5} className="text-amber-400 animate-spin" />
      </div>
    </div>
  );
};

export default CrosshairUI;
