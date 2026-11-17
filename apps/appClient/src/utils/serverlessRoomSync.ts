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
  WINNING_RULES,
  computeDistanceDamage,
  computeMuzzleWorldPos,
  getSupportHeightAt,
  raycastMapBoxes,
  resolveCylinderBoxCollisions,
  type CharacterId,
  type GameMode,
  type LootPickup,
  type MapId,
  type SkillId,
  type SkinId,
  type StormZoneState,
  type TeamType,
  type WeaponId,
} from "@block-shooter/shared";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { handleFirestoreError, OperationType } from "../services/firebaseService";
import {
  type PendingSessionConfig,
  type PlayerState,
  type PublicRoomSummary,
  type RealtimeChannel,
} from "../stores/useGameStore";
import { soundEngine } from "./soundEngine";

interface RoomDocData {
  roomId: string;
  name: string;
  hostUid: string;
  mapId: MapId;
  mode: GameMode;
  isPrivate: boolean;
  maxPlayers: number;
  botCount: number;
  playerCount: number;
  matchState: "waiting" | "playing" | "ended";
  scoreLimit: number;
  timeRemaining: number;
  redScore: number;
  blueScore: number;
  dominationOwner: TeamType;
  dominationProgress: number;
  stormRadius: number;
  stormPhase: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface RoomPlayerDocData {
  playerId: string;
  ownerUid: string;
  name: string;
  color: string;
  team: TeamType;
  characterId: CharacterId;
  skinId: SkinId;
  isBot: boolean;
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
  lastDoubleJumpAt: number;
  health: number;
  maxHealth: number;
  shield: number;
  isDead: boolean;
  kills: number;
  deaths: number;
  currentWeapon: WeaponId;
  ammo: number;
  isReloading: boolean;
  dashUntil: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

type RoomEventType =
  | "shot"
  | "damage"
  | "kill"
  | "explosion"
  | "voice_join"
  | "voice_leave"
  | "voice_offer"
  | "voice_answer"
  | "voice_ice"
  | "voice_speaking";

interface RoomEventDocData {
  eventId: string;
  type: RoomEventType;
  senderId: string;
  senderUid: string;
  targetId: string;
  weaponId: string;
  weaponName: string;
  color: string;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  hitSurface: boolean;
  amount: number;
  isHeadshot: boolean;
  distanceMeters: number;
  killed: boolean;
  senderTeam: string;
  targetTeam: string;
  senderName: string;
  targetName: string;
  radius: number;
  speaking: boolean;
  rtcSdpType: string;
  rtcSdp: string;
  rtcCandidate: string;
  rtcSdpMid: string;
  rtcSdpMLineIndex: number;
  createdAt?: Timestamp;
}

interface LocalBotRuntime extends RoomPlayerDocData {
  vy: number;
  magazines: Record<WeaponId, number>;
  lastShotTime: number;
  reloadTimeout: number | null;
  shieldExpiresAt: number;
  lastJumpPadAt: number;
  botTargetX: number;
  botTargetZ: number;
  botNextWanderAt: number;
  botNextShotAt: number;
}

type BroadcastMessage =
  | { kind: "player_state"; player: RoomPlayerDocData }
  | { kind: "event"; event: RoomEventDocData }
  | { kind: "room_state"; room: Omit<RoomDocData, "createdAt" | "updatedAt"> };

const BOT_NAMES = [
  "Alpha-01",
  "Spectre",
  "Vortex",
  "Kobra",
  "Viper",
  "Ranger",
  "Nomad",
  "Ghost-IX",
];

function sanitizeRoomId(raw: string | undefined, fallback = "PUBLIC-01"): string {
  const cleaned = (raw || fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 20);
  if (cleaned.length >= 3) return cleaned;
  return fallback;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function sanitizeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return clean || "id_0";
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function wrapAngle(rad: number): number {
  if (!Number.isFinite(rad)) return 0;
  return Math.atan2(Math.sin(rad), Math.cos(rad));
}

function createLootForMap(mapId: MapId): LootPickup[] {
  const map = MAPS[mapId] || MAPS.compound_05;
  const kinds: Array<LootPickup["kind"]> = ["medkit", "armor", "ammo", "weapon"];
  return map.lootSpawns.map((sp, idx) => {
    const kind = kinds[idx % kinds.length];
    return {
      id: `sr_loot_${idx}`,
      kind,
      weaponId: kind === "weapon" ? WEAPON_ORDER[(idx + 2) % WEAPON_ORDER.length] : undefined,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      active: true,
    };
  });
}

function toRoomPlayerUpdateFields(p: RoomPlayerDocData) {
  return {
    ownerUid: p.ownerUid,
    x: clamp(p.x, -195, 195),
    y: clamp(p.y, -15, 115),
    z: clamp(p.z, -195, 195),
    yaw: clamp(wrapAngle(p.yaw), -3.2, 3.2),
    pitch: clamp(p.pitch, -1.6, 1.6),
    isCrouching: Boolean(p.isCrouching),
    isSprinting: Boolean(p.isSprinting),
    isMoving: Boolean(p.isMoving),
    isGrounded: Boolean(p.isGrounded),
    moveForward: clamp(p.moveForward, -2, 2),
    moveRight: clamp(p.moveRight, -2, 2),
    isAiming: Boolean(p.isAiming),
    lastDoubleJumpAt: Math.max(0, Math.round(p.lastDoubleJumpAt || 0)),
    health: Math.round(clamp(p.health, 0, 250)),
    shield: Math.round(clamp(p.shield, 0, 150)),
    isDead: Boolean(p.isDead),
    kills: Math.round(clamp(p.kills, 0, 500)),
    deaths: Math.round(clamp(p.deaths, 0, 500)),
    currentWeapon: WEAPONS[p.currentWeapon] ? p.currentWeapon : "assaultRifle",
    ammo: Math.round(clamp(p.ammo, 0, 100)),
    isReloading: Boolean(p.isReloading),
    dashUntil: Math.max(0, Math.round(p.dashUntil || 0)),
    team: p.team,
    color: p.color.slice(0, 16),
    updatedAt: serverTimestamp(),
  };
}

export async function listServerlessPublicRooms(): Promise<PublicRoomSummary[]> {
  if (!auth.currentUser) return [];
  const path = "rooms";
  try {
    const q = query(
      collection(db, "rooms"),
      where("isPrivate", "==", false),
      limit(20),
    );
    const snap = await getDocs(q);
    const now = Date.now();
    const out: PublicRoomSummary[] = [];
    snap.docs.forEach((d) => {
      const r = d.data() as RoomDocData;
      const updatedMs = r.updatedAt?.toMillis?.() ?? now;
      // Only list active rooms touched within the last 3 minutes
      if (now - updatedMs > 180_000 && r.playerCount <= 0) return;
      out.push({
        id: r.roomId,
        name: r.name,
        mapId: MAPS[r.mapId] ? r.mapId : "compound_05",
        mode: r.mode || "tdm",
        playerCount: Math.max(0, r.playerCount || 0),
        maxPlayers: r.maxPlayers || 12,
        botCount: r.botCount || 0,
      });
    });
    return out;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function createServerlessRoomChannel(opts: {
  sessionConfig: PendingSessionConfig;
  onPingMeasured?: (ms: number) => void;
  onConnected?: (localId: string) => void;
  onDisconnected?: () => void;
}): RealtimeChannel {
  const { sessionConfig, onPingMeasured, onConnected, onDisconnected } = opts;
  const listeners = new Map<string, Set<(...args: never[]) => void>>();

  const emitLocal = (event: string, ...args: unknown[]) => {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach((cb) => {
      try {
        (cb as (...a: unknown[]) => void)(...args);
      } catch (e) {
        console.error(`Serverless handler error (${event}):`, e);
      }
    });
  };

  let stopped = false;
  let joined = false;
  let roomId =
    sessionConfig.playMode === "room" && sessionConfig.roomAction === "create"
      ? generateRoomCode()
      : sanitizeRoomId(sessionConfig.roomId, "PUBLIC-01");

  const uid = auth.currentUser?.uid || "";
  if (!uid) {
    window.setTimeout(() => {
      emitLocal("room_error", { message: "Sign in with Google for Serverless Online Play" });
    }, 10);
    return {
      emit: () => {},
      on: (event, listener) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(listener);
      },
      off: (event, listener) => {
        if (!listener) listeners.delete(event);
        else listeners.get(event)?.delete(listener);
      },
      disconnect: () => {
        stopped = true;
      },
    };
  }

  let roomMeta: RoomDocData = {
    roomId,
    name: (sessionConfig.roomName || `${sessionConfig.playerName}'s Room`).slice(0, 40),
    hostUid: uid,
    mapId: MAPS[sessionConfig.mapId] ? sessionConfig.mapId : "compound_05",
    mode: sessionConfig.mode || "tdm",
    isPrivate: Boolean(sessionConfig.isPrivate),
    maxPlayers: Math.round(clamp(sessionConfig.maxPlayers || 12, 2, 16)),
    botCount: Math.round(clamp(sessionConfig.botCount ?? 4, 0, 8)),
    playerCount: 1,
    matchState: "playing",
    scoreLimit:
      sessionConfig.mode === "ffa"
        ? WINNING_RULES.ffaScoreLimit
        : sessionConfig.mode === "domination"
          ? WINNING_RULES.dominationScoreLimit
          : sessionConfig.mode === "br"
            ? 1
            : WINNING_RULES.tdmScoreLimit,
    timeRemaining:
      sessionConfig.mode === "br"
        ? WINNING_RULES.brMatchSeconds
        : WINNING_RULES.defaultMatchSeconds,
    redScore: 0,
    blueScore: 0,
    dominationOwner: "none",
    dominationProgress: 0,
    stormRadius: Math.round(MAPS[sessionConfig.mapId || "compound_05"].floor.width * 0.56),
    stormPhase: 1,
  };

  let lootPickups: LootPickup[] = createLootForMap(roomMeta.mapId);
  const remotePlayers = new Map<string, RoomPlayerDocData>();
  const localBots = new Map<string, LocalBotRuntime>();
  const processedEvents = new Set<string>();
  const skillReadyAt: Record<SkillId, number> = { dash: 0, shield: 0, grenade: 0 };

  const cfg = CHARACTERS[sessionConfig.characterId] || CHARACTERS.striker;
  const skinId: SkinId = CHARACTER_SKINS[sessionConfig.skinId] ? sessionConfig.skinId : cfg.defaultSkin;
  const weaponId: WeaponId = WEAPONS[sessionConfig.weaponId] ? sessionConfig.weaponId : cfg.defaultWeapon;

  const pickSpawn = (mId: MapId, team: TeamType) => {
    const map = MAPS[mId] || MAPS.compound_05;
    const pool =
      team === "red"
        ? map.redSpawns
        : team === "blue"
          ? map.blueSpawns
          : map.ffaSpawns;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const preferredTeam = sessionConfig.preferredTeam || "auto";
  const initialTeam: TeamType =
    roomMeta.mode === "ffa" || roomMeta.mode === "br"
      ? "none"
      : preferredTeam === "red" || preferredTeam === "blue"
        ? preferredTeam
        : "blue";
  const initialSpawn = pickSpawn(roomMeta.mapId, initialTeam);
  const initialMags: Record<WeaponId, number> = {
    assaultRifle: WEAPONS.assaultRifle.magSize,
    smg: WEAPONS.smg.magSize,
    shotgun: WEAPONS.shotgun.magSize,
    burstRifle: WEAPONS.burstRifle.magSize,
    sniper: WEAPONS.sniper.magSize,
    pistol: WEAPONS.pistol.magSize,
  };

  const localPlayer: RoomPlayerDocData = {
    playerId: uid,
    ownerUid: uid,
    name: (sessionConfig.playerName || "Operator").slice(0, 24) || "Operator",
    color:
      initialTeam === "red"
        ? "#ef4444"
        : initialTeam === "blue"
          ? "#3b82f6"
          : cfg.secondaryColor,
    team: initialTeam,
    characterId: cfg.id,
    skinId,
    isBot: false,
    x: initialSpawn.x,
    y: initialSpawn.y + 1.0,
    z: initialSpawn.z,
    yaw: 0,
    pitch: 0,
    isCrouching: false,
    isSprinting: false,
    isMoving: false,
    isGrounded: true,
    moveForward: 0,
    moveRight: 0,
    isAiming: false,
    lastDoubleJumpAt: 0,
    health: cfg.maxHealth,
    maxHealth: cfg.maxHealth,
    shield: 0,
    isDead: false,
    kills: 0,
    deaths: 0,
    currentWeapon: weaponId,
    ammo: initialMags[weaponId],
    isReloading: false,
    dashUntil: 0,
  };

  let localVy = 0;
  let localJumpsUsed = 0;
  let localLastShotAt = 0;
  let localReloadTimeout: number | null = null;
  let localShieldExpiresAt = 0;
  let localLastJumpPadAt = 0;
  let pendingFirestoreFlush = false;
  let lastFirestoreWriteAt = 0;
  let lastBroadcastAt = 0;
  let lastHostCheckAt = 0;
  let lastRoomUpdateMs = Date.now();

  let bc: BroadcastChannel | null = null;
  let unsubRoom: Unsubscribe | null = null;
  let unsubPlayers: Unsubscribe | null = null;
  let unsubEvents: Unsubscribe | null = null;
  let simTimer: number | null = null;
  let secondTimer: number | null = null;
  let pingTimer: number | null = null;
  let statePushTimer: number | null = null;

  const postBC = (msg: BroadcastMessage) => {
    try {
      bc?.postMessage(msg);
    } catch {
      // ignore if BroadcastChannel unavailable
    }
  };

  const buildEventBase = (
    type: RoomEventType,
    senderId: string,
    overrides: Partial<RoomEventDocData>,
  ): RoomEventDocData => {
    const eid = sanitizeId(`ev_${uid.slice(0, 6)}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    return {
      eventId: eid,
      type,
      senderId: sanitizeId(senderId),
      senderUid: uid,
      targetId: (overrides.targetId || "").slice(0, 128),
      weaponId: (overrides.weaponId || "").slice(0, 24),
      weaponName: (overrides.weaponName || "").slice(0, 32),
      color: (overrides.color || "#38bdf8").slice(0, 16),
      fromX: clamp(overrides.fromX ?? 0, -245, 245),
      fromY: clamp(overrides.fromY ?? 0, -18, 145),
      fromZ: clamp(overrides.fromZ ?? 0, -245, 245),
      toX: clamp(overrides.toX ?? 0, -245, 245),
      toY: clamp(overrides.toY ?? 0, -18, 145),
      toZ: clamp(overrides.toZ ?? 0, -245, 245),
      hitSurface: Boolean(overrides.hitSurface),
      amount: Math.round(clamp(overrides.amount ?? 0, 0, 500)),
      isHeadshot: Boolean(overrides.isHeadshot),
      distanceMeters: Math.round(clamp(overrides.distanceMeters ?? 0, 0, 500)),
      killed: Boolean(overrides.killed),
      senderTeam: (overrides.senderTeam || "none").slice(0, 8),
      targetTeam: (overrides.targetTeam || "none").slice(0, 8),
      senderName: (overrides.senderName || "").slice(0, 32),
      targetName: (overrides.targetName || "").slice(0, 32),
      radius: clamp(overrides.radius ?? 0, 0, 30),
      speaking: Boolean(overrides.speaking),
      rtcSdpType: (overrides.rtcSdpType || "").slice(0, 16),
      rtcSdp: (overrides.rtcSdp || "").slice(0, 8192),
      rtcCandidate: (overrides.rtcCandidate || "").slice(0, 1024),
      rtcSdpMid: (overrides.rtcSdpMid || "").slice(0, 32),
      rtcSdpMLineIndex: Math.round(clamp(overrides.rtcSdpMLineIndex ?? 0, -1, 32)),
    };
  };

  const publishEvent = async (ev: RoomEventDocData) => {
    if (stopped) return;
    processedEvents.add(ev.eventId);
    postBC({ kind: "event", event: ev });

    const path = `rooms/${roomId}/events/${ev.eventId}`;
    try {
      await setDoc(doc(db, "rooms", roomId, "events", ev.eventId), {
        ...ev,
        createdAt: serverTimestamp(),
      });
      // Auto-prune transient event doc after 6 seconds
      window.setTimeout(() => {
        void deleteDoc(doc(db, "rooms", roomId, "events", ev.eventId)).catch(() => {});
      }, 6000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const getAllPlayersMap = (): Record<string, PlayerState> => {
    const out: Record<string, PlayerState> = {};
    remotePlayers.forEach((rp, id) => {
      if (id === uid) return;
      if (rp.isBot && roomMeta.hostUid === uid && localBots.has(id)) return;
      out[id] = {
        id: rp.playerId,
        name: rp.name,
        color: rp.color,
        team: rp.team,
        characterId: rp.characterId,
        skinId: rp.skinId,
        isBot: rp.isBot,
        x: rp.x,
        y: rp.y,
        z: rp.z,
        yaw: rp.yaw,
        pitch: rp.pitch,
        isCrouching: rp.isCrouching,
        isSprinting: rp.isSprinting,
        isMoving: rp.isMoving,
        isGrounded: rp.isGrounded,
        moveForward: rp.moveForward,
        moveRight: rp.moveRight,
        isAiming: rp.isAiming,
        lastDoubleJumpAt: rp.lastDoubleJumpAt,
        health: rp.health,
        maxHealth: rp.maxHealth,
        shield: rp.shield,
        isDead: rp.isDead,
        kills: rp.kills,
        deaths: rp.deaths,
        currentWeapon: rp.currentWeapon,
        ammo: rp.ammo,
        isReloading: rp.isReloading,
        dashUntil: rp.dashUntil,
      };
    });

    if (roomMeta.hostUid === uid) {
      localBots.forEach((b, id) => {
        out[id] = {
          id: b.playerId,
          name: b.name,
          color: b.color,
          team: b.team,
          characterId: b.characterId,
          skinId: b.skinId,
          isBot: true,
          x: b.x,
          y: b.y,
          z: b.z,
          yaw: b.yaw,
          pitch: b.pitch,
          isCrouching: b.isCrouching,
          isSprinting: b.isSprinting,
          isMoving: b.isMoving,
          isGrounded: b.isGrounded,
          moveForward: b.moveForward,
          moveRight: b.moveRight,
          isAiming: b.isAiming,
          lastDoubleJumpAt: b.lastDoubleJumpAt,
          health: b.health,
          maxHealth: b.maxHealth,
          shield: b.shield,
          isDead: b.isDead,
          kills: b.kills,
          deaths: b.deaths,
          currentWeapon: b.currentWeapon,
          ammo: b.ammo,
          isReloading: b.isReloading,
          dashUntil: b.dashUntil,
        };
      });
    }

    out[uid] = {
      id: localPlayer.playerId,
      name: localPlayer.name,
      color: localPlayer.color,
      team: localPlayer.team,
      characterId: localPlayer.characterId,
      skinId: localPlayer.skinId,
      isBot: false,
      x: localPlayer.x,
      y: localPlayer.y,
      z: localPlayer.z,
      yaw: localPlayer.yaw,
      pitch: localPlayer.pitch,
      isCrouching: localPlayer.isCrouching,
      isSprinting: localPlayer.isSprinting,
      isMoving: localPlayer.isMoving,
      isGrounded: localPlayer.isGrounded,
      moveForward: localPlayer.moveForward,
      moveRight: localPlayer.moveRight,
      isAiming: localPlayer.isAiming,
      lastDoubleJumpAt: localPlayer.lastDoubleJumpAt,
      health: localPlayer.health,
      maxHealth: localPlayer.maxHealth,
      shield: localPlayer.shield,
      isDead: localPlayer.isDead,
      kills: localPlayer.kills,
      deaths: localPlayer.deaths,
      currentWeapon: localPlayer.currentWeapon,
      ammo: localPlayer.ammo,
      isReloading: localPlayer.isReloading,
      lastShotTime: localLastShotAt,
      skillReadyAt: { ...skillReadyAt },
      dashUntil: localPlayer.dashUntil,
    };

    return out;
  };

  const pushCombinedState = () => {
    if (stopped || !joined) return;
    emitLocal("state", {
      matchState: roomMeta.matchState,
      timeRemaining: roomMeta.timeRemaining,
      teamScores: { red: roomMeta.redScore, blue: roomMeta.blueScore },
      scoreLimit: roomMeta.scoreLimit,
      dominationOwner: roomMeta.dominationOwner,
      dominationProgress: roomMeta.dominationProgress,
      stormZone:
        roomMeta.mode === "br"
          ? ({
              centerX: 0,
              centerZ: 0,
              currentRadius: roomMeta.stormRadius,
              targetRadius: 10,
              phase: roomMeta.stormPhase,
              dps: roomMeta.stormPhase === 3 ? 12 : roomMeta.stormPhase === 2 ? 8 : 5,
            } satisfies StormZoneState)
          : null,
      lootPickups,
      players: getAllPlayersMap(),
    });
  };

  const flushLocalPlayerToFirestore = async (force = false) => {
    if (stopped || !joined) return;
    const now = Date.now();
    if (!force && now - lastFirestoreWriteAt < 110) {
      pendingFirestoreFlush = true;
      return;
    }
    pendingFirestoreFlush = false;
    lastFirestoreWriteAt = now;
    postBC({ kind: "player_state", player: { ...localPlayer } });
    try {
      await updateDoc(
        doc(db, "rooms", roomId, "players", uid),
        toRoomPlayerUpdateFields(localPlayer),
      );
    } catch {
      // ignore transient disconnect errors during teardown
    }
  };

  const spawnBotsIfHost = async () => {
    if (stopped || roomMeta.hostUid !== uid || roomMeta.botCount <= 0) return;
    for (let i = 0; i < roomMeta.botCount; i++) {
      const botId = `bot_${i}`;
      if (localBots.has(botId)) continue;

      const existingRemote = remotePlayers.get(botId);
      const bCharId = existingRemote?.characterId || CHARACTER_ORDER[(i + 1) % CHARACTER_ORDER.length];
      const bCfg = CHARACTERS[bCharId] || CHARACTERS.striker;
      const bSkinId = existingRemote?.skinId || SKIN_ORDER[i % SKIN_ORDER.length];
      const bWeaponId = existingRemote?.currentWeapon || WEAPON_ORDER[(i + 1) % WEAPON_ORDER.length];
      const bTeam: TeamType =
        roomMeta.mode === "ffa" || roomMeta.mode === "br"
          ? "none"
          : existingRemote?.team || (i % 2 === 0 ? "red" : "blue");
      const sp = pickSpawn(roomMeta.mapId, bTeam);

      const bot: LocalBotRuntime = {
        playerId: botId,
        ownerUid: uid,
        name: existingRemote?.name || BOT_NAMES[i % BOT_NAMES.length],
        color:
          bTeam === "red"
            ? "#ef4444"
            : bTeam === "blue"
              ? "#3b82f6"
              : bCfg.secondaryColor,
        team: bTeam,
        characterId: bCfg.id,
        skinId: bSkinId,
        isBot: true,
        x: existingRemote?.x ?? sp.x,
        y: existingRemote?.y ?? sp.y + 1.0,
        z: existingRemote?.z ?? sp.z,
        yaw: existingRemote?.yaw ?? 0,
        pitch: existingRemote?.pitch ?? 0,
        isCrouching: false,
        isSprinting: false,
        isMoving: false,
        isGrounded: true,
        moveForward: 0,
        moveRight: 0,
        isAiming: false,
        lastDoubleJumpAt: 0,
        health: existingRemote?.health ?? bCfg.maxHealth,
        maxHealth: existingRemote?.maxHealth ?? bCfg.maxHealth,
        shield: existingRemote?.shield ?? 0,
        isDead: existingRemote?.isDead ?? false,
        kills: existingRemote?.kills ?? 0,
        deaths: existingRemote?.deaths ?? 0,
        currentWeapon: bWeaponId,
        ammo: WEAPONS[bWeaponId].magSize,
        isReloading: false,
        dashUntil: 0,
        vy: 0,
        magazines: {
          assaultRifle: WEAPONS.assaultRifle.magSize,
          smg: WEAPONS.smg.magSize,
          shotgun: WEAPONS.shotgun.magSize,
          burstRifle: WEAPONS.burstRifle.magSize,
          sniper: WEAPONS.sniper.magSize,
          pistol: WEAPONS.pistol.magSize,
        },
        lastShotTime: 0,
        reloadTimeout: null,
        shieldExpiresAt: 0,
        lastJumpPadAt: 0,
        botTargetX: sp.x,
        botTargetZ: sp.z,
        botNextWanderAt: 0,
        botNextShotAt: Date.now() + 800 + i * 250,
      };
      localBots.set(botId, bot);

      if (existingRemote) {
        await updateDoc(doc(db, "rooms", roomId, "players", botId), toRoomPlayerUpdateFields(bot)).catch(
          () => {},
        );
      } else {
        await setDoc(doc(db, "rooms", roomId, "players", botId), {
          playerId: bot.playerId,
          ownerUid: bot.ownerUid,
          name: bot.name,
          color: bot.color,
          team: bot.team,
          characterId: bot.characterId,
          skinId: bot.skinId,
          isBot: true,
          x: bot.x,
          y: bot.y,
          z: bot.z,
          yaw: bot.yaw,
          pitch: bot.pitch,
          isCrouching: bot.isCrouching,
          isSprinting: bot.isSprinting,
          isMoving: bot.isMoving,
          isGrounded: bot.isGrounded,
          moveForward: bot.moveForward,
          moveRight: bot.moveRight,
          isAiming: bot.isAiming,
          lastDoubleJumpAt: bot.lastDoubleJumpAt,
          health: bot.health,
          maxHealth: bot.maxHealth,
          shield: bot.shield,
          isDead: bot.isDead,
          kills: bot.kills,
          deaths: bot.deaths,
          currentWeapon: bot.currentWeapon,
          ammo: bot.ammo,
          isReloading: bot.isReloading,
          dashUntil: bot.dashUntil,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  };

  const applyDamageToEntity = (
    target: RoomPlayerDocData,
    amount: number,
    attacker: {
      id: string;
      name: string;
      team: string;
      x?: number;
      z?: number;
    } | null,
    weaponName: string,
    weaponId: string,
    isHeadshot: boolean,
    hitY: number,
    distanceMeters: number,
    isLocalVictim: boolean,
  ) => {
    if (target.isDead || roomMeta.matchState !== "playing") return;
    if (
      attacker &&
      roomMeta.mode !== "ffa" &&
      roomMeta.mode !== "br" &&
      attacker.team === target.team &&
      attacker.id !== target.playerId
    ) {
      return;
    }

    let rem = amount;
    if ((target.shield || 0) > 0) {
      const absorbed = Math.min(target.shield, rem);
      target.shield -= absorbed;
      rem -= absorbed;
    }
    target.health = Math.max(0, target.health - rem);
    const killed = target.health <= 0;

    emitLocal("player_damaged", {
      targetId: target.playerId,
      shooterId: attacker?.id,
      attackerX: attacker?.x,
      attackerZ: attacker?.z,
      x: target.x,
      y: hitY,
      z: target.z,
      damage: amount,
      isHeadshot,
      distanceMeters,
      killed,
    });

    if (killed) {
      target.isDead = true;
      target.deaths += 1;

      if (attacker && attacker.id === uid) {
        localPlayer.kills += 1;
        void flushLocalPlayerToFirestore(true);
      }

      if (roomMeta.hostUid === uid && attacker && roomMeta.mode === "tdm") {
        if (attacker.team === "red") roomMeta.redScore += 1;
        if (attacker.team === "blue") roomMeta.blueScore += 1;
      }

      const killEv = buildEventBase("kill", attacker?.id || "storm", {
        targetId: target.playerId,
        weaponId,
        weaponName: isHeadshot ? `${weaponName} (HS)` : weaponName,
        isHeadshot,
        senderName: attacker?.name || "Storm Zone",
        targetName: target.name,
        senderTeam: attacker?.team || "none",
        targetTeam: target.team,
        killed: true,
      });
      emitLocal("kill_feed", {
        id: killEv.eventId,
        shooter: killEv.senderName,
        shooterId: killEv.senderId,
        target: killEv.targetName,
        targetId: killEv.targetId,
        weapon: killEv.weaponName,
        weaponId: weaponId || undefined,
        shooterTeam: killEv.senderTeam,
        targetTeam: killEv.targetTeam,
        isHeadshot,
      });
      void publishEvent(killEv);

      if (roomMeta.mode !== "br") {
        window.setTimeout(() => {
          if (stopped || roomMeta.matchState !== "playing") return;
          const sp = pickSpawn(roomMeta.mapId, target.team);
          const charCfg = CHARACTERS[target.characterId] || CHARACTERS.striker;
          target.health = charCfg.maxHealth;
          target.shield = 0;
          target.isDead = false;
          target.ammo = WEAPONS[target.currentWeapon].magSize;
          target.x = sp.x;
          target.y = sp.y + 1.0;
          target.z = sp.z;
          if (isLocalVictim) {
            localVy = 0;
            localJumpsUsed = 0;
            void flushLocalPlayerToFirestore(true);
          }
          pushCombinedState();
        }, 2500);
      }
    }

    if (isLocalVictim) {
      void flushLocalPlayerToFirestore(true);
    }
    pushCombinedState();
  };

  const handleIncomingEvent = (ev: RoomEventDocData) => {
    if (stopped || processedEvents.has(ev.eventId)) return;
    processedEvents.add(ev.eventId);

    if (ev.type === "shot") {
      emitLocal("shot_vfx", {
        shooterId: ev.senderId,
        weaponId: ev.weaponId || "assaultRifle",
        from: { x: ev.fromX, y: ev.fromY, z: ev.fromZ },
        to: { x: ev.toX, y: ev.toY, z: ev.toZ },
        color: ev.color || "#38bdf8",
        hitSurface: ev.hitSurface,
      });
    } else if (ev.type === "damage") {
      const attacker = {
        id: ev.senderId,
        name: ev.senderName || "Operator",
        team: ev.senderTeam || "none",
        x: ev.fromX,
        z: ev.fromZ,
      };
      if (ev.targetId === uid) {
        applyDamageToEntity(
          localPlayer,
          ev.amount,
          attacker,
          ev.weaponName || "Rifle",
          ev.weaponId || "assaultRifle",
          ev.isHeadshot,
          ev.toY || localPlayer.y + 0.3,
          ev.distanceMeters || 0,
          true,
        );
      } else if (roomMeta.hostUid === uid && localBots.has(ev.targetId)) {
        const bot = localBots.get(ev.targetId)!;
        applyDamageToEntity(
          bot,
          ev.amount,
          attacker,
          ev.weaponName || "Rifle",
          ev.weaponId || "assaultRifle",
          ev.isHeadshot,
          ev.toY || bot.y + 0.3,
          ev.distanceMeters || 0,
          false,
        );
      }
    } else if (ev.type === "kill") {
      if (ev.senderId === uid) {
        localPlayer.kills += 1;
        emitLocal("hit_confirm", {
          shooterId: uid,
          isHeadshot: ev.isHeadshot,
          killed: true,
        });
        void flushLocalPlayerToFirestore(true);
      }
      if (roomMeta.hostUid === uid && roomMeta.mode === "tdm") {
        if (ev.senderTeam === "red") roomMeta.redScore += 1;
        if (ev.senderTeam === "blue") roomMeta.blueScore += 1;
      }
      emitLocal("kill_feed", {
        id: ev.eventId,
        shooter: ev.senderName,
        shooterId: ev.senderId,
        target: ev.targetName,
        targetId: ev.targetId,
        weapon: ev.weaponName,
        weaponId: ev.weaponId || undefined,
        shooterTeam: ev.senderTeam,
        targetTeam: ev.targetTeam,
        isHeadshot: ev.isHeadshot,
      });
    } else if (ev.type === "explosion") {
      emitLocal("explosion_vfx", {
        x: ev.fromX,
        y: ev.fromY,
        z: ev.fromZ,
        radius: ev.radius || 7.5,
        color: ev.color || "#f97316",
      });
    } else if (ev.type === "voice_join") {
      emitLocal("voice_join", { peerId: ev.senderId });
    } else if (ev.type === "voice_leave") {
      emitLocal("voice_leave", { peerId: ev.senderId });
    } else if (ev.type === "voice_speaking") {
      emitLocal("voice_speaking", { peerId: ev.senderId, speaking: ev.speaking });
    } else if (ev.type === "voice_offer" && ev.targetId === uid) {
      emitLocal("voice_offer", {
        from: ev.senderId,
        offer: { type: ev.rtcSdpType || "offer", sdp: ev.rtcSdp },
      });
    } else if (ev.type === "voice_answer" && ev.targetId === uid) {
      emitLocal("voice_answer", {
        from: ev.senderId,
        answer: { type: ev.rtcSdpType || "answer", sdp: ev.rtcSdp },
      });
    } else if (ev.type === "voice_ice" && ev.targetId === uid) {
      emitLocal("voice_ice", {
        from: ev.senderId,
        candidate: {
          candidate: ev.rtcCandidate,
          sdpMid: ev.rtcSdpMid || null,
          sdpMLineIndex: ev.rtcSdpMLineIndex,
        },
      });
    }
  };

  const performActorShoot = (
    actor: RoomPlayerDocData,
    dirX: number,
    dirY: number,
    dirZ: number,
    customMuzzle?: { x: number; y: number; z: number },
  ) => {
    if (actor.isDead || actor.isReloading || actor.ammo <= 0) return;
    const wpn = WEAPONS[actor.currentWeapon];
    const map = MAPS[roomMeta.mapId] || MAPS.compound_05;
    const eyeY =
      actor.y +
      (actor.isCrouching ? PLAYER_CONFIG.CROUCH_EYE_OFFSET : PLAYER_CONFIG.EYE_LEVEL_OFFSET);

    const hasCustomMuzzle =
      customMuzzle &&
      Number.isFinite(customMuzzle.x) &&
      Number.isFinite(customMuzzle.y) &&
      Number.isFinite(customMuzzle.z) &&
      Math.hypot(customMuzzle.x - actor.x, customMuzzle.y - eyeY, customMuzzle.z - actor.z) < 2.5;

    const muzzlePos =
      hasCustomMuzzle && customMuzzle
        ? customMuzzle
        : computeMuzzleWorldPos(
            actor.x,
            actor.y,
            actor.z,
            actor.yaw,
            actor.pitch,
            actor.currentWeapon,
            actor.isCrouching,
            actor.isAiming,
          );

    const pellets = wpn.pellets || 1;
    const spread = wpn.spread || 0;
    const allTargets = getAllPlayersMap();

    for (let i = 0; i < pellets; i++) {
      const sx = dirX + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const sy = dirY + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const sz = dirZ + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const len = Math.hypot(sx, sy, sz) || 1;
      const dx = sx / len;
      const dy = sy / len;
      const dz = sz / len;

      const wallDist = raycastMapBoxes(actor.x, eyeY, actor.z, dx, dy, dz, wpn.range, map);
      let bestDist = wallDist;
      let hitTarget: PlayerState | null = null;
      let hitY = eyeY;

      Object.entries(allTargets).forEach(([tid, other]) => {
        if (tid === actor.playerId || other.isDead) return;
        const toX = other.x - actor.x;
        const toZ = other.z - actor.z;
        const proj = toX * dx + toZ * dz;
        if (proj <= 0) return;
        const horizLen = Math.hypot(dx, dz) || 0.001;
        const t = proj / (horizLen * horizLen);
        if (t <= 0 || t >= bestDist) return;

        const px = actor.x + dx * t;
        const py = eyeY + dy * t;
        const pz = actor.z + dz * t;
        const radial = Math.hypot(px - other.x, pz - other.z);
        if (radial <= 0.62 && py >= other.y - 1.0 && py <= other.y + 1.05) {
          bestDist = t;
          hitTarget = other;
          hitY = py;
        }
      });

      const endX = actor.x + dx * bestDist;
      const endY = eyeY + dy * bestDist;
      const endZ = actor.z + dz * bestDist;

      if (i === 0 || i % 2 === 0) {
        const shotEv = buildEventBase("shot", actor.playerId, {
          weaponId: actor.currentWeapon,
          color: wpn.tracerColor,
          fromX: muzzlePos.x,
          fromY: muzzlePos.y,
          fromZ: muzzlePos.z,
          toX: endX,
          toY: endY,
          toZ: endZ,
          hitSurface: bestDist < wpn.range,
        });
        emitLocal("shot_vfx", {
          shooterId: actor.playerId,
          weaponId: actor.currentWeapon,
          from: muzzlePos,
          to: { x: endX, y: endY, z: endZ },
          color: wpn.tracerColor,
          hitSurface: bestDist < wpn.range,
        });
        void publishEvent(shotEv);
      }

      if (hitTarget) {
        const target = hitTarget as PlayerState;
        const targetId = target.id || "";
        const friendly =
          roomMeta.mode !== "ffa" &&
          roomMeta.mode !== "br" &&
          target.team === actor.team &&
          targetId !== actor.playerId;

        if (!friendly && targetId) {
          const isHeadshot = hitY >= target.y + 0.45;
          const dmg = computeDistanceDamage(actor.currentWeapon, bestDist, isHeadshot);
          const distM = Math.round(bestDist);

          if (actor.playerId === uid) {
            const predictedKilled = target.health + (target.shield || 0) - dmg <= 0;
            emitLocal("hit_confirm", {
              shooterId: uid,
              isHeadshot,
              killed: false,
            });
            emitLocal("player_damaged", {
              targetId,
              shooterId: uid,
              attackerX: actor.x,
              attackerZ: actor.z,
              x: target.x,
              y: hitY,
              z: target.z,
              damage: dmg,
              isHeadshot,
              distanceMeters: distM,
              killed: predictedKilled,
            });
          }

          if (targetId === uid) {
            applyDamageToEntity(
              localPlayer,
              dmg,
              {
                id: actor.playerId,
                name: actor.name,
                team: actor.team,
                x: actor.x,
                z: actor.z,
              },
              wpn.shortName,
              actor.currentWeapon,
              isHeadshot,
              hitY,
              distM,
              true,
            );
          } else if (roomMeta.hostUid === uid && localBots.has(targetId)) {
            applyDamageToEntity(
              localBots.get(targetId)!,
              dmg,
              {
                id: actor.playerId,
                name: actor.name,
                team: actor.team,
                x: actor.x,
                z: actor.z,
              },
              wpn.shortName,
              actor.currentWeapon,
              isHeadshot,
              hitY,
              distM,
              false,
            );
          } else {
            const dmgEv = buildEventBase("damage", actor.playerId, {
              targetId,
              weaponId: actor.currentWeapon,
              weaponName: wpn.shortName,
              fromX: actor.x,
              fromY: actor.y,
              fromZ: actor.z,
              toX: target.x,
              toY: hitY,
              toZ: target.z,
              amount: dmg,
              isHeadshot,
              distanceMeters: distM,
              senderTeam: actor.team,
              targetTeam: target.team,
              senderName: actor.name,
              targetName: target.name,
            });
            void publishEvent(dmgEv);
          }
        }
      }
    }
  };

  const stepBotsAndHostSync = () => {
    if (stopped || !joined) return;
    const nowMs = Date.now();
    const dt = 0.05; // 20Hz simulation tick for serverless room bots
    const map = MAPS[roomMeta.mapId] || MAPS.compound_05;

    if (localShieldExpiresAt > 0 && nowMs > localShieldExpiresAt) {
      localPlayer.shield = 0;
      localShieldExpiresAt = 0;
    }

    // Jump pads & Loot check for local player
    if (!localPlayer.isDead && nowMs - localLastJumpPadAt > 600) {
      for (const pad of map.jumpPads) {
        if (
          Math.hypot(localPlayer.x - pad.x, localPlayer.z - pad.z) <= pad.radius &&
          Math.abs(localPlayer.y - (pad.y + 1.0)) < 1.8
        ) {
          localLastJumpPadAt = nowMs;
          emitLocal("jump_pad_vfx", {
            playerId: uid,
            padId: pad.id,
            boostY: pad.boostY,
          });
          break;
        }
      }
    }

    if (!localPlayer.isDead) {
      for (const item of lootPickups) {
        if (!item.active) continue;
        if (
          Math.hypot(localPlayer.x - item.x, localPlayer.z - item.z) <= 2.1 &&
          Math.abs(localPlayer.y - item.y) <= 2.2
        ) {
          item.active = false;
          if (item.kind === "medkit") {
            localPlayer.health = Math.min(localPlayer.maxHealth, localPlayer.health + 45);
          } else if (item.kind === "armor") {
            localPlayer.shield = Math.min(60, (localPlayer.shield || 0) + 35);
            localShieldExpiresAt = nowMs + 45000;
          } else if (item.kind === "ammo") {
            const wpn = WEAPONS[localPlayer.currentWeapon];
            localPlayer.ammo = wpn.magSize;
            initialMags[localPlayer.currentWeapon] = wpn.magSize;
          } else if (item.kind === "weapon" && item.weaponId) {
            localPlayer.currentWeapon = item.weaponId;
            localPlayer.ammo = WEAPONS[item.weaponId].magSize;
            initialMags[item.weaponId] = localPlayer.ammo;
          }
          soundEngine.playClick();
          void flushLocalPlayerToFirestore(true);
          window.setTimeout(() => {
            item.active = true;
          }, 18000);
          break;
        }
      }
    }

    // Check stale host failover every 3 seconds if we are not host
    if (roomMeta.hostUid !== uid && nowMs - lastHostCheckAt > 3000) {
      lastHostCheckAt = nowMs;
      if (nowMs - lastRoomUpdateMs > 9000) {
        void updateDoc(doc(db, "rooms", roomId), {
          hostUid: uid,
          updatedAt: serverTimestamp(),
        })
          .then(() => {
            roomMeta.hostUid = uid;
            void spawnBotsIfHost();
          })
          .catch(() => {});
      }
    }

    if (roomMeta.hostUid === uid && roomMeta.matchState === "playing") {
      const allPlayers = getAllPlayersMap();
      localBots.forEach((bot) => {
        if (bot.isDead) return;

        const supportY = getSupportHeightAt(bot.x, bot.z, bot.y - 1.0, PLAYER_CONFIG.RADIUS, map);
        const minBodyY = supportY + 1.0;
        bot.vy += -30 * dt;
        bot.y += bot.vy * dt;
        if (bot.y <= minBodyY) {
          bot.y = minBodyY;
          bot.vy = 0;
          bot.isGrounded = true;
        } else {
          bot.isGrounded = false;
        }

        let nearestEnemy: PlayerState | null = null;
        let nearestDist = 48;
        Object.values(allPlayers).forEach((other) => {
          if (!other.id || other.id === bot.playerId || other.isDead) return;
          if (roomMeta.mode !== "ffa" && roomMeta.mode !== "br" && other.team === bot.team) return;
          const d = Math.hypot(other.x - bot.x, other.z - bot.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = other;
          }
        });

        let tx = bot.botTargetX;
        let tz = bot.botTargetZ;

        if (nearestEnemy) {
          const enemy = nearestEnemy as PlayerState;
          const dx = enemy.x - bot.x;
          const dy = enemy.y + 0.4 - (bot.y + 0.5);
          const dz = enemy.z - bot.z;
          const horiz = Math.hypot(dx, dz) || 1;
          bot.yaw = Math.atan2(-dx, -dz);
          bot.pitch = Math.atan2(dy, horiz);
          bot.isAiming = true;

          if (horiz > 13) {
            tx = enemy.x;
            tz = enemy.z;
            bot.isSprinting = horiz > 26;
          } else {
            const s = Math.sin(nowMs * 0.002 + bot.x) > 0 ? 1 : -1;
            tx = bot.x + (-dz / horiz) * 6 * s;
            tz = bot.z + (dx / horiz) * 6 * s;
            bot.isSprinting = false;
          }

          if (nowMs >= bot.botNextShotAt && !bot.isReloading && bot.ammo > 0) {
            const len = Math.hypot(dx, dy, dz) || 1;
            const wallDist = raycastMapBoxes(
              bot.x,
              bot.y + 0.5,
              bot.z,
              dx / len,
              dy / len,
              dz / len,
              nearestDist,
              map,
            );
            if (wallDist >= nearestDist - 0.8) {
              bot.ammo -= 1;
              performActorShoot(
                bot,
                dx / len + (Math.random() - 0.5) * 0.06,
                dy / len + (Math.random() - 0.5) * 0.06,
                dz / len + (Math.random() - 0.5) * 0.06,
              );
              if (bot.ammo <= 0) {
                bot.isReloading = true;
                window.setTimeout(() => {
                  bot.ammo = WEAPONS[bot.currentWeapon].magSize;
                  bot.isReloading = false;
                }, 1600);
              }
            }
            bot.botNextShotAt = nowMs + 340 + Math.random() * 320;
          }
        } else {
          bot.isAiming = false;
          bot.isSprinting = false;
          if (nowMs > bot.botNextWanderAt) {
            bot.botTargetX = (Math.random() - 0.5) * (map.floor.width * 0.65);
            bot.botTargetZ = (Math.random() - 0.5) * (map.floor.depth * 0.65);
            bot.botNextWanderAt = nowMs + 3200 + Math.random() * 2400;
            tx = bot.botTargetX;
            tz = bot.botTargetZ;
          }
          const dx = tx - bot.x;
          const dz = tz - bot.z;
          if (Math.hypot(dx, dz) > 0.5) {
            bot.yaw = Math.atan2(-dx, -dz);
            bot.pitch = 0;
          }
        }

        const mdx = tx - bot.x;
        const mdz = tz - bot.z;
        const mLen = Math.hypot(mdx, mdz);
        if (mLen > 0.6) {
          const bCfg = CHARACTERS[bot.characterId] || CHARACTERS.striker;
          const spd =
            (bot.isSprinting ? PHYSICS_CONFIG.SPRINT_SPEED : PHYSICS_CONFIG.WALK_SPEED) *
            bCfg.speedMult *
            dt;
          const dirX = mdx / mLen;
          const dirZ = mdz / mLen;
          const fwdX = -Math.sin(bot.yaw);
          const fwdZ = -Math.cos(bot.yaw);
          const rgtX = Math.cos(bot.yaw);
          const rgtZ = -Math.sin(bot.yaw);
          bot.moveForward = dirX * fwdX + dirZ * fwdZ;
          bot.moveRight = dirX * rgtX + dirZ * rgtZ;

          const res = resolveCylinderBoxCollisions(
            bot.x + dirX * spd,
            bot.y,
            bot.z + dirZ * spd,
            PLAYER_CONFIG.RADIUS,
            map,
          );
          bot.x = res.x;
          bot.z = res.z;
          bot.isMoving = true;
        } else {
          bot.isMoving = false;
          bot.moveForward = 0;
          bot.moveRight = 0;
        }
      });
    }

    if (pendingFirestoreFlush && nowMs - lastFirestoreWriteAt >= 110) {
      void flushLocalPlayerToFirestore(false);
    }
  };

  const stepHostSecond = () => {
    if (stopped || !joined) return;
    if (roomMeta.hostUid !== uid || roomMeta.matchState !== "playing") return;

    const map = MAPS[roomMeta.mapId] || MAPS.compound_05;
    if (roomMeta.mode === "domination") {
      let redIn = 0;
      let blueIn = 0;
      const all = getAllPlayersMap();
      Object.values(all).forEach((p) => {
        if (!p.isDead && Math.hypot(p.x - map.captureZone.x, p.z - map.captureZone.z) <= map.captureZone.radius) {
          if (p.team === "red") redIn++;
          if (p.team === "blue") blueIn++;
        }
      });
      if (redIn > blueIn) {
        roomMeta.dominationProgress = Math.max(-100, roomMeta.dominationProgress - 20);
        if (roomMeta.dominationProgress <= -50) roomMeta.dominationOwner = "red";
      } else if (blueIn > redIn) {
        roomMeta.dominationProgress = Math.min(100, roomMeta.dominationProgress + 20);
        if (roomMeta.dominationProgress >= 50) roomMeta.dominationOwner = "blue";
      }
      if (roomMeta.dominationOwner === "red") roomMeta.redScore += 2;
      if (roomMeta.dominationOwner === "blue") roomMeta.blueScore += 2;
    }

    if (roomMeta.mode === "br") {
      roomMeta.stormRadius = Math.max(10, Number((roomMeta.stormRadius - 0.35).toFixed(2)));
      roomMeta.stormPhase = roomMeta.stormRadius < 24 ? 3 : roomMeta.stormRadius < 45 ? 2 : 1;
      const dps = roomMeta.stormPhase === 3 ? 12 : roomMeta.stormPhase === 2 ? 8 : 5;
      if (!localPlayer.isDead && Math.hypot(localPlayer.x, localPlayer.z) > roomMeta.stormRadius) {
        applyDamageToEntity(localPlayer, dps, null, "Storm Zone", "", false, localPlayer.y, 0, true);
      }
      localBots.forEach((b) => {
        if (!b.isDead && Math.hypot(b.x, b.z) > roomMeta.stormRadius) {
          applyDamageToEntity(b, dps, null, "Storm Zone", "", false, b.y, 0, false);
        }
      });
    }

    roomMeta.timeRemaining = Math.max(0, roomMeta.timeRemaining - 1);

    const tdmEnd =
      roomMeta.mode === "tdm" &&
      (roomMeta.redScore >= roomMeta.scoreLimit || roomMeta.blueScore >= roomMeta.scoreLimit);
    const domEnd =
      roomMeta.mode === "domination" &&
      (roomMeta.redScore >= roomMeta.scoreLimit || roomMeta.blueScore >= roomMeta.scoreLimit);

    if (roomMeta.timeRemaining <= 0 || tdmEnd || domEnd) {
      roomMeta.matchState = "ended";
      window.setTimeout(() => {
        if (stopped || roomMeta.hostUid !== uid) return;
        roomMeta.matchState = "playing";
        roomMeta.redScore = 0;
        roomMeta.blueScore = 0;
        roomMeta.dominationOwner = "none";
        roomMeta.dominationProgress = 0;
        roomMeta.stormRadius = Math.round(map.floor.width * 0.56);
        roomMeta.stormPhase = 1;
        roomMeta.timeRemaining =
          roomMeta.mode === "br"
            ? WINNING_RULES.brMatchSeconds
            : WINNING_RULES.defaultMatchSeconds;
        localPlayer.kills = 0;
        localPlayer.deaths = 0;
        localPlayer.health = localPlayer.maxHealth;
        localPlayer.isDead = false;
        const sp = pickSpawn(roomMeta.mapId, localPlayer.team);
        localPlayer.x = sp.x;
        localPlayer.y = sp.y + 1.0;
        localPlayer.z = sp.z;
        void flushLocalPlayerToFirestore(true);
      }, 5000);
    }

    const humanCount = Array.from(remotePlayers.values()).filter((p) => !p.isBot).length;
    roomMeta.playerCount = Math.max(1, Math.min(roomMeta.maxPlayers, humanCount));

    // Push bots & room meta to Firestore (1 write/sec per bot + room)
    localBots.forEach((b) => {
      postBC({ kind: "player_state", player: { ...b } });
      void updateDoc(doc(db, "rooms", roomId, "players", b.playerId), toRoomPlayerUpdateFields(b)).catch(
        () => {},
      );
    });

    postBC({ kind: "room_state", room: roomMeta });
    void updateDoc(doc(db, "rooms", roomId), {
      playerCount: roomMeta.playerCount,
      matchState: roomMeta.matchState,
      timeRemaining: roomMeta.timeRemaining,
      redScore: roomMeta.redScore,
      blueScore: roomMeta.blueScore,
      dominationOwner: roomMeta.dominationOwner,
      dominationProgress: roomMeta.dominationProgress,
      stormRadius: roomMeta.stormRadius,
      stormPhase: roomMeta.stormPhase,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  };

  const init = async () => {
    try {
      const roomRef = doc(db, "rooms", roomId);
      const shouldCreate =
        sessionConfig.playMode === "room" && sessionConfig.roomAction === "create";

      if (shouldCreate) {
        await setDoc(roomRef, {
          ...roomMeta,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const existing = snap.data() as RoomDocData;
          roomMeta = {
            ...existing,
            roomId,
            mapId: MAPS[existing.mapId] ? existing.mapId : "compound_05",
            mode: existing.mode || "tdm",
          };
          lootPickups = createLootForMap(roomMeta.mapId);

          // Inspect live players in room to count active humans and team distribution
          let redHumanCount = 0;
          let blueHumanCount = 0;
          let activeHumans = 0;
          try {
            const pSnap = await getDocs(collection(db, "rooms", roomId, "players"));
            const nowMs = Date.now();
            pSnap.docs.forEach((pd) => {
              const p = pd.data() as RoomPlayerDocData;
              if (p.isBot || p.playerId === uid) return;
              const updatedMs = p.updatedAt?.toMillis?.() ?? nowMs;
              if (nowMs - updatedMs > 60_000) return;
              activeHumans += 1;
              if (p.team === "red") redHumanCount += 1;
              else if (p.team === "blue") blueHumanCount += 1;
            });
          } catch {
            // fallback to playerCount if subcollection query fails
          }

          if (activeHumans >= roomMeta.maxPlayers) {
            emitLocal("room_error", { message: `Room [${roomId}] is full.` });
            return;
          }

          // Assign chosen side or auto-balance cleanly for 2+ players
          if (roomMeta.mode === "ffa" || roomMeta.mode === "br") {
            localPlayer.team = "none";
          } else if (preferredTeam === "red" || preferredTeam === "blue") {
            localPlayer.team = preferredTeam;
          } else {
            localPlayer.team = blueHumanCount <= redHumanCount ? "blue" : "red";
          }
          localPlayer.color =
            localPlayer.team === "red"
              ? "#ef4444"
              : localPlayer.team === "blue"
                ? "#3b82f6"
                : cfg.secondaryColor;
          const sp = pickSpawn(roomMeta.mapId, localPlayer.team);
          localPlayer.x = sp.x;
          localPlayer.y = sp.y + 1.0;
          localPlayer.z = sp.z;

          const nextCount = Math.min(roomMeta.maxPlayers, Math.max(1, activeHumans + 1));
          await updateDoc(roomRef, {
            playerCount: nextCount,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        } else if (roomId === "PUBLIC-01" || sessionConfig.playMode === "online") {
          roomId = "PUBLIC-01";
          roomMeta = {
            ...roomMeta,
            roomId: "PUBLIC-01",
            name: "Public Arena #1",
            isPrivate: false,
            hostUid: uid,
          };
          await setDoc(doc(db, "rooms", "PUBLIC-01"), {
            ...roomMeta,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          emitLocal("room_error", { message: `Room [${roomId}] not found` });
          return;
        }
      }

      if (stopped) return;

      // Register local player document
      await setDoc(doc(db, "rooms", roomId, "players", uid), {
        playerId: localPlayer.playerId,
        ownerUid: uid,
        name: localPlayer.name,
        color: localPlayer.color,
        team: localPlayer.team,
        characterId: localPlayer.characterId,
        skinId: localPlayer.skinId,
        isBot: false,
        x: localPlayer.x,
        y: localPlayer.y,
        z: localPlayer.z,
        yaw: localPlayer.yaw,
        pitch: localPlayer.pitch,
        isCrouching: localPlayer.isCrouching,
        isSprinting: localPlayer.isSprinting,
        isMoving: localPlayer.isMoving,
        isGrounded: localPlayer.isGrounded,
        moveForward: localPlayer.moveForward,
        moveRight: localPlayer.moveRight,
        isAiming: localPlayer.isAiming,
        lastDoubleJumpAt: localPlayer.lastDoubleJumpAt,
        health: localPlayer.health,
        maxHealth: localPlayer.maxHealth,
        shield: localPlayer.shield,
        isDead: localPlayer.isDead,
        kills: localPlayer.kills,
        deaths: localPlayer.deaths,
        currentWeapon: localPlayer.currentWeapon,
        ammo: localPlayer.ammo,
        isReloading: localPlayer.isReloading,
        dashUntil: localPlayer.dashUntil,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      joined = true;

      try {
        bc = new BroadcastChannel(`sg3d_room_${roomId}`);
        bc.onmessage = (msgEv) => {
          const payload = msgEv.data as BroadcastMessage;
          if (!payload || stopped) return;
          if (payload.kind === "player_state") {
            const p = payload.player;
            if (p.playerId !== uid) {
              remotePlayers.set(p.playerId, p);
            }
          } else if (payload.kind === "event") {
            handleIncomingEvent(payload.event);
          } else if (payload.kind === "room_state") {
            if (payload.room.hostUid !== uid) {
              roomMeta = { ...roomMeta, ...payload.room };
            }
          }
        };
      } catch {
        bc = null;
      }

      // Firestore real-time listeners
      unsubRoom = onSnapshot(doc(db, "rooms", roomId), (snap) => {
        if (stopped || !snap.exists()) return;
        const d = snap.data() as RoomDocData;
        lastRoomUpdateMs = d.updatedAt?.toMillis?.() ?? Date.now();
        if (d.hostUid !== uid) {
          roomMeta = { ...roomMeta, ...d };
        } else {
          roomMeta.hostUid = uid;
        }
      });

      unsubPlayers = onSnapshot(
        query(collection(db, "rooms", roomId, "players"), where("ownerUid", ">=", "")),
        (snap) => {
          if (stopped) return;
          const activeIds = new Set<string>();
          snap.docs.forEach((d) => {
            const p = d.data() as RoomPlayerDocData;
            activeIds.add(p.playerId);
            if (p.playerId !== uid) {
              remotePlayers.set(p.playerId, p);
            }
          });
          Array.from(remotePlayers.keys()).forEach((id) => {
            if (!activeIds.has(id)) remotePlayers.delete(id);
          });
        },
        (err) => {
          if (!stopped) console.warn("Serverless players snapshot warning:", err.message);
        },
      );

      unsubEvents = onSnapshot(
        query(collection(db, "rooms", roomId, "events"), where("senderUid", ">=", "")),
        (snap) => {
          if (stopped) return;
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              handleIncomingEvent(change.doc.data() as RoomEventDocData);
            }
          });
        },
        (err) => {
          if (!stopped) console.warn("Serverless events snapshot warning:", err.message);
        },
      );

      if (roomMeta.hostUid === uid) {
        await spawnBotsIfHost();
      }

      onConnected?.(uid);
      emitLocal("room_joined", {
        roomId,
        roomName: roomMeta.name,
        mapId: roomMeta.mapId,
        mode: roomMeta.mode,
      });

      // Public rooms refresh for pause menu / lobby parity
      void listServerlessPublicRooms()
        .then((list) => {
          if (!stopped) emitLocal("rooms_list", list);
        })
        .catch(() => {});

      pushCombinedState();

      // Timers
      simTimer = window.setInterval(stepBotsAndHostSync, 50);
      secondTimer = window.setInterval(stepHostSecond, 1000);
      statePushTimer = window.setInterval(pushCombinedState, 45);
      pingTimer = window.setInterval(async () => {
        if (stopped) return;
        const start = performance.now();
        try {
          await getDocFromServer(doc(db, "rooms", roomId));
          const rtt = Math.round(performance.now() - start);
          onPingMeasured?.(rtt);
        } catch {
          // ignore offline ping blip
        }
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize serverless room";
      emitLocal("room_error", { message: msg });
    }
  };

  void init();

  const channel: RealtimeChannel = {
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    off: (event, listener) => {
      if (!listener) listeners.delete(event);
      else listeners.get(event)?.delete(listener);
    },
    emit: (event, ...args) => {
      if (stopped) return;
      const payload = (args[0] || {}) as Record<string, unknown>;

      if (event === "ping") {
        const cb = typeof args[0] === "function" ? (args[0] as () => void) : null;
        cb?.();
        return;
      }

      if (event === "playerInput") {
        if (localPlayer.isDead) return;
        if (typeof payload.x === "number") localPlayer.x = payload.x;
        if (typeof payload.y === "number" && Date.now() - localLastJumpPadAt > 350) {
          localPlayer.y = payload.y;
        }
        if (typeof payload.z === "number") localPlayer.z = payload.z;
        if (typeof payload.yaw === "number") localPlayer.yaw = payload.yaw;
        if (typeof payload.pitch === "number") localPlayer.pitch = payload.pitch;
        localPlayer.isCrouching = Boolean(payload.isCrouching);
        localPlayer.isSprinting = Boolean(payload.isSprinting);
        localPlayer.isMoving = Boolean(payload.isMoving);
        localPlayer.moveForward =
          typeof payload.moveForward === "number" ? payload.moveForward : 0;
        localPlayer.moveRight =
          typeof payload.moveRight === "number" ? payload.moveRight : 0;
        localPlayer.isAiming = Boolean(payload.isAiming);
        if (typeof payload.isGrounded === "boolean") {
          localPlayer.isGrounded = payload.isGrounded;
          if (payload.isGrounded) localJumpsUsed = 0;
        }
        if (typeof payload.lastDoubleJumpAt === "number" && payload.lastDoubleJumpAt > 0) {
          localPlayer.lastDoubleJumpAt = payload.lastDoubleJumpAt;
        }

        const now = Date.now();
        if (now - lastBroadcastAt >= 32) {
          lastBroadcastAt = now;
          postBC({ kind: "player_state", player: { ...localPlayer } });
        }
        void flushLocalPlayerToFirestore(false);
        return;
      }

      if (event === "jump") {
        if (localPlayer.isDead) return;
        if (localPlayer.isGrounded) {
          localVy = PHYSICS_CONFIG.JUMP_FORCE;
          localPlayer.isGrounded = false;
          localJumpsUsed = 1;
        } else if (localJumpsUsed < PHYSICS_CONFIG.MAX_JUMPS) {
          localVy = PHYSICS_CONFIG.DOUBLE_JUMP_FORCE;
          localJumpsUsed += 1;
          localPlayer.lastDoubleJumpAt = Date.now();
          void flushLocalPlayerToFirestore(true);
        }
        return;
      }

      if (event === "switchWeapon") {
        const nextW = (typeof args[0] === "string" ? args[0] : payload.weaponId) as WeaponId;
        if (localPlayer.isDead || !WEAPONS[nextW]) return;
        if (localReloadTimeout) {
          clearTimeout(localReloadTimeout);
          localReloadTimeout = null;
        }
        localPlayer.isReloading = false;
        localPlayer.currentWeapon = nextW;
        localPlayer.ammo = initialMags[nextW];
        void flushLocalPlayerToFirestore(true);
        pushCombinedState();
        return;
      }

      if (event === "selectCharacter") {
        const nextCharId = (
          typeof args[0] === "string" ? args[0] : payload.characterId
        ) as CharacterId;
        const nextCfg = CHARACTERS[nextCharId];
        if (!nextCfg) return;
        localPlayer.characterId = nextCharId;
        localPlayer.maxHealth = nextCfg.maxHealth;
        localPlayer.health = Math.min(localPlayer.health, nextCfg.maxHealth);
        void flushLocalPlayerToFirestore(true);
        pushCombinedState();
        return;
      }

      if (event === "switchTeam") {
        if (roomMeta.mode !== "tdm" && roomMeta.mode !== "domination") return;
        const requested = (
          typeof args[0] === "string" ? args[0] : payload.team
        ) as TeamType;
        if (requested !== "red" && requested !== "blue") return;
        if (localPlayer.team === requested) return;

        localPlayer.team = requested;
        localPlayer.color = requested === "red" ? "#ef4444" : "#3b82f6";
        const sp = pickSpawn(roomMeta.mapId, requested);
        localPlayer.x = sp.x;
        localPlayer.y = sp.y + 1.0;
        localPlayer.z = sp.z;
        localPlayer.health = localPlayer.maxHealth;
        localPlayer.isDead = false;
        localVy = 0;
        localJumpsUsed = 0;
        window.dispatchEvent(
          new CustomEvent("local-team-switched", {
            detail: { x: localPlayer.x, y: localPlayer.y, z: localPlayer.z },
          }),
        );
        void flushLocalPlayerToFirestore(true);
        pushCombinedState();
        return;
      }

      if (event === "reload") {
        if (localPlayer.isDead || localPlayer.isReloading) return;
        const wpn = WEAPONS[localPlayer.currentWeapon];
        if (localPlayer.ammo >= wpn.magSize) return;
        const reloadMs = Math.round(wpn.reloadTime * cfg.reloadMult);
        localPlayer.isReloading = true;
        void flushLocalPlayerToFirestore(true);
        pushCombinedState();
        localReloadTimeout = window.setTimeout(() => {
          if (stopped) return;
          initialMags[localPlayer.currentWeapon] = wpn.magSize;
          localPlayer.ammo = wpn.magSize;
          localPlayer.isReloading = false;
          localReloadTimeout = null;
          void flushLocalPlayerToFirestore(true);
          pushCombinedState();
        }, reloadMs);
        return;
      }

      if (event === "shoot") {
        if (localPlayer.isDead || localPlayer.isReloading) return;
        const wpn = WEAPONS[localPlayer.currentWeapon];
        const now = Date.now();
        if (now - localLastShotAt < wpn.fireRate - 15 || localPlayer.ammo <= 0) return;

        localLastShotAt = now;
        initialMags[localPlayer.currentWeapon] = Math.max(
          0,
          initialMags[localPlayer.currentWeapon] - 1,
        );
        localPlayer.ammo = initialMags[localPlayer.currentWeapon];

        const dirX = typeof payload.dirX === "number" ? payload.dirX : 0;
        const dirY = typeof payload.dirY === "number" ? payload.dirY : 0;
        const dirZ = typeof payload.dirZ === "number" ? payload.dirZ : -1;
        const muzzle = payload.muzzle as { x: number; y: number; z: number } | undefined;

        performActorShoot(localPlayer, dirX, dirY, dirZ, muzzle);

        if (localPlayer.ammo <= 0) {
          channel.emit("reload");
        } else {
          void flushLocalPlayerToFirestore(true);
        }
        pushCombinedState();
        return;
      }

      if (event === "use_skill") {
        if (localPlayer.isDead) return;
        const sId = payload.skillId as SkillId;
        const sk = SKILLS[sId];
        const now = Date.now();
        if (!sk || now < skillReadyAt[sId]) return;
        skillReadyAt[sId] = now + Math.round(sk.cooldownMs * cfg.cooldownMult);

        if (sId === "dash") {
          localPlayer.dashUntil = now + sk.durationMs;
        } else if (sId === "shield") {
          localPlayer.shield = 45;
          localShieldExpiresAt = now + sk.durationMs;
          localPlayer.health = Math.min(localPlayer.maxHealth, localPlayer.health + 25);
        } else if (sId === "grenade") {
          const map = MAPS[roomMeta.mapId] || MAPS.compound_05;
          const dirX = typeof payload.dirX === "number" ? payload.dirX : 0;
          const dirY = typeof payload.dirY === "number" ? payload.dirY : 0;
          const dirZ = typeof payload.dirZ === "number" ? payload.dirZ : -1;
          const dist = Math.min(
            18,
            raycastMapBoxes(localPlayer.x, localPlayer.y + 0.6, localPlayer.z, dirX, dirY, dirZ, 18, map),
          );
          const ex = localPlayer.x + dirX * Math.max(1.5, dist - 0.5);
          const ey = Math.max(0.5, localPlayer.y + 0.6 + dirY * Math.max(1.5, dist - 0.5));
          const ez = localPlayer.z + dirZ * Math.max(1.5, dist - 0.5);

          emitLocal("explosion_vfx", { x: ex, y: ey, z: ez, radius: 7.5, color: sk.color });
          void publishEvent(
            buildEventBase("explosion", uid, {
              fromX: ex,
              fromY: ey,
              fromZ: ez,
              radius: 7.5,
              color: sk.color,
            }),
          );

          const all = getAllPlayersMap();
          Object.entries(all).forEach(([tid, target]) => {
            if (target.isDead || tid === uid) return;
            if (roomMeta.mode !== "ffa" && roomMeta.mode !== "br" && target.team === localPlayer.team) return;
            const d = Math.hypot(target.x - ex, target.y - ey, target.z - ez);
            if (d <= 7.5) {
              const dmg = Math.round(70 * (1 - d / 8.5));
              if (dmg > 0) {
                void publishEvent(
                  buildEventBase("damage", uid, {
                    targetId: tid,
                    weaponId: "grenade",
                    weaponName: "Frag Grenade",
                    fromX: localPlayer.x,
                    fromY: localPlayer.y,
                    fromZ: localPlayer.z,
                    toX: target.x,
                    toY: target.y + 0.3,
                    toZ: target.z,
                    amount: dmg,
                    distanceMeters: Math.round(d),
                    senderTeam: localPlayer.team,
                    targetTeam: target.team,
                    senderName: localPlayer.name,
                    targetName: target.name,
                  }),
                );
              }
            }
          });
        }
        void flushLocalPlayerToFirestore(true);
        pushCombinedState();
        return;
      }

      if (event === "voice_join" || event === "voice_leave") {
        void publishEvent(buildEventBase(event, uid, {}));
        return;
      }

      if (event === "voice_speaking") {
        void publishEvent(
          buildEventBase("voice_speaking", uid, { speaking: Boolean(payload.speaking) }),
        );
        return;
      }

      if (event === "voice_offer" || event === "voice_answer") {
        const offer = (payload.offer || payload.answer || {}) as { type?: string; sdp?: string };
        void publishEvent(
          buildEventBase(event, uid, {
            targetId: String(payload.to || ""),
            rtcSdpType: offer.type || (event === "voice_offer" ? "offer" : "answer"),
            rtcSdp: offer.sdp || "",
          }),
        );
        return;
      }

      if (event === "voice_ice") {
        const cand = (payload.candidate || {}) as {
          candidate?: string;
          sdpMid?: string | null;
          sdpMLineIndex?: number | null;
        };
        void publishEvent(
          buildEventBase("voice_ice", uid, {
            targetId: String(payload.to || ""),
            rtcCandidate: cand.candidate || "",
            rtcSdpMid: cand.sdpMid || "",
            rtcSdpMLineIndex: typeof cand.sdpMLineIndex === "number" ? cand.sdpMLineIndex : 0,
          }),
        );
      }
    },
    disconnect: () => {
      if (stopped) return;
      stopped = true;
      if (simTimer !== null) clearInterval(simTimer);
      if (secondTimer !== null) clearInterval(secondTimer);
      if (pingTimer !== null) clearInterval(pingTimer);
      if (statePushTimer !== null) clearInterval(statePushTimer);
      if (localReloadTimeout !== null) clearTimeout(localReloadTimeout);
      unsubRoom?.();
      unsubPlayers?.();
      unsubEvents?.();
      try {
        bc?.close();
      } catch {
        // ignore
      }
      onDisconnected?.();

      // Best-effort cleanup of local player doc and empty room
      void deleteDoc(doc(db, "rooms", roomId, "players", uid)).catch(() => {});
      if (roomMeta.hostUid === uid) {
        const otherHumans = Array.from(remotePlayers.values()).filter(
          (p) => !p.isBot && p.playerId !== uid,
        );
        if (otherHumans.length === 0) {
          localBots.forEach((b) => {
            void deleteDoc(doc(db, "rooms", roomId, "players", b.playerId)).catch(() => {});
          });
          void deleteDoc(doc(db, "rooms", roomId)).catch(() => {});
        } else {
          // Transfer host cleanly to next human player on voluntary leave
          void updateDoc(doc(db, "rooms", roomId), {
            playerCount: Math.max(1, otherHumans.length),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      } else {
        const otherHumans = Array.from(remotePlayers.values()).filter(
          (p) => !p.isBot && p.playerId !== uid,
        );
        void updateDoc(doc(db, "rooms", roomId), {
          playerCount: Math.max(0, otherHumans.length),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    },
  };

  void localVy;
  return channel;
}
