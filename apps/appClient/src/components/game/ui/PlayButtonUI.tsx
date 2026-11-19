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
import {
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Play,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
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
  const setMobileHudEditorOpen = useGameStore((state) => state.setMobileHudEditorOpen);

  const perspective = useSettingsStore((state) => state.perspective);
  const togglePerspective = useSettingsStore((state) => state.togglePerspective);
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
        setTimeout(() => setIsCooldown(false), 700);
      }
    };
    document.addEventListener("pointerlockchange", handleLockChange);
    return () =>
      document.removeEventListener("pointerlockchange", handleLockChange);
  }, []);

  const me = localId ? players[localId] : null;
  const isHidden = isLocked || matchState === "ended";
  const mapInfo = MAPS[mapId] || MAPS.royale_valley;

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
    void navigator.clipboard
      ?.writeText(roomId)
      .then(() => {
        toast.success(`Room code ${roomId} copied!`);
      })
      .catch(() => {});
  };

  const isTeamMode = mode === "tdm" || mode === "domination";
  const allPlayersList = Object.values(players);
  const blueCount = allPlayersList.filter((p) => p.team === "blue").length;
  const redCount = allPlayersList.filter((p) => p.team === "red").length;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-40 transition-opacity duration-200 font-tactical p-3 ${
        isHidden
          ? "opacity-0 pointer-events-none"
          : "opacity-100 bg-black/65 pointer-events-auto"
      }`}
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto border border-amber-500/35 bg-[#090d16] text-white shadow-2xl p-5 md:p-6 clip-tactical">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4 mb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-400">
              S-G-3D {playMode.toUpperCase()} DEPLOYMENT
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
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-amber-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <span>{roomId}</span>
              <Copy size={12} />
            </button>
            <span className="px-3 py-1 bg-white/5 border border-white/15 text-slate-300 text-xs font-bold uppercase flex items-center gap-1.5 font-mono">
              <Users size={13} className="text-cyan-400" />
              {Object.keys(players).length}
            </span>
          </div>
        </div>

        {roomError && (
          <div className="mb-4 p-2.5 bg-red-500/15 border border-red-500/50 text-xs font-bold text-red-400 uppercase tracking-wider">
            {roomError}
          </div>
        )}

        {/* Quick Camera, HUD, Mobile Customizer, Voice & Settings */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              togglePerspective();
            }}
            className="py-2.5 px-2 bg-[#111622] border border-cyan-400/40 text-white text-[11px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-400"
          >
            <Eye size={13} className="text-cyan-400" />
            <span>{perspective.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              toggleControls();
            }}
            className="py-2.5 px-2 bg-[#111622] border border-white/15 text-white text-[11px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:border-amber-400"
          >
            {showControls ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-400" />}
            <span>{showControls ? "HUD ON" : "HUD OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMobileHudEditorOpen(true);
            }}
            className="py-2.5 px-2 bg-[#111622] border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-500 hover:text-slate-950 transition-colors"
          >
            <Smartphone size={13} />
            <span>Touch HUD</span>
          </button>

          <button
            type="button"
            disabled={playMode === "solo"}
            onClick={() => {
              soundEngine.playClick();
              setMicEnabled(!micEnabled);
            }}
            className={`py-2.5 px-2 border text-[11px] font-black uppercase flex items-center justify-center gap-1.5 ${
              playMode === "solo"
                ? "opacity-35 cursor-not-allowed bg-[#111622] border-white/10"
                : micEnabled
                  ? "bg-emerald-600 border-emerald-400 text-white cursor-pointer"
                  : "bg-[#111622] border-white/15 text-white cursor-pointer"
            }`}
          >
            {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            <span>{micEnabled ? "MIC ON" : "MIC"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSidebarOpen(true);
            }}
            className="py-2.5 px-2 bg-[#111622] border border-white/15 hover:border-amber-400 text-white text-[11px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>

        {/* Quick 14-Weapon Loadout Switcher */}
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
            Arsenal Loadout ({WEAPON_ORDER.length} Weapons • Press [Y] In-Game To Switch Scope)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {WEAPON_ORDER.map((wId) => {
              const w = WEAPONS[wId];
              const active = me?.currentWeapon === wId;
              return (
                <button
                  key={wId}
                  type="button"
                  onClick={() => handleWeaponPick(wId)}
                  className={`py-2 px-2 border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                    active
                      ? "bg-amber-500 border-amber-400 text-slate-950"
                      : "bg-[#111622] border-white/10 text-slate-300 hover:border-amber-400/50"
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
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
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
                        ? "bg-cyan-500 border-cyan-400 text-slate-950"
                        : "bg-[#111622] border-white/10 text-slate-300 hover:text-white"
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
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Squad Side ({blueCount} Blue vs {redCount} Red)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTeamSwitch("blue")}
                className={`py-2.5 px-3 border text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all ${
                  me?.team === "blue"
                    ? "bg-blue-600 border-blue-400 text-white"
                    : "bg-[#111622] border-white/15 text-slate-300 hover:border-blue-500"
                }`}
              >
                <span>Blue Strike</span>
                <span>{blueCount}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTeamSwitch("red")}
                className={`py-2.5 px-3 border text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all ${
                  me?.team === "red"
                    ? "bg-red-600 border-red-400 text-white"
                    : "bg-[#111622] border-white/15 text-slate-300 hover:border-red-500"
                }`}
              >
                <span>Red Vanguard</span>
                <span>{redCount}</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Enter Combat Button */}
        <button
          onClick={() => {
            soundEngine.unlock();
            soundEngine.playClick();
          }}
          disabled={isCooldown}
          id="play-button"
          className={`w-full py-4 flex items-center justify-center gap-3 font-black text-lg sm:text-xl tracking-[0.22em] uppercase transition-all clip-tactical-btn ${
            isHidden
              ? "pointer-events-none"
              : isCooldown
                ? "cursor-not-allowed opacity-50 bg-slate-800 text-slate-400"
                : "cursor-pointer bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:brightness-110 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
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
