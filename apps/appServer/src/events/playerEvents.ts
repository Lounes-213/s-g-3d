import { Server, Socket } from "socket.io";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CHARACTER_SKINS,
  MAPS,
  PHYSICS_CONFIG,
  PLAYER_CONFIG,
  SKIN_ORDER,
  SKILLS,
  WEAPONS,
  WEAPON_ORDER,
  createInitialMagazines,
  computeMuzzleWorldPos,
  computeDistanceDamage,
  resolveCylinderBoxCollisions,
  getSupportHeightAt,
  type CharacterId,
  type SkillId,
  type SkinId,
  type TeamType,
  type WeaponId,
} from "@block-shooter/shared";
import {
  createRoom,
  getPublicRoomsList,
  rooms,
  socketToRoom,
} from "../state/gameState.js";
import type { GameRoom, ServerPlayerState } from "../types/typesSource.js";
import {
  generateRoomCode,
  getBotName,
  getRandomName,
  getRandomSpawn,
} from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export function isPlayerOnGround(
  world: RAPIER.World,
  playerBody: RAPIER.RigidBody,
): boolean {
  const position = playerBody.translation();
  const rayOrigin = {
    x: position.x,
    y: position.y - (PLAYER_CONFIG.HALF_HEIGHT + PLAYER_CONFIG.RADIUS + 0.02),
    z: position.z,
  };
  const ray = new RAPIER.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
  const hit = world.castRay(ray, 0.25, true, undefined, undefined, undefined, playerBody);
  return hit !== null;
}

function assignTeam(room: GameRoom): TeamType {
  if (room.config.mode === "ffa" || room.config.mode === "br") return "none";
  let redCount = 0;
  let blueCount = 0;
  room.players.forEach((p) => {
    if (p.team === "red") redCount++;
    if (p.team === "blue") blueCount++;
  });
  return redCount <= blueCount ? "red" : "blue";
}

function spawnEntityInRoom(
  room: GameRoom,
  opts: {
    id: string;
    name: string;
    characterId: CharacterId;
    skinId?: SkinId;
    weaponId: WeaponId;
    isBot: boolean;
    team?: TeamType;
  },
): ServerPlayerState {
  const charCfg = CHARACTERS[opts.characterId] || CHARACTERS.striker;
  const skinId: SkinId =
    opts.skinId && CHARACTER_SKINS[opts.skinId] ? opts.skinId : charCfg.defaultSkin;
  const team = opts.team ?? assignTeam(room);
  const spawn = getRandomSpawn(room.config.mapId, team);

  const color =
    team === "red"
      ? "#ef4444"
      : team === "blue"
        ? "#3b82f6"
        : charCfg.secondaryColor;

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(spawn.x, spawn.y + 3.0, spawn.z)
    .lockRotations();

  const body = room.world.createRigidBody(bodyDesc);
  body.userData = { id: opts.id };

  const colliderDesc = RAPIER.ColliderDesc.capsule(
    PLAYER_CONFIG.HALF_HEIGHT,
    PLAYER_CONFIG.RADIUS,
  );
  room.world.createCollider(colliderDesc, body);

  const mags = createInitialMagazines();
  const weaponId = WEAPONS[opts.weaponId] ? opts.weaponId : charCfg.defaultWeapon;

  const player: ServerPlayerState = {
    id: opts.id,
    name: opts.name,
    color,
    team,
    characterId: charCfg.id,
    skinId,
    isBot: opts.isBot,
    x: spawn.x,
    y: spawn.y + 3.0,
    z: spawn.z,
    yaw: 0,
    pitch: 0,
    isCrouching: false,
    isSprinting: false,
    isMoving: false,
    isGrounded: true,
    moveForward: 0,
    moveRight: 0,
    isAiming: false,
    health: charCfg.maxHealth,
    maxHealth: charCfg.maxHealth,
    shield: 0,
    shieldExpiresAt: 0,
    isDead: false,
    kills: 0,
    deaths: 0,
    body,
    currentWeapon: weaponId,
    ammo: mags[weaponId],
    magazines: mags,
    isReloading: false,
    lastShotTime: 0,
    reloadTimer: null,
    skillReadyAt: { dash: 0, shield: 0, grenade: 0 },
    dashUntil: 0,
    lastJumpPadAt: 0,
    jumpsUsed: 0,
  };

  room.players.set(opts.id, player);
  return player;
}

