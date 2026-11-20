import { create } from "zustand";
import {
  DEFAULT_KEYBINDINGS,
  getDefaultAttachments,
  type KeyAction,
  type KeyBindingsMap,
  type PerspectiveMode,
  type SkinId,
  type ThemeMode,
  type WeaponAttachments,
  type WeaponId,
} from "@block-shooter/shared";

export type SoundPack = "tactical" | "scifi" | "classic";
export type SprintMode = "hold" | "toggle";
export type AdsMode = "hold" | "toggle";
export type CameraShoulder = "right" | "left";
export type CrosshairStyle = "tactical" | "dot" | "cross" | "circle";
export type GraphicsQuality = "low" | "medium" | "high";
export type MobileControlsMode = "auto" | "on" | "off";

export type MobileControlId =
  | "joystick"
  | "fireRight"
  | "fireLeft"
  | "ads"
  | "jump"
  | "crouch"
  | "reload"
  | "loot"
  | "armorPlate"
  | "medkit"
  | "scopeCycle"
  | "leanLeft"
  | "leanRight"
  | "skill1"
  | "skill2"
  | "skill3"
  | "camera"
  | "weaponsBar";

export interface MobileControlLayout {
  x: number; // viewport % (0..100)
  y: number; // viewport % (0..100)
  scale: number; // 0.6..1.6
  opacity: number; // 0.3..1.0
  visible: boolean;
}

export type MobileHudLayoutMap = Record<MobileControlId, MobileControlLayout>;
export type MobilePresetId = "thumb2" | "claw3" | "claw4" | "custom";

export const MOBILE_CONTROL_LABELS: Record<MobileControlId, string> = {
  joystick: "Move Joystick",
  fireRight: "Primary Fire (R)",
  fireLeft: "Secondary Fire (L)",
  ads: "Scope / ADS",
  jump: "Jump",
  crouch: "Crouch / Slide",
  reload: "Reload",
  loot: "Loot Pickup",
  armorPlate: "Armor Plate",
  medkit: "Medkit",
  scopeCycle: "Cycle Zoom",
  leanLeft: "Lean Left",
  leanRight: "Lean Right",
  skill1: "Dash Skill",
  skill2: "Shield Skill",
  skill3: "Frag Grenade",
  camera: "1P / 3P Cam",
  weaponsBar: "Weapon Slots",
};

