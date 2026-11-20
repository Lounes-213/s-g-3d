import "dotenv/config";
import { logger } from "./utils/logger.js";
import { Server } from "socket.io";
import RAPIER from "@dimforge/rapier3d-compat";
import http from "http";
import { expressApp } from "./expressApp.js";
import {
  buildLootForMap,
  createInitialStorm,
  createRoom,
  getPublicRoomsList,
  getRoomFullState,
  rooms,
  socketToRoom,
} from "./state/gameState.js";
import {
  handleCreateRoom,
  handleDisconnect,
  handleJump,
  handlePlayerInput,
  handleReload,
  handleSelectCharacter,
  handleShoot,
  handleSwitchTeam,
  handleSwitchWeapon,
  handleUseSkill,
  joinSpecificRoom,
  leaveCurrentRoom,
  scheduleRespawn,
  stepRoomBots,
} from "./events/playerEvents.js";
import { getRandomSpawn } from "./utils/helpers.js";
import { MAPS, WEAPONS, WINNING_RULES } from "@block-shooter/shared";

const PORT =
  Number(process.env.PORT) ||
  (process.env.NODE_ENV === "production" ? 3000 : 9208);

const deathZoneY = -40.0;

async function startServer() {
  await RAPIER.init();
  logger.info("Rapier3D WASM physics initialized");

  // Create default public room (Pure PvP between players, no bots)
  createRoom({
    id: "PUBLIC-01",
    name: "Public Tactical Arena (Pro PvP)",
    hostId: null,
    isPrivate: false,
    mapId: "veridian_04",
    mode: "tdm",
    maxPlayers: 12,
    botCount: 0,
  });

  const expressServer = http.createServer(expressApp);

  const io = new Server(expressServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    perMessageDeflate: false,
    httpCompression: false,
  });

  expressServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`S-G-3D server listening on 0.0.0.0:${PORT}`);
  });

  const gracefulShutdown = (signal: string) => {
    io.close();
    expressServer.closeAllConnections();
    expressServer.close(() => {
      if (signal === "SIGUSR2") {
        process.kill(process.pid, "SIGUSR2");
      } else {
        process.exit(0);
      }
    });
    setTimeout(() => {
      if (signal === "SIGUSR2") {
        process.kill(process.pid, "SIGUSR2");
      } else {
        process.exit(1);
      }
    }, 1500).unref();
  };

  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  process.once("SIGUSR2", () => gracefulShutdown("SIGUSR2"));

  io.on("connection", (socket) => {
    if (!socket.id) return;

    socket.emit("rooms_list", getPublicRoomsList());

    socket.on("list_rooms", () => {
      socket.emit("rooms_list", getPublicRoomsList());
    });

    socket.on("create_room", (data: any) => {
      handleCreateRoom(socket, io, data || {});
    });

    socket.on("join_room", (data: any) => {
      joinSpecificRoom(socket, io, data || {});
    });

    socket.on("leave_room", () => {
      leaveCurrentRoom(socket, io);
    });

    socket.on("ping", (cb?: () => void) => {
      if (typeof cb === "function") cb();
    });

    socket.on("playerInput", (data: any) => {
      handlePlayerInput(socket.id, data || {});
    });

    socket.on("jump", () => {
      handleJump(socket.id);
    });

    socket.on("shoot", (data: any) => {
      handleShoot(socket.id, data || {}, io);
    });

    socket.on("switchWeapon", (weaponId: any) => {
      handleSwitchWeapon(socket.id, weaponId);
    });

    socket.on("selectCharacter", (characterId: any) => {
      handleSelectCharacter(socket.id, characterId);
    });

    socket.on("switchTeam", (team: any) => {
      handleSwitchTeam(socket.id, team);
    });

    socket.on("reload", () => {
      handleReload(socket.id);
    });

    socket.on("use_skill", (data: any) => {
      handleUseSkill(socket.id, data || {}, io);
    });

    // --- WebRTC Voice Chat Signaling within Active Room ---
    socket.on("voice_join", () => {
      const rId = socketToRoom.get(socket.id);
      if (rId) socket.to(rId).emit("voice_peer_joined", { peerId: socket.id });
    });

    socket.on("voice_leave", () => {
      const rId = socketToRoom.get(socket.id);
      if (rId) socket.to(rId).emit("voice_peer_left", { peerId: socket.id });
    });

    socket.on("voice_offer", (data: { to: string; sdp: unknown }) => {
      if (data?.to) io.to(data.to).emit("voice_offer", { from: socket.id, sdp: data.sdp });
    });

    socket.on("voice_answer", (data: { to: string; sdp: unknown }) => {
      if (data?.to) io.to(data.to).emit("voice_answer", { from: socket.id, sdp: data.sdp });
    });

    socket.on("voice_ice", (data: { to: string; candidate: unknown }) => {
      if (data?.to) io.to(data.to).emit("voice_ice", { from: socket.id, candidate: data.candidate });
    });

    socket.on("voice_speaking", (speaking: boolean) => {
      const rId = socketToRoom.get(socket.id);
      if (rId) socket.to(rId).emit("voice_speaking", { peerId: socket.id, speaking: Boolean(speaking) });
    });

    socket.on("disconnect", (reason) => {
      const rId = socketToRoom.get(socket.id);
      if (rId) socket.to(rId).emit("voice_peer_left", { peerId: socket.id });
      handleDisconnect(socket, io, reason);
    });

    socket.on("error", (err) => {
      logger.error(`Socket error for ${socket.id}: ${err}`);
    });
  });

  // 60Hz Physics & 30Hz Smooth Network Snapshot Loop per Room
  const tickRate = 60;
  const tickInterval = 1000 / tickRate;
  let tickCount = 0;

  setInterval(() => {
    const now = Date.now();
    tickCount++;
    const shouldBroadcast = tickCount % 2 === 0;

    rooms.forEach((room) => {
      let humanCount = 0;
      room.players.forEach((p) => {
        if (!p.isBot) humanCount++;
      });
      if (humanCount === 0) return;

      const dt = Math.min(0.05, (now - room.lastTickAt) / 1000);
      room.lastTickAt = now;

      room.world.step();
      if (room.config.botCount > 0) {
        stepRoomBots(room, dt, io);
      }

      const map = MAPS[room.config.mapId] || MAPS.citadel_01;
      const maxBoundX = map.floor.width / 2 - 1.5;
      const maxBoundZ = map.floor.depth / 2 - 1.5;

      room.players.forEach((p, id) => {
        // Expire temporary shield
        if (p.shield > 0 && p.shieldExpiresAt > 0 && now > p.shieldExpiresAt) {
          p.shield = 0;
          p.shieldExpiresAt = 0;
        }

        if (!p.isDead && p.body) {
          const pos = p.body.translation();

          if (pos.y < deathZoneY) {
            p.health = 0;
            p.isDead = true;
            p.deaths += 1;

            io.to(room.config.id).emit("kill_feed", {
              id: Math.random().toString(36).substring(2, 9),
              shooter: "Environment",
              target: p.name,
              weapon: "Void",
              shooterTeam: "none",
              targetTeam: p.team,
            });
            scheduleRespawn(room, id, 1500);
          } else {
            let safeX = Math.max(-maxBoundX, Math.min(maxBoundX, pos.x));
            let safeZ = Math.max(-maxBoundZ, Math.min(maxBoundZ, pos.z));

            if (safeX !== pos.x || safeZ !== pos.z) {
              p.body.setTranslation({ x: safeX, y: pos.y, z: safeZ }, true);
              p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }

            // Jump Pads check
            if (now - p.lastJumpPadAt > 600) {
              for (const pad of map.jumpPads) {
                const dist = Math.hypot(safeX - pad.x, safeZ - pad.z);
                if (dist <= pad.radius && Math.abs(pos.y - (pad.y + 1.0)) < 1.8) {
                  p.body.setLinvel({ x: 0, y: pad.boostY, z: 0 }, true);
                  p.lastJumpPadAt = now;
                  io.to(room.config.id).emit("jump_pad_vfx", {
                    playerId: id,
                    padId: pad.id,
                  });
                  break;
                }
              }
            }

            p.x = safeX;
            p.y = pos.y;
            p.z = safeZ;

            // Ground Loot Pickups (Medkit, Armor, Ammo, Weapon)
            for (const item of room.lootPickups) {
              if (!item.active) continue;
              if (Math.hypot(safeX - item.x, safeZ - item.z) <= 2.1 && Math.abs(pos.y - item.y) <= 2.2) {
                item.active = false;
                if (item.kind === "medkit") {
                  p.health = Math.min(p.maxHealth, p.health + 45);
                } else if (item.kind === "armor") {
                  p.shield = Math.min(60, (p.shield || 0) + 35);
                  p.shieldExpiresAt = now + 45000;
                } else if (item.kind === "ammo") {
                  const wpn = WEAPONS[p.currentWeapon];
                  p.ammo = wpn.magSize;
                  p.magazines[p.currentWeapon] = wpn.magSize;
                } else if (item.kind === "weapon" && item.weaponId) {
                  p.currentWeapon = item.weaponId;
                  p.ammo = WEAPONS[item.weaponId].magSize;
                  p.magazines[item.weaponId] = p.ammo;
                }
                setTimeout(() => {
                  item.active = true;
                }, 18000);
                break;
              }
            }
          }
        }
      });

      if (shouldBroadcast) {
        io.to(room.config.id).emit("state", getRoomFullState(room));
      }
    });
  }, tickInterval);

  // 1Hz Match Timer & Domination Scoring Loop
  setInterval(() => {
    rooms.forEach((room) => {
      let humanCount = 0;
      room.players.forEach((p) => {
        if (!p.isBot) humanCount++;
      });

      if (humanCount === 0) {
        if (room.matchState !== "waiting") {
          room.matchState = "waiting";
          room.timeRemaining = WINNING_RULES.defaultMatchSeconds;
          room.teamScores = { red: 0, blue: 0 };
        }
        return;
      }

      if (room.matchState === "waiting") {
        room.matchState = "playing";
      }

      if (room.matchState === "playing") {
        // Domination capture zone tick
        if (room.config.mode === "domination") {
          const map = MAPS[room.config.mapId] || MAPS.citadel_01;
          const zone = map.captureZone;
          let redIn = 0;
          let blueIn = 0;
          room.players.forEach((p) => {
            if (!p.isDead) {
              const d = Math.hypot(p.x - zone.x, p.z - zone.z);
              if (d <= zone.radius) {
                if (p.team === "red") redIn++;
                if (p.team === "blue") blueIn++;
              }
            }
          });

          if (redIn > blueIn) {
            room.dominationProgress = Math.max(-100, room.dominationProgress - 20);
            if (room.dominationProgress <= -50) room.dominationOwner = "red";
          } else if (blueIn > redIn) {
            room.dominationProgress = Math.min(100, room.dominationProgress + 20);
            if (room.dominationProgress >= 50) room.dominationOwner = "blue";
          }

          if (room.dominationOwner === "red") room.teamScores.red += 2;
          if (room.dominationOwner === "blue") room.teamScores.blue += 2;

          if (
            room.teamScores.red >= room.config.scoreLimit ||
            room.teamScores.blue >= room.config.scoreLimit
          ) {
            room.timeRemaining = 0;
          }
        }

        // Battle Royale Storm Shrink & Outer Damage
        if (room.config.mode === "br" && room.stormZone) {
          const storm = room.stormZone;
          storm.currentRadius = Math.max(storm.targetRadius, storm.currentRadius - 0.35);
          storm.phase = storm.currentRadius < 24 ? 3 : storm.currentRadius < 45 ? 2 : 1;
          storm.dps = storm.phase === 3 ? 12 : storm.phase === 2 ? 8 : 5;

          let aliveCount = 0;
          room.players.forEach((p, id) => {
            if (p.isDead) return;
            const d = Math.hypot(p.x - storm.centerX, p.z - storm.centerZ);
            if (d > storm.currentRadius) {
              p.health -= storm.dps;
              if (p.health <= 0) {
                p.health = 0;
                p.isDead = true;
                p.deaths += 1;
                io.to(room.config.id).emit("kill_feed", {
                  id: Math.random().toString(36).substring(2, 9),
                  shooter: "Storm Zone",
                  target: p.name,
                  weapon: "Zone",
                  shooterTeam: "none",
                  targetTeam: p.team,
                });
                return;
              }
            }
            aliveCount++;
            void id;
          });

          if (room.players.size > 1 && aliveCount <= 1) {
            room.timeRemaining = 0;
          }
        }

        room.timeRemaining = Math.max(0, room.timeRemaining - 1);

        if (room.timeRemaining <= 0 && !room.restartTimer) {
          room.matchState = "ended";
          room.restartTimer = setTimeout(() => {
            room.restartTimer = null;
            room.matchState = "playing";
            room.timeRemaining =
              room.config.mode === "br"
                ? WINNING_RULES.brMatchSeconds
                : WINNING_RULES.defaultMatchSeconds;
            room.teamScores = { red: 0, blue: 0 };
            room.dominationOwner = "none";
            room.dominationProgress = 0;
            room.stormZone =
              room.config.mode === "br" ? createInitialStorm(room.config.mapId) : null;
            room.lootPickups = buildLootForMap(room.config.mapId);

            room.players.forEach((p) => {
              p.kills = 0;
              p.deaths = 0;
              p.health = p.maxHealth;
              p.shield = 0;
              p.isDead = false;
              const spawn = getRandomSpawn(room.config.mapId, p.team);
              p.x = spawn.x;
              p.y = spawn.y + 3.0;
              p.z = spawn.z;
              p.body.setTranslation({ x: spawn.x, y: spawn.y + 3.0, z: spawn.z }, true);
            });
          }, 5000);
        }
      }
    });
  }, 1000);
}

startServer();
