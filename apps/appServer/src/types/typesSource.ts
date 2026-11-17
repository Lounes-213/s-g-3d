import RAPIER from "@dimforge/rapier3d-compat";
import type {
  CharacterId,
  GameMode,
  LootPickup,
  MapId,
  MatchState,
  SkinId,
  StormZoneState,
  TeamType,
  WeaponId,
} from "@block-shooter/shared";

export type ServerPlayerState = {
  id: string;
  name: string;
  color: string;
  team: TeamType;
  characterId: CharacterId;
  skinId: SkinId;
  isBot: boolean;

  // transform & motion
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isMoving: boolean;
  isGrounded: boolean;
  moveForward: number;
  moveRight: number;
  isAiming: boolean;

  // combat stats
  health: number;
  maxHealth: number;
  shield: number;
  shieldExpiresAt: number;
  isDead: boolean;
  kills: number;
  deaths: number;
  body: RAPIER.RigidBody;

  // weapons
  currentWeapon: WeaponId;
  ammo: number;
  magazines: Record<WeaponId, number>;
  isReloading: boolean;
  lastShotTime: number;
  reloadTimer: NodeJS.Timeout | null;

  // skills cooldowns (epoch ms when ready)
  skillReadyAt: {
    dash: number;
    shield: number;
    grenade: number;
  };
  dashUntil: number;
  lastJumpPadAt: number;
  jumpsUsed: number;

  // bot AI scratchpad
  botTargetX?: number;
  botTargetZ?: number;
  botNextWanderAt?: number;
  botNextShotAt?: number;
};

export type RoomConfig = {
  id: string;
  name: string;
  hostId: string | null;
  isPrivate: boolean;
  mapId: MapId;
  mode: GameMode;
  maxPlayers: number;
  botCount: number;
  scoreLimit: number;
};

export type GameRoom = {
  config: RoomConfig;
  world: RAPIER.World;
  players: Map<string, ServerPlayerState>;
  matchState: MatchState;
  timeRemaining: number;
  teamScores: { red: number; blue: number };
  dominationOwner: TeamType;
  dominationProgress: number;
  stormZone: StormZoneState | null;
  lootPickups: LootPickup[];
  restartTimer: NodeJS.Timeout | null;
  lastTickAt: number;
};
