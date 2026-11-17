import { useEffect, useRef } from "react";
import { useGameStore, type KillEvent } from "../../../stores/useGameStore";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Crosshair } from "lucide-react";

const KillFeedItem = ({ kill }: { kill: KillEvent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.from(containerRef.current, {
        x: 80,
        scale: 0.9,
        opacity: 0,
        duration: 0.3,
        ease: "back.out(1.5)",
      });
      tl.to(
        containerRef.current,
        { x: 40, opacity: 0, duration: 0.25, ease: "power2.in" },
        "+=4.5",
      );
    },
    { scope: containerRef },
  );

  const shooterClass =
    kill.shooterTeam === "red"
      ? "text-red-400"
      : kill.shooterTeam === "blue"
        ? "text-sky-400"
        : "text-amber-300";

  const targetClass =
    kill.targetTeam === "red"
      ? "text-red-400"
      : kill.targetTeam === "blue"
        ? "text-sky-400"
        : "text-slate-300";

  return (
    <div
      ref={containerRef}
      className="bg-slate-950/85 px-3.5 py-1.5 border border-white/15 border-r-2 border-r-sky-400 shadow-lg text-xs font-bold flex items-center gap-2 backdrop-blur-md"
    >
      <span className={shooterClass}>{kill.shooter}</span>
      <span className="px-1.5 py-0.5 bg-white/10 text-[10px] uppercase tracking-wider text-slate-200 flex items-center gap-1">
        {kill.isHeadshot && <Crosshair size={11} className="text-rose-400" />}
        {kill.weapon}
      </span>
      <span className={targetClass}>{kill.target}</span>
    </div>
  );
};

const KillFeedUI = () => {
  const killFeed = useGameStore((state) => state.killFeed);
  const removeOldKills = useGameStore((state) => state.removeOldKills);

  useEffect(() => {
    const interval = setInterval(() => removeOldKills(), 1000);
    return () => clearInterval(interval);
  }, [removeOldKills]);

  if (killFeed.length === 0) return null;

  return (
    <div className="absolute top-48 right-4 flex flex-col gap-1.5 z-20 pointer-events-none items-end">
      {killFeed.map((kill) => (
        <KillFeedItem key={kill.id} kill={kill} />
      ))}
    </div>
  );
};

export default KillFeedUI;
