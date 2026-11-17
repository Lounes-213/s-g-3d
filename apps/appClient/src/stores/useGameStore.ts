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

  hitMarker: { at: number; isHeadshot: boolean } | null;
  triggerHitMarker: (isHeadshot: boolean) => void;

  damageFlashAt: number;
  triggerDamageFlash: () => void;

  tracers: TracerVFX[];
  explosions: ExplosionVFX[];
  muzzleFlashes: MuzzleFlashVFX[];
  hitSparks: HitSparkVFX[];
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
  markEntityHit: (
    targetId: string,
    info: {
      x: number;
      y: number;
      z: number;
      amount: number;
      isHeadshot: boolean;
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
  mapId: "compound_05",
  mode: "tdm",
  botCount: 5,
  maxPlayers: 10,
  characterId: "striker",
  skinId: "urban_ops",
  weaponId: "assaultRifle",
  playerName: "Operator-01",
};

export const useGameStore = create<GameStore>((set) => ({
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

  roomId: "SOLO-01",
  roomName: "Tactical Compound",
  mapId: "compound_05",
  mode: "tdm",
  scoreLimit: 30,
  matchState: "waiting",
  timeRemaining: 240,
  teamScores: { red: 0, blue: 0 },
  dominationOwner: "none",
  dominationProgress: 0,
  stormZone: null,
  lootPickups: [],

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
  triggerHitMarker: (isHeadshot) =>
    set({ hitMarker: { at: Date.now(), isHeadshot } }),

  damageFlashAt: 0,
  triggerDamageFlash: () => set({ damageFlashAt: Date.now() }),

  tracers: [],
  explosions: [],
  muzzleFlashes: [],
  hitSparks: [],
  damagePopups: [],
  hitEntities: {},
  dealtPopups: [],
  takenPopups: [],
  streakCount: 0,
  streakBanner: null,
  lastStreakKillAt: 0,
  addTracer: (tracer) =>
    set((state) => ({
      tracers: [...state.tracers.slice(-24), tracer],
    })),
  addExplosion: (exp) =>
    set((state) => ({
      explosions: [...state.explosions.slice(-8), exp],
    })),
  addMuzzleFlash: (flash) =>
    set((state) => ({
      muzzleFlashes: [...state.muzzleFlashes.slice(-16), flash],
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
          ...state.hitSparks.slice(-18),
          {
            id: `spark_${id}`,
            x: info.x,
            y: info.y,
            z: info.z,
            color: info.isHeadshot ? "#fbbf24" : "#ef4444",
            isHeadshot: info.isHeadshot,
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
      const withinChain = now - state.lastStreakKillAt < 7000;
      const nextStreak = withinChain ? state.streakCount + 1 : 1;
      let label = "";
      if (nextStreak >= 5) label = "GODLIKE RAMPAGE";
      else if (nextStreak === 4) label = "QUADRA KILL";
      else if (nextStreak === 3) label = "TRIPLE KILL";
      else if (nextStreak === 2) label = "DOUBLE KILL";
      else if (isHeadshot) label = "HEADSHOT ELIMINATION";
      return {
        streakCount: nextStreak,
        lastStreakKillAt: now,
        streakBanner: label ? { label, at: now } : state.streakBanner,
      };
    }),
  pruneVfx: () =>
    set((state) => {
      const now = Date.now();
      return {
        tracers: state.tracers.filter((t) => now - t.createdAt < 220),
        explosions: state.explosions.filter((e) => now - e.createdAt < 750),
        muzzleFlashes: state.muzzleFlashes.filter((m) => now - m.createdAt < 95),
        hitSparks: state.hitSparks.filter((s) => now - s.createdAt < 420),
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
      roomError: null,
    }),
}));
