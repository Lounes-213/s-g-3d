import { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { WEAPONS, combatState, type WeaponId } from "@block-shooter/shared";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Crosshair, RotateCw } from "lucide-react";

const CrosshairUI = () => {
  const spread = useGameStore((state) => state.crosshairSpread);
  const isLocked = useGameStore((state) => state.isLocked);
  const matchState = useGameStore((state) => state.matchState);
  const localId = useGameStore((state) => state.localId);
  const players = useGameStore((state) => state.players);
  const dealtPopups = useGameStore((state) => state.dealtPopups);
  const streakBanner = useGameStore((state) => state.streakBanner);
  const scoreboardKey = useSettingsStore((state) => state.keybindings.scoreboard);
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
    zoom: number;
  }>({ isAiming: false, weaponId: "assaultRifle", zoom: 1 });
  const [showHit, setShowHit] = useState<{ active: boolean; hs: boolean }>({
    active: false,
    hs: false,
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

  // Poll ADS zoom / optic state cleanly
  useEffect(() => {
    const id = setInterval(() => {
      const st = useGameStore.getState();
      const player = st.localId ? st.players[st.localId] : null;
      const wId = player?.currentWeapon || "assaultRifle";
      const wpn = WEAPONS[wId] || WEAPONS.assaultRifle;
      const aiming = Boolean(combatState.isAiming && st.isLocked);
      setAimState({
        isAiming: aiming,
        weaponId: wId,
        zoom: wpn?.adsZoom || 1.45,
      });
    }, 40);
    return () => clearInterval(id);
  }, []);

  // Animate upward dealt damage popups & killstreak banner cleanly without Date.now() in render
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
        setShowHit({ active: true, hs: state.hitMarker.isHeadshot });
        if (timer) clearTimeout(timer);
        timer = setTimeout(
          () => setShowHit({ active: false, hs: false }),
          state.hitMarker.isHeadshot ? 240 : 160,
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

  if (!isLocked || matchState === "ended" || isHoldingTab || isDead) return null;

  const showStreak = streakBanner && nowMs - streakBanner.at < 2600;
  const isSniperAds = aimState.isAiming && aimState.weaponId === "sniper";
  const isDmrAds = aimState.isAiming && aimState.weaponId === "dmr";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 font-tactical">
      {/* Killstreak / Headshot Elimination Callout Banner */}
      {showStreak && streakBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-950/90 border-y-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.45)] flex items-center gap-2.5 animate-pulse">
          <Crosshair size={16} className="text-amber-400" />
          <span className="text-sm sm:text-base font-black uppercase tracking-[0.28em] text-amber-300">
            {streakBanner.label}
          </span>
        </div>
      )}

      {/* Pro 4.8x Mil-Dot Optical Sniper Scope */}
      {isSniperAds ? (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, transparent 34%, rgba(2,6,23,0.92) 36%)",
            }}
          >
            <div className="relative w-[68vmin] h-[68vmin] rounded-full border-2 border-slate-400/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 h-[1px] bg-slate-900/80" />
              <div className="absolute inset-y-0 w-[1px] bg-slate-900/80" />
              <div className="absolute left-0 w-[24%] h-[2.5px] bg-slate-950" />
              <div className="absolute right-0 w-[24%] h-[2.5px] bg-slate-950" />
              <div className="absolute bottom-0 h-[24%] w-[2.5px] bg-slate-950" />

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
                    width: `${14 - i * 2}px`,
                  }}
                />
              ))}

              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
              <div className="absolute bottom-7 px-2.5 py-0.5 bg-slate-950/85 border border-rose-500/40 text-[10px] font-black tracking-widest text-rose-400 uppercase">
                AWP-X {aimState.zoom.toFixed(1)}x OPTIC
              </div>
            </div>
          </div>
        </div>
      ) : isDmrAds ? (
        /* Unobstructed 2.8x ACOG Chevron Optic for MK-14 EBR */
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[42vmin] h-[42vmin] rounded-full border border-emerald-400/55 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center">
            <div className="absolute inset-x-4 h-[1px] bg-emerald-400/35" />
            <div className="absolute bottom-4 h-[38%] w-[1.5px] bg-emerald-400/55" />
            {/* Precision Illuminated Chevron */}
            <div
              className="w-2.5 h-2.5 border-t-2 border-l-2 rotate-45 translate-y-1"
              style={{ borderColor: crosshairColor, boxShadow: `0 0 8px ${crosshairColor}` }}
            />
            <div className="absolute bottom-3 px-2 py-0.5 bg-slate-950/75 border border-emerald-400/40 text-[9px] font-black tracking-widest text-emerald-300 uppercase">
              ACOG {aimState.zoom.toFixed(1)}x
            </div>
          </div>
        </div>
      ) : aimState.isAiming ? (
        /* Ultra-Clean Holographic Reflex Optic — Zero Obstruction */
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full border border-dashed opacity-55 flex items-center justify-center"
            style={{ borderColor: crosshairColor }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: crosshairColor,
                boxShadow: `0 0 8px ${crosshairColor}`,
              }}
            />
          </div>
          <div
            className="absolute translate-y-11 px-1.5 py-0.5 bg-slate-950/70 border text-[9px] font-black tracking-widest uppercase"
            style={{ borderColor: `${crosshairColor}66`, color: crosshairColor }}
          >
            {aimState.zoom.toFixed(2)}x OPTIC
          </div>
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

      {/* Hitmarker X */}
      {showHit.active && (
        <div className="absolute flex items-center justify-center">
          <div
            className={`${
              showHit.hs
                ? "w-8 h-[3px] bg-amber-300 shadow-[0_0_12px_#fbbf24]"
                : "w-5 h-0.5 bg-white"
            } rotate-45`}
          />
          <div
            className={`absolute ${
              showHit.hs
                ? "w-8 h-[3px] bg-amber-300 shadow-[0_0_12px_#fbbf24]"
                : "w-5 h-0.5 bg-white"
            } -rotate-45`}
          />
          {showHit.hs && (
            <span className="absolute translate-y-6 text-[10px] font-black tracking-[0.22em] text-amber-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              HEADSHOT
            </span>
          )}
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
                {p.isHeadshot ? " HEADSHOT!" : ""}
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

