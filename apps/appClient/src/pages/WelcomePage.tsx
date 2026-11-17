import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { io } from "socket.io-client";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CHARACTER_SKINS,
  MAP_ORDER,
  MAPS,
  SKIN_ORDER,
  WEAPONS,
  WEAPON_ORDER,
  type CharacterId,
  type GameMode,
  type MapId,
  type PlayMode,
  type SkinId,
  type WeaponId,
} from "@block-shooter/shared";
import {
  Bot,
  Crosshair,
  Eye,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  Moon,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sun,
  Trophy,
  UserCheck,
  Users,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useGameStore, type PublicRoomSummary } from "../stores/useGameStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { signInOperator } from "../services/firebaseService";
import { CharacterModel3D } from "../components/game/CharacterModel3D";
import { listServerlessPublicRooms } from "../utils/serverlessRoomSync";
import { soundEngine } from "../utils/soundEngine";
import SideBar from "../components/SideBar";
import { OperatorAvatar } from "../components/OperatorAvatar";
import { AccountModal, FriendsModal, LeaderboardModal } from "../components/SocialModals";

function RotatingOperatorPreview({
  characterId,
  skinId,
  weaponId,
}: {
  characterId: CharacterId;
  skinId: SkinId;
  weaponId: WeaponId;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.55;
    }
  });
  return (
    <group ref={ref} position={[0, -0.05, 0]}>
      <CharacterModel3D
        characterId={characterId}
        skinId={skinId}
        team="none"
        weaponId={weaponId}
        pitch={0}
        isMoving={false}
      />
    </group>
  );
}

