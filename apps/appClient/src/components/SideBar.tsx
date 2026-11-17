import { useEffect, useState } from "react";
import {
  X,
  Keyboard,
  LogOut,
  Menu,
  Volume2,
  Eye,
  RotateCcw,
  Upload,
  Play,
  Trash2,
  Sun,
  Moon,
} from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import {
  useSettingsStore,
  type MobileControlsMode,
  type SoundPack,
} from "../stores/useSettingsStore";
import { Link } from "react-router";
import {
  KEYBINDING_LABELS,
  WEAPONS,
  WEAPON_ORDER,
  formatKeyCode,
  type KeyAction,
  type WeaponId,
} from "@block-shooter/shared";
import { soundEngine } from "../utils/soundEngine";

type SettingsTab = "keybinds" | "camera" | "audio";

const SideBar = () => {
  const {
    isSidebarOpen,
    toggleSidebar,
    showControls,
    setShowControls,
    showMinimap,
    setShowMinimap,
    appVersion,
    activePage,
  } = useAppStore();

  const {
    keybindings,
    setKeybinding,
    resetKeybindings,
    perspective,
    setPerspective,
    mouseSensitivity,
    setMouseSensitivity,
    fov,
    setFov,
    masterVolume,
    setMasterVolume,
    soundPack,
    setSoundPack,
    theme,
    toggleTheme,
    sprintMode,
    setSprintMode,
    mobileControlsMode,
    setMobileControlsMode,
    voicePttMode,
    setVoicePttMode,
    customWeaponSounds,
    setCustomWeaponSound,
    clearCustomWeaponSound,
  } = useSettingsStore();

  const [tab, setTab] = useState<SettingsTab>("keybinds");
  const [listeningAction, setListeningAction] = useState<KeyAction | null>(null);

  const isLight = theme === "light";

  useEffect(() => {
    if (!listeningAction) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== "Escape") {
        setKeybinding(listeningAction, e.code);
        soundEngine.playClick();
      }
      setListeningAction(null);
    };

    window.addEventListener("keydown", handleKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKey, { capture: true });
  }, [listeningAction, setKeybinding]);

  const handleUploadSound = (weaponId: WeaponId, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomWeaponSound(weaponId, file.name, reader.result);
        soundEngine.playWeaponFire(weaponId);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="z-50 font-tactical">
      {activePage === "ingame" && (
        <button
          onClick={toggleSidebar}
          aria-label="Open Settings"
          className={`fixed top-4 left-4 z-60 p-3 border transition-all cursor-pointer ${
            isLight
              ? "bg-white/95 border-slate-300 text-slate-800 hover:border-sky-600 shadow"
              : "bg-slate-950/90 border-white/20 hover:border-sky-400 text-slate-300 hover:text-white"
          }`}
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleSidebar}
      />

      <aside
        className={`fixed top-0 left-0 h-screen w-full max-w-md border-r z-50 flex flex-col transform transition-transform duration-300 ease-out shadow-2xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950 border-white/20 text-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pl-20 pr-5 py-4 border-b ${
            isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/40"
          }`}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-600">
              S-G-3D SYSTEM
            </div>
            <h2 className="text-lg font-black tracking-widest uppercase">
              Settings & Controls
            </h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`grid grid-cols-3 border-b ${
            isLight ? "border-slate-200 bg-slate-100" : "border-white/10 bg-slate-900/60"
          }`}
        >
          <button
            onClick={() => setTab("keybinds")}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              tab === "keybinds"
                ? "border-sky-600 text-sky-600"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Keyboard size={14} /> Keybinds
          </button>
          <button
            onClick={() => setTab("camera")}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              tab === "camera"
                ? "border-sky-600 text-sky-600"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Eye size={14} /> Camera & HUD
          </button>
          <button
            onClick={() => setTab("audio")}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              tab === "audio"
                ? "border-sky-600 text-sky-600"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Volume2 size={14} /> Audio
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {tab === "keybinds" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs opacity-70">
                  Click any binding and press a new key to remap.
                </p>
                <button
                  onClick={() => {
                    resetKeybindings();
                    soundEngine.playClick();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase border cursor-pointer ${
                    isLight ? "bg-slate-100 border-slate-300" : "bg-white/5 border-white/15"
                  }`}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              <div className="space-y-1.5">
                {(Object.keys(KEYBINDING_LABELS) as KeyAction[]).map((action) => {
                  const isListening = listeningAction === action;
                  return (
                    <div
                      key={action}
                      className={`flex items-center justify-between px-3 py-2 border ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {KEYBINDING_LABELS[action]}
                      </span>
                      <button
                        onClick={() => setListeningAction(action)}
                        className={`min-w-24 px-3 py-1 text-xs font-black uppercase tracking-widest border cursor-pointer transition-all ${
                          isListening
                            ? "bg-amber-500 text-slate-950 border-amber-300 animate-pulse"
                            : isLight
                              ? "bg-white text-sky-700 border-slate-300 hover:border-sky-600"
                              : "bg-slate-900 text-sky-300 border-white/20 hover:border-sky-400"
                        }`}
                      >
                        {isListening ? "PRESS KEY..." : formatKeyCode(keybindings[action])}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "camera" && (
            <div className="space-y-4">
              {/* Light / Dark Theme */}
              <div className={`border p-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="text-xs font-black uppercase tracking-wider mb-2">
                  Visual Theme (Light / Dark)
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    toggleTheme();
                  }}
                  className={`w-full py-2.5 px-3 border text-xs font-black uppercase flex items-center justify-between cursor-pointer ${
                    isLight ? "bg-white border-amber-400 text-amber-800" : "bg-slate-900 border-white/15 text-amber-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isLight ? <Sun size={14} /> : <Moon size={14} />}
                    {isLight ? "Daylight Light Mode" : "Tactical Dark Mode"}
                  </span>
                  <span className="text-sky-600">SWITCH</span>
                </button>
              </div>

              {/* 1P / 3P Perspective */}
              <div className={`border p-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="text-xs font-black uppercase tracking-wider mb-2">
                  Camera Mode (1P / 3P)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPerspective("1p")}
                    className={`py-2 text-xs font-black uppercase border cursor-pointer ${
                      perspective === "1p"
                        ? "bg-sky-600 border-sky-500 text-white"
                        : isLight
                          ? "bg-white border-slate-300"
                          : "bg-slate-900 border-white/10 text-slate-400"
                    }`}
                  >
                    1st Person (1P)
                  </button>
                  <button
                    onClick={() => setPerspective("3p")}
                    className={`py-2 text-xs font-black uppercase border cursor-pointer ${
                      perspective === "3p"
                        ? "bg-sky-600 border-sky-500 text-white"
                        : isLight
                          ? "bg-white border-slate-300"
                          : "bg-slate-900 border-white/10 text-slate-400"
                    }`}
                  >
                    3rd Person (3P)
                  </button>
                </div>
              </div>

              {/* Sprint Mode & Mobile Controls */}
              <div className={`border p-3.5 space-y-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider mb-1.5">
                    Sprint Behavior
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["hold", "toggle"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSprintMode(m)}
                        className={`py-2 text-xs font-black uppercase border cursor-pointer ${
                          sprintMode === m
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : isLight
                              ? "bg-white border-slate-300"
                              : "bg-slate-900 border-white/10 text-slate-400"
                        }`}
                      >
                        {m === "hold" ? "Hold Key" : "Toggle Tap"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black uppercase tracking-wider mb-1.5">
                    Mobile Touch Controls
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["auto", "on", "off"] as MobileControlsMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMobileControlsMode(m)}
                        className={`py-1.5 text-[11px] font-black uppercase border cursor-pointer ${
                          mobileControlsMode === m
                            ? "bg-sky-600 border-sky-500 text-white"
                            : isLight
                              ? "bg-white border-slate-300"
                              : "bg-slate-900 border-white/10 text-slate-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mouse Sensitivity & FOV */}
              <div className={`border p-3.5 space-y-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div>
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>Sensitivity</span>
                    <span className="text-sky-600">{mouseSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={mouseSensitivity}
                    onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>Field of View (FOV)</span>
                    <span className="text-sky-600">{fov}°</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="100"
                    step="1"
                    value={fov}
                    onChange={(e) => setFov(parseInt(e.target.value, 10))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* HUD Toggles including Hide Controls */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowControls(!showControls)}
                  className={`w-full flex items-center justify-between p-3 border text-xs font-black uppercase cursor-pointer ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                  }`}
                >
                  <span>Controls & Touch Overlay (Key: H)</span>
                  <span className={showControls ? "text-emerald-600" : "text-rose-500"}>
                    {showControls ? "VISIBLE" : "HIDDEN"}
                  </span>
                </button>
                <button
                  onClick={() => setShowMinimap(!showMinimap)}
                  className={`w-full flex items-center justify-between p-3 border text-xs font-black uppercase cursor-pointer ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                  }`}
                >
                  <span>Tactical Radar Minimap</span>
                  <span className={showMinimap ? "text-emerald-600" : "text-rose-500"}>
                    {showMinimap ? "VISIBLE" : "HIDDEN"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {tab === "audio" && (
            <div className="space-y-4">
              {/* Voice Chat Mode */}
              <div className={`border p-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="text-xs font-black uppercase tracking-wider mb-2">
                  Voice Chat Mode
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVoicePttMode(false)}
                    className={`py-2 text-xs font-black uppercase border cursor-pointer ${
                      !voicePttMode
                        ? "bg-sky-600 border-sky-500 text-white"
                        : isLight
                          ? "bg-white border-slate-300"
                          : "bg-slate-900 border-white/10 text-slate-400"
                    }`}
                  >
                    Open Mic
                  </button>
                  <button
                    onClick={() => setVoicePttMode(true)}
                    className={`py-2 text-xs font-black uppercase border cursor-pointer ${
                      voicePttMode
                        ? "bg-sky-600 border-sky-500 text-white"
                        : isLight
                          ? "bg-white border-slate-300"
                          : "bg-slate-900 border-white/10 text-slate-400"
                    }`}
                  >
                    Push-To-Talk ({formatKeyCode(keybindings.pushToTalk)})
                  </button>
                </div>
              </div>

              {/* Master Volume */}
              <div className={`border p-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="flex justify-between text-xs font-black uppercase mb-2">
                  <span>Master Volume</span>
                  <span className="text-sky-600">{Math.round(masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {/* Sound Pack Selector */}
              <div className={`border p-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="text-xs font-black uppercase tracking-wider mb-2">
                  Pro Weapon Sound Pack
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "tactical", label: "Tactical Pro" },
                      { id: "scifi", label: "Cyber Sci-Fi" },
                      { id: "classic", label: "Classic" },
                    ] as Array<{ id: SoundPack; label: string }>
                  ).map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => {
                        setSoundPack(pack.id);
                        soundEngine.playWeaponFire("assaultRifle");
                      }}
                      className={`py-2 text-[11px] font-black uppercase border cursor-pointer ${
                        soundPack === pack.id
                          ? "bg-sky-600 border-sky-500 text-white"
                          : isLight
                            ? "bg-white border-slate-300"
                            : "bg-slate-900 border-white/10 text-slate-400"
                      }`}
                    >
                      {pack.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-weapon Sound Test & Custom Audio Upload */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider opacity-75">
                  Custom Weapon Sounds (Test or Upload .mp3/.wav)
                </div>
                {WEAPON_ORDER.map((wId) => {
                  const w = WEAPONS[wId];
                  const custom = customWeaponSounds[wId];
                  return (
                    <div
                      key={wId}
                      className={`flex items-center justify-between gap-2 p-2.5 border ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase truncate">{w.name}</div>
                        <div className="text-[10px] opacity-65 truncate">
                          {custom ? `Custom: ${custom.name}` : `Pack: ${soundPack}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => soundEngine.playWeaponFire(wId)}
                          title="Preview weapon sound"
                          className={`p-1.5 border text-sky-600 cursor-pointer ${
                            isLight ? "bg-white border-slate-300" : "bg-slate-900 border-white/15"
                          }`}
                        >
                          <Play size={13} />
                        </button>
                        <label
                          title="Upload custom audio file"
                          className={`p-1.5 border text-emerald-600 cursor-pointer ${
                            isLight ? "bg-white border-slate-300" : "bg-slate-900 border-white/15"
                          }`}
                        >
                          <Upload size={13} />
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) =>
                              handleUploadSound(wId, e.target.files?.[0])
                            }
                          />
                        </label>
                        {custom && (
                          <button
                            onClick={() => clearCustomWeaponSound(wId)}
                            title="Reset to pack sound"
                            className="p-1.5 border border-red-500/30 text-red-500 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex flex-col gap-3 ${
            isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/50"
          }`}
        >
          <div className="text-center text-[10px] opacity-55 tracking-[0.25em] uppercase">
            S-G-3D ENGINE v{appVersion}
          </div>

          {activePage === "ingame" && (
            <Link to="/" className="w-full" onClick={toggleSidebar}>
              <button className="flex items-center justify-center gap-3 w-full py-3 border border-red-500/50 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs cursor-pointer">
                <LogOut size={16} />
                Leave Match & Return to Lobby
              </button>
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
};

export default SideBar;
