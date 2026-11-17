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