export function syncRoomBots(room: GameRoom) {
  const targetBots = room.config.botCount;
  const existingBots = Array.from(room.players.values()).filter((p) => p.isBot);

  if (existingBots.length < targetBots) {
    for (let i = existingBots.length; i < targetBots; i++) {
      const botId = `bot_${room.config.id}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const charId = CHARACTER_ORDER[i % CHARACTER_ORDER.length];
      const skinId = SKIN_ORDER[i % SKIN_ORDER.length];
      const wpnId = WEAPON_ORDER[i % WEAPON_ORDER.length];
      spawnEntityInRoom(room, {
        id: botId,
        name: getBotName(i),
        characterId: charId,
        skinId,
        weaponId: wpnId,
        isBot: true,
      });
    }
  } else if (existingBots.length > targetBots) {
    const excess = existingBots.slice(targetBots);
    for (const bot of excess) {
      if (bot.reloadTimer) clearTimeout(bot.reloadTimer);
      try {
        room.world.removeRigidBody(bot.body);
      } catch {
        // ignore
      }
      room.players.delete(bot.id);
    }
  }
}

export function scheduleRespawn(room: GameRoom, id: string, delayMs = 2800) {
  setTimeout(() => {
    const p = room.players.get(id);
    if (!p) return;

    const charCfg = CHARACTERS[p.characterId] || CHARACTERS.striker;
    p.maxHealth = charCfg.maxHealth;
    p.health = p.maxHealth;
    p.shield = 0;
    p.shieldExpiresAt = 0;
    p.isDead = false;
    p.isReloading = false;

    const weapon = WEAPONS[p.currentWeapon];
    if (weapon) {
      p.ammo = weapon.magSize;
      p.magazines[p.currentWeapon] = weapon.magSize;
    }

    const newSpawn = getRandomSpawn(room.config.mapId, p.team);
    p.x = newSpawn.x;
    p.y = newSpawn.y + 3.0;
    p.z = newSpawn.z;

    p.body.setTranslation({ x: newSpawn.x, y: newSpawn.y + 3.0, z: newSpawn.z }, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    p.jumpsUsed = 0;
  }, delayMs);
}

export function leaveCurrentRoom(socket: Socket, io: Server) {
  const prevRoomId = socketToRoom.get(socket.id);
  if (!prevRoomId) return;

  socket.leave(prevRoomId);
  socketToRoom.delete(socket.id);

  const room = rooms.get(prevRoomId);
  if (!room) return;

  const player = room.players.get(socket.id);
  if (player) {
    if (player.reloadTimer) clearTimeout(player.reloadTimer);
    try {
      room.world.removeRigidBody(player.body);
    } catch {
      // ignore
    }
    room.players.delete(socket.id);
  }

  // Clean up non-default empty rooms
  if (prevRoomId !== "PUBLIC-01") {
    let humanCount = 0;
    room.players.forEach((p) => {
      if (!p.isBot) humanCount++;
    });
    if (humanCount === 0) {
      if (room.restartTimer) clearTimeout(room.restartTimer);
      rooms.delete(prevRoomId);
      logger.info(`Removed empty custom room ${prevRoomId}`);
    }
  }

  io.emit("rooms_list", getPublicRoomsList());
}

export function joinSpecificRoom(
  socket: Socket,
  io: Server,
  payload: {
    roomId?: string;
    playerName?: string;
    characterId?: CharacterId;
    skinId?: SkinId;
    weaponId?: WeaponId;
    preferredTeam?: "auto" | "red" | "blue";
  },
) {
  const targetId = payload.roomId || "PUBLIC-01";
  let room = rooms.get(targetId);

  if (!room) {
    if (targetId === "PUBLIC-01") {
      room = createRoom({
        id: "PUBLIC-01",
        name: "Public Tactical Arena (Pro PvP)",
        hostId: null,
        isPrivate: false,
        mapId: "veridian_04",
        mode: "tdm",
        maxPlayers: 12,
        botCount: 0,
      });
    } else {
      socket.emit("room_error", { message: `Room "${targetId}" not found.` });
      return;
    }
  }

  let humanCount = 0;
  room.players.forEach((p) => {
    if (!p.isBot) humanCount++;
  });
  if (humanCount >= room.config.maxPlayers) {
    socket.emit("room_error", { message: "Room is full." });
    return;
  }

  leaveCurrentRoom(socket, io);

  socket.join(room.config.id);
  socketToRoom.set(socket.id, room.config.id);

  const cleanName = (payload.playerName || "").trim().slice(0, 18) || getRandomName();
  const charId: CharacterId =
    payload.characterId && CHARACTERS[payload.characterId] ? payload.characterId : "striker";
  const skinId: SkinId =
    payload.skinId && CHARACTER_SKINS[payload.skinId]
      ? payload.skinId
      : CHARACTERS[charId].defaultSkin;
  const wpnId: WeaponId =
    payload.weaponId && WEAPONS[payload.weaponId] ? payload.weaponId : "assaultRifle";

  const chosenTeam: TeamType | undefined =
    room.config.mode !== "ffa" &&
    room.config.mode !== "br" &&
    (payload.preferredTeam === "red" || payload.preferredTeam === "blue")
      ? payload.preferredTeam
      : undefined;

  spawnEntityInRoom(room, {
    id: socket.id,
    name: cleanName,
    characterId: charId,
    skinId,
    weaponId: wpnId,
    isBot: false,
    team: chosenTeam,
  });

  syncRoomBots(room);

  socket.emit("room_joined", {
    roomId: room.config.id,
    roomName: room.config.name,
    mapId: room.config.mapId,
    mode: room.config.mode,
    isPrivate: room.config.isPrivate,
    botCount: room.config.botCount,
  });

  io.emit("rooms_list", getPublicRoomsList());
  logger.info(`${cleanName} (${socket.id}) joined room ${room.config.id}`);
}

export function handleCreateRoom(
  socket: Socket,
  io: Server,
  payload: {
    roomName?: string;
    mapId?: any;
    mode?: any;
    isPrivate?: boolean;
    maxPlayers?: number;
    botCount?: number;
    playerName?: string;
    characterId?: CharacterId;
    skinId?: SkinId;
    weaponId?: WeaponId;
    preferredTeam?: "auto" | "red" | "blue";
  },
) {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room = createRoom({
    id: code,
    name: (payload.roomName || `Room ${code}`).slice(0, 28),
    hostId: socket.id,
    isPrivate: Boolean(payload.isPrivate),
    mapId: payload.mapId,
    mode: payload.mode,
    maxPlayers: Math.min(16, Math.max(2, Number(payload.maxPlayers) || 10)),
    botCount: Math.min(8, Math.max(0, Number(payload.botCount) || 0)),
  });

  joinSpecificRoom(socket, io, {
    roomId: room.config.id,
    playerName: payload.playerName,
    characterId: payload.characterId,
    skinId: payload.skinId,
    weaponId: payload.weaponId,
    preferredTeam: payload.preferredTeam,
  });
}

export function handlePlayerInput(id: string, data: any) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(id);
  if (!player || player.isDead) return;

  player.yaw = typeof data.yaw === "number" ? data.yaw : player.yaw;
  player.pitch = typeof data.pitch === "number" ? data.pitch : player.pitch;
  player.isCrouching = Boolean(data.isCrouching);
  player.isSprinting = Boolean(data.isSprinting);
  player.isMoving = Boolean(data.isMoving);
  player.moveForward = typeof data.moveForward === "number" ? data.moveForward : 0;
  player.moveRight = typeof data.moveRight === "number" ? data.moveRight : 0;
  player.isAiming = Boolean(data.isAiming);

  const currentPos = player.body.translation();
  const nextX = typeof data.x === "number" ? data.x : player.x;
  const nextZ = typeof data.z === "number" ? data.z : player.z;
  const nextY = typeof data.y === "number" ? data.y : currentPos.y;

  player.x = nextX;
  player.z = nextZ;
  player.y = nextY;
  if (Boolean(data.isGrounded)) {
    player.jumpsUsed = 0;
  }

  player.body.setTranslation({ x: nextX, y: nextY, z: nextZ }, true);
}

export function handleJump(id: string) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(id);
  if (player && !player.isDead) {
    const onGround = isPlayerOnGround(room.world, player.body);
    if (onGround) {
      player.jumpsUsed = 1;
      const vel = player.body.linvel();
      player.body.setLinvel({ x: vel.x, y: PHYSICS_CONFIG.JUMP_FORCE, z: vel.z }, true);
    } else if (player.jumpsUsed < PHYSICS_CONFIG.MAX_JUMPS) {
      player.jumpsUsed += 1;
      const vel = player.body.linvel();
      player.body.setLinvel(
        { x: vel.x, y: PHYSICS_CONFIG.DOUBLE_JUMP_FORCE, z: vel.z },
        true,
      );
    }
  }
}

export function handleSwitchWeapon(id: string, weaponId: WeaponId) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(id);
  if (!player || player.isDead || !WEAPONS[weaponId]) return;

  if (player.isReloading) {
    player.isReloading = false;
    if (player.reloadTimer) {
      clearTimeout(player.reloadTimer);
      player.reloadTimer = null;
    }
  }

  player.currentWeapon = weaponId;
  player.ammo = player.magazines[weaponId];
}

export function handleSelectCharacter(id: string, characterId: CharacterId) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(id);
  if (!player || !CHARACTERS[characterId]) return;
  const cfg = CHARACTERS[characterId];
  player.characterId = characterId;
  player.maxHealth = cfg.maxHealth;
  player.health = Math.min(player.health, cfg.maxHealth);
}

export function handleSwitchTeam(id: string, team: "red" | "blue") {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.config.mode !== "tdm" && room.config.mode !== "domination") return;
  if (team !== "red" && team !== "blue") return;

  const player = room.players.get(id);
  if (!player || player.team === team) return;

  player.team = team;
  player.color = team === "red" ? "#ef4444" : "#3b82f6";
  const spawn = getRandomSpawn(room.config.mapId, team);
  player.x = spawn.x;
  player.y = spawn.y + 1.5;
  player.z = spawn.z;
  player.health = player.maxHealth;
  player.isDead = false;
  player.body.setTranslation({ x: player.x, y: player.y, z: player.z }, true);
  player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

export function handleReload(id: string, roomOverride?: GameRoom) {
  let room = roomOverride;
  if (!room) {
    const roomId = socketToRoom.get(id);
    if (!roomId) return;
    room = rooms.get(roomId);
  }
  if (!room) return;

  const player = room.players.get(id);
  if (!player || player.isDead || player.isReloading) return;

  const weapon = WEAPONS[player.currentWeapon];
  if (player.ammo >= weapon.magSize) return;

  const charCfg = CHARACTERS[player.characterId] || CHARACTERS.striker;
  const reloadMs = Math.round(weapon.reloadTime * charCfg.reloadMult);

  player.isReloading = true;
  const targetRoom = room;

  player.reloadTimer = setTimeout(() => {
    const p = targetRoom.players.get(id);
    if (p) {
      p.magazines[p.currentWeapon] = weapon.magSize;
      p.ammo = weapon.magSize;
      p.isReloading = false;
      p.reloadTimer = null;
    }
  }, reloadMs);
}

function applyDamageToPlayer(
  room: GameRoom,
  attacker: ServerPlayerState,
  target: ServerPlayerState,
  damage: number,
  weaponName: string,
  isHeadshot: boolean,
  io: Server,
  hitY?: number,
  distanceMeters?: number,
) {
  if (target.isDead) return;
  if (
    room.config.mode !== "ffa" &&
    room.config.mode !== "br" &&
    attacker.team === target.team &&
    attacker.id !== target.id
  ) {
    return;
  }

  let remaining = damage;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }

  target.health -= remaining;
  const killed = target.health <= 0;

  io.to(room.config.id).emit("player_damaged", {
    targetId: target.id,
    shooterId: attacker.id,
    attackerX: attacker.x,
    attackerZ: attacker.z,
    x: target.x,
    y: hitY ?? target.y + (isHeadshot ? 0.65 : 0.2),
    z: target.z,
    damage,
    isHeadshot,
    distanceMeters,
    killed,
  });

  if (!attacker.isBot) {
    io.to(room.config.id).emit("hit_confirm", {
      shooterId: attacker.id,
      targetId: target.id,
      damage,
      isHeadshot,
      killed,
      distanceMeters,
    });
  }

  if (killed) {
    target.health = 0;
    target.isDead = true;
    target.deaths += 1;

    if (attacker.id !== target.id) {
      attacker.kills += 1;
      if (room.config.mode === "tdm") {
        room.teamScores[attacker.team as "red" | "blue"] += 1;
      }
    }

    // Check score limit or BR last-survivor win
    if (
      room.config.mode === "tdm" &&
      room.teamScores[attacker.team as "red" | "blue"] >= room.config.scoreLimit
    ) {
      room.timeRemaining = 0;
    } else if (
      room.config.mode === "ffa" &&
      attacker.kills >= room.config.scoreLimit
    ) {
      room.timeRemaining = 0;
    } else if (room.config.mode === "br") {
      let aliveCount = 0;
      room.players.forEach((p) => {
        if (!p.isDead) aliveCount++;
      });
      if (aliveCount <= 1) {
        room.timeRemaining = 0;
      }
    }

    io.to(room.config.id).emit("kill_feed", {
      id: Math.random().toString(36).substring(2, 9),
      shooter: attacker.name,
      shooterId: attacker.id,
      target: target.name,
      targetId: target.id,
      weapon: isHeadshot ? `${weaponName} (HS)` : weaponName,
      weaponId: attacker.currentWeapon,
      shooterTeam: attacker.team,
      targetTeam: target.team,
      isHeadshot,
    });

    if (room.config.mode !== "br") {
      scheduleRespawn(room, target.id, 2800);
    }
  }
}

export function performShoot(
  room: GameRoom,
  shooterId: string,
  dir: {
    dirX: number;
    dirY: number;
    dirZ: number;
    muzzle?: { x: number; y: number; z: number };
  },
  io: Server,
) {
  const shooter = room.players.get(shooterId);
  if (!shooter || shooter.isDead || shooter.isReloading) return;

  const weapon = WEAPONS[shooter.currentWeapon];
  const now = Date.now();

  if (now - shooter.lastShotTime < weapon.fireRate - 15) return;
  if (shooter.ammo <= 0) return;

  shooter.magazines[shooter.currentWeapon] -= 1;
  shooter.ammo = shooter.magazines[shooter.currentWeapon];
  shooter.lastShotTime = now;

  const eyeOffset = shooter.isCrouching
    ? PLAYER_CONFIG.CROUCH_EYE_OFFSET
    : PLAYER_CONFIG.EYE_LEVEL_OFFSET;

  const origin = {
    x: shooter.x,
    y: shooter.y + eyeOffset,
    z: shooter.z,
  };

  const hasValidMuzzle =
    dir.muzzle &&
    Number.isFinite(dir.muzzle.x) &&
    Number.isFinite(dir.muzzle.y) &&
    Number.isFinite(dir.muzzle.z) &&
    Math.hypot(dir.muzzle.x - origin.x, dir.muzzle.y - origin.y, dir.muzzle.z - origin.z) < 2.5;

  const muzzlePos = hasValidMuzzle && dir.muzzle
    ? dir.muzzle
    : computeMuzzleWorldPos(
        shooter.x,
        shooter.y,
        shooter.z,
        shooter.yaw,
        shooter.pitch,
        shooter.currentWeapon,
        shooter.isCrouching,
        shooter.isAiming,
      );

  // Evaluate each pellet (1 for rifles/sniper, 7 for shotgun)
  const pellets = weapon.pellets || 1;
  const spread = weapon.spread || 0;

  for (let i = 0; i < pellets; i++) {
    const sx = dir.dirX + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
    const sy = dir.dirY + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
    const sz = dir.dirZ + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
    const len = Math.hypot(sx, sy, sz) || 1;
    const ndir = { x: sx / len, y: sy / len, z: sz / len };

    const ray = new RAPIER.Ray(origin, ndir);
    const hit = room.world.castRay(
      ray,
      weapon.range,
      true,
      undefined,
      undefined,
      undefined,
      shooter.body,
    );

    const hitDist = hit ? hit.timeOfImpact : weapon.range;
    const endPoint = {
      x: origin.x + ndir.x * hitDist,
      y: origin.y + ndir.y * hitDist,
      z: origin.z + ndir.z * hitDist,
    };

    // Broadcast tracer VFX starting strictly from barrel muzzle tip
    if (i === 0 || i % 2 === 0) {
      io.to(room.config.id).emit("shot_vfx", {
        shooterId,
        weaponId: shooter.currentWeapon,
        from: muzzlePos,
        to: endPoint,
        color: weapon.tracerColor,
        hitSurface: Boolean(hit),
      });
    }

    if (hit && hit.collider) {
      const hitId = (hit.collider.parent()?.userData as { id?: string } | undefined)?.id;
      if (hitId && hitId !== shooterId) {
        const target = room.players.get(hitId);
        if (target && !target.isDead) {
          const isHeadshot = endPoint.y >= target.y + 0.45;
          const dmg = computeDistanceDamage(shooter.currentWeapon, hitDist, isHeadshot);
          applyDamageToPlayer(
            room,
            shooter,
            target,
            dmg,
            weapon.shortName,
            isHeadshot,
            io,
            endPoint.y,
            Math.round(hitDist),
          );
        }
      }
    }
  }

  if (shooter.ammo <= 0) {
    handleReload(shooterId, room);
  }
}

export function handleShoot(id: string, data: any, io: Server) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const muzzle =
    data?.muzzle &&
    typeof data.muzzle.x === "number" &&
    typeof data.muzzle.y === "number" &&
    typeof data.muzzle.z === "number"
      ? { x: data.muzzle.x, y: data.muzzle.y, z: data.muzzle.z }
      : undefined;

  performShoot(
    room,
    id,
    {
      dirX: Number(data.dirX) || 0,
      dirY: Number(data.dirY) || 0,
      dirZ: Number(data.dirZ) || -1,
      muzzle,
    },
    io,
  );
}

export function handleUseSkill(
  id: string,
  data: { skillId: SkillId; dirX?: number; dirY?: number; dirZ?: number },
  io: Server,
) {
  const roomId = socketToRoom.get(id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(id);
  if (!player || player.isDead) return;

  const skill = SKILLS[data.skillId];
  if (!skill) return;

  const now = Date.now();
  if (now < player.skillReadyAt[data.skillId]) return;

  const charCfg = CHARACTERS[player.characterId] || CHARACTERS.striker;
  const cd = Math.round(skill.cooldownMs * charCfg.cooldownMult);
  player.skillReadyAt[data.skillId] = now + cd;

  if (data.skillId === "dash") {
    player.dashUntil = now + skill.durationMs;
    io.to(room.config.id).emit("skill_vfx", {
      playerId: id,
      skillId: "dash",
      x: player.x,
      y: player.y,
      z: player.z,
      color: skill.color,
    });
  } else if (data.skillId === "shield") {
    player.shield = 45;
    player.shieldExpiresAt = now + skill.durationMs;
    player.health = Math.min(player.maxHealth, player.health + 25);
    io.to(room.config.id).emit("skill_vfx", {
      playerId: id,
      skillId: "shield",
      x: player.x,
      y: player.y,
      z: player.z,
      color: skill.color,
    });
  } else if (data.skillId === "grenade") {
    const dx = Number(data.dirX) || -Math.sin(player.yaw);
    const dy = Number(data.dirY) || 0;
    const dz = Number(data.dirZ) || -Math.cos(player.yaw);
    const len = Math.hypot(dx, dy, dz) || 1;
    const ndx = dx / len;
    const ndy = dy / len;
    const ndz = dz / len;

    const origin = { x: player.x, y: player.y + 0.6, z: player.z };
    const ray = new RAPIER.Ray(origin, { x: ndx, y: ndy, z: ndz });
    const hit = room.world.castRay(ray, 20, true, undefined, undefined, undefined, player.body);
    const dist = hit ? Math.max(1.5, hit.timeOfImpact - 0.5) : 16;

    const ex = origin.x + ndx * dist;
    const ey = Math.max(0.5, origin.y + ndy * dist);
    const ez = origin.z + ndz * dist;

    io.to(room.config.id).emit("explosion_vfx", {
      x: ex,
      y: ey,
      z: ez,
      radius: 7.5,
      color: skill.color,
    });

    // Apply radial blast damage
    room.players.forEach((target) => {
      if (target.isDead) return;
      if (
        room.config.mode !== "ffa" &&
        room.config.mode !== "br" &&
        target.team === player.team &&
        target.id !== player.id
      ) {
        return;
      }
      const d = Math.hypot(target.x - ex, target.y - ey, target.z - ez);
      if (d <= 7.5) {
        const dmg = Math.round(70 * (1 - d / 8.5));
        if (dmg > 0 && target.id !== player.id) {
          applyDamageToPlayer(
            room,
            player,
            target,
            dmg,
            "Plasma Blast",
            false,
            io,
            undefined,
            Math.round(d),
          );
        }
      }
    });
  }
}

export function stepRoomBots(room: GameRoom, dt: number, io: Server) {
  const map = MAPS[room.config.mapId] || MAPS.veridian_04;
  const now = Date.now();

  room.players.forEach((bot) => {
    if (!bot.isBot || bot.isDead) return;

    // Find nearest visible enemy
    let nearestEnemy: ServerPlayerState | null = null;
    let nearestDist = 55;

    room.players.forEach((other) => {
      if (other.id === bot.id || other.isDead) return;
      if (room.config.mode !== "ffa" && room.config.mode !== "br" && other.team === bot.team) return;
      const d = Math.hypot(other.x - bot.x, other.z - bot.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = other;
      }
    });

    let targetX = bot.botTargetX ?? 0;
    let targetZ = bot.botTargetZ ?? 0;

    // Battle Royale storm safety priority
    const storm = room.stormZone;
    const distFromCenter = storm
      ? Math.hypot(bot.x - storm.centerX, bot.z - storm.centerZ)
      : 0;
    if (storm && distFromCenter > storm.currentRadius * 0.82) {
      targetX = storm.centerX + (Math.random() - 0.5) * 6;
      targetZ = storm.centerZ + (Math.random() - 0.5) * 6;
      bot.isSprinting = true;
    } else if (nearestEnemy) {
      bot.isSprinting = false;
      const enemy = nearestEnemy as ServerPlayerState;
      const dx = enemy.x - bot.x;
      const dy = enemy.y + 0.4 - (bot.y + 0.5);
      const dz = enemy.z - bot.z;
      const horiz = Math.hypot(dx, dz) || 1;

      bot.yaw = Math.atan2(-dx, -dz);
      bot.pitch = Math.atan2(dy, horiz);

      // Move closer if far, strafe if medium
      if (horiz > 14) {
        targetX = enemy.x;
        targetZ = enemy.z;
      } else {
        const strafeDir = Math.sin(now * 0.002 + bot.x) > 0 ? 1 : -1;
        targetX = bot.x + (-dz / horiz) * 6 * strafeDir;
        targetZ = bot.z + (dx / horiz) * 6 * strafeDir;
      }

      // Check line of sight & shoot
      if (now >= (bot.botNextShotAt ?? 0)) {
        const dirLen = Math.hypot(dx, dy, dz) || 1;
        const ray = new RAPIER.Ray(
          { x: bot.x, y: bot.y + 0.5, z: bot.z },
          { x: dx / dirLen, y: dy / dirLen, z: dz / dirLen },
        );
        const hit = room.world.castRay(ray, nearestDist + 2, true, undefined, undefined, undefined, bot.body);
        const hitId = hit?.collider?.parent()?.userData as { id?: string } | undefined;

        if (hitId?.id === enemy.id) {
          const jitter = 0.045;
          performShoot(
            room,
            bot.id,
            {
              dirX: dx / dirLen + (Math.random() - 0.5) * jitter,
              dirY: dy / dirLen + (Math.random() - 0.5) * jitter,
              dirZ: dz / dirLen + (Math.random() - 0.5) * jitter,
            },
            io,
          );
        }
        bot.botNextShotAt = now + 260 + Math.random() * 280;
      }
    } else {
      // Patrol toward capture zone or random waypoint
      if (!bot.botNextWanderAt || now > bot.botNextWanderAt) {
        bot.botTargetX = (Math.random() - 0.5) * (map.floor.width * 0.65);
        bot.botTargetZ = (Math.random() - 0.5) * (map.floor.depth * 0.65);
        bot.botNextWanderAt = now + 3500 + Math.random() * 2500;
        targetX = bot.botTargetX;
        targetZ = bot.botTargetZ;
      }
      const dx = targetX - bot.x;
      const dz = targetZ - bot.z;
      if (Math.hypot(dx, dz) > 0.5) {
        bot.yaw = Math.atan2(-dx, -dz);
        bot.pitch = 0;
      }
    }

    // Move bot horizontally and compute local directional animation axes relative to yaw
    const mdx = targetX - bot.x;
    const mdz = targetZ - bot.z;
    const mLen = Math.hypot(mdx, mdz);
    bot.isAiming = Boolean(nearestEnemy);
    if (mLen > 0.6) {
      const charCfg = CHARACTERS[bot.characterId] || CHARACTERS.striker;
      const speed = PHYSICS_CONFIG.WALK_SPEED * charCfg.speedMult * dt;
      const dirX = mdx / mLen;
      const dirZ = mdz / mLen;
      const fwdX = -Math.sin(bot.yaw);
      const fwdZ = -Math.cos(bot.yaw);
      const rgtX = Math.cos(bot.yaw);
      const rgtZ = -Math.sin(bot.yaw);
      bot.moveForward = dirX * fwdX + dirZ * fwdZ;
      bot.moveRight = dirX * rgtX + dirZ * rgtZ;

      const rawX = bot.x + dirX * speed;
      const rawZ = bot.z + dirZ * speed;
      const resolved = resolveCylinderBoxCollisions(
        rawX,
        bot.y,
        rawZ,
        PLAYER_CONFIG.RADIUS,
        map,
      );
      const supportY = getSupportHeightAt(
        resolved.x,
        resolved.z,
        bot.y - 1.0,
        PLAYER_CONFIG.RADIUS,
        map,
      );
      const targetBodyY = Math.max(bot.body.translation().y, supportY + 1.02);
      bot.x = resolved.x;
      bot.z = resolved.z;
      bot.y = targetBodyY;
      bot.isMoving = true;
      bot.body.setTranslation({ x: resolved.x, y: targetBodyY, z: resolved.z }, true);
    } else {
      bot.isMoving = false;
      bot.moveForward = 0;
      bot.moveRight = 0;
    }
  });
}

export function handleDisconnect(socket: Socket, io: Server, reason: string) {
  logger.info(`Client disconnected: ${socket.id} (${reason})`);
  leaveCurrentRoom(socket, io);
}
