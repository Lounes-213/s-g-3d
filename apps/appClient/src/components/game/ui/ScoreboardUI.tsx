import { useEffect, useState } from "react";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { CHARACTERS } from "@block-shooter/shared";
import { Award, Crown } from "lucide-react";

const ScoreboardUI = () => {
  const players = useGameStore((state) => state.players);
  const localId = useGameStore((state) => state.localId);
  const matchState = useGameStore((state) => state.matchState);
  const mode = useGameStore((state) => state.mode);
  const teamScores = useGameStore((state) => state.teamScores);
  const roomId = useGameStore((state) => state.roomId);
  const isLocked = useGameStore((state) => state.isLocked);
  const scoreboardKey = useSettingsStore((state) => state.keybindings.scoreboard);
  const theme = useSettingsStore((state) => state.theme);

  const [isHoldingTab, setIsHoldingTab] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === scoreboardKey || e.key === "Tab") {
        e.preventDefault();
        setIsHoldingTab(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === scoreboardKey || e.key === "Tab") {
        e.preventDefault();
        setIsHoldingTab(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [scoreboardKey]);

  const shouldShow = (isHoldingTab && isLocked) || matchState === "ended";
  if (!shouldShow) return null;

  const isLight = theme === "light";

  const allPlayers = Object.entries(players).map(([id, data]) => ({
    id,
    ...data,
  }));

  const me = localId ? allPlayers.find((p) => p.id === localId) : null;
  const mvp = [...allPlayers].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0];

  let outcomeLabel = "MATCH COMPLETE";
  let outcomeTone = "bg-sky-600 text-white border-sky-400";
  if (matchState === "ended" && me) {
    const topKills = Math.max(...allPlayers.map((p) => p.kills), 0);
    const didWin =
      mode === "br"
        ? !me.isDead
        : mode === "ffa"
          ? me.kills >= topKills && me.kills > 0
          : me.team === "red"
            ? teamScores.red >= teamScores.blue
            : teamScores.blue >= teamScores.red;
    outcomeLabel = didWin ? "VICTORY" : "DEFEAT";
    outcomeTone = didWin
      ? "bg-emerald-600/95 text-white border-emerald-400"
      : "bg-rose-600/95 text-white border-rose-400";
  }

  const postMatchBanner =
    matchState === "ended" ? (
      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className={`md:col-span-2 border-2 px-4 py-3 flex items-center justify-between ${outcomeTone}`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] opacity-85">
              Post-Match Results • {mode.toUpperCase()}
            </div>
            <div className="text-2xl sm:text-3xl font-black uppercase tracking-widest">
              {outcomeLabel}
            </div>
          </div>
          <div className="text-right">
            {mode === "tdm" || mode === "domination" ? (
              <div className="text-lg font-black uppercase">
                BLUE {teamScores.blue} — {teamScores.red} RED
              </div>
            ) : (
              <div className="text-lg font-black uppercase">
                {me ? `${me.kills} KILLS • ${me.deaths} DEATHS` : "FINAL STANDINGS"}
              </div>
            )}
            <div className="text-[10px] uppercase tracking-wider opacity-85">
              Next round launching in 5s...
            </div>
          </div>
        </div>

        {mvp && (
          <div
            className={`border-2 px-4 py-3 flex items-center justify-between ${
              isLight
                ? "bg-amber-50 border-amber-400 text-slate-900"
                : "bg-slate-950/95 border-amber-400/70 text-white"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
                <Crown size={12} /> Match MVP
              </div>
              <div className="text-base font-black uppercase truncate max-w-[160px]">
                {mvp.name}
              </div>
              <div className="text-[11px] opacity-75">
                {mvp.kills}K / {mvp.deaths}D ({(mvp.kills / Math.max(1, mvp.deaths)).toFixed(2)} K/D)
              </div>
            </div>
            <Award size={28} className="text-amber-500 shrink-0" />
          </div>
        )}
      </div>
    ) : null;

  const renderTable = (
    title: string,
    list: typeof allPlayers,
    borderColor: string,
    textColor: string,
  ) => (
    <div className="w-full flex-1">
      <div
        className={`border-t-4 ${borderColor} border overflow-hidden ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950/95 border-white/15 text-white"
        }`}
      >
        <h3 className={`text-center font-black tracking-widest uppercase py-2 ${textColor}`}>
          {title}
        </h3>
        <table className="w-full text-sm text-left">
          <thead
            className={`uppercase text-xs ${
              isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"
            }`}
          >
            <tr>
              <th className="px-4 py-2">Operator</th>
              <th className="px-3 py-2">Class</th>
              {mode === "br" && <th className="px-3 py-2 text-center">Status</th>}
              <th className="px-3 py-2 text-center">K</th>
              <th className="px-3 py-2 text-center">D</th>
              <th className="px-3 py-2 text-center">K/D</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const kd = (p.kills / Math.max(1, p.deaths)).toFixed(2);
              const isMe = p.id === localId;
              const charName = CHARACTERS[p.characterId]?.codename || "STRIKER";

              return (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 ${
                    isLight ? "border-slate-100" : "border-white/5"
                  } ${isMe ? "bg-sky-500/15 font-bold" : ""}`}
                >
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 bg-sky-600 text-white uppercase">
                        YOU
                      </span>
                    )}
                    {p.isBot && (
                      <span className="text-[10px] px-1.5 bg-slate-500 text-white uppercase">
                        BOT
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs opacity-65">{charName}</td>
                  {mode === "br" && (
                    <td className="px-3 py-2 text-center text-xs font-black uppercase">
                      <span className={p.isDead ? "text-rose-500" : "text-emerald-600"}>
                        {p.isDead ? "OUT" : "ALIVE"}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2 text-center font-bold">{p.kills}</td>
                  <td className="px-3 py-2 text-center opacity-65">{p.deaths}</td>
                  <td className="px-3 py-2 text-center opacity-80">{kd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (mode === "ffa" || mode === "br") {
    const sorted = [...allPlayers].sort((a, b) => {
      if (mode === "br" && a.isDead !== b.isDead) return a.isDead ? 1 : -1;
      return b.kills - a.kills;
    });
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center p-8 pointer-events-none">
        <div className="w-full max-w-4xl bg-black/55 p-4 shadow-2xl">
          {postMatchBanner}
          {renderTable(
            mode === "br" ? "Battle Royale Standings" : "Free-For-All Standings",
            sorted,
            mode === "br" ? "border-emerald-500" : "border-amber-400",
            mode === "br" ? "text-emerald-500" : "text-amber-500",
          )}
        </div>
      </div>
    );
  }

  const redTeam = allPlayers
    .filter((p) => p.team === "red")
    .sort((a, b) => b.kills - a.kills);
  const blueTeam = allPlayers
    .filter((p) => p.team === "blue")
    .sort((a, b) => b.kills - a.kills);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-8 pointer-events-none">
      <div className="w-full max-w-5xl bg-black/60 p-4 shadow-2xl space-y-3">
        {postMatchBanner}
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/80 px-1">
          <span>ROOM CODE: {roomId}</span>
          <span>Press ESC to switch side or loadout</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          {renderTable(
            `Red Vanguard (${redTeam.length})`,
            redTeam,
            "border-red-500",
            "text-red-500",
          )}
          {renderTable(
            `Blue Strike (${blueTeam.length})`,
            blueTeam,
            "border-blue-500",
            "text-blue-500",
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreboardUI;