const WelcomePage = () => {
  const navigate = useNavigate();
  const { setActivePage, toggleSidebar } = useAppStore();
  const { sessionConfig, setSessionConfig } = useGameStore();
  const {
    perspective,
    togglePerspective,
    playerName: savedName,
    setPlayerName,
    theme,
    toggleTheme,
    skinId: savedSkinId,
    setSkinId: persistSkinId,
    sprintMode,
    setSprintMode,
  } = useSettingsStore();

  const { firebaseUser, profile, incomingRequests, roomInvites } = useAuthStore();
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  const [playMode, setPlayMode] = useState<PlayMode>(sessionConfig.playMode);
  const [roomAction, setRoomAction] = useState<"create" | "join">(
    sessionConfig.roomAction === "join" ? "join" : "create",
  );
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [customRoomName, setCustomRoomName] = useState("S-G-3D Tactical Room");
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [preferredTeam, setPreferredTeam] = useState<"auto" | "red" | "blue">(
    sessionConfig.preferredTeam || "auto",
  );
  const [mapId, setMapId] = useState<MapId>(sessionConfig.mapId);
  const [mode, setMode] = useState<GameMode>(sessionConfig.mode);
  const [botCount, setBotCount] = useState<number>(
    sessionConfig.playMode === "solo" ? (sessionConfig.botCount || 4) : 0,
  );
  const [characterId, setCharacterId] = useState<CharacterId>(
    sessionConfig.characterId,
  );
  const [skinId, setSkinId] = useState<SkinId>(savedSkinId || sessionConfig.skinId || "urban_ops");
  const [weaponId, setWeaponId] = useState<WeaponId>(sessionConfig.weaponId);
  const [callsign, setCallsign] = useState<string>(
    profile?.username || savedName || sessionConfig.playerName || "Operator-01",
  );

  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [activeModal, setActiveModal] = useState<"account" | "leaderboard" | "friends" | null>(null);

  useEffect(() => {
    setActivePage("welcome");
  }, [setActivePage]);

  const fetchRooms = () => {
    setRefreshingRooms(true);
    let socketRooms: PublicRoomSummary[] = [];
    let cloudRooms: PublicRoomSummary[] = [];
    const mergeAndSet = () => {
      const merged = new Map<string, PublicRoomSummary>();
      cloudRooms.forEach((r) => merged.set(r.id, r));
      socketRooms.forEach((r) => merged.set(r.id, r));
      setRooms(Array.from(merged.values()));
    };

    void listServerlessPublicRooms()
      .then((list) => {
        cloudRooms = list;
        mergeAndSet();
      })
      .catch(() => {});

    const serverUrl =
      (import.meta.env.VITE_SERVER_URL as string)?.trim() ||
      (typeof window !== "undefined" && (window as unknown as { __SG3D_SERVER_URL__?: string }).__SG3D_SERVER_URL__) ||
      "";
    const sock = serverUrl
      ? io(serverUrl, { transports: ["websocket", "polling"], timeout: 4000, reconnection: false })
      : io({ transports: ["websocket", "polling"], timeout: 1200, reconnection: false });
    sock.on("rooms_list", (list: PublicRoomSummary[]) => {
      socketRooms = list || [];
      mergeAndSet();
      setRefreshingRooms(false);
      sock.disconnect();
    });
    setTimeout(() => {
      setRefreshingRooms(false);
      sock.disconnect();
    }, 1300);
  };

  useEffect(() => {
    if (playMode !== "room") return;
    let active = true;
    let socketRooms: PublicRoomSummary[] = [];
    let cloudRooms: PublicRoomSummary[] = [];
    const mergeAndSet = () => {
      if (!active) return;
      const merged = new Map<string, PublicRoomSummary>();
      cloudRooms.forEach((r) => merged.set(r.id, r));
      socketRooms.forEach((r) => merged.set(r.id, r));
      setRooms(Array.from(merged.values()));
    };

    void listServerlessPublicRooms()
      .then((list) => {
        cloudRooms = list;
        mergeAndSet();
      })
      .catch(() => {});

    const serverUrl =
      (import.meta.env.VITE_SERVER_URL as string)?.trim() ||
      (typeof window !== "undefined" && (window as unknown as { __SG3D_SERVER_URL__?: string }).__SG3D_SERVER_URL__) ||
      "";
    const sock = serverUrl
      ? io(serverUrl, { transports: ["websocket", "polling"], timeout: 4000, reconnection: false })
      : io({ transports: ["websocket", "polling"], timeout: 1200, reconnection: false });
    sock.on("rooms_list", (list: PublicRoomSummary[]) => {
      socketRooms = list || [];
      mergeAndSet();
      setRefreshingRooms(false);
      sock.disconnect();
    });
    const timer = setTimeout(() => {
      sock.disconnect();
    }, 1300);
    return () => {
      active = false;
      clearTimeout(timer);
      sock.disconnect();
    };
  }, [playMode]);

  const handleGoogleSignIn = async () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setSigningInGoogle(true);
    try {
      await signInOperator();
      toast.success("Google account connected for Online & Room play");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleDeploy = (overrideRoomId?: string) => {
    soundEngine.unlock();
    soundEngine.playClick();

    const effectivePlayMode: PlayMode = overrideRoomId ? "room" : playMode;
    if (effectivePlayMode !== "solo" && !firebaseUser) {
      toast.error("Please sign in with Google before entering Online or Room matches");
      void handleGoogleSignIn();
      return;
    }

    const cleanName = callsign.trim() || "Operator-01";
    setPlayerName(cleanName);
    persistSkinId(skinId);

    setSessionConfig({
      playMode: effectivePlayMode,
      roomAction:
        effectivePlayMode === "online"
          ? "public"
          : overrideRoomId
            ? "join"
            : roomAction,
      roomId:
        overrideRoomId ||
        (effectivePlayMode === "room" && roomAction === "join"
          ? roomCodeInput.trim().toUpperCase() || "PUBLIC-01"
          : "PUBLIC-01"),
      roomName: customRoomName.trim() || "S-G-3D Room",
      isPrivate: isPrivateRoom,
      preferredTeam,
      mapId,
      mode,
      botCount:
        effectivePlayMode === "solo"
          ? (botCount > 0 ? botCount : 4)
          : (roomAction === "create" ? botCount : 0),
      maxPlayers: 12,
      characterId,
      skinId,
      weaponId,
      playerName: cleanName,
    });

    navigate("/play");
  };

  const selectedChar = CHARACTERS[characterId];
  const selectedSkin = CHARACTER_SKINS[skinId] || CHARACTER_SKINS.urban_ops;
  const selectedWeapon = WEAPONS[weaponId];

  const isLight = theme === "light";
  const pendingSocial = incomingRequests.length + roomInvites.length;

  const cardBg = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-slate-950/90 border-white/15";
  const subCardBg = isLight
    ? "bg-slate-50 border-slate-200 hover:border-slate-400"
    : "bg-slate-900/75 border-white/10 hover:border-white/30";
  const mutedText = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <main
      id="main-content"
      className={`relative min-h-dvh font-tactical overflow-x-hidden transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#060911] text-white"
      }`}
    >
      <SideBar />

      {activeModal === "account" && <AccountModal onClose={() => setActiveModal(null)} />}
      {activeModal === "leaderboard" && <LeaderboardModal onClose={() => setActiveModal(null)} />}
      {activeModal === "friends" && (
        <FriendsModal
          onClose={() => setActiveModal(null)}
          onJoinInvite={(rId) => handleDeploy(rId)}
          currentRoomId={roomCodeInput || "PUBLIC-01"}
          currentRoomName={customRoomName}
          currentMapId={mapId}
          currentMode={mode}
        />
      )}

      {/* Architectural Grid Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage: isLight
            ? "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.12), transparent 45%), linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)"
            : "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.2), transparent 45%), linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* TOP HEADER */}
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b pb-4 ${
            isLight ? "border-slate-200" : "border-white/10"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md">
              SG
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-[0.2em] uppercase leading-none">
                S-G-3D
              </h1>
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.25em] ${
                  isLight ? "text-sky-700" : "text-sky-400"
                }`}
              >
                Tactical 3D Arena & Battle Royale • 1P / 3P • Voice & Ranked
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Callsign Input */}
            <div
              className={`flex items-center border px-3 py-1.5 ${
                isLight ? "bg-white border-slate-300" : "bg-slate-900 border-white/15"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase mr-2 ${mutedText}`}>
                Callsign
              </span>
              <input
                type="text"
                maxLength={20}
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-black uppercase tracking-wider outline-none w-28 sm:w-32"
              />
            </div>

            {/* Account & Rank Button with Gmail Avatar */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveModal("account");
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                firebaseUser
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : isLight
                    ? "bg-white border-slate-300 hover:border-sky-600 text-slate-800"
                    : "bg-slate-900 border-white/20 hover:border-sky-400 text-white"
              }`}
            >
              {firebaseUser ? (
                <OperatorAvatar
                  photoURL={firebaseUser.photoURL}
                  name={profile?.username || firebaseUser.displayName || callsign}
                  size="sm"
                />
              ) : (
                <UserCheck size={14} />
              )}
              <span>
                {profile
                  ? `${profile.rankTier} (${profile.rankPoints})`
                  : firebaseUser
                    ? firebaseUser.displayName || "Signed In"
                    : "Sign In"}
              </span>
            </button>

            {/* Leaderboard Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveModal("leaderboard");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                isLight
                  ? "bg-white border-slate-300 hover:border-amber-500 text-slate-800"
                  : "bg-slate-900 border-white/20 hover:border-amber-400 text-white"
              }`}
            >
              <Trophy size={14} className="text-amber-500" />
              <span>Ranks</span>
            </button>

            {/* Friends & Room Invites Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveModal("friends");
              }}
              className={`relative flex items-center gap-1.5 px-3 py-2 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                isLight
                  ? "bg-white border-slate-300 hover:border-purple-500 text-slate-800"
                  : "bg-slate-900 border-white/20 hover:border-purple-400 text-white"
              }`}
            >
              <Users size={14} className="text-purple-500" />
              <span>Friends</span>
              {pendingSocial > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black">
                  {pendingSocial}
                </span>
              )}
            </button>

            {/* Light / Dark Mode Switch */}
            <button
              onClick={() => {
                soundEngine.playClick();
                toggleTheme();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-black uppercase cursor-pointer ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-900 border-white/20 text-amber-300"
              }`}
              title="Toggle Light / Dark Mode"
            >
              {isLight ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isLight ? "Light" : "Dark"}</span>
            </button>

            {/* 1P / 3P Perspective Quick Toggle */}
            <button
              onClick={() => {
                soundEngine.playClick();
                togglePerspective();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                isLight
                  ? "bg-white border-sky-500 text-sky-700"
                  : "bg-slate-900 border-sky-400/50 text-sky-300"
              }`}
            >
              <Eye size={14} />
              <span>{perspective.toUpperCase()}</span>
            </button>

            {/* Open Keybinds & Settings */}
            <button
              onClick={() => {
                soundEngine.playClick();
                toggleSidebar();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-black uppercase tracking-wider cursor-pointer ${
                isLight
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                  : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
              }`}
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
          </div>
        </header>

        {/* Active Room Invite Banner */}
        {roomInvites.length > 0 && (
          <div className="p-3 border border-amber-500 bg-amber-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-black uppercase">
              Squad Invite from {roomInvites[0].fromUsername}: Room [{roomInvites[0].roomId}]
            </span>
            <button
              onClick={() => handleDeploy(roomInvites[0].roomId)}
              className="px-4 py-1.5 bg-emerald-600 text-white font-black uppercase cursor-pointer"
            >
              Join Friend Now
            </button>
          </div>
        )}

        {/* MAIN 2-COLUMN COMMAND DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN (7 cols): Play Mode, Rooms, Map, Game Mode, Weapons */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 1. Play Mode Selector */}
            <section className={`border p-4 sm:p-5 ${cardBg}`}>
              <h2 className={`text-xs font-black uppercase tracking-[0.22em] mb-3 ${mutedText}`}>
                1. Select Deployment Mode
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setPlayMode("solo");
                    setBotCount(4);
                  }}
                  className={`p-3.5 border text-left transition-all cursor-pointer ${
                    playMode === "solo"
                      ? isLight
                        ? "bg-emerald-50 border-emerald-600 text-emerald-950"
                        : "bg-emerald-500/15 border-emerald-400 text-white"
                      : subCardBg
                  }`}
                >
                  <Bot size={20} className={playMode === "solo" ? "text-emerald-600" : mutedText} />
                  <div className="mt-1.5 text-sm font-black uppercase tracking-wider">
                    Solo vs Bots
                  </div>
                  <div className={`text-[11px] ${mutedText}`}>
                    Instant offline combat vs tactical AI
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setPlayMode("online");
                    setBotCount(0);
                  }}
                  className={`p-3.5 border text-left transition-all cursor-pointer ${
                    playMode === "online"
                      ? isLight
                        ? "bg-sky-50 border-sky-600 text-sky-950"
                        : "bg-sky-500/15 border-sky-400 text-white"
                      : subCardBg
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Globe size={20} className={playMode === "online" ? "text-sky-600" : mutedText} />
                    {!firebaseUser && <Lock size={14} className="text-amber-500" />}
                  </div>
                  <div className="mt-1.5 text-sm font-black uppercase tracking-wider">
                    Online Match
                  </div>
                  <div className={`text-[11px] ${mutedText}`}>
                    Pure Pro PvP with real players
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setPlayMode("room");
                    setBotCount(0);
                  }}
                  className={`p-3.5 border text-left transition-all cursor-pointer ${
                    playMode === "room"
                      ? isLight
                        ? "bg-purple-50 border-purple-600 text-purple-950"
                        : "bg-purple-500/15 border-purple-400 text-white"
                      : subCardBg
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Users size={20} className={playMode === "room" ? "text-purple-600" : mutedText} />
                    {!firebaseUser && <Lock size={14} className="text-amber-500" />}
                  </div>
                  <div className="mt-1.5 text-sm font-black uppercase tracking-wider">
                    Custom Room
                  </div>
                  <div className={`text-[11px] ${mutedText}`}>
                    Private room or join with code
                  </div>
                </button>
              </div>

              {playMode !== "solo" && !firebaseUser && (
                <div className="mt-3 p-3 border border-amber-500/60 bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <div className="font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Google Account Required for Online & Room Matches
                    </div>
                    <div className={`text-[11px] ${mutedText}`}>
                      Connect your Gmail account to display your profile avatar, sync ranks, and join multiplayer servers.
                    </div>
                  </div>
                  <button
                    onClick={() => void handleGoogleSignIn()}
                    disabled={signingInGoogle}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LogIn size={14} />
                    <span>{signingInGoogle ? "Connecting..." : "Sign In With Google"}</span>
                  </button>
                </div>
              )}
            </section>

            {/* Custom Room Panel */}
            {playMode === "room" && (
              <section className={`border p-4 space-y-3 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRoomAction("create")}
                      className={`px-3.5 py-1.5 text-xs font-black uppercase border cursor-pointer flex items-center gap-1.5 ${
                        roomAction === "create"
                          ? "bg-purple-600 border-purple-500 text-white"
                          : subCardBg
                      }`}
                    >
                      <Plus size={14} /> Create Room
                    </button>
                    <button
                      onClick={() => setRoomAction("join")}
                      className={`px-3.5 py-1.5 text-xs font-black uppercase border cursor-pointer flex items-center gap-1.5 ${
                        roomAction === "join"
                          ? "bg-purple-600 border-purple-500 text-white"
                          : subCardBg
                      }`}
                    >
                      <KeyRound size={14} /> Join by Code
                    </button>
                  </div>

                  <button
                    onClick={fetchRooms}
                    className="text-xs font-bold uppercase text-sky-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={13} className={refreshingRooms ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                {roomAction === "create" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-1 ${mutedText}`}>
                        Room Name
                      </label>
                      <input
                        type="text"
                        value={customRoomName}
                        onChange={(e) => setCustomRoomName(e.target.value)}
                        className={`w-full px-3 py-2 border text-sm font-bold outline-none ${
                          isLight ? "bg-slate-50 border-slate-300" : "bg-slate-900 border-white/15"
                        }`}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                        className={`w-full py-2 px-3 border text-xs font-black uppercase cursor-pointer ${
                          isPrivateRoom
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : subCardBg
                        }`}
                      >
                        {isPrivateRoom ? "Private (Invite / Code Only)" : "Public (Listed)"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER ROOM CODE (e.g. X7K2P)"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className={`flex-1 px-3 py-2 border text-sm font-black uppercase tracking-widest outline-none ${
                          isLight ? "bg-slate-50 border-slate-300" : "bg-slate-900 border-white/15"
                        }`}
                      />
                      <button
                        onClick={() => handleDeploy()}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-xs tracking-wider cursor-pointer"
                      >
                        Join
                      </button>
                    </div>

                    {rooms.length > 0 && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {rooms.map((r) => (
                          <div
                            key={r.id}
                            className={`flex items-center justify-between px-3 py-2 border text-xs ${subCardBg}`}
                          >
                            <div>
                              <span className="font-black mr-2">{r.name}</span>
                              <span className="text-sky-600 font-bold">[{r.id}]</span>
                              <span className={`ml-2 uppercase ${mutedText}`}>
                                {MAPS[r.mapId]?.name} • {r.mode.toUpperCase()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeploy(r.id)}
                              className="px-3 py-1 bg-sky-600 text-white font-black uppercase cursor-pointer"
                            >
                              Join ({r.playerCount}/{r.maxPlayers})
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preferred Side / Team Selection for 2+ Player Rooms */}
                {(roomAction === "join" || mode === "tdm" || mode === "domination") && (
                  <div
                    className={`pt-3 border-t ${
                      isLight ? "border-slate-200" : "border-white/10"
                    }`}
                  >
                    <div className={`text-[10px] font-black uppercase tracking-[0.18em] mb-2 ${mutedText}`}>
                      Choose Your Side / Squad (2+ Players)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setPreferredTeam("auto");
                        }}
                        className={`py-2 px-2 border text-xs font-black uppercase cursor-pointer ${
                          preferredTeam === "auto"
                            ? "bg-slate-800 border-slate-700 text-white"
                            : subCardBg
                        }`}
                      >
                        Auto Balance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setPreferredTeam("blue");
                        }}
                        className={`py-2 px-2 border text-xs font-black uppercase cursor-pointer ${
                          preferredTeam === "blue"
                            ? "bg-blue-600 border-blue-500 text-white"
                            : subCardBg
                        }`}
                      >
                        Blue Strike
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setPreferredTeam("red");
                        }}
                        className={`py-2 px-2 border text-xs font-black uppercase cursor-pointer ${
                          preferredTeam === "red"
                            ? "bg-red-600 border-red-500 text-white"
                            : subCardBg
                        }`}
                      >
                        Red Vanguard
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 2. Arena Map & Game Mode Configuration */}
            {(playMode === "solo" || (playMode === "room" && roomAction === "create")) && (
              <section className={`border p-4 sm:p-5 space-y-4 ${cardBg}`}>
                <div>
                  <h2 className={`text-xs font-black uppercase tracking-[0.22em] mb-2.5 ${mutedText}`}>
                    2. Select Tactical Arena Map
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MAP_ORDER.map((id, idx) => {
                      const m = MAPS[id];
                      const active = mapId === id;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            soundEngine.playClick();
                            setMapId(id);
                          }}
                          className={`p-3 border text-left cursor-pointer transition-all ${
                            idx === 0 ? "sm:col-span-2" : ""
                          } ${
                            active
                              ? isLight
                                ? "bg-sky-50 border-sky-600 text-sky-950"
                                : "bg-sky-500/15 border-sky-400 text-white"
                              : subCardBg
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black uppercase">{m.name}</span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-sky-500/15 text-sky-600">
                              {m.isDaylight ? "DAYLIGHT" : "NIGHT"}
                            </span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${mutedText}`}>{m.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${
                    isLight ? "border-slate-200" : "border-white/10"
                  }`}
                >
                  <div>
                    <div className={`text-xs font-black uppercase tracking-[0.18em] mb-2 ${mutedText}`}>
                      Game Mode
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: "tdm", label: "TDM" },
                          { id: "ffa", label: "FFA" },
                          { id: "domination", label: "Zones" },
                          { id: "br", label: "Royale" },
                        ] as Array<{ id: GameMode; label: string }>
                      ).map((gm) => (
                        <button
                          key={gm.id}
                          onClick={() => {
                            soundEngine.playClick();
                            setMode(gm.id);
                          }}
                          className={`py-2 px-1 text-[11px] font-black uppercase border cursor-pointer ${
                            mode === gm.id
                              ? "bg-amber-500 border-amber-400 text-slate-950"
                              : subCardBg
                          }`}
                        >
                          {gm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={`flex justify-between text-xs font-black uppercase tracking-[0.15em] mb-1.5 ${mutedText}`}>
                      <span>Combat Bots</span>
                      <span className={botCount === 0 ? "text-sky-500 font-black" : "text-emerald-600 font-black"}>
                        {botCount === 0 ? "0 BOTS (PURE PRO PVP)" : `${botCount} BOTS`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={botCount}
                      onChange={(e) => setBotCount(parseInt(e.target.value, 10))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between mt-1.5 text-[10px] font-black uppercase">
                      <span className={mutedText}>Sprint Style:</span>
                      <button
                        onClick={() => setSprintMode(sprintMode === "hold" ? "toggle" : "hold")}
                        className="px-2 py-0.5 bg-sky-500/15 text-sky-600 border border-sky-500/30 cursor-pointer"
                      >
                        {sprintMode === "hold" ? "Hold Shift" : "Tap Toggle"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Primary Weapon Armory */}
            <section className={`border p-4 sm:p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${mutedText}`}>
                  3. Starting Weapon Loadout (All 6 In-Game)
                </h2>
                <button
                  onClick={() => soundEngine.playWeaponFire(weaponId)}
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase text-sky-600 hover:underline cursor-pointer"
                >
                  <Volume2 size={14} /> Test Fire Sound
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WEAPON_ORDER.map((wId) => {
                  const w = WEAPONS[wId];
                  const active = weaponId === wId;
                  return (
                    <button
                      key={wId}
                      onClick={() => {
                        setWeaponId(wId);
                        soundEngine.playWeaponFire(wId);
                      }}
                      className={`p-2.5 border text-left cursor-pointer transition-all ${
                        active
                          ? isLight
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white/15 border-white text-white"
                          : subCardBg
                      }`}
                      style={
                        active ? { borderLeftWidth: "4px", borderLeftColor: w.accentColor } : undefined
                      }
                    >
                      <div className="text-[9px] font-bold uppercase opacity-70">{w.category}</div>
                      <div className="text-xs sm:text-sm font-black uppercase">{w.name}</div>
                    </button>
                  );
                })}
              </div>

              <div
                className={`mt-3 p-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-white/10"
                }`}
              >
                <span className="opacity-80">{selectedWeapon.description}</span>
                <div className="flex gap-3 font-black uppercase text-[11px]">
                  <span className="text-rose-500">
                    DMG: {selectedWeapon.damage}
                    {selectedWeapon.pellets > 1 ? `x${selectedWeapon.pellets}` : ""}
                  </span>
                  <span className="text-sky-600">MAG: {selectedWeapon.magSize}</span>
                  <span className="text-emerald-600">RNG: {selectedWeapon.range}m</span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5 cols): 3D Operator Preview, Skins, Character Selector & Launch CTA */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Live 3D Operator, Skin & Weapon Showcase */}
            <section
              className={`relative h-72 sm:h-80 border overflow-hidden ${
                isLight
                  ? "bg-gradient-to-b from-sky-100 via-sky-50 to-slate-200 border-slate-300"
                  : "bg-gradient-to-b from-slate-900 to-slate-950 border-white/15"
              }`}
            >
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-sky-600 text-[10px] font-black uppercase tracking-widest text-white">
                  {selectedChar.codename}
                </span>
                <span className="text-xs font-black uppercase opacity-80">
                  {selectedSkin.name}
                </span>
              </div>

              <Canvas camera={{ position: [0, 0.55, 3.0], fov: 42 }}>
                <ambientLight intensity={isLight ? 1.1 : 0.75} />
                <directionalLight position={[3, 5, 4]} intensity={isLight ? 2.0 : 1.7} />
                <pointLight position={[-3, 2, 2]} intensity={0.8} color="#38bdf8" />
                <Suspense fallback={null}>
                  <RotatingOperatorPreview
                    characterId={characterId}
                    skinId={skinId}
                    weaponId={weaponId}
                  />
                </Suspense>
              </Canvas>

              <div
                className={`absolute bottom-0 inset-x-0 p-3.5 ${
                  isLight
                    ? "bg-gradient-to-t from-white via-white/90 to-transparent text-slate-900"
                    : "bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent text-white"
                }`}
              >
                <div className="text-sm font-black uppercase">{selectedChar.name}</div>
                <p className="text-[11px] opacity-80">{selectedChar.description}</p>
              </div>
            </section>

            {/* Character Skins Picker */}
            <section className={`border p-3.5 ${cardBg}`}>
              <div className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 ${mutedText}`}>
                <Palette size={13} className="text-sky-600" />
                Tactical Uniform Skin
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SKIN_ORDER.map((sId) => {
                  const sk = CHARACTER_SKINS[sId];
                  const active = skinId === sId;
                  return (
                    <button
                      key={sId}
                      onClick={() => {
                        soundEngine.playClick();
                        setSkinId(sId);
                        persistSkinId(sId);
                      }}
                      className={`px-2 py-1.5 border text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? "border-sky-600 bg-sky-500/15"
                          : subCardBg
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                        style={{ backgroundColor: sk.uniformPrimary }}
                      />
                      <span className="truncate">{sk.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Operator Class Picker */}
            <section className={`border p-3.5 ${cardBg}`}>
              <div className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-between ${mutedText}`}>
                <span className="flex items-center gap-1.5">
                  <Shield size={13} className="text-sky-600" />
                  Operator Class ({CHARACTER_ORDER.length})
                </span>
                <span className="text-[9px] font-bold tracking-wider opacity-75">
                  Unified Tactical Rig
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-1.5">
                {CHARACTER_ORDER.map((cId) => {
                  const c = CHARACTERS[cId];
                  const active = characterId === cId;
                  return (
                    <button
                      key={cId}
                      onClick={() => {
                        soundEngine.playClick();
                        setCharacterId(cId);
                      }}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        active
                          ? isLight
                            ? "bg-sky-50 border-sky-600 text-sky-950"
                            : "bg-sky-500/15 border-sky-400 text-white"
                          : subCardBg
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase truncate">{c.codename}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.visorColor }}
                        />
                      </div>
                      <div className={`text-[9px] uppercase mt-0.5 truncate ${mutedText}`}>
                        {c.maxHealth} HP • {Math.round(c.speedMult * 100)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Launch Match Button */}
            <button
              onClick={() => handleDeploy()}
              className={`w-full py-4.5 text-white font-black text-xl uppercase tracking-[0.22em] flex items-center justify-center gap-3 shadow-lg cursor-pointer transition-transform active:scale-[0.99] ${
                playMode !== "solo" && !firebaseUser
                  ? "bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:brightness-110"
                  : "bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:brightness-110"
              }`}
            >
              {playMode !== "solo" && !firebaseUser ? (
                <>
                  <LogIn size={22} />
                  <span>Sign In To Deploy</span>
                </>
              ) : (
                <>
                  <Play size={24} fill="currentColor" />
                  <span>Deploy S-G-3D</span>
                  <Crosshair size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default WelcomePage;
