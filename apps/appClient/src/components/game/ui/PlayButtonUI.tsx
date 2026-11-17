import { useEffect, useState } from "react";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { useAppStore } from "../../../stores/useAppStore";
import { useVoiceStore } from "../../../hooks/useVoiceChat";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  MAPS,
  WEAPONS,
  WEAPON_ORDER,
} from "@block-shooter/shared";
import { soundEngine } from "../../../utils/soundEngine";
import { soloEngine } from "../../../utils/soloEngine";
import { Copy, Crosshair, Eye, EyeOff, Mic, MicOff, Play, Settings, Users } from "lucide-react";
import toast from "react-hot-toast";

const PlayButtonUI = () => {
  const isLocked = useGameStore((state) => state.isLocked);
  const matchState = useGameStore((state) => state.matchState);
  const roomId = useGameStore((state) => state.roomId);
  const roomName = useGameStore((state) => state.roomName);
  const mapId = useGameStore((state) => state.mapId);
  const mode = useGameStore((state) => state.mode);
  const players = useGameStore((state) => state.players);
  const localId = useGameStore((state) => state.localId);
  const channel = useGameStore((state) => state.channel);
  const playMode = useGameStore((state) => state.sessionConfig.playMode);
  const roomError = useGameStore((state) => state.roomError);

  const perspective = useSettingsStore((state) => state.perspective);
  const togglePerspective = useSettingsStore((state) => state.togglePerspective);
  const theme = useSettingsStore((state) => state.theme);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const showControls = useAppStore((state) => state.showControls);
  const toggleControls = useAppStore((state) => state.toggleControls);

  const micEnabled = useVoiceStore((s) => s.micEnabled);
  const setMicEnabled = useVoiceStore((s) => s.setMicEnabled);

  const [isCooldown, setIsCooldown] = useState(false);

  useEffect(() => {
    const handleLockChange = () => {
      if (!document.pointerLockElement) {
        setIsCooldown(true);
        setTimeout(() => setIsCooldown(false), 900);
      }
    };
    document.addEventListener("pointerlockchange", handleLockChange);
    return () =>
      document.removeEventListener("pointerlockchange", handleLockChange);
  }, []);

  const me = localId ? players[localId] : null;
  const isHidden = isLocked || matchState === "ended";
  const mapInfo = MAPS[mapId] || MAPS.veridian_04;
  const isLight = theme === "light";

  const handleWeaponPick = (wId: (typeof WEAPON_ORDER)[number]) => {
    soundEngine.playClick();
    useGameStore.getState().setSessionConfig({ weaponId: wId });
    if (playMode === "solo") soloEngine.switchWeaponLocal(wId);
    else if (channel) channel.emit("switchWeapon", wId);
  };

  const handleCharacterPick = (cId: (typeof CHARACTER_ORDER)[number]) => {
    soundEngine.playClick();
    useGameStore.getState().setSessionConfig({ characterId: cId });
    if (channel) channel.emit("selectCharacter", cId);
  };

  const handleTeamSwitch = (team: "red" | "blue") => {
    soundEngine.playClick();
    useGameStore.getState().setSessionConfig({ preferredTeam: team });
    if (playMode === "solo") {
      soloEngine.switchTeamLocal(team);
    } else if (channel) {
      channel.emit("switchTeam", team);
    }
  };

  const handleCopyCode = () => {
    soundEngine.playClick();
    void navigator.clipboard?.writeText(roomId).then(() => {
      toast.success(`Room code ${roomId} copied!`);
    }).catch(() => {});
  };

  const isTeamMode = mode === "tdm" || mode === "domination";
  const allPlayersList = Object.values(players);
  const blueCount = allPlayersList.filter((p) => p.team === "blue").length;
  const redCount = allPlayersList.filter((p) => p.team === "red").length;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-40 transition-opacity duration-200 font-tactical ${
        isHidden
          ? "opacity-0 pointer-events-none"
          : "opacity-100 bg-black/50 pointer-events-auto"
      }`}
    >
      <div
        className={`w-full max-w-2xl mx-4 border shadow-2xl p-6 md:p-7 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950 border-white/20 text-white"
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b pb-4 mb-5 ${
            isLight ? "border-slate-200" : "border-white/10"
          }`}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-600">
              S-G-3D // {playMode.toUpperCase()} DEPLOYMENT
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider">
              {roomName} — {mapInfo.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy room code to invite friends"
              className={`px-3 py-1 border text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  : "bg-white/5 border-white/15 text-amber-300 hover:bg-white/10"
              }`}
            >
              <span>CODE: {roomId}</span>
              <Copy size={12} />
            </button>
            <span
              className={`px-3 py-1 border text-xs font-bold uppercase flex items-center gap-1.5 ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-700"
                  : "bg-white/5 border-white/15 text-slate-300"
              }`}
            >
              <Users size={13} className="text-sky-600" />
              {Object.keys(players).length}
            </span>
          </div>
        </div>

        {roomError && (
          <div className="mb-4 p-2.5 bg-red-500/15 border border-red-500/50 text-xs font-bold text-red-600 uppercase tracking-wider">
            {roomError}
          </div>
        )}

        {/* Quick Camera, Voice, Hide HUD & Settings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              togglePerspective();
            }}
            className={`py-2.5 px-3 border text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              isLight
                ? "bg-slate-50 border-sky-500 text-sky-700"
                : "bg-slate-900 border-sky-400/40 text-white"
            }`}
          >
            <Eye size={14} />
            <span>{perspective.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              toggleControls();
            }}
            className={`py-2.5 px-3 border text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-800"
                : "bg-slate-900 border-white/20 text-white"
            }`}
          >
            {showControls ? <Eye size={14} /> : <EyeOff size={14} className="text-rose-500" />}
            <span>{showControls ? "HUD ON" : "HUD OFF"}</span>
          </button>

          <button
            type="button"
            disabled={playMode === "solo"}
            onClick={() => {
              soundEngine.playClick();
              setMicEnabled(!micEnabled);
            }}
            className={`py-2.5 px-3 border text-xs font-black uppercase flex items-center justify-center gap-1.5 ${
              playMode === "solo"
                ? "opacity-40 cursor-not-allowed border-slate-300"
                : micEnabled
                  ? "bg-emerald-600 border-emerald-500 text-white cursor-pointer"
                  : isLight
                    ? "bg-slate-50 border-slate-300 text-slate-800 cursor-pointer"
                    : "bg-slate-900 border-white/20 text-white cursor-pointer"
            }`}
          >
            {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{micEnabled ? "MIC ON" : "MIC OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSidebarOpen(true);
            }}
            className={`py-2.5 px-3 border text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              isLight
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-900 border-white/20 text-white"
            }`}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>

        {/* Quick Weapon Switch */}
        <div className="mb-5">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">
            Active Weapon Loadout
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {WEAPON_ORDER.map((wId) => {
              const w = WEAPONS[wId];
              const active = me?.currentWeapon === wId;
              return (
                <button
                  key={wId}
                  type="button"
                  onClick={() => handleWeaponPick(wId)}
                  className={`py-2 px-2 border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? "bg-sky-600 border-sky-500 text-white"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400"
                        : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {w.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Character Switch (Online/Room) */}
        {playMode !== "solo" && (
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">
              Operator Class
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CHARACTER_ORDER.map((cId) => {
                const c = CHARACTERS[cId];
                const active = me?.characterId === cId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => handleCharacterPick(cId)}
                    className={`py-2 px-2 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                      active
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : isLight
                          ? "bg-slate-50 border-slate-200 text-slate-700"
                          : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {c.codename}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Side / Team Switch (TDM & Domination) */}
        {isTeamMode && (
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">
              Choose Side / Squad ({blueCount} Blue vs {redCount} Red)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTeamSwitch("blue")}
                className={`py-2.5 px-3 border text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all ${
                  me?.team === "blue"
                    ? "bg-blue-600 border-blue-400 text-white shadow"
                    : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-500"
                      : "bg-slate-900 border-white/15 text-slate-300 hover:border-blue-500"
                }`}
              >
                <span>Blue Strike</span>
                <span className="text-[11px] opacity-85">{blueCount}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTeamSwitch("red")}
                className={`py-2.5 px-3 border text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all ${
                  me?.team === "red"
                    ? "bg-red-600 border-red-400 text-white shadow"
                    : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-red-500"
                      : "bg-slate-900 border-white/15 text-slate-300 hover:border-red-500"
                }`}
              >
                <span>Red Vanguard</span>
                <span className="text-[11px] opacity-85">{redCount}</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Play / Lock Pointer Button */}
        <button
          onClick={() => {
            soundEngine.unlock();
            soundEngine.playClick();
          }}
          disabled={isCooldown}
          id="play-button"
          className={`w-full py-4 flex items-center justify-center gap-3 font-black text-xl tracking-[0.2em] uppercase transition-all border-2 ${
            isHidden
              ? "pointer-events-none"
              : isCooldown
                ? "cursor-not-allowed opacity-50 bg-slate-800 border-slate-600 text-slate-400"
                : "cursor-pointer bg-gradient-to-r from-sky-600 to-cyan-500 border-sky-400 text-white hover:brightness-110 shadow-xl"
          }`}
        >
          {isCooldown ? (
            <span>Initializing...</span>
          ) : (
            <>
              <Play size={22} fill="currentColor" />
              <span>Enter Combat ({mode.toUpperCase()})</span>
              <Crosshair size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PlayButtonUI;
