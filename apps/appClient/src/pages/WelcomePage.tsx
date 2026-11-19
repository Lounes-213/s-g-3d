import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { io } from "socket.io-client";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CHARACTER_SKINS,
  MAP_ORDER,
  MAPS,
  SCOPES,
  SKIN_ORDER,
  computeEffectiveWeaponStats,
  getDefaultAttachments,
  type CharacterId,
  type GameMode,
  type MapId,
  type PlayMode,
  type SkinId,
  type WeaponAttachments,
  type WeaponId,
} from "@block-shooter/shared";
import {
  Bot,
  ChevronRight,
  Crosshair,
  Eye,
  Globe,
  History,
  KeyRound,
  Lock,
  LogIn,
  Map as MapIcon,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Trophy,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useGameStore, type PublicRoomSummary } from "../stores/useGameStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { signInOperator } from "../services/firebaseService";
import { CharacterModel3D } from "../components/game/CharacterModel3D";
import { WeaponArmoryModal } from "../components/game/WeaponInspector3D";
import { MobileHudEditorModal } from "../components/game/ui/MobileHudEditorModal";
import { listServerlessPublicRooms } from "../utils/serverlessRoomSync";
import { soundEngine } from "../utils/soundEngine";
import SideBar from "../components/SideBar";
import { OperatorAvatar } from "../components/OperatorAvatar";
import { AccountModal, FriendsModal, LeaderboardModal } from "../components/SocialModals";

function HeroOperatorStage({
  characterId,
  skinId,
  weaponId,
  attachments,
}: {
  characterId: CharacterId;
  skinId: SkinId;
  weaponId: WeaponId;
  attachments: WeaponAttachments;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.28;
      ref.current.position.y = -0.95 + Math.sin(state.clock.elapsedTime * 1.4) * 0.015;
    }
  });

  return (
    <group>
      <group ref={ref} position={[0, -0.95, 0]} scale={1.15}>
        <CharacterModel3D
          characterId={characterId}
          skinId={skinId}
          team="none"
          weaponId={weaponId}
          weaponAttachments={attachments}
          pitch={0}
          isMoving={false}
        />
      </group>

      {/* Atmospheric Obsidian Tactical Turntable Pedestal */}
      <mesh position={[0, -1.04, 0]} receiveShadow>
        <cylinderGeometry args={[1.38, 1.56, 0.14, 48]} />
        <meshStandardMaterial color="#0b101b" metalness={0.86} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.965, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.28, 1.36, 48]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0, -0.962, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 0.95, 48]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

type LobbyDrawer = "mode_map" | "operator" | null;

