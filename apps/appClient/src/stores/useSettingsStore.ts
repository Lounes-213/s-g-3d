import { create } from "zustand";
import {
  DEFAULT_KEYBINDINGS,
  type KeyAction,
  type KeyBindingsMap,
  type PerspectiveMode,
  type SkinId,
  type ThemeMode,
  type WeaponId,
} from "@block-shooter/shared";

export type SoundPack = "tactical" | "scifi" | "classic";
export type SprintMode = "hold" | "toggle";
export type AdsMode = "hold" | "toggle";
export type CameraShoulder = "right" | "left";
export type CrosshairStyle = "tactical" | "dot" | "cross" | "circle";
export type GraphicsQuality = "low" | "medium" | "high";
export type MobileControlsMode = "auto" | "on" | "off";

const STORAGE_KEY = "sg3d_settings_v2";

interface PersistedSettings {
  keybindings: KeyBindingsMap;
  perspective: PerspectiveMode;
  mouseSensitivity: number;
  fov: number;
  masterVolume: number;
  soundPack: SoundPack;
  playerName: string;
  theme: ThemeMode;
  skinId: SkinId;
  sprintMode: SprintMode;
  adsMode: AdsMode;
  autoSprint: boolean;
  autoReload: boolean;
  hideWeaponOnAds: boolean;
  cameraShoulder: CameraShoulder;
  cameraDistance: number;
  crosshairStyle: CrosshairStyle;
  crosshairColor: string;
  showDamageNumbers: boolean;
  graphicsQuality: GraphicsQuality;
  mobileControlsMode: MobileControlsMode;
  voicePttMode: boolean;
}

function loadInitialSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        keybindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings || {}) },
        perspective: parsed.perspective === "1p" ? "1p" : "3p",
        mouseSensitivity:
          typeof parsed.mouseSensitivity === "number" ? parsed.mouseSensitivity : 1.0,
        fov: typeof parsed.fov === "number" ? parsed.fov : 74,
        masterVolume:
          typeof parsed.masterVolume === "number" ? parsed.masterVolume : 0.8,
        soundPack:
          parsed.soundPack === "scifi" || parsed.soundPack === "classic"
            ? parsed.soundPack
            : "tactical",
        playerName: typeof parsed.playerName === "string" ? parsed.playerName : "",
        theme: parsed.theme === "dark" ? "dark" : "light",
        skinId: typeof parsed.skinId === "string" ? parsed.skinId : "urban_ops",
        sprintMode: parsed.sprintMode === "toggle" ? "toggle" : "hold",
        adsMode: parsed.adsMode === "toggle" ? "toggle" : "hold",
        autoSprint: Boolean(parsed.autoSprint),
        autoReload: typeof parsed.autoReload === "boolean" ? parsed.autoReload : true,
        hideWeaponOnAds:
          typeof parsed.hideWeaponOnAds === "boolean" ? parsed.hideWeaponOnAds : true,
        cameraShoulder: parsed.cameraShoulder === "left" ? "left" : "right",
        cameraDistance:
          typeof parsed.cameraDistance === "number"
            ? Math.min(5.5, Math.max(2.4, parsed.cameraDistance))
            : 3.8,
        crosshairStyle:
          parsed.crosshairStyle === "dot" ||
          parsed.crosshairStyle === "cross" ||
          parsed.crosshairStyle === "circle"
            ? parsed.crosshairStyle
            : "tactical",
        crosshairColor:
          typeof parsed.crosshairColor === "string" ? parsed.crosshairColor : "#67e8f9",
        showDamageNumbers:
          typeof parsed.showDamageNumbers === "boolean" ? parsed.showDamageNumbers : true,
        graphicsQuality:
          parsed.graphicsQuality === "low" || parsed.graphicsQuality === "high"
            ? parsed.graphicsQuality
            : "medium",
        mobileControlsMode:
          parsed.mobileControlsMode === "on" || parsed.mobileControlsMode === "off"
            ? parsed.mobileControlsMode
            : "auto",
        voicePttMode: Boolean(parsed.voicePttMode),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    keybindings: { ...DEFAULT_KEYBINDINGS },
    perspective: "3p",
    mouseSensitivity: 1.0,
    fov: 74,
    masterVolume: 0.8,
    soundPack: "tactical",
    playerName: "",
    theme: "light",
    skinId: "urban_ops",
    sprintMode: "hold",
    adsMode: "hold",
    autoSprint: false,
    autoReload: true,
    hideWeaponOnAds: true,
    cameraShoulder: "right",
    cameraDistance: 3.8,
    crosshairStyle: "tactical",
    crosshairColor: "#67e8f9",
    showDamageNumbers: true,
    graphicsQuality: "medium",
    mobileControlsMode: "auto",
    voicePttMode: false,
  };
}

