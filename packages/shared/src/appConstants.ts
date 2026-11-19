import type {
  GripId,
  MagId,
  MuzzleId,
  ScopeId,
  WeaponId,
} from "./weapons.js";

export const GRAVITY = { x: 0, y: -30, z: 0 };

export const PHYSICS_CONFIG = {
  JUMP_FORCE: 15.5,
  DOUBLE_JUMP_FORCE: 13.8,
  MAX_JUMPS: 2,
  WALK_SPEED: 6.5,
  SPRINT_SPEED: 10.6,
  CROUCH_SPEED: 3.8,
  SLIDE_SPEED: 15.2,
  SLIDE_DURATION_MS: 660,
  SLIDE_COOLDOWN_MS: 1150,
  DASH_IMPULSE: 24.0,
};

export const PLAYER_CONFIG = {
  RADIUS: 0.48,
  HALF_HEIGHT: 0.52, // Total height = ~2.0m
  EYE_LEVEL_OFFSET: 0.62,
  CROUCH_EYE_OFFSET: 0.15,
  SLIDE_EYE_OFFSET: -0.08,
};

export const WINNING_RULES = {
  tdmScoreLimit: 30,
  ffaScoreLimit: 20,
  dominationScoreLimit: 150,
  brMatchSeconds: 360,
  defaultMatchSeconds: 240,
};

export type GameMode = "tdm" | "ffa" | "domination" | "br";
export type PlayMode = "online" | "room" | "solo";
export type PerspectiveMode = "1p" | "3p";
export type TeamType = "red" | "blue" | "none";
export type MatchState = "waiting" | "playing" | "ended";
export type ThemeMode = "light" | "dark";
export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Apex";
export type LootRarity = "common" | "rare" | "epic" | "legendary";

export interface LootPickup {
  id: string;
  kind: "medkit" | "armor" | "ammo" | "weapon" | "scope" | "attachment" | "airdrop";
  rarity?: LootRarity;
  label?: string;
  weaponId?: WeaponId;
  scopeId?: ScopeId;
  muzzleId?: MuzzleId;
  gripId?: GripId;
  magId?: MagId;
  isAirdrop?: boolean;
  isDeathBox?: boolean;
  x: number;
  y: number;
  z: number;
  active: boolean;
}

export interface StormZoneState {
  centerX: number;
  centerZ: number;
  currentRadius: number;
  targetRadius: number;
  phase: number;
  dps: number;
}

export function getRankTier(points: number): RankTier {
  if (points >= 2400) return "Apex";
  if (points >= 2000) return "Diamond";
  if (points >= 1650) return "Platinum";
  if (points >= 1300) return "Gold";
  if (points >= 1000) return "Silver";
  return "Bronze";
}