export const MOBILE_HUD_PRESETS: Record<Exclude<MobilePresetId, "custom">, MobileHudLayoutMap> = {
  thumb2: {
    joystick: { x: 14, y: 74, scale: 1.0, opacity: 0.88, visible: true },
    fireRight: { x: 87, y: 69, scale: 1.05, opacity: 0.92, visible: true },
    fireLeft: { x: 14, y: 45, scale: 0.9, opacity: 0.8, visible: true },
    ads: { x: 76, y: 55, scale: 1.0, opacity: 0.9, visible: true },
    jump: { x: 92, y: 49, scale: 0.95, opacity: 0.88, visible: true },
    crouch: { x: 75, y: 78, scale: 0.95, opacity: 0.88, visible: true },
    reload: { x: 65, y: 80, scale: 0.9, opacity: 0.88, visible: true },
    loot: { x: 50, y: 68, scale: 1.0, opacity: 0.96, visible: true },
    armorPlate: { x: 32, y: 84, scale: 0.88, opacity: 0.88, visible: true },
    medkit: { x: 25, y: 84, scale: 0.88, opacity: 0.88, visible: true },
    scopeCycle: { x: 84, y: 36, scale: 0.85, opacity: 0.86, visible: true },
    leanLeft: { x: 22, y: 55, scale: 0.82, opacity: 0.82, visible: true },
    leanRight: { x: 30, y: 55, scale: 0.82, opacity: 0.82, visible: true },
    skill1: { x: 82, y: 24, scale: 0.82, opacity: 0.84, visible: true },
    skill2: { x: 90, y: 24, scale: 0.82, opacity: 0.84, visible: true },
    skill3: { x: 94, y: 35, scale: 0.82, opacity: 0.84, visible: true },
    camera: { x: 93, y: 12, scale: 0.82, opacity: 0.84, visible: true },
    weaponsBar: { x: 50, y: 92, scale: 0.95, opacity: 0.92, visible: true },
  },
  claw3: {
    joystick: { x: 14, y: 74, scale: 1.0, opacity: 0.88, visible: true },
    fireLeft: { x: 14, y: 24, scale: 1.15, opacity: 0.94, visible: true },
    fireRight: { x: 88, y: 72, scale: 0.92, opacity: 0.8, visible: true },
    ads: { x: 88, y: 48, scale: 1.05, opacity: 0.92, visible: true },
    jump: { x: 77, y: 58, scale: 0.98, opacity: 0.9, visible: true },
    crouch: { x: 77, y: 75, scale: 0.98, opacity: 0.9, visible: true },
    reload: { x: 66, y: 79, scale: 0.9, opacity: 0.88, visible: true },
    loot: { x: 50, y: 66, scale: 1.0, opacity: 0.96, visible: true },
    armorPlate: { x: 32, y: 83, scale: 0.88, opacity: 0.88, visible: true },
    medkit: { x: 25, y: 83, scale: 0.88, opacity: 0.88, visible: true },
    scopeCycle: { x: 78, y: 38, scale: 0.88, opacity: 0.88, visible: true },
    leanLeft: { x: 24, y: 36, scale: 0.86, opacity: 0.86, visible: true },
    leanRight: { x: 32, y: 36, scale: 0.86, opacity: 0.86, visible: true },
    skill1: { x: 68, y: 24, scale: 0.82, opacity: 0.84, visible: true },
    skill2: { x: 76, y: 24, scale: 0.82, opacity: 0.84, visible: true },
    skill3: { x: 84, y: 24, scale: 0.82, opacity: 0.84, visible: true },
    camera: { x: 93, y: 12, scale: 0.82, opacity: 0.84, visible: true },
    weaponsBar: { x: 50, y: 92, scale: 0.95, opacity: 0.92, visible: true },
  },
  claw4: {
    joystick: { x: 14, y: 75, scale: 1.0, opacity: 0.86, visible: true },
    fireLeft: { x: 13, y: 22, scale: 1.2, opacity: 0.94, visible: true },
    fireRight: { x: 89, y: 76, scale: 0.85, opacity: 0.65, visible: false },
    ads: { x: 87, y: 22, scale: 1.15, opacity: 0.94, visible: true },
    jump: { x: 77, y: 25, scale: 0.96, opacity: 0.9, visible: true },
    crouch: { x: 89, y: 40, scale: 0.98, opacity: 0.9, visible: true },
    reload: { x: 78, y: 78, scale: 0.92, opacity: 0.88, visible: true },
    loot: { x: 50, y: 66, scale: 1.0, opacity: 0.96, visible: true },
    armorPlate: { x: 32, y: 82, scale: 0.88, opacity: 0.88, visible: true },
    medkit: { x: 25, y: 82, scale: 0.88, opacity: 0.88, visible: true },
    scopeCycle: { x: 77, y: 39, scale: 0.88, opacity: 0.88, visible: true },
    leanLeft: { x: 24, y: 24, scale: 0.92, opacity: 0.88, visible: true },
    leanRight: { x: 32, y: 24, scale: 0.92, opacity: 0.88, visible: true },
    skill1: { x: 88, y: 56, scale: 0.84, opacity: 0.84, visible: true },
    skill2: { x: 88, y: 68, scale: 0.84, opacity: 0.84, visible: true },
    skill3: { x: 78, y: 62, scale: 0.84, opacity: 0.84, visible: true },
    camera: { x: 68, y: 14, scale: 0.82, opacity: 0.84, visible: true },
    weaponsBar: { x: 50, y: 92, scale: 0.95, opacity: 0.92, visible: true },
  },
};

const STORAGE_KEY = "sg3d_settings_v3";

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
  weaponAttachments: Partial<Record<WeaponId, WeaponAttachments>>;
  mobileHudPreset: MobilePresetId;
  mobileHudLayout: MobileHudLayoutMap;
}

function mergeMobileLayout(saved?: Partial<MobileHudLayoutMap>): MobileHudLayoutMap {
  const base = MOBILE_HUD_PRESETS.thumb2;
  const out = { ...base };
  if (saved) {
    (Object.keys(base) as MobileControlId[]).forEach((k) => {
      if (saved[k]) {
        out[k] = { ...base[k], ...saved[k] };
      }
    });
  }
  return out;
}

function loadInitialSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("sg3d_settings_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        keybindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings || {}) },
        perspective: parsed.perspective === "3p" ? "3p" : "1p",
        mouseSensitivity:
          typeof parsed.mouseSensitivity === "number" ? parsed.mouseSensitivity : 1.0,
        fov: typeof parsed.fov === "number" ? parsed.fov : 76,
        masterVolume:
          typeof parsed.masterVolume === "number" ? parsed.masterVolume : 0.85,
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
          typeof parsed.hideWeaponOnAds === "boolean" ? parsed.hideWeaponOnAds : false,
        cameraShoulder: parsed.cameraShoulder === "left" ? "left" : "right",
        cameraDistance:
          typeof parsed.cameraDistance === "number"
            ? Math.min(5.5, Math.max(2.4, parsed.cameraDistance))
            : 3.7,
        crosshairStyle:
          parsed.crosshairStyle === "dot" ||
          parsed.crosshairStyle === "cross" ||
          parsed.crosshairStyle === "circle"
            ? parsed.crosshairStyle
            : "tactical",
        crosshairColor:
          typeof parsed.crosshairColor === "string" ? parsed.crosshairColor : "#f59e0b",
        showDamageNumbers:
          typeof parsed.showDamageNumbers === "boolean" ? parsed.showDamageNumbers : true,
        graphicsQuality:
          parsed.graphicsQuality === "low" || parsed.graphicsQuality === "high"
            ? parsed.graphicsQuality
            : "high",
        mobileControlsMode:
          parsed.mobileControlsMode === "on" || parsed.mobileControlsMode === "off"
            ? parsed.mobileControlsMode
            : "auto",
        voicePttMode: Boolean(parsed.voicePttMode),
        weaponAttachments:
          parsed.weaponAttachments && typeof parsed.weaponAttachments === "object"
            ? parsed.weaponAttachments
            : {},
        mobileHudPreset:
          parsed.mobileHudPreset === "claw3" ||
          parsed.mobileHudPreset === "claw4" ||
          parsed.mobileHudPreset === "custom"
            ? parsed.mobileHudPreset
            : "thumb2",
        mobileHudLayout: mergeMobileLayout(parsed.mobileHudLayout),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    keybindings: { ...DEFAULT_KEYBINDINGS },
    perspective: "1p",
    mouseSensitivity: 1.0,
    fov: 76,
    masterVolume: 0.85,
    soundPack: "tactical",
    playerName: "",
    theme: "light",
    skinId: "urban_ops",
    sprintMode: "hold",
    adsMode: "hold",
    autoSprint: false,
    autoReload: true,
    hideWeaponOnAds: false,
    cameraShoulder: "right",
    cameraDistance: 3.7,
    crosshairStyle: "tactical",
    crosshairColor: "#f59e0b",
    showDamageNumbers: true,
    graphicsQuality: "high",
    mobileControlsMode: "auto",
    voicePttMode: false,
    weaponAttachments: {},
    mobileHudPreset: "thumb2",
    mobileHudLayout: mergeMobileLayout(),
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
  getWeaponAttachments: (weaponId: WeaponId) => WeaponAttachments;
  setWeaponAttachment: <K extends keyof WeaponAttachments>(
    weaponId: WeaponId,
    slot: K,
    value: WeaponAttachments[K],
  ) => void;
  resetWeaponAttachments: (weaponId: WeaponId) => void;
  updateMobileControl: (id: MobileControlId, patch: Partial<MobileControlLayout>) => void;
  applyMobilePreset: (preset: Exclude<MobilePresetId, "custom">) => void;
  resetMobileHudLayout: () => void;
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
    weaponAttachments: s.weaponAttachments,
    mobileHudPreset: s.mobileHudPreset,
    mobileHudLayout: s.mobileHudLayout,
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

  getWeaponAttachments: (weaponId) => {
    const saved = get().weaponAttachments[weaponId];
    return { ...getDefaultAttachments(weaponId), ...(saved || {}) };
  },

  setWeaponAttachment: (weaponId, slot, value) =>
    set((state) => {
      const current = {
        ...getDefaultAttachments(weaponId),
        ...(state.weaponAttachments[weaponId] || {}),
      };
      const nextMap = {
        ...state.weaponAttachments,
        [weaponId]: { ...current, [slot]: value },
      };
      saveSettings(persistSnapshot({ ...state, weaponAttachments: nextMap }));
      return { weaponAttachments: nextMap };
    }),

  resetWeaponAttachments: (weaponId) =>
    set((state) => {
      const nextMap = { ...state.weaponAttachments };
      delete nextMap[weaponId];
      saveSettings(persistSnapshot({ ...state, weaponAttachments: nextMap }));
      return { weaponAttachments: nextMap };
    }),

  updateMobileControl: (id, patch) =>
    set((state) => {
      const nextLayout: MobileHudLayoutMap = {
        ...state.mobileHudLayout,
        [id]: { ...state.mobileHudLayout[id], ...patch },
      };
      saveSettings(
        persistSnapshot({
          ...state,
          mobileHudPreset: "custom",
          mobileHudLayout: nextLayout,
        }),
      );
      return { mobileHudPreset: "custom", mobileHudLayout: nextLayout };
    }),

  applyMobilePreset: (preset) =>
    set((state) => {
      const nextLayout = mergeMobileLayout(MOBILE_HUD_PRESETS[preset]);
      saveSettings(
        persistSnapshot({
          ...state,
          mobileHudPreset: preset,
          mobileHudLayout: nextLayout,
        }),
      );
      return { mobileHudPreset: preset, mobileHudLayout: nextLayout };
    }),

  resetMobileHudLayout: () => {
    get().applyMobilePreset("thumb2");
  },

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