function saveSettings(state: PersistedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export interface SettingsStore extends PersistedSettings {
  customWeaponSounds: Partial<Record<WeaponId, { name: string; dataUrl: string }>>;
  setKeybinding: (action: KeyAction, code: string) => void;
  resetKeybindings: () => void;
  setPerspective: (mode: PerspectiveMode) => void;
  togglePerspective: () => void;
  setMouseSensitivity: (val: number) => void;
  setFov: (val: number) => void;
  setMasterVolume: (val: number) => void;
  setSoundPack: (pack: SoundPack) => void;
  setPlayerName: (name: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSkinId: (skinId: SkinId) => void;
  setSprintMode: (mode: SprintMode) => void;
  setAdsMode: (mode: AdsMode) => void;
  setAutoSprint: (val: boolean) => void;
  setAutoReload: (val: boolean) => void;
  setHideWeaponOnAds: (val: boolean) => void;
  setCameraShoulder: (shoulder: CameraShoulder) => void;
  setCameraDistance: (dist: number) => void;
  setCrosshairStyle: (style: CrosshairStyle) => void;
  setCrosshairColor: (color: string) => void;
  setShowDamageNumbers: (val: boolean) => void;
  setGraphicsQuality: (q: GraphicsQuality) => void;
  setMobileControlsMode: (mode: MobileControlsMode) => void;
  setVoicePttMode: (ptt: boolean) => void;
  setCustomWeaponSound: (weaponId: WeaponId, name: string, dataUrl: string) => void;
  clearCustomWeaponSound: (weaponId: WeaponId) => void;
}

const initial = loadInitialSettings();

function persistSnapshot(s: SettingsStore): PersistedSettings {
  return {
    keybindings: s.keybindings,
    perspective: s.perspective,
    mouseSensitivity: s.mouseSensitivity,
    fov: s.fov,
    masterVolume: s.masterVolume,
    soundPack: s.soundPack,
    playerName: s.playerName,
    theme: s.theme,
    skinId: s.skinId,
    sprintMode: s.sprintMode,
    adsMode: s.adsMode,
    autoSprint: s.autoSprint,
    autoReload: s.autoReload,
    hideWeaponOnAds: s.hideWeaponOnAds,
    cameraShoulder: s.cameraShoulder,
    cameraDistance: s.cameraDistance,
    crosshairStyle: s.crosshairStyle,
    crosshairColor: s.crosshairColor,
    showDamageNumbers: s.showDamageNumbers,
    graphicsQuality: s.graphicsQuality,
    mobileControlsMode: s.mobileControlsMode,
    voicePttMode: s.voicePttMode,
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initial,
  customWeaponSounds: {},

  setKeybinding: (action, code) =>
    set((state) => {
      const next = { ...state.keybindings, [action]: code };
      const updated = { ...state, keybindings: next };
      saveSettings(persistSnapshot(updated));
      return { keybindings: next };
    }),

  resetKeybindings: () =>
    set((state) => {
      const next = { ...DEFAULT_KEYBINDINGS };
      saveSettings(persistSnapshot({ ...state, keybindings: next }));
      return { keybindings: next };
    }),

  setPerspective: (perspective) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, perspective }));
      return { perspective };
    }),

  togglePerspective: () => {
    const next: PerspectiveMode = get().perspective === "1p" ? "3p" : "1p";
    get().setPerspective(next);
  },

  setMouseSensitivity: (mouseSensitivity) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, mouseSensitivity }));
      return { mouseSensitivity };
    }),

  setFov: (fov) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, fov }));
      return { fov };
    }),

  setMasterVolume: (masterVolume) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, masterVolume }));
      return { masterVolume };
    }),

  setSoundPack: (soundPack) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, soundPack }));
      return { soundPack };
    }),

  setPlayerName: (playerName) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, playerName }));
      return { playerName };
    }),

  setTheme: (theme) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, theme }));
      return { theme };
    }),

  toggleTheme: () => {
    const next: ThemeMode = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  setSkinId: (skinId) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, skinId }));
      return { skinId };
    }),

  setSprintMode: (sprintMode) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, sprintMode }));
      return { sprintMode };
    }),

  setAdsMode: (adsMode) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, adsMode }));
      return { adsMode };
    }),

  setAutoSprint: (autoSprint) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, autoSprint }));
      return { autoSprint };
    }),

  setAutoReload: (autoReload) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, autoReload }));
      return { autoReload };
    }),

  setHideWeaponOnAds: (hideWeaponOnAds) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, hideWeaponOnAds }));
      return { hideWeaponOnAds };
    }),

  setCameraShoulder: (cameraShoulder) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, cameraShoulder }));
      return { cameraShoulder };
    }),

  setCameraDistance: (cameraDistance) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, cameraDistance }));
      return { cameraDistance };
    }),

  setCrosshairStyle: (crosshairStyle) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, crosshairStyle }));
      return { crosshairStyle };
    }),

  setCrosshairColor: (crosshairColor) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, crosshairColor }));
      return { crosshairColor };
    }),

  setShowDamageNumbers: (showDamageNumbers) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, showDamageNumbers }));
      return { showDamageNumbers };
    }),

  setGraphicsQuality: (graphicsQuality) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, graphicsQuality }));
      return { graphicsQuality };
    }),

  setMobileControlsMode: (mobileControlsMode) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, mobileControlsMode }));
      return { mobileControlsMode };
    }),

  setVoicePttMode: (voicePttMode) =>
    set((state) => {
      saveSettings(persistSnapshot({ ...state, voicePttMode }));
      return { voicePttMode };
    }),

  setCustomWeaponSound: (weaponId, name, dataUrl) =>
    set((state) => ({
      customWeaponSounds: {
        ...state.customWeaponSounds,
        [weaponId]: { name, dataUrl },
      },
    })),

  clearCustomWeaponSound: (weaponId) =>
    set((state) => {
      const next = { ...state.customWeaponSounds };
      delete next[weaponId];
      return { customWeaponSounds: next };
    }),
}));
