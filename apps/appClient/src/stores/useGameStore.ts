import { create } from "zustand";
import type {
  CharacterId,
  GameMode,
  LootPickup,
  MapId,
  MatchState,
  PlayMode,
  SkillId,
  SkinId,
  StormZoneState,
  TeamType,
  WeaponId,
} from "@block-shooter/shared";

export interface RealtimeChannel {
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, listener: (...args: never[]) => void) => void;
  off: (event: string, listener?: (...args: never[]) => void) => void;
  disconnect?: () => void;
}

export type ConnectionStatus = "stable" | "disconnecting" | "disconnected";

export type PlayerState = {
  id?: string;
  name: string;
  color: string;
  team: TeamType;
  characterId: CharacterId;
  skinId?: SkinId;
  isBot?: boolean;

  // transform
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  isCrouching?: boolean;
  isSprinting?: boolean;
  isSliding?: boolean;
  lean?: number;
  isMoving?: boolean;
  isGrounded?: boolean;
  moveForward?: number;
  moveRight?: number;
  isAiming?: boolean;
  lastDoubleJumpAt?: number;

  // combat stats
  health: number;
  maxHealth?: number;
  shield?: number;
  isDead: boolean;
  kills: number;
  deaths: number;

  // weapon state
  currentWeapon: WeaponId;
  ammo: number;
  isReloading: boolean;
  lastShotTime?: number;

  // skills
  skillReadyAt?: Record<SkillId, number>;
  dashUntil?: number;
};

export type KillEvent = {
  id: string;
  shooter: string;
  shooterId?: string;
  target: string;
  targetId?: string;
  weapon: string;
  weaponId?: WeaponId;
  shooterTeam: TeamType;
  targetTeam: TeamType;
  isHeadshot?: boolean;
  timestamp: number;
};

export type TracerVFX = {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  createdAt: number;
  hitSurface: boolean;
};

export type ExplosionVFX = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  createdAt: number;
};

export type MuzzleFlashVFX = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: number;
};

export type HitSparkVFX = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  isHeadshot: boolean;
  isArmorBreak?: boolean;
  createdAt: number;
};

export type ShellCasingVFX = {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  createdAt: number;
};

export type DamagePopupVFX = {
  id: string;
  x: number;
  y: number;
  z: number;
  amount: number;
  isHeadshot: boolean;
  isFromLocal?: boolean;
  isOnLocal?: boolean;
  createdAt: number;
};

export type HudDealtPopup = {
  id: string;
  amount: number;
  isHeadshot: boolean;
  killed?: boolean;
  distanceMeters?: number;
  createdAt: number;
};

export type HudTakenPopup = {
  id: string;
  amount: number;
  isHeadshot: boolean;
  attackerWorldX?: number;
  attackerWorldZ?: number;
  createdAt: number;
};

export type PublicRoomSummary = {
  id: string;
  name: string;
  mapId: MapId;
  mode: GameMode;
  playerCount: number;
  maxPlayers: number;
  botCount: number;
};

export type PendingSessionConfig = {
  playMode: PlayMode;
  roomAction: "public" | "create" | "join";
  roomId?: string;
  roomName?: string;
  isPrivate?: boolean;
  preferredTeam?: "auto" | "red" | "blue";
  mapId: MapId;
  mode: GameMode;
  botCount: number;
  maxPlayers: number;
  characterId: CharacterId;
  skinId: SkinId;
  weaponId: WeaponId;
  playerName: string;
};

