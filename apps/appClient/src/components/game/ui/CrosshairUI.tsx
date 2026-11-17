import { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { WEAPONS, combatState } from "@block-shooter/shared";
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

  const me = localId ? players[localId] : null;
  const isReloading = me?.isReloading || false;
  const isDead = me?.isDead || false;

  const [isHoldingTab, setIsHoldingTab] = useState(false);
  const [aimState, setAimState] = useState<{
    isAiming: boolean;
    isSniper: boolean;
    zoom: number;
  }>({ isAiming: false, isSniper: false, zoom: 1 });
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

  // Poll ADS zoom / sniper scope state cleanly
  useEffect(() => {
    const id = setInterval(() => {
      const st = useGameStore.getState();
      const player = st.localId ? st.players[st.localId] : null;
      const wpn = player ? WEAPONS[player.currentWeapon] : WEAPONS.assaultRifle;
      const aiming = Boolean(combatState.isAiming && st.isLocked);
      setAimState({
        isAiming: aiming,
        isSniper: Boolean(aiming && player?.currentWeapon === "sniper"),
        zoom: wpn?.adsZoom || 1.45,
      });
    }, 45);
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
    const baseOffset = 7;
    const currentOffset = baseOffset + spread;
    const config = { duration: 0.12, ease: "power2.out", overwrite: "auto" as const };
    gsap.to(topRef.current, { y: -currentOffset, ...config });
    gsap.to(bottomRef.current, { y: currentOffset, ...config });
    gsap.to(leftRef.current, { x: -currentOffset, ...config });
    gsap.to(rightRef.current, { x: currentOffset, ...config });
  }, [spread]);

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

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 font-tactical">
      {/* Killstreak / Headshot Elimination Callout Banner */}
      {showStreak && streakBanner && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-950/90 border-y-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.45)] flex items-center gap-2.5 animate-pulse"
        >
          <Crosshair size={16} className="text-amber-400" />
          <span className="text-sm sm:text-base font-black uppercase tracking-[0.28em] text-amber-300">
            {streakBanner.label}
          </span>
        </div>
      )}

      {/* Pro 4.8x Mil-Dot Optical Sniper Scope */}
      {aimState.isSniper ? (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, transparent 28.5%, rgba(2,6,23,0.98) 30%)",
            }}
          >
            <div className="relative w-[58vmin] h-[58vmin] rounded-full border-2 border-slate-400/60 shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
              {/* Main Crosshair Wires */}
              <div className="absolute inset-x-0 h-[1px] bg-slate-900/90" />
              <div className="absolute inset-y-0 w-[1px] bg-slate-900/90" />

              {/* Thick Outer Post Stadia Bars */}
              <div className="absolute left-0 w-[26%] h-[3px] bg-slate-950" />
              <div className="absolute right-0 w-[26%] h-[3px] bg-slate-950" />
              <div className="absolute bottom-0 h-[26%] w-[3px] bg-slate-950" />

              {/* Mil-Dot Horizontal Calibration Ticks */}
              {[-36, -24, -12, 12, 24, 36].map((pct) => (
                <div
                  key={`hx_${pct}`}
                  className="absolute w-[2px] h-2.5 bg-slate-950"
                  style={{ left: `calc(50% + ${pct}%)` }}
                />
              ))}

              {/* Mil-Dot Vertical Drop Compensation Bars */}
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

              {/* Illuminated Red Precision Center Reticle */}
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />

              {/* Optical Telemetry Readout */}
              <div className="absolute bottom-7 px-2.5 py-0.5 bg-slate-950/85 border border-rose-500/40 text-[10px] font-black tracking-widest text-rose-400 uppercase">
                AWP-X {aimState.zoom.toFixed(1)}x OPTIC
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={crosshairGroupRef}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              ref={topRef}
              className="absolute bg-cyan-300 w-0.5 h-3 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
            />
            <div
              ref={bottomRef}
              className="absolute bg-cyan-300 w-0.5 h-3 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
            />
            <div
              ref={leftRef}
              className="absolute bg-cyan-300 w-3 h-0.5 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
            />
            <div
              ref={rightRef}
              className="absolute bg-cyan-300 w-3 h-0.5 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
            />
          </div>
          <div className="absolute bg-white w-1 h-1 rounded-full shadow-[0_0_3px_rgba(0,0,0,0.9)]" />
          {aimState.isAiming && (
            <div className="absolute translate-y-9 px-1.5 py-0.5 bg-slate-950/75 border border-cyan-400/40 text-[9px] font-black tracking-widest text-cyan-300 uppercase">
              {aimState.zoom.toFixed(2)}x ZOOM
            </div>
          )}
        </>
      )}

      {/* Hitmarker X (Larger Gold/Crimson Burst on Headshot) */}
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

      {/* Near-Crosshair Damage Dealt Popups (+ Rising UPWARD) */}
      {dealtPopups.map((p, idx) => {
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

