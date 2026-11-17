import RAPIER from "@dimforge/rapier3d-compat";
import {
  GRAVITY,
  MAPS,
  WEAPON_ORDER,
  WINNING_RULES,
  type GameMode,
  type LootPickup,
  type MapId,
  type StormZoneState,
} from "@block-shooter/shared";
import type { GameRoom, RoomConfig } from "../types/typesSource.js";
import { logger } from "../utils/logger.js";

export const rooms = new Map<string, GameRoom>();
export const socketToRoom = new Map<string, string>();

export function buildLootForMap(mapId: MapId): LootPickup[] {
  const map = MAPS[mapId] || MAPS.veridian_04;
  const kinds: Array<LootPickup["kind"]> = ["medkit", "armor", "ammo", "weapon"];
  return map.lootSpawns.map((sp, idx) => {
    const kind = kinds[idx % kinds.length];
    return {
      id: `loot_${idx}`,
      kind,
      weaponId: kind === "weapon" ? WEAPON_ORDER[(idx + 2) % WEAPON_ORDER.length] : undefined,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      active: true,
    };
  });
}

export function createInitialStorm(mapId: MapId): StormZoneState {
  const map = MAPS[mapId] || MAPS.veridian_04;
  const maxR = Math.round(map.floor.width * 0.56);
  return {
    centerX: 0,
    centerZ: 0,
    currentRadius: maxR,
    targetRadius: 10,
    phase: 1,
    dps: 5,
  };
}

export function buildRapierWorldForMap(mapId: MapId): RAPIER.World {
  const map = MAPS[mapId] || MAPS.veridian_04;
  const world = new RAPIER.World(GRAVITY);

  const arenaBodyDesc = RAPIER.RigidBodyDesc.fixed();
  const arenaBody = world.createRigidBody(arenaBodyDesc);

  const floorDesc = RAPIER.ColliderDesc.cuboid(
    map.floor.width / 2,
    map.floor.thickness / 2,
    map.floor.depth / 2,
  ).setTranslation(map.floor.x, map.floor.y, map.floor.z);
  world.createCollider(floorDesc, arenaBody);

  [...map.walls, ...map.structures].forEach((box) => {
    const desc = RAPIER.ColliderDesc.cuboid(
      box.width / 2,
      box.height / 2,
      box.depth / 2,
    ).setTranslation(box.x, box.y, box.z);
    world.createCollider(desc, arenaBody);
  });

  return world;
}

export function createRoom(options: {
  id: string;
  name: string;
  hostId: string | null;
  isPrivate: boolean;
  mapId?: MapId;
  mode?: GameMode;
  maxPlayers?: number;
  botCount?: number;
  scoreLimit?: number;
}): GameRoom {
  const mapId: MapId = options.mapId && MAPS[options.mapId] ? options.mapId : "veridian_04";
  const mode: GameMode = options.mode || "tdm";
  const defaultLimit =
    mode === "ffa"
      ? WINNING_RULES.ffaScoreLimit
      : mode === "domination"
        ? WINNING_RULES.dominationScoreLimit
        : mode === "br"
          ? 1
          : WINNING_RULES.tdmScoreLimit;

  const config: RoomConfig = {
    id: options.id,
    name: options.name,
    hostId: options.hostId,
    isPrivate: options.isPrivate,
    mapId,
    mode,
    maxPlayers: options.maxPlayers ?? 12,
    botCount: options.botCount ?? 0,
    scoreLimit: options.scoreLimit ?? defaultLimit,
  };

  const room: GameRoom = {
    config,
    world: buildRapierWorldForMap(mapId),
    players: new Map(),
    matchState: "waiting",
    timeRemaining:
      mode === "br" ? WINNING_RULES.brMatchSeconds : WINNING_RULES.defaultMatchSeconds,
    teamScores: { red: 0, blue: 0 },
    dominationOwner: "none",
    dominationProgress: 0,
    stormZone: mode === "br" ? createInitialStorm(mapId) : null,
    lootPickups: buildLootForMap(mapId),
    restartTimer: null,
    lastTickAt: Date.now(),
  };

  rooms.set(config.id, room);
  logger.info(`Room created: ${config.id} (${config.name}) [${config.mode} on ${config.mapId}]`);
  return room;
}

export function getRoomFullState(room: GameRoom) {
  const safePlayers: Record<string, unknown> = {};

  room.players.forEach((player, id) => {
    const {
      reloadTimer,
      body,
      botTargetX,
      botTargetZ,
      botNextWanderAt,
      botNextShotAt,
      ...safeData
    } = player;
    safePlayers[id] = safeData;
  });

  return {
    roomId: room.config.id,
    roomName: room.config.name,
    mapId: room.config.mapId,
    mode: room.config.mode,
    scoreLimit: room.config.scoreLimit,
    matchState: room.matchState,
    timeRemaining: room.timeRemaining,
    teamScores: room.teamScores,
    dominationOwner: room.dominationOwner,
    dominationProgress: room.dominationProgress,
    stormZone: room.stormZone,
    lootPickups: room.lootPickups,
    players: safePlayers,
  };
}

export function getPublicRoomsList() {
  const list: Array<{
    id: string;
    name: string;
    mapId: MapId;
    mode: GameMode;
    playerCount: number;
    maxPlayers: number;
    botCount: number;
  }> = [];

  rooms.forEach((room) => {
    if (!room.config.isPrivate) {
      let humanCount = 0;
      room.players.forEach((p) => {
        if (!p.isBot) humanCount++;
      });
      list.push({
        id: room.config.id,
        name: room.config.name,
        mapId: room.config.mapId,
        mode: room.config.mode,
        playerCount: humanCount,
        maxPlayers: room.config.maxPlayers,
        botCount: room.config.botCount,
      });
    }
  });

  return list;
}