export type GameStore = {
  sessionConfig: PendingSessionConfig;
  setSessionConfig: (partial: Partial<PendingSessionConfig>) => void;

  localId: string | null;
  channel: RealtimeChannel | null;
  isConnected: boolean;
  ping: number;
  connectionStatus: ConnectionStatus;

  availableRooms: PublicRoomSummary[];
  roomError: string | null;
  setAvailableRooms: (rooms: PublicRoomSummary[]) => void;
  setRoomError: (err: string | null) => void;

  roomId: string;
  roomName: string;
  mapId: MapId;
  mode: GameMode;
  scoreLimit: number;
  matchState: MatchState;
  timeRemaining: number;
  teamScores: { red: number; blue: number };
  dominationOwner: TeamType;
  dominationProgress: number;
  stormZone: StormZoneState | null;
  lootPickups: LootPickup[];
  nearbyLoot: LootPickup | null;
  setNearbyLoot: (loot: LootPickup | null) => void;

  // Signature Tactical Survival & Combat Systems
  armorPlates: number;
  medkits: number;
  overdriveCharge: number; // 0..100
  overdriveUntil: number;
  lastLootToast: { label: string; rarity: string; at: number } | null;
  isMobileHudEditorOpen: boolean;
  setMobileHudEditorOpen: (open: boolean) => void;
  addInventoryItem: (type: "armorPlate" | "medkit", count?: number) => void;
  consumeArmorPlate: () => boolean;
  consumeMedkit: () => boolean;
  showLootNotice: (label: string, rarity?: string) => void;
  chargeOverdrive: (amount: number) => void;

  players: Record<string, PlayerState>;
  speakingPeers: Record<string, boolean>;
  setSpeakingPeer: (peerId: string, speaking: boolean) => void;

  setLocalId: (id: string | null) => void;
  setChannel: (channel: RealtimeChannel | null) => void;
  setIsConnected: (connected: boolean) => void;
  setPing: (ping: number) => void;
  setPlayers: (players: Record<string, PlayerState>) => void;
  updateMatchData: (data: Partial<GameStore>) => void;

  isLocked: boolean;
  setLocked: (locked: boolean) => void;

  killFeed: KillEvent[];
  addKillEvent: (event: KillEvent) => void;
  removeOldKills: () => void;

  crosshairSpread: number;
  setCrosshairSpread: (spread: number) => void;

  hitMarker: { at: number; isHeadshot: boolean; isArmorBreak?: boolean } | null;
  triggerHitMarker: (isHeadshot: boolean, isArmorBreak?: boolean) => void;

  damageFlashAt: number;
  triggerDamageFlash: () => void;

  tracers: TracerVFX[];
  explosions: ExplosionVFX[];
  muzzleFlashes: MuzzleFlashVFX[];
  hitSparks: HitSparkVFX[];
  shellCasings: ShellCasingVFX[];
  damagePopups: DamagePopupVFX[];
  hitEntities: Record<string, { at: number; isHeadshot: boolean }>;
  dealtPopups: HudDealtPopup[];
  takenPopups: HudTakenPopup[];
  streakCount: number;
  streakBanner: { label: string; at: number } | null;
  lastStreakKillAt: number;
  addTracer: (tracer: TracerVFX) => void;
  addExplosion: (exp: ExplosionVFX) => void;
  addMuzzleFlash: (flash: MuzzleFlashVFX) => void;
  addShellCasing: (shell: ShellCasingVFX) => void;
  markEntityHit: (
    targetId: string,
    info: {
      x: number;
      y: number;
      z: number;
      amount: number;
      isHeadshot: boolean;
      isArmorBreak?: boolean;
      shooterId?: string;
      attackerX?: number;
      attackerZ?: number;
      distanceMeters?: number;
      killed?: boolean;
    },
  ) => void;
  registerLocalKill: (isHeadshot: boolean) => void;
  pruneVfx: () => void;

  resetMatchStore: () => void;
};

const defaultSession: PendingSessionConfig = {
  playMode: "solo",
  roomAction: "public",
  preferredTeam: "auto",
  mapId: "royale_valley",
  mode: "br",
  botCount: 9,
  maxPlayers: 16,
  characterId: "striker",
  skinId: "urban_ops",
  weaponId: "assaultRifle",
  playerName: "Operator-01",
};

