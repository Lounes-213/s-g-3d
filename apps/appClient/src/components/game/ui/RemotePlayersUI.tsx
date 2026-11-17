import { Html } from "@react-three/drei";
import { Volume2 } from "lucide-react";
import { useGameStore, type PlayerState } from "../../../stores/useGameStore";
import { CHARACTERS } from "@block-shooter/shared";

export default function RemotePlayersUI({ player }: { player: PlayerState }) {
  const speakingPeers = useGameStore((s) => s.speakingPeers);
  const charCfg = CHARACTERS[player.characterId] || CHARACTERS.striker;
  const maxHealth = player.maxHealth || charCfg.maxHealth || 100;
  const displayHealth = Math.max(0, player.health);
  const pct = Math.min(100, (displayHealth / maxHealth) * 100);
  const shield = Math.max(0, player.shield || 0);
  const isSpeaking = player.id ? Boolean(speakingPeers[player.id]) : false;

  return (
    <Html position={[0, 1.55, 0]} center transform sprite scale={0.5}>
      <div className="flex flex-col items-center gap-1 pointer-events-none select-none min-w-28">
        <div className="flex items-center gap-1.5 bg-slate-950/85 px-2 py-0.5 border border-white/25">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: player.color }}
          />
          <span className="text-white text-[10px] font-black tracking-wide whitespace-nowrap">
            {player.name}
          </span>
          {isSpeaking && <Volume2 size={10} className="text-emerald-400" />}
        </div>

        <div className="w-24 h-1.5 bg-slate-900 border border-white/20 overflow-hidden">
          <div
            className={`h-full ${
              pct <= 30
                ? "bg-red-500"
                : player.team === "red"
                  ? "bg-red-400"
                  : player.team === "blue"
                    ? "bg-sky-400"
                    : "bg-amber-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {shield > 0 && <div className="w-24 h-1 bg-emerald-400/90" />}
      </div>
    </Html>
  );
}
