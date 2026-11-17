import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";

const MatchTimerUI = () => {
  const matchState = useGameStore((state) => state.matchState);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const mode = useGameStore((state) => state.mode);
  const teamScores = useGameStore((state) => state.teamScores);
  const roomId = useGameStore((state) => state.roomId);
  const dominationOwner = useGameStore((state) => state.dominationOwner);
  const stormZone = useGameStore((state) => state.stormZone);
  const players = useGameStore((state) => state.players);
  const localId = useGameStore((state) => state.localId);
  const theme = useSettingsStore((state) => state.theme);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (matchState === "waiting") return null;

  const isLight = theme === "light";

  const modeName =
    mode === "tdm"
      ? "Team Deathmatch"
      : mode === "ffa"
        ? "Free-For-All"
        : mode === "br"
          ? "Battle Royale"
          : "Zone Control";

  const me = localId ? players[localId] : null;
  const playerList = Object.values(players);
  const topLeader = [...playerList].sort((a, b) => b.kills - a.kills)[0];
  const aliveCount = playerList.filter((p) => !p.isDead).length;

  const boxClass = isLight
    ? "bg-white/95 border-slate-300 text-slate-900 shadow-lg"
    : "bg-slate-950/92 border-white/20 text-white shadow-2xl";

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 z-10 pointer-events-none flex flex-col items-center font-tactical">
      <div className={`px-5 py-0.5 border border-b-0 flex items-center gap-3 ${boxClass}`}>
        <span className="text-sky-600 text-[11px] font-black tracking-[0.2em] uppercase">
          {modeName}
        </span>
        <span className="opacity-40 text-[10px]">|</span>
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">
          ROOM: {roomId}
        </span>
      </div>

      <div className={`flex items-center border ${boxClass}`}>
        {mode === "br" ? (
          <div className="px-4 py-1.5 bg-emerald-500/15 border-r border-emerald-500/30 text-center min-w-24">
            <div className="text-[9px] font-bold uppercase text-emerald-600">Alive</div>
            <div className="text-base font-black">{aliveCount}</div>
          </div>
        ) : mode === "ffa" ? (
          <div className="px-4 py-1.5 bg-amber-500/15 border-r border-amber-500/30 text-center min-w-24">
            <div className="text-[9px] font-bold uppercase text-amber-600">Leader</div>
            <div className="text-base font-black">
              {topLeader ? `${topLeader.kills} K` : "0 K"}
            </div>
          </div>
        ) : (
          <div className="bg-red-600/15 px-5 py-1.5 flex items-center justify-center min-w-18 border-r border-red-500/30">
            <span className="text-red-500 font-black text-2xl tabular-nums">
              {teamScores.red}
            </span>
          </div>
        )}

        <div className="px-6 py-1.5 flex flex-col items-center justify-center min-w-28">
          <span
            className={`font-mono font-black text-2xl tabular-nums leading-none ${
              timeRemaining <= 30 ? "text-red-500 animate-pulse" : ""
            }`}
          >
            {formatTime(timeRemaining)}
          </span>
        </div>

        {mode === "br" ? (
          <div className="px-4 py-1.5 bg-sky-500/15 border-l border-sky-500/30 text-center min-w-24">
            <div className="text-[9px] font-bold uppercase text-sky-600">Kills</div>
            <div className="text-base font-black">{me ? me.kills : 0}</div>
          </div>
        ) : mode === "ffa" ? (
          <div className="px-4 py-1.5 bg-emerald-500/15 border-l border-emerald-500/30 text-center min-w-24">
            <div className="text-[9px] font-bold uppercase text-emerald-600">You</div>
            <div className="text-base font-black">{me ? `${me.kills} K` : "0 K"}</div>
          </div>
        ) : (
          <div className="bg-blue-600/15 px-5 py-1.5 flex items-center justify-center min-w-18 border-l border-blue-500/30">
            <span className="text-blue-500 font-black text-2xl tabular-nums">
              {teamScores.blue}
            </span>
          </div>
        )}
      </div>

      {mode === "domination" && (
        <div className={`mt-1 px-3 py-0.5 border text-[10px] font-black uppercase tracking-widest ${boxClass}`}>
          Zone Status:{" "}
          <span
            className={
              dominationOwner === "red"
                ? "text-red-500"
                : dominationOwner === "blue"
                  ? "text-blue-500"
                  : "text-sky-600"
            }
          >
            {dominationOwner === "none" ? "CONTESTED" : `${dominationOwner.toUpperCase()} CONTROL`}
          </span>
        </div>
      )}

      {mode === "br" && stormZone && (
        <div className={`mt-1 px-3 py-0.5 border text-[10px] font-black uppercase tracking-widest ${boxClass}`}>
          Storm Phase {stormZone.phase} • Safe Radius:{" "}
          <span className="text-sky-600">{Math.round(stormZone.currentRadius)}m</span> •{" "}
          <span className="text-rose-500">{stormZone.dps} DPS</span>
        </div>
      )}
    </div>
  );
};

export default MatchTimerUI;