export const useGameStore = create<GameStore>((set, get) => ({
  sessionConfig: defaultSession,
  setSessionConfig: (partial) =>
    set((state) => ({
      sessionConfig: { ...state.sessionConfig, ...partial },
    })),

  localId: null,
  channel: null,
  isConnected: false,
  ping: 0,
  connectionStatus: "disconnected",

  availableRooms: [],
  roomError: null,
  setAvailableRooms: (availableRooms) => set({ availableRooms }),
  setRoomError: (roomError) => set({ roomError }),

  roomId: "ROYALE-01",
  roomName: "Los Verdant Royale",
  mapId: "royale_valley",
  mode: "br",
  scoreLimit: 1,
  matchState: "waiting",
  timeRemaining: 360,
  teamScores: { red: 0, blue: 0 },
  dominationOwner: "none",
  dominationProgress: 0,
  stormZone: null,
  lootPickups: [],
  nearbyLoot: null,
  setNearbyLoot: (nearbyLoot) => set({ nearbyLoot }),

  armorPlates: 2,
  medkits: 1,
  overdriveCharge: 0,
  overdriveUntil: 0,
  lastLootToast: null,
  isMobileHudEditorOpen: false,
  setMobileHudEditorOpen: (isMobileHudEditorOpen) => set({ isMobileHudEditorOpen }),
  addInventoryItem: (type, count = 1) =>
    set((state) =>
      type === "armorPlate"
        ? { armorPlates: Math.min(6, state.armorPlates + count) }
        : { medkits: Math.min(4, state.medkits + count) },
    ),
  consumeArmorPlate: () => {
    if (get().armorPlates <= 0) return false;
    set((state) => ({ armorPlates: Math.max(0, state.armorPlates - 1) }));
    return true;
  },
  consumeMedkit: () => {
    if (get().medkits <= 0) return false;
    set((state) => ({ medkits: Math.max(0, state.medkits - 1) }));
    return true;
  },
  showLootNotice: (label, rarity = "rare") =>
    set({ lastLootToast: { label, rarity, at: Date.now() } }),
  chargeOverdrive: (amount) =>
    set((state) => {
      const next = Math.min(100, state.overdriveCharge + amount);
      if (next >= 100) {
        return {
          overdriveCharge: 0,
          overdriveUntil: Date.now() + 9000,
          streakBanner: { label: "OVERDRIVE SURGE ACTIVE", at: Date.now() },
        };
      }
      return { overdriveCharge: next };
    }),

  players: {},
  speakingPeers: {},
  setSpeakingPeer: (peerId, speaking) =>
    set((state) => ({
      speakingPeers: { ...state.speakingPeers, [peerId]: speaking },
    })),

  setLocalId: (id) => set({ localId: id }),
  setChannel: (channel) => set({ channel }),

  setIsConnected: (connected) =>
    set((state) => {
      let status: ConnectionStatus = "stable";
      if (!connected) status = "disconnected";
      else if (state.ping > 150) status = "disconnecting";
      return { isConnected: connected, connectionStatus: status };
    }),

  setPing: (ping) =>
    set((state) => {
      let status: ConnectionStatus = "stable";
      if (!state.isConnected) status = "disconnected";
      else if (ping > 150) status = "disconnecting";
      return { ping, connectionStatus: status };
    }),

  setPlayers: (players) => set({ players }),
  updateMatchData: (data) => set((state) => ({ ...state, ...data })),

  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),

  killFeed: [],
  addKillEvent: (event) =>
    set((state) => {
      if (state.killFeed.some((k) => k.id === event.id)) return state;
      return { killFeed: [...state.killFeed.slice(-5), event] };
    }),

  removeOldKills: () =>
    set((state) => {
      const now = Date.now();
      return {
        killFeed: state.killFeed.filter((k) => now - k.timestamp < 5500),
      };
    }),

  crosshairSpread: 0,
  setCrosshairSpread: (spread) => set({ crosshairSpread: spread }),

  hitMarker: null,
  triggerHitMarker: (isHeadshot, isArmorBreak) =>
    set({ hitMarker: { at: Date.now(), isHeadshot, isArmorBreak } }),

  damageFlashAt: 0,
  triggerDamageFlash: () => set({ damageFlashAt: Date.now() }),

  tracers: [],
  explosions: [],
  muzzleFlashes: [],
  hitSparks: [],
  shellCasings: [],
  damagePopups: [],
  hitEntities: {},
  dealtPopups: [],
  takenPopups: [],
  streakCount: 0,
  streakBanner: null,
  lastStreakKillAt: 0,
  addTracer: (tracer) =>
    set((state) => ({
      tracers: [...state.tracers.slice(-28), tracer],
    })),
  addExplosion: (exp) =>
    set((state) => ({
      explosions: [...state.explosions.slice(-8), exp],
    })),
  addMuzzleFlash: (flash) =>
    set((state) => ({
      muzzleFlashes: [...state.muzzleFlashes.slice(-16), flash],
    })),
  addShellCasing: (shell) =>
    set((state) => ({
      shellCasings: [...state.shellCasings.slice(-20), shell],
    })),
  markEntityHit: (targetId, info) =>
    set((state) => {
      const now = Date.now();
      const id = Math.random().toString(36).slice(2);
      const isFromLocal = Boolean(info.shooterId && info.shooterId === state.localId);
      const isOnLocal = Boolean(state.localId && targetId === state.localId);

      return {
        hitEntities: {
          ...state.hitEntities,
          [targetId]: { at: now, isHeadshot: info.isHeadshot },
        },
        hitSparks: [
          ...state.hitSparks.slice(-20),
          {
            id: `spark_${id}`,
            x: info.x,
            y: info.y,
            z: info.z,
            color: info.isArmorBreak
              ? "#22d3ee"
              : info.isHeadshot
                ? "#fbbf24"
                : "#ef4444",
            isHeadshot: info.isHeadshot,
            isArmorBreak: info.isArmorBreak,
            createdAt: now,
          },
        ],
        damagePopups: [
          ...state.damagePopups.slice(-16),
          {
            id: `dmg_${id}`,
            x: info.x + (Math.random() - 0.5) * 0.35,
            y: info.y + 0.55,
            z: info.z + (Math.random() - 0.5) * 0.35,
            amount: info.amount,
            isHeadshot: info.isHeadshot,
            isFromLocal,
            isOnLocal,
            createdAt: now,
          },
        ],
        dealtPopups: isFromLocal
          ? [
              ...state.dealtPopups.slice(-6),
              {
                id: `dealt_${id}`,
                amount: info.amount,
                isHeadshot: info.isHeadshot,
                killed: info.killed,
                distanceMeters: info.distanceMeters,
                createdAt: now,
              },
            ]
          : state.dealtPopups,
        takenPopups: isOnLocal
          ? [
              ...state.takenPopups.slice(-6),
              {
                id: `taken_${id}`,
                amount: info.amount,
                isHeadshot: info.isHeadshot,
                attackerWorldX: info.attackerX,
                attackerWorldZ: info.attackerZ,
                createdAt: now,
              },
            ]
          : state.takenPopups,
      };
    }),
  registerLocalKill: (isHeadshot) =>
    set((state) => {
      const now = Date.now();
      const withinChain = now - state.lastStreakKillAt < 8000;
      const nextStreak = withinChain ? state.streakCount + 1 : 1;
      const nextCharge = state.overdriveCharge + (isHeadshot ? 45 : 34);
      const triggerOverdrive = nextCharge >= 100;

      let label = "";
      if (triggerOverdrive) label = "OVERDRIVE SURGE ACTIVE";
      else if (nextStreak >= 5) label = "GODLIKE RAMPAGE";
      else if (nextStreak === 4) label = "QUADRA KILL";
      else if (nextStreak === 3) label = "TRIPLE KILL";
      else if (nextStreak === 2) label = "DOUBLE KILL";
      else if (isHeadshot) label = "HEADSHOT ELIMINATION";

      return {
        streakCount: nextStreak,
        lastStreakKillAt: now,
        overdriveCharge: triggerOverdrive ? 0 : nextCharge,
        overdriveUntil: triggerOverdrive ? now + 9000 : state.overdriveUntil,
        streakBanner: label ? { label, at: now } : state.streakBanner,
      };
    }),
  pruneVfx: () =>
    set((state) => {
      const now = Date.now();
      return {
        tracers: state.tracers.filter((t) => now - t.createdAt < 230),
        explosions: state.explosions.filter((e) => now - e.createdAt < 750),
        muzzleFlashes: state.muzzleFlashes.filter((m) => now - m.createdAt < 95),
        hitSparks: state.hitSparks.filter((s) => now - s.createdAt < 450),
        shellCasings: state.shellCasings.filter((c) => now - c.createdAt < 900),
        damagePopups: state.damagePopups.filter((d) => now - d.createdAt < 780),
        dealtPopups: state.dealtPopups.filter((d) => now - d.createdAt < 950),
        takenPopups: state.takenPopups.filter((t) => now - t.createdAt < 950),
      };
    }),

  resetMatchStore: () =>
    set({
      players: {},
      speakingPeers: {},
      killFeed: [],
      tracers: [],
      explosions: [],
      muzzleFlashes: [],
      hitSparks: [],
      shellCasings: [],
      damagePopups: [],
      hitEntities: {},
      dealtPopups: [],
      takenPopups: [],
      streakCount: 0,
      streakBanner: null,
      lastStreakKillAt: 0,
      hitMarker: null,
      damageFlashAt: 0,
      matchState: "waiting",
      teamScores: { red: 0, blue: 0 },
      dominationOwner: "none",
      dominationProgress: 0,
      stormZone: null,
      lootPickups: [],
      nearbyLoot: null,
      armorPlates: 2,
      medkits: 1,
      overdriveCharge: 0,
      overdriveUntil: 0,
      lastLootToast: null,
      roomError: null,
    }),
}));