const WelcomePage = () => {
  const navigate = useNavigate();
  const { setActivePage, toggleSidebar } = useAppStore();
  const {
    sessionConfig,
    setSessionConfig,
    isMobileHudEditorOpen,
    setMobileHudEditorOpen,
  } = useGameStore();
  const {
    perspective,
    togglePerspective,
    playerName: savedName,
    setPlayerName,
    skinId: savedSkinId,
    setSkinId: persistSkinId,
    weaponAttachments,
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
  const [mapId, setMapId] = useState<MapId>(sessionConfig.mapId || "royale_valley");
  const [mode, setMode] = useState<GameMode>(sessionConfig.mode || "br");
  const [botCount, setBotCount] = useState<number>(
    sessionConfig.playMode === "solo" ? sessionConfig.botCount || 9 : 0,
  );
  const [characterId, setCharacterId] = useState<CharacterId>(sessionConfig.characterId);
  const [skinId, setSkinId] = useState<SkinId>(savedSkinId || sessionConfig.skinId || "urban_ops");
  const [weaponId, setWeaponId] = useState<WeaponId>(sessionConfig.weaponId);
  const [callsign, setCallsign] = useState<string>(
    profile?.username || savedName || sessionConfig.playerName || "Operator-01",
  );

  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [activeModal, setActiveModal] = useState<"account" | "leaderboard" | "friends" | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"leaderboard" | "players" | "history">("leaderboard");
  const [openDrawer, setOpenDrawer] = useState<LobbyDrawer>(null);
  const [armoryModalOpen, setArmoryModalOpen] = useState(false);

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
      (typeof window !== "undefined" &&
        (window as unknown as { __SG3D_SERVER_URL__?: string }).__SG3D_SERVER_URL__) ||
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
    if (playMode !== "room" || openDrawer !== "mode_map") return;
    const timer = window.setTimeout(() => {
      fetchRooms();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [playMode, openDrawer]);

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
          ? botCount > 0
            ? botCount
            : mode === "br"
              ? 9
              : 5
          : roomAction === "create"
            ? botCount
            : 0,
      maxPlayers: 16,
      characterId,
      skinId,
      weaponId,
      playerName: cleanName,
    });

    navigate("/play");
  };

  const selectedChar = CHARACTERS[characterId] || CHARACTERS.striker;
  const selectedSkin = CHARACTER_SKINS[skinId] || CHARACTER_SKINS.urban_ops;
  const selectedMap = MAPS[mapId] || MAPS.royale_valley;
  const activeAtt = weaponAttachments[weaponId] || getDefaultAttachments(weaponId);
  const effWeapon = computeEffectiveWeaponStats(weaponId, activeAtt);
  const pendingSocial = incomingRequests.length + roomInvites.length;

  return (
    <main
      id="main-content"
      className="relative w-full h-dvh overflow-hidden bg-[#080a0f] text-white font-tactical select-none"
    >
      <SideBar />

      {activeModal === "account" && <AccountModal onClose={() => setActiveModal(null)} />}
      {activeModal === "leaderboard" && (
        <LeaderboardModal onClose={() => setActiveModal(null)} initialTab={leaderboardTab} />
      )}
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

      <WeaponArmoryModal
        isOpen={armoryModalOpen}
        onClose={() => setArmoryModalOpen(false)}
        weaponId={weaponId}
        onSelectWeapon={(id) => {
          setWeaponId(id);
          soundEngine.playClick();
        }}
        skinId={skinId}
      />

      <MobileHudEditorModal
        isOpen={isMobileHudEditorOpen}
        onClose={() => setMobileHudEditorOpen(false)}
      />

      {/* FULL-SCREEN LIVE 3D OPERATOR SHOWCASE STAGE */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(245,158,11,0.14) 0%, rgba(12,18,30,0.92) 48%, #06080d 100%)",
        }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0.48, 3.65], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 7, 5]} intensity={2.4} color="#fff7ed" castShadow />
          <directionalLight position={[-5, 3, -3]} intensity={1.3} color="#06b6d4" />
          <pointLight position={[0, 2.2, 2.5]} intensity={1.1} color="#f59e0b" />
          <Suspense fallback={null}>
            <HeroOperatorStage
              characterId={characterId}
              skinId={skinId}
              weaponId={weaponId}
              attachments={activeAtt}
            />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI * 0.35}
            maxPolarAngle={Math.PI * 0.54}
          />
        </Canvas>
      </div>

      {/* Subtle Vignette Gradient for High-Contrast Foreground Controls */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,8,13,0.82) 0%, transparent 22%, transparent 68%, rgba(6,8,13,0.92) 100%)",
        }}
      />

      {/* FOREGROUND SINGLE-VIEWPORT COMMAND INTERFACE */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
        {/* TOP MINIMAL AAA HEADER BAR */}
        <header className="flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg sm:text-xl clip-tactical-sm shadow-lg">
              SG
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black tracking-[0.22em] uppercase leading-none text-white">
                S-G-3D
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400 mt-0.5">
                Tactical Battle Royale & Arena
              </p>
            </div>
          </div>

          {/* Right Compact Icon & Profile Utility Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Operator Callsign & Rank */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveModal("account");
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0c101a]/92 border border-white/15 hover:border-amber-400 text-xs font-black uppercase cursor-pointer clip-tactical-sm"
            >
              {firebaseUser ? (
                <OperatorAvatar
                  photoURL={firebaseUser.photoURL}
                  name={profile?.username || firebaseUser.displayName || callsign}
                  size="sm"
                />
              ) : (
                <UserCheck size={14} className="text-amber-400" />
              )}
              <span className="hidden sm:inline max-w-[110px] truncate">
                {profile ? profile.username : callsign}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLeaderboardTab("leaderboard");
                setActiveModal("leaderboard");
              }}
              title="Leaderboard & Match History"
              className="p-2 sm:px-3 sm:py-2 bg-[#0c101a]/92 border border-white/15 hover:border-amber-400 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer clip-tactical-sm"
            >
              <Trophy size={15} className="text-amber-400" />
              <span className="hidden md:inline">Ranks</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLeaderboardTab("history");
                setActiveModal("leaderboard");
              }}
              title="Match History"
              className="hidden sm:flex p-2 bg-[#0c101a]/92 border border-white/15 hover:border-cyan-400 text-white cursor-pointer clip-tactical-sm"
            >
              <History size={15} className="text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveModal("friends");
              }}
              title="Friends & Squad Invites"
              className="relative p-2 sm:px-3 sm:py-2 bg-[#0c101a]/92 border border-white/15 hover:border-cyan-400 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer clip-tactical-sm"
            >
              <Users size={15} className="text-cyan-400" />
              <span className="hidden md:inline">Squad</span>
              {pendingSocial > 0 && (
                <span className="px-1.5 bg-rose-600 text-white text-[9px] font-black">
                  {pendingSocial}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setMobileHudEditorOpen(true);
              }}
              title="Customize Mobile Touch Controls"
              className="p-2 bg-[#0c101a]/92 border border-white/15 hover:border-amber-400 text-amber-400 cursor-pointer clip-tactical-sm"
            >
              <Smartphone size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                toggleSidebar();
              }}
              title="Settings, Audio & Keybinds"
              className="p-2 sm:px-3 sm:py-2 bg-[#0c101a]/92 border border-white/15 hover:border-amber-400 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer clip-tactical-sm"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </header>

        {/* Active Squad Invite Toast */}
        {roomInvites.length > 0 && (
          <div className="self-center pointer-events-auto px-4 py-2 bg-[#0d121d]/95 border border-amber-500 flex items-center gap-3 text-xs clip-tactical-sm">
            <span className="font-black uppercase text-amber-300">
              Invite from {roomInvites[0].fromUsername} [{roomInvites[0].roomId}]
            </span>
            <button
              type="button"
              onClick={() => handleDeploy(roomInvites[0].roomId)}
              className="px-3 py-1 bg-amber-500 text-slate-950 font-black uppercase cursor-pointer"
            >
              Join
            </button>
          </div>
        )}

        {/* MIDDLE LEFT FLOATING TACTICAL DOCK (Everything neatly tucked behind crisp buttons!) */}
        <div className="my-auto flex flex-col gap-2 w-fit pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setArmoryModalOpen(true);
            }}
            className="group flex items-center justify-between gap-4 w-52 sm:w-64 px-4 py-3 bg-[#0a0e17]/90 hover:bg-[#121927] border border-white/15 hover:border-amber-400 text-left cursor-pointer transition-all clip-tactical-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                <Wrench size={11} /> Armory & Gunsmith
              </div>
              <div className="text-sm font-black uppercase truncate text-white mt-0.5">
                {effWeapon.name}
              </div>
              <div className="text-[10px] font-mono text-cyan-300 truncate">
                {SCOPES[activeAtt.scope].shortName} {effWeapon.adsZoom.toFixed(1)}x • {effWeapon.magSize} MAG
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setOpenDrawer(openDrawer === "operator" ? null : "operator");
            }}
            className={`group flex items-center justify-between gap-4 w-52 sm:w-64 px-4 py-3 border text-left cursor-pointer transition-all clip-tactical-sm ${
              openDrawer === "operator"
                ? "bg-amber-500/20 border-amber-400"
                : "bg-[#0a0e17]/90 hover:bg-[#121927] border-white/15 hover:border-amber-400"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
                <User size={11} /> Operators & Skins
              </div>
              <div className="text-sm font-black uppercase truncate text-white mt-0.5">
                {selectedChar.codename}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {selectedSkin.name} • {selectedChar.maxHealth} HP
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              togglePerspective();
            }}
            className="flex items-center justify-between w-52 sm:w-64 px-4 py-2.5 bg-[#0a0e17]/90 hover:bg-[#121927] border border-white/15 hover:border-cyan-400 text-left cursor-pointer clip-tactical-sm"
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase">
              <Eye size={14} className="text-cyan-400" />
              <span>Camera Perspective</span>
            </div>
            <span className="text-xs font-black font-mono text-amber-400">
              {perspective.toUpperCase()}
            </span>
          </button>
        </div>

        {/* BOTTOM COMMAND BAR: Mode/Map Selector Card + Dominant Amber DEPLOY CTA */}
        <footer className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pointer-events-auto">
          {/* Mode & Map Launcher Card */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setOpenDrawer(openDrawer === "mode_map" ? null : "mode_map");
            }}
            className={`flex items-center justify-between gap-4 px-4 py-3 sm:min-w-[320px] border text-left cursor-pointer transition-all clip-tactical-sm ${
              openDrawer === "mode_map"
                ? "bg-amber-500/20 border-amber-400"
                : "bg-[#0a0e17]/92 hover:bg-[#121927] border-white/15 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                <MapIcon size={18} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  {playMode.toUpperCase()} • {mode === "br" ? "BATTLE ROYALE" : mode.toUpperCase()}
                  {playMode === "solo" ? ` • ${botCount} BOTS` : ""}
                </div>
                <div className="text-base font-black uppercase tracking-wider truncate text-white">
                  {selectedMap.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Tap to change Mode, Map or Room
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-amber-400 shrink-0" />
          </button>

          {/* Dominant Chamfered Amber DEPLOY Button */}
          <button
            type="button"
            onClick={() => handleDeploy()}
            className="px-8 sm:px-12 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-lg sm:text-xl uppercase tracking-[0.26em] flex items-center justify-center gap-3 shadow-[0_0_32px_rgba(245,158,11,0.38)] cursor-pointer transition-transform active:scale-[0.98] clip-tactical-btn"
          >
            <Play size={22} fill="currentColor" />
            <span>DEPLOY</span>
            <Crosshair size={20} />
          </button>
        </footer>
      </div>

      {/* SLIDE-OVER DRAWER 1: MODE, MAP, ROOM & BOTS SELECTOR */}
      {openDrawer === "mode_map" && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex justify-end"
          onClick={() => setOpenDrawer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-dvh bg-[#090d16] border-l border-amber-500/35 flex flex-col shadow-2xl"
          >
            <div className="px-5 py-4 bg-[#0d121d] border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                  Tactical Mission Setup
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider">
                  Deployment Mode & Maps ({MAP_ORDER.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenDrawer(null)}
                className="p-2 bg-white/5 hover:bg-amber-500 hover:text-slate-950 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Callsign quick edit */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
                  Operator Callsign
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111622] border border-white/15 focus:border-amber-400 text-sm font-black uppercase tracking-wider outline-none"
                />
              </div>

              {/* Play Mode Tabs */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Match Type
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setPlayMode("solo");
                      if (botCount === 0) setBotCount(mode === "br" ? 9 : 5);
                    }}
                    className={`p-3 border text-left cursor-pointer ${
                      playMode === "solo"
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300"
                    }`}
                  >
                    <Bot size={16} className="text-amber-400 mb-1" />
                    <div className="text-xs font-black uppercase">Solo vs AI</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setPlayMode("online");
                      setBotCount(0);
                    }}
                    className={`p-3 border text-left cursor-pointer ${
                      playMode === "online"
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex justify-between">
                      <Globe size={16} className="text-cyan-400 mb-1" />
                      {!firebaseUser && <Lock size={12} className="text-amber-400" />}
                    </div>
                    <div className="text-xs font-black uppercase">Online PvP</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setPlayMode("room");
                      setBotCount(0);
                    }}
                    className={`p-3 border text-left cursor-pointer ${
                      playMode === "room"
                        ? "bg-purple-500/20 border-purple-400 text-white"
                        : "bg-[#111622] border-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex justify-between">
                      <Users size={16} className="text-purple-400 mb-1" />
                      {!firebaseUser && <Lock size={12} className="text-amber-400" />}
                    </div>
                    <div className="text-xs font-black uppercase">Custom Room</div>
                  </button>
                </div>

                {playMode !== "solo" && !firebaseUser && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/45 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-200">
                      Sign in with Google for Online & Rooms
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={signingInGoogle}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <LogIn size={12} /> {signingInGoogle ? "..." : "Google Sign-In"}
                    </button>
                  </div>
                )}
              </div>

              {/* Room Options */}
              {playMode === "room" && (
                <div className="p-3.5 bg-[#0e1320] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRoomAction("create")}
                        className={`px-3 py-1.5 text-[11px] font-black uppercase border cursor-pointer flex items-center gap-1 ${
                          roomAction === "create"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-[#141a29] border-white/10 text-slate-300"
                        }`}
                      >
                        <Plus size={12} /> Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomAction("join")}
                        className={`px-3 py-1.5 text-[11px] font-black uppercase border cursor-pointer flex items-center gap-1 ${
                          roomAction === "join"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-[#141a29] border-white/10 text-slate-300"
                        }`}
                      >
                        <KeyRound size={12} /> Join Code
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={fetchRooms}
                      className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={refreshingRooms ? "animate-spin" : ""} /> Refresh
                    </button>
                  </div>

                  {roomAction === "create" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customRoomName}
                        onChange={(e) => setCustomRoomName(e.target.value)}
                        className="px-3 py-2 bg-[#141a29] border border-white/15 text-xs font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                        className={`py-2 px-3 border text-[11px] font-black uppercase cursor-pointer ${
                          isPrivateRoom
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-[#141a29] border-white/15 text-slate-300"
                        }`}
                      >
                        {isPrivateRoom ? "Private Code Only" : "Public Listed"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ROOM CODE (e.g. X7K2P)"
                          value={roomCodeInput}
                          onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 bg-[#141a29] border border-white/15 text-xs font-black uppercase tracking-widest outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeploy()}
                          className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black uppercase cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                      {rooms.length > 0 && (
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {rooms.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between px-2.5 py-1.5 bg-[#141a29] border border-white/10 text-[11px]"
                            >
                              <span className="truncate font-bold">
                                {r.name} [{r.id}] • {r.mode.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeploy(r.id)}
                                className="px-2.5 py-1 bg-cyan-500 text-slate-950 font-black uppercase cursor-pointer"
                              >
                                Join ({r.playerCount}/{r.maxPlayers})
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(roomAction === "join" || mode === "tdm" || mode === "domination") && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["auto", "blue", "red"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPreferredTeam(t)}
                          className={`py-1.5 text-[10px] font-black uppercase border cursor-pointer ${
                            preferredTeam === t
                              ? t === "blue"
                                ? "bg-blue-600 border-blue-400 text-white"
                                : t === "red"
                                  ? "bg-red-600 border-red-400 text-white"
                                  : "bg-slate-700 border-slate-500 text-white"
                              : "bg-[#141a29] border-white/10 text-slate-400"
                          }`}
                        >
                          {t === "auto" ? "Auto Team" : t === "blue" ? "Blue Strike" : "Red Vanguard"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Game Mode Selector */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Combat Mode
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: "br", label: "Royale" },
                      { id: "tdm", label: "TDM" },
                      { id: "ffa", label: "FFA" },
                      { id: "domination", label: "Zones" },
                    ] as Array<{ id: GameMode; label: string }>
                  ).map((gm) => (
                    <button
                      key={gm.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setMode(gm.id);
                        if (gm.id === "br" && playMode === "solo" && botCount < 6) {
                          setBotCount(9);
                        }
                      }}
                      className={`py-2.5 text-xs font-black uppercase border cursor-pointer ${
                        mode === gm.id
                          ? "bg-amber-500 border-amber-400 text-slate-950"
                          : "bg-[#111622] border-white/10 text-slate-300 hover:border-amber-400/50"
                      }`}
                    >
                      {gm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Bots Slider */}
              {(playMode === "solo" || (playMode === "room" && roomAction === "create")) && (
                <div>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                    <span className="text-slate-400">Combat AI Operators</span>
                    <span className="text-amber-400 font-mono">
                      {botCount === 0 ? "0 BOTS (PURE PVP)" : `${botCount} AI OPERATORS`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={playMode === "solo" ? 1 : 0}
                    max={mode === "br" ? 15 : 10}
                    step={1}
                    value={botCount}
                    onChange={(e) => setBotCount(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Map Selection Grid */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Select Combat Theater
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MAP_ORDER.map((id, idx) => {
                    const m = MAPS[id];
                    const active = mapId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMapId(id);
                          if (id === "royale_valley") setMode("br");
                        }}
                        className={`p-3 border text-left cursor-pointer transition-all ${
                          idx === 0 ? "sm:col-span-2" : ""
                        } ${
                          active
                            ? "bg-amber-500/20 border-amber-400 text-white"
                            : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black uppercase">{m.name}</span>
                          <span className="text-[9px] font-black font-mono uppercase text-cyan-400">
                            {m.floor.width}m • {m.isDaylight ? "DAY" : "NIGHT"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0d121d] border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOpenDrawer(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-[0.2em] text-sm cursor-pointer clip-tactical-btn"
              >
                Confirm Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER 2: OPERATORS & TACTICAL SKINS */}
      {openDrawer === "operator" && (
        <div
          className="fixed inset-0 z-50 bg-black/65 flex justify-end"
          onClick={() => setOpenDrawer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-dvh bg-[#090d16] border-l border-cyan-500/35 flex flex-col shadow-2xl"
          >
            <div className="px-5 py-4 bg-[#0d121d] border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                  Special Forces Roster
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider">
                  Operators & Camo Skins
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenDrawer(null)}
                className="p-2 bg-white/5 hover:bg-amber-500 hover:text-slate-950 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Operators */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Select Operator ({CHARACTER_ORDER.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CHARACTER_ORDER.map((cId) => {
                    const c = CHARACTERS[cId];
                    const active = characterId === cId;
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setCharacterId(cId);
                        }}
                        className={`p-3 border text-left cursor-pointer transition-all ${
                          active
                            ? "bg-amber-500/20 border-amber-400 text-white"
                            : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase">{c.codename}</span>
                          <span className="text-[9px] font-mono text-cyan-300">{c.maxHealth} HP</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{c.role}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operator Passive Bio */}
              <div className="p-3 bg-[#111622] border border-white/10 text-xs">
                <div className="flex items-center gap-1.5 font-black uppercase text-amber-400 mb-1">
                  <Shield size={13} /> {selectedChar.codename} — {selectedChar.role}
                </div>
                <p className="text-[11px] text-slate-300">{selectedChar.passive}</p>
              </div>

              {/* Tactical Camo Skins */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Uniform & Armor Camo ({SKIN_ORDER.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SKIN_ORDER.map((sId) => {
                    const sk = CHARACTER_SKINS[sId];
                    const active = skinId === sId;
                    return (
                      <button
                        key={sId}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSkinId(sId);
                          persistSkinId(sId);
                        }}
                        className={`p-2.5 border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                          active
                            ? "bg-cyan-500/20 border-cyan-400 text-white"
                            : "bg-[#111622] border-white/10 text-slate-300 hover:border-white/30"
                        }`}
                      >
                        <span
                          className="w-5 h-5 border border-white/30 shrink-0"
                          style={{ backgroundColor: sk.primary }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase truncate">{sk.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0d121d] border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOpenDrawer(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-[0.2em] text-sm cursor-pointer clip-tactical-btn"
              >
                Equip Operator
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default WelcomePage;
