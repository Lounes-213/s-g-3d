import {
  CHARACTERS,
  CHARACTER_ORDER,
  CHARACTER_SKINS,
  GRIPS,
  MAGS,
  MAPS,
  MUZZLES,
  PHYSICS_CONFIG,
  PLAYER_CONFIG,
  SCOPES,
  SKIN_ORDER,
  SKILLS,
  WEAPONS,
  WEAPON_ORDER,
  WINNING_RULES,
  computeEffectiveWeaponStats,
  computeMuzzleWorldPos,
  computeDistanceDamage,
  createInitialMagazines,
  getSupportHeightAt,
  raycastMapBoxes,
  resolveCylinderBoxCollisions,
  type CharacterId,
  type GameMode,
  type GripId,
  type LootPickup,
  type LootRarity,
  type MagId,
  type MapId,
  type MuzzleId,
  type ScopeId,
  type SkillId,
  type SkinId,
  type StormZoneState,
  type TeamType,
  type WeaponId,
} from "@block-shooter/shared";
import { useGameStore, type PlayerState } from "../stores/useGameStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { recordMatchStats } from "../services/firebaseService";
import { arenaPhysics } from "./cannonPhysics";
import { recordMatchHistory } from "./matchHistory";
import { soundEngine } from "./soundEngine";

interface InternalSoloEntity extends PlayerState {
  id: string;
  vy: number;
  magazines: Record<WeaponId, number>;
  lastShotTime: number;
  reloadTimeout: number | null;
  shieldExpiresAt: number;
  skillReadyAt: Record<SkillId, number>;
  dashUntil: number;
  lastJumpPadAt: number;
  jumpsUsed: number;
  lastDoubleJumpAt: number;
  botTargetX?: number;
  botTargetZ?: number;
  botNextWanderAt?: number;
  botNextShotAt?: number;
}

const BOT_NAMES = [
  "Alpha-01",
  "Spectre",
  "Vortex",
  "Kobra",
  "Viper",
  "Ranger",
  "Nomad",
  "Ghost-IX",
  "Reaper",
  "Falcon",
  "Striker-7",
  "Mantis",
  "Cobalt",
  "Warden",
  "Apex-09",
];

const LOOT_SCOPES: ScopeId[] = ["red_dot", "holo", "prism_2x", "acog_4x", "sniper_8x"];
const LOOT_MUZZLES: MuzzleId[] = ["compensator", "suppressor", "heavy_brake"];
const LOOT_GRIPS: GripId[] = ["vertical", "angled", "laser_sight"];
const LOOT_MAGS: MagId[] = ["extended", "fast_mag"];

function createLootForMap(mapId: MapId): LootPickup[] {
  const map = MAPS[mapId] || MAPS.royale_valley;
  const pattern: Array<LootPickup["kind"]> = [
    "weapon",
    "armor",
    "scope",
    "medkit",
    "attachment",
    "ammo",
    "weapon",
    "armor",
  ];

  return map.lootSpawns.map((sp, idx) => {
    const kind = pattern[idx % pattern.length];
    let rarity: LootRarity;
    let label: string;
    let weaponId: WeaponId | undefined;
    let scopeId: ScopeId | undefined;
    let muzzleId: MuzzleId | undefined;
    let gripId: GripId | undefined;
    let magId: MagId | undefined;

    if (kind === "weapon") {
      weaponId = WEAPON_ORDER[(idx * 3 + 1) % WEAPON_ORDER.length];
      const w = WEAPONS[weaponId];
      rarity =
        weaponId === "sniper" || weaponId === "scarH" || weaponId === "kar98" || weaponId === "lmg"
          ? "legendary"
          : weaponId === "ak74m" || weaponId === "dmr" || weaponId === "p90" || weaponId === "vector"
            ? "epic"
            : "rare";
      label = w.name;
    } else if (kind === "scope") {
      scopeId = LOOT_SCOPES[idx % LOOT_SCOPES.length];
      rarity = scopeId === "sniper_8x" ? "legendary" : scopeId === "acog_4x" ? "epic" : "rare";
      label = `${SCOPES[scopeId].name} (${SCOPES[scopeId].zoom.toFixed(1)}x)`;
    } else if (kind === "attachment") {
      const sub = idx % 3;
      if (sub === 0) {
        muzzleId = LOOT_MUZZLES[idx % LOOT_MUZZLES.length];
        rarity = muzzleId === "suppressor" ? "epic" : "rare";
        label = MUZZLES[muzzleId].name;
      } else if (sub === 1) {
        gripId = LOOT_GRIPS[idx % LOOT_GRIPS.length];
        rarity = gripId === "laser_sight" ? "epic" : "rare";
        label = GRIPS[gripId].name;
      } else {
        magId = LOOT_MAGS[idx % LOOT_MAGS.length];
        rarity = "rare";
        label = MAGS[magId].name;
      }
    } else if (kind === "armor") {
      rarity = "rare";
      label = "Ballistic Armor Plate";
    } else if (kind === "medkit") {
      rarity = "rare";
      label = "Trauma Medkit";
    } else {
      rarity = "common";
      label = "Tactical Ammo Pack";
    }

    return {
      id: `solo_loot_${idx}`,
      kind,
      rarity,
      label,
      weaponId,
      scopeId,
      muzzleId,
      gripId,
      magId,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      active: true,
    };
  });
}

class SoloGameEngine {
  private entities: Map<string, InternalSoloEntity> = new Map();
  private mapId: MapId = "royale_valley";
  private mode: GameMode = "br";
  private scoreLimit = 30;
  private timeRemaining = 240;
  private teamScores = { red: 0, blue: 0 };
  private dominationOwner: TeamType = "none";
  private dominationProgress = 0;
  private stormZone: StormZoneState | null = null;
  private lootPickups: LootPickup[] = [];
  private matchState: "waiting" | "playing" | "ended" = "playing";
  private loopTimer: number | null = null;
  private secondTimer: number | null = null;
  private lastTick = 0;
  private lastStoreSyncAt = 0;
  private localId = "solo-local";
  private elapsedSeconds = 0;
  private airdropCounter = 0;
  private lastNearbyLootId: string | null = null;

  public start(opts: {
    mapId: MapId;
    mode: GameMode;
    botCount: number;
    playerName: string;
    characterId: CharacterId;
    skinId?: SkinId;
    weaponId: WeaponId;
  }) {
    this.stop();

    this.mapId = MAPS[opts.mapId] ? opts.mapId : "royale_valley";
    this.mode = opts.mode;
    this.elapsedSeconds = 0;
    this.airdropCounter = 0;
    this.lastNearbyLootId = null;

    this.scoreLimit =
      opts.mode === "ffa"
        ? WINNING_RULES.ffaScoreLimit
        : opts.mode === "domination"
          ? WINNING_RULES.dominationScoreLimit
          : opts.mode === "br"
            ? 1
            : WINNING_RULES.tdmScoreLimit;
    this.timeRemaining =
      opts.mode === "br" ? WINNING_RULES.brMatchSeconds : WINNING_RULES.defaultMatchSeconds;
    this.teamScores = { red: 0, blue: 0 };
    this.dominationOwner = "none";
    this.dominationProgress = 0;
    const mapSpan = MAPS[this.mapId].floor.width;
    this.stormZone =
      opts.mode === "br"
        ? {
            centerX: (Math.random() - 0.5) * mapSpan * 0.14,
            centerZ: (Math.random() - 0.5) * mapSpan * 0.14,
            currentRadius: Math.round(mapSpan * 0.56),
            targetRadius: 12,
            phase: 1,
            dps: 5,
          }
        : null;
    this.lootPickups = createLootForMap(this.mapId);
    this.matchState = "playing";
    this.entities.clear();

    const localTeam: TeamType =
      opts.mode === "ffa" || opts.mode === "br" ? "none" : "blue";
    this.spawnEntity({
      id: this.localId,
      name: opts.playerName || "Operator-01",
      characterId: opts.characterId,
      skinId: opts.skinId,
      weaponId: opts.weaponId,
      team: localTeam,
      isBot: false,
    });

    const maxBots = opts.mode === "br" ? 15 : 10;
    const bots = Math.max(1, Math.min(maxBots, opts.botCount || (opts.mode === "br" ? 9 : 5)));
    for (let i = 0; i < bots; i++) {
      let botTeam: TeamType = "none";
      if (opts.mode !== "ffa" && opts.mode !== "br") {
        botTeam = i % 2 === 0 ? "red" : "blue";
      }
      this.spawnEntity({
        id: `solo-bot-${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        characterId: CHARACTER_ORDER[(i + 1) % CHARACTER_ORDER.length],
        skinId: SKIN_ORDER[i % SKIN_ORDER.length],
        weaponId: WEAPON_ORDER[(i * 2 + 1) % WEAPON_ORDER.length],
        team: botTeam,
        isBot: true,
      });
    }

    const store = useGameStore.getState();
    store.setLocalId(this.localId);
    store.setIsConnected(true);
    store.setPing(0);
    store.setNearbyLoot(null);
    store.updateMatchData({
      roomId: "SOLO-ARENA",
      roomName: opts.mode === "br" ? "Los Verdant Royale" : "Solo Combat Arena",
      mapId: this.mapId,
      mode: this.mode,
      scoreLimit: this.scoreLimit,
      matchState: "playing",
      timeRemaining: this.timeRemaining,
      teamScores: { ...this.teamScores },
      stormZone: this.stormZone,
      lootPickups: this.lootPickups,
    });

    this.lastTick = performance.now();
    this.syncToStore();

    this.loopTimer = window.setInterval(() => this.tick(), 1000 / 60);
    this.secondTimer = window.setInterval(() => this.tickSecond(), 1000);
  }

  public stop() {
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.secondTimer !== null) {
      clearInterval(this.secondTimer);
      this.secondTimer = null;
    }
    this.entities.forEach((e) => {
      if (e.reloadTimeout) clearTimeout(e.reloadTimeout);
    });
    this.entities.clear();
  }

  private getRandomSpawn(team: TeamType) {
    const map = MAPS[this.mapId];
    const pool =
      team === "red"
        ? map.redSpawns
        : team === "blue"
          ? map.blueSpawns
          : map.ffaSpawns;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private getEffectiveStatsFor(entity: InternalSoloEntity, weaponId: WeaponId) {
    if (entity.id === this.localId) {
      const att = useSettingsStore.getState().getWeaponAttachments(weaponId);
      return computeEffectiveWeaponStats(weaponId, att);
    }
    return computeEffectiveWeaponStats(weaponId);
  }

  private spawnEntity(opts: {
    id: string;
    name: string;
    characterId: CharacterId;
    skinId?: SkinId;
    weaponId: WeaponId;
    team: TeamType;
    isBot: boolean;
  }) {
    const cfg = CHARACTERS[opts.characterId] || CHARACTERS.striker;
    const skinId: SkinId =
      opts.skinId && CHARACTER_SKINS[opts.skinId] ? opts.skinId : cfg.defaultSkin;
    const spawn = this.getRandomSpawn(opts.team);
    const mags: Record<WeaponId, number> = createInitialMagazines();
    if (!opts.isBot) {
      for (const wId of WEAPON_ORDER) {
        const att = useSettingsStore.getState().getWeaponAttachments(wId);
        mags[wId] = computeEffectiveWeaponStats(wId, att).magSize;
      }
    }

    const color =
      opts.team === "red"
        ? "#ef4444"
        : opts.team === "blue"
          ? "#3b82f6"
          : cfg.secondaryColor;

    this.entities.set(opts.id, {
      id: opts.id,
      name: opts.name,
      color,
      team: opts.team,
      characterId: cfg.id,
      skinId,
      isBot: opts.isBot,
      x: spawn.x,
      y: spawn.y + 1.0,
      z: spawn.z,
      vy: 0,
      yaw: 0,
      pitch: 0,
      isCrouching: false,
      isSprinting: false,
      isSliding: false,
      lean: 0,
      isMoving: false,
      isGrounded: true,
      moveForward: 0,
      moveRight: 0,
      isAiming: false,
      health: cfg.maxHealth,
      maxHealth: cfg.maxHealth,
      shield: this.mode === "br" ? 50 : 0,
      shieldExpiresAt: 0,
      isDead: false,
      kills: 0,
      deaths: 0,
      currentWeapon: opts.weaponId,
      ammo: mags[opts.weaponId],
      magazines: mags,
      isReloading: false,
      lastShotTime: 0,
      reloadTimeout: null,
      skillReadyAt: { dash: 0, shield: 0, grenade: 0 },
      dashUntil: 0,
      lastJumpPadAt: 0,
      jumpsUsed: 0,
      lastDoubleJumpAt: 0,
    });
  }

  public updateLocalInput(data: {
    x: number;
    y?: number;
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
  }) {
    const me = this.entities.get(this.localId);
    if (!me || me.isDead) return;
    me.x = data.x;
    if (typeof data.y === "number" && Date.now() - me.lastJumpPadAt > 350) {
      me.y = data.y;
    }
    me.z = data.z;
    me.yaw = data.yaw;
    me.pitch = data.pitch;
    me.isCrouching = Boolean(data.isCrouching);
    me.isSprinting = Boolean(data.isSprinting);
    me.isSliding = Boolean(data.isSliding);
    me.lean = typeof data.lean === "number" ? data.lean : 0;
    me.isMoving = Boolean(data.isMoving);
    me.moveForward = typeof data.moveForward === "number" ? data.moveForward : 0;
    me.moveRight = typeof data.moveRight === "number" ? data.moveRight : 0;
    me.isAiming = Boolean(data.isAiming);
    if (typeof data.isGrounded === "boolean") {
      me.isGrounded = data.isGrounded;
      if (data.isGrounded) {
        me.jumpsUsed = 0;
      }
    }
    if (typeof data.lastDoubleJumpAt === "number" && data.lastDoubleJumpAt > 0) {
      me.lastDoubleJumpAt = data.lastDoubleJumpAt;
    }
  }

  public jumpLocal() {
    const me = this.entities.get(this.localId);
    if (!me || me.isDead) return;
    if (me.isGrounded) {
      me.vy = PHYSICS_CONFIG.JUMP_FORCE;
      me.isGrounded = false;
      me.jumpsUsed = 1;
    } else if (me.jumpsUsed < PHYSICS_CONFIG.MAX_JUMPS) {
      me.vy = PHYSICS_CONFIG.DOUBLE_JUMP_FORCE;
      me.jumpsUsed += 1;
      me.lastDoubleJumpAt = Date.now();
      this.syncToStore();
    }
  }

  public switchWeaponLocal(weaponId: WeaponId) {
    const me = this.entities.get(this.localId);
    if (!me || me.isDead || !WEAPONS[weaponId]) return;
    if (me.reloadTimeout) {
      clearTimeout(me.reloadTimeout);
      me.reloadTimeout = null;
    }
    me.isReloading = false;
    me.currentWeapon = weaponId;
    const effMag = this.getEffectiveStatsFor(me, weaponId).magSize;
    if (me.magazines[weaponId] > effMag || me.magazines[weaponId] <= 0) {
      me.magazines[weaponId] = effMag;
    }
    me.ammo = me.magazines[weaponId];
    this.syncToStore();
  }

  public reloadLocal(entityId = this.localId) {
    const p = this.entities.get(entityId);
    if (!p || p.isDead || p.isReloading) return;
    const eff = this.getEffectiveStatsFor(p, p.currentWeapon);
    if (p.ammo >= eff.magSize) return;
    const cfg = CHARACTERS[p.characterId] || CHARACTERS.striker;
    const isOverdrive =
      entityId === this.localId && useGameStore.getState().overdriveUntil > Date.now();
    const reloadMs = Math.round(eff.reloadTime * cfg.reloadMult * (isOverdrive ? 0.65 : 1.0));

    p.isReloading = true;
    if (entityId === this.localId) {
      soundEngine.playReload();
      this.syncToStore();
    }

    p.reloadTimeout = window.setTimeout(() => {
      const target = this.entities.get(entityId);
      if (target) {
        const latestEff = this.getEffectiveStatsFor(target, target.currentWeapon);
        target.magazines[target.currentWeapon] = latestEff.magSize;
        target.ammo = latestEff.magSize;
        target.isReloading = false;
        target.reloadTimeout = null;
        if (entityId === this.localId) this.syncToStore();
      }
    }, reloadMs);
  }

  public useArmorPlateLocal() {
    const me = this.entities.get(this.localId);
    const store = useGameStore.getState();
    if (!me || me.isDead) return;
    if ((me.shield || 0) >= 100) {
      store.showLootNotice("Armor already at 100%", "common");
      return;
    }
    if (!store.consumeArmorPlate()) {
      store.showLootNotice("No Armor Plates left — Loot supplies!", "common");
      return;
    }
    me.shield = Math.min(100, (me.shield || 0) + 50);
    me.shieldExpiresAt = 0; // Permanent ballistic plate until broken
    soundEngine.playArmorPlateInsert();
    store.showLootNotice(`Armor Plate Installed (+50 Shield)`, "rare");
    this.syncToStore();
  }

  public useMedkitLocal() {
    const me = this.entities.get(this.localId);
    const store = useGameStore.getState();
    if (!me || me.isDead) return;
    const maxHp = me.maxHealth || 100;
    if (me.health >= maxHp) {
      store.showLootNotice("Health already full", "common");
      return;
    }
    if (!store.consumeMedkit()) {
      store.showLootNotice("No Medkits left — Loot supplies!", "common");
      return;
    }
    me.health = Math.min(maxHp, me.health + 65);
    soundEngine.playMedkitUse();
    store.showLootNotice("Trauma Medkit Applied (+65 HP)", "rare");
    this.syncToStore();
  }

  public pickupNearbyLoot() {
    const me = this.entities.get(this.localId);
    const store = useGameStore.getState();
    const item = store.nearbyLoot;
    if (!me || me.isDead || !item || !item.active) return;

    const dist = Math.hypot(me.x - item.x, me.z - item.z);
    if (dist > 4.2) return;

    const settings = useSettingsStore.getState();
    item.active = false;
    store.setNearbyLoot(null);
    this.lastNearbyLootId = null;

    soundEngine.playLootPickup(item.rarity || "common");

    if (item.isAirdrop) {
      // Legendary Supply Drop: Full Armor + Medkits + Sniper/SCAR-H + 8x/Suppressor
      const rewardWpn: WeaponId = item.weaponId || "sniper";
      me.currentWeapon = rewardWpn;
      settings.setWeaponAttachment(rewardWpn, "scope", item.scopeId || "sniper_8x");
      settings.setWeaponAttachment(rewardWpn, "muzzle", "suppressor");
      settings.setWeaponAttachment(rewardWpn, "mag", "extended");
      const eff = this.getEffectiveStatsFor(me, rewardWpn);
      me.magazines[rewardWpn] = eff.magSize;
      me.ammo = eff.magSize;
      me.shield = 100;
      store.addInventoryItem("armor", 2);
      store.addInventoryItem("medkit", 1);
      store.showLootNotice(`AIRDROP: ${WEAPONS[rewardWpn].name} + 100 Armor + Plates!`, "legendary");
    } else if (item.isDeathBox) {
      store.addInventoryItem("armor", 1);
      store.addInventoryItem("medkit", 1);
      const eff = this.getEffectiveStatsFor(me, me.currentWeapon);
      me.ammo = eff.magSize;
      me.magazines[me.currentWeapon] = eff.magSize;
      store.showLootNotice(`LOOTED DEATH BOX: +1 Plate, +1 Medkit, Full Mag`, "epic");
    } else if (item.kind === "weapon" && item.weaponId) {
      me.currentWeapon = item.weaponId;
      const eff = this.getEffectiveStatsFor(me, item.weaponId);
      me.magazines[item.weaponId] = eff.magSize;
      me.ammo = eff.magSize;
      store.showLootNotice(`Equipped ${WEAPONS[item.weaponId].name}`, item.rarity || "rare");
    } else if (item.kind === "scope" && item.scopeId) {
      settings.setWeaponAttachment(me.currentWeapon, "scope", item.scopeId);
      soundEngine.playScopeZoom();
      store.showLootNotice(`Mounted ${SCOPES[item.scopeId].name} on ${WEAPONS[me.currentWeapon].shortName}`, item.rarity || "rare");
    } else if (item.kind === "attachment") {
      if (item.muzzleId) {
        settings.setWeaponAttachment(me.currentWeapon, "muzzle", item.muzzleId);
        store.showLootNotice(`Attached ${MUZZLES[item.muzzleId].name}`, item.rarity || "rare");
      } else if (item.gripId) {
        settings.setWeaponAttachment(me.currentWeapon, "grip", item.gripId);
        store.showLootNotice(`Attached ${GRIPS[item.gripId].name}`, item.rarity || "rare");
      } else if (item.magId) {
        settings.setWeaponAttachment(me.currentWeapon, "mag", item.magId);
        const eff = this.getEffectiveStatsFor(me, me.currentWeapon);
        me.magazines[me.currentWeapon] = eff.magSize;
        me.ammo = eff.magSize;
        store.showLootNotice(`Installed ${MAGS[item.magId].name}`, item.rarity || "rare");
      }
    } else if (item.kind === "armor") {
      store.addInventoryItem("armor", 1);
      if ((me.shield || 0) < 50) {
        me.shield = Math.min(100, (me.shield || 0) + 35);
      }
      store.showLootNotice("Picked up Armor Plate [B]", "rare");
    } else if (item.kind === "medkit") {
      store.addInventoryItem("medkit", 1);
      store.showLootNotice("Picked up Trauma Medkit [X]", "rare");
    } else if (item.kind === "ammo") {
      const eff = this.getEffectiveStatsFor(me, me.currentWeapon);
      me.ammo = eff.magSize;
      me.magazines[me.currentWeapon] = eff.magSize;
      store.showLootNotice("Ammo Refilled", "common");
    }

    // Standard arena modes respawn ground loot after 24s; BR keeps loot scarce (airdrops/deathboxes persist)
    if (this.mode !== "br" && !item.isAirdrop && !item.isDeathBox) {
      window.setTimeout(() => {
        item.active = true;
      }, 24000);
    }

    this.syncToStore();
  }

  public shootLocal(dir: {
    dirX: number;
    dirY: number;
    dirZ: number;
    muzzle?: { x: number; y: number; z: number };
  }) {
    this.performShoot(this.localId, dir);
  }

  public useSkillLocal(skillId: SkillId, dir: { dirX: number; dirY: number; dirZ: number }) {
    const p = this.entities.get(this.localId);
    if (!p || p.isDead) return;
    const skill = SKILLS[skillId];
    const now = Date.now();
    if (!skill || now < p.skillReadyAt[skillId]) return;

    const cfg = CHARACTERS[p.characterId] || CHARACTERS.striker;
    p.skillReadyAt[skillId] = now + Math.round(skill.cooldownMs * cfg.cooldownMult);
    soundEngine.playSkill(skillId);

    if (skillId === "dash") {
      p.dashUntil = now + skill.durationMs;
    } else if (skillId === "shield") {
      p.shield = Math.min(100, (p.shield || 0) + 45);
      p.shieldExpiresAt = now + skill.durationMs;
      p.health = Math.min(p.maxHealth || 100, p.health + 25);
    } else if (skillId === "grenade") {
      const map = MAPS[this.mapId];
      const ox = p.x;
      const oy = p.y + 0.6;
      const oz = p.z;
      const dist = Math.min(
        20,
        raycastMapBoxes(ox, oy, oz, dir.dirX, dir.dirY, dir.dirZ, 20, map),
      );
      const ex = ox + dir.dirX * Math.max(1.5, dist - 0.5);
      const ey = Math.max(0.5, oy + dir.dirY * Math.max(1.5, dist - 0.5));
      const ez = oz + dir.dirZ * Math.max(1.5, dist - 0.5);

      soundEngine.playExplosion();
      arenaPhysics.applyExplosionImpulse(ex, ey, ez, 7.5, 220);
      useGameStore.getState().addExplosion({
        id: Math.random().toString(36).slice(2),
        x: ex,
        y: ey,
        z: ez,
        radius: 7.5,
        color: skill.color,
        createdAt: Date.now(),
      });

      this.entities.forEach((target) => {
        if (target.isDead || target.id === p.id) return;
        if (this.mode !== "ffa" && this.mode !== "br" && target.team === p.team) return;
        const d = Math.hypot(target.x - ex, target.y - ey, target.z - ez);
        if (d <= 7.5) {
          const dmg = Math.round(75 * (1 - d / 8.5));
          if (dmg > 0) this.applyDamage(p, target, dmg, "Frag Grenade", false, undefined, Math.round(d));
        }
      });
    }
    this.syncToStore();
  }

  public switchTeamLocal(team: "red" | "blue") {
    if (this.mode !== "tdm" && this.mode !== "domination") return;
    const p = this.entities.get(this.localId);
    if (!p) return;
    p.team = team;
    p.color = team === "red" ? "#ef4444" : "#3b82f6";
    const sp = this.getRandomSpawn(team);
    p.x = sp.x;
    p.y = sp.y + 1.0;
    p.z = sp.z;
    p.vy = 0;
    p.isDead = false;
    p.health = p.maxHealth || 100;
    arenaPhysics.teleportPlayer(p.x, p.y, p.z);
    this.syncToStore();
  }

  private performShoot(
    shooterId: string,
    dir: {
      dirX: number;
      dirY: number;
      dirZ: number;
      muzzle?: { x: number; y: number; z: number };
    },
  ) {
    const shooter = this.entities.get(shooterId);
    if (!shooter || shooter.isDead || shooter.isReloading) return;

    const wpn = this.getEffectiveStatsFor(shooter, shooter.currentWeapon);
    const now = Date.now();
    if (now - shooter.lastShotTime < wpn.fireRate - 15) return;
    if (shooter.ammo <= 0) return;

    shooter.magazines[shooter.currentWeapon] -= 1;
    shooter.ammo = shooter.magazines[shooter.currentWeapon];
    shooter.lastShotTime = now;

    const map = MAPS[this.mapId];
    const eyeY =
      shooter.y +
      (shooter.isSliding
        ? PLAYER_CONFIG.SLIDE_EYE_OFFSET
        : shooter.isCrouching
          ? PLAYER_CONFIG.CROUCH_EYE_OFFSET
          : PLAYER_CONFIG.EYE_LEVEL_OFFSET);

    const pellets = wpn.pellets || 1;
    const spread = wpn.spread || 0;
    const hasCustomMuzzle =
      dir.muzzle &&
      Number.isFinite(dir.muzzle.x) &&
      Number.isFinite(dir.muzzle.y) &&
      Number.isFinite(dir.muzzle.z) &&
      Math.hypot(dir.muzzle.x - shooter.x, dir.muzzle.y - eyeY, dir.muzzle.z - shooter.z) < 2.5;
    const muzzlePos = hasCustomMuzzle && dir.muzzle
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

    const store = useGameStore.getState();

    if (shooterId !== this.localId) {
      const localEnt = this.entities.get(this.localId);
      if (localEnt) {
        const dist = Math.hypot(
          shooter.x - localEnt.x,
          shooter.y - localEnt.y,
          shooter.z - localEnt.z,
        );
        soundEngine.playSpatialWeaponFire(shooter.currentWeapon, dist, wpn.isSuppressed);
      }
      if (!wpn.isSuppressed) {
        store.addMuzzleFlash({
          id: Math.random().toString(36).slice(2),
          x: muzzlePos.x,
          y: muzzlePos.y,
          z: muzzlePos.z,
          color: wpn.tracerColor,
          createdAt: now,
        });
      }
    } else if (!wpn.isSuppressed) {
      store.addMuzzleFlash({
        id: Math.random().toString(36).slice(2),
        x: muzzlePos.x,
        y: muzzlePos.y,
        z: muzzlePos.z,
        color: wpn.tracerColor,
        createdAt: now,
      });
    }

    for (let i = 0; i < pellets; i++) {
      const sx =
        dir.dirX + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const sy =
        dir.dirY + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const sz =
        dir.dirZ + (i === 0 && pellets === 1 ? 0 : (Math.random() - 0.5) * spread * 2);
      const len = Math.hypot(sx, sy, sz) || 1;
      const dx = sx / len;
      const dy = sy / len;
      const dz = sz / len;

      const wallDist = raycastMapBoxes(
        shooter.x,
        eyeY,
        shooter.z,
        dx,
        dy,
        dz,
        wpn.range,
        map,
      );

      let bestDist = wallDist;
      let hitTarget: InternalSoloEntity | null = null;
      let hitY = eyeY;

      this.entities.forEach((other) => {
        if (other.id === shooterId || other.isDead) return;
        const toX = other.x - shooter.x;
        const toZ = other.z - shooter.z;
        const proj = toX * dx + toZ * dz;
        if (proj <= 0) return;
        const horizLen = Math.hypot(dx, dz) || 0.001;
        const t = proj / (horizLen * horizLen);
        if (t <= 0 || t >= bestDist) return;

        const px = shooter.x + dx * t;
        const py = eyeY + dy * t;
        const pz = shooter.z + dz * t;

        const radialDist = Math.hypot(px - other.x, pz - other.z);
        if (radialDist <= 0.62 && py >= other.y - 1.0 && py <= other.y + 1.05) {
          bestDist = t;
          hitTarget = other;
          hitY = py;
        }
      });

      if (i === 0 || i % 2 === 0) {
        store.addTracer({
          id: Math.random().toString(36).slice(2),
          from: [muzzlePos.x, muzzlePos.y, muzzlePos.z],
          to: [
            shooter.x + dx * bestDist,
            eyeY + dy * bestDist,
            shooter.z + dz * bestDist,
          ],
          color: wpn.isSuppressed ? "#94a3b8" : wpn.tracerColor,
          createdAt: Date.now(),
          hitSurface: bestDist < wpn.range,
        });
      }

      if (hitTarget) {
        const target = hitTarget as InternalSoloEntity;
        const isHeadshot = hitY >= target.y + 0.45;
        const dmg = computeDistanceDamage(shooter.currentWeapon, bestDist, isHeadshot);
        this.applyDamage(
          shooter,
          target,
          dmg,
          wpn.shortName,
          isHeadshot,
          hitY,
          Math.round(bestDist),
        );
      }
    }

    if (shooter.ammo <= 0) {
      if (shooterId !== this.localId || useSettingsStore.getState().autoReload) {
        this.reloadLocal(shooterId);
      }
    }
    if (shooterId === this.localId) {
      this.syncToStore();
    }
  }

  private applyDamage(
    attacker: InternalSoloEntity | null,
    target: InternalSoloEntity,
    dmg: number,
    weaponName: string,
    isHeadshot: boolean,
    hitY?: number,
    distanceMeters?: number,
  ) {
    if (target.isDead) return;
    if (
      attacker &&
      this.mode !== "ffa" &&
      this.mode !== "br" &&
      attacker.team === target.team &&
      attacker.id !== target.id
    ) {
      return;
    }

    let rem = dmg;
    const prevShield = target.shield || 0;
    if (prevShield > 0) {
      const absorbed = Math.min(prevShield, rem);
      target.shield = prevShield - absorbed;
      rem -= absorbed;
    }
    const isArmorBreak = prevShield > 0 && (target.shield || 0) <= 0;
    target.health -= rem;
    const killed = target.health <= 0;

    const store = useGameStore.getState();
    store.markEntityHit(target.id, {
      x: target.x,
      y: hitY ?? target.y + (isHeadshot ? 0.65 : 0.2),
      z: target.z,
      amount: dmg,
      isHeadshot,
      isArmorBreak,
      shooterId: attacker?.id,
      attackerX: attacker?.x,
      attackerZ: attacker?.z,
      distanceMeters,
      killed,
    });

    if (attacker && attacker.id === this.localId) {
      if (isArmorBreak) {
        soundEngine.playArmorCrack();
      } else {
        soundEngine.playHitMarker(isHeadshot);
      }
      store.triggerHitMarker(isHeadshot, isArmorBreak);
    }
    if (target.id === this.localId) {
      store.triggerDamageFlash();
    }

    if (killed) {
      target.health = 0;
      target.isDead = true;
      target.deaths += 1;

      if (attacker && attacker.id !== target.id) {
        attacker.kills += 1;
        if (this.mode === "tdm") {
          this.teamScores[attacker.team as "red" | "blue"] += 1;
        }
      }

      // Drop Enemy Death Box containing tactical gear & armor
      if (target.id !== this.localId) {
        this.lootPickups.push({
          id: `deathbox_${target.id}_${Date.now()}`,
          kind: "armor",
          rarity: "epic",
          label: `${target.name}'s Death Box`,
          weaponId: target.currentWeapon,
          x: target.x,
          y: Math.max(0.05, target.y - 1.0),
          z: target.z,
          active: true,
          isDeathBox: true,
        });
      }

      if (attacker && attacker.id === this.localId) {
        soundEngine.playKillConfirm();
        store.registerLocalKill(isHeadshot);
        const activated = store.chargeOverdrive(isHeadshot ? 52 : 36);
        if (activated) {
          soundEngine.playOverdriveSurge();
          store.showLootNotice("OVERDRIVE SURGE ACTIVE (+18% SPEED, FAST RELOAD)", "legendary");
        }
      }

      useGameStore.getState().addKillEvent({
        id: Math.random().toString(36).slice(2),
        shooter: attacker ? attacker.name : "Storm Zone",
        shooterId: attacker?.id,
        target: target.name,
        targetId: target.id,
        weapon: isHeadshot ? `${weaponName} (HS)` : weaponName,
        shooterTeam: attacker ? attacker.team : "none",
        targetTeam: target.team,
        isHeadshot,
        timestamp: Date.now(),
      });

      if (
        (this.mode === "tdm" &&
          attacker &&
          this.teamScores[attacker.team as "red" | "blue"] >= this.scoreLimit) ||
        (this.mode === "ffa" && attacker && attacker.kills >= this.scoreLimit)
      ) {
        this.endMatch();
        return;
      }

      if (this.mode === "br") {
        let alive = 0;
        this.entities.forEach((p) => {
          if (!p.isDead) alive++;
        });
        if (alive <= 1) {
          this.endMatch();
        }
        return;
      }

      window.setTimeout(() => {
        const p = this.entities.get(target.id);
        if (!p || this.matchState !== "playing") return;
        const cfg = CHARACTERS[p.characterId] || CHARACTERS.striker;
        p.health = cfg.maxHealth;
        p.shield = 0;
        p.isDead = false;
        const eff = this.getEffectiveStatsFor(p, p.currentWeapon);
        p.ammo = eff.magSize;
        p.magazines[p.currentWeapon] = eff.magSize;
        const sp = this.getRandomSpawn(p.team);
        p.x = sp.x;
        p.y = sp.y + 1.0;
        p.z = sp.z;
        p.vy = 0;
        p.jumpsUsed = 0;
        this.syncToStore();
      }, 2500);
    }
    this.syncToStore();
  }

  private spawnAirdrop() {
    if (!this.stormZone) return;
    this.airdropCounter += 1;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.max(8, this.stormZone.currentRadius * 0.55);
    const ax = this.stormZone.centerX + Math.cos(angle) * dist;
    const az = this.stormZone.centerZ + Math.sin(angle) * dist;
    const legendWeapons: WeaponId[] = ["sniper", "scarH", "kar98", "lmg"];
    const wId = legendWeapons[this.airdropCounter % legendWeapons.length];

    this.lootPickups.push({
      id: `airdrop_${this.airdropCounter}_${Date.now()}`,
      kind: "airdrop",
      rarity: "legendary",
      label: `Supply Airdrop (${WEAPONS[wId].shortName})`,
      weaponId: wId,
      scopeId: wId === "sniper" || wId === "kar98" ? "sniper_8x" : "acog_4x",
      x: ax,
      y: 0.05,
      z: az,
      active: true,
      isAirdrop: true,
    });

    soundEngine.playLootPickup("legendary");
    useGameStore.getState().showLootNotice(
      `SUPPLY AIRDROP INCOMING — Follow the Red Flare!`,
      "legendary",
    );
  }

  private tick() {
    if (this.matchState !== "playing") return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;

    const map = MAPS[this.mapId];
    const epochNow = Date.now();
    let closestLoot: LootPickup | null = null;
    let closestLootDist = 3.4;

    this.entities.forEach((p) => {
      if ((p.shield || 0) > 0 && p.shieldExpiresAt > 0 && epochNow > p.shieldExpiresAt) {
        p.shield = 0;
        p.shieldExpiresAt = 0;
      }

      if (p.isDead) return;

      const supportY = getSupportHeightAt(
        p.x,
        p.z,
        p.y - 1.0,
        PLAYER_CONFIG.RADIUS,
        map,
      );
      const minBodyY = supportY + 1.0;

      if (p.isBot) {
        p.vy += -30 * dt;
        p.y += p.vy * dt;

        if (p.y <= minBodyY) {
          p.y = minBodyY;
          p.vy = 0;
          p.isGrounded = true;
        } else {
          p.isGrounded = false;
        }
      }

      if (epochNow - p.lastJumpPadAt > 600) {
        for (const pad of map.jumpPads) {
          if (
            Math.hypot(p.x - pad.x, p.z - pad.z) <= pad.radius &&
            Math.abs(p.y - (pad.y + 1.0)) < 1.8
          ) {
            p.vy = pad.boostY;
            p.isGrounded = false;
            p.lastJumpPadAt = epochNow;
            if (p.id === this.localId) {
              soundEngine.playJumpPad();
              window.dispatchEvent(
                new CustomEvent("local-jump-pad", { detail: { boostY: pad.boostY } }),
              );
            }
            break;
          }
        }
      }

      // Loot scanning for local player (proximity [F] prompt + auto-ammo) and bot scavenging
      for (const item of this.lootPickups) {
        if (!item.active) continue;
        const d = Math.hypot(p.x - item.x, p.z - item.z);
        if (Math.abs(p.y - item.y) > 2.5) continue;

        if (p.id === this.localId) {
          // Auto-collect pure ammo packs when stepping right over them
          if (item.kind === "ammo" && !item.isAirdrop && !item.isDeathBox && d <= 1.6) {
            item.active = false;
            const eff = this.getEffectiveStatsFor(p, p.currentWeapon);
            p.ammo = eff.magSize;
            p.magazines[p.currentWeapon] = eff.magSize;
            soundEngine.playLootPickup("common");
            useGameStore.getState().showLootNotice("Ammo Refilled", "common");
            if (this.mode !== "br") {
              window.setTimeout(() => {
                item.active = true;
              }, 20000);
            }
            continue;
          }
          if (d < closestLootDist) {
            closestLootDist = d;
            closestLoot = item;
          }
        } else if (d <= 2.1 && !item.isAirdrop) {
          // Bots pick up medkits/armor/weapons naturally
          item.active = false;
          if (item.kind === "medkit") {
            p.health = Math.min(p.maxHealth || 100, p.health + 45);
          } else if (item.kind === "armor") {
            p.shield = Math.min(100, (p.shield || 0) + 40);
          } else if (item.kind === "weapon" && item.weaponId) {
            p.currentWeapon = item.weaponId;
            p.ammo = WEAPONS[item.weaponId].magSize;
            p.magazines[item.weaponId] = p.ammo;
          }
          if (this.mode !== "br") {
            window.setTimeout(() => {
              item.active = true;
            }, 22000);
          }
          break;
        }
      }

      if (p.isBot) {
        this.stepBot(p, dt, map, epochNow);
      }
    });

    // Update nearbyLoot in store only when changed
    const nextNearbyId = closestLoot ? (closestLoot as LootPickup).id : null;
    if (nextNearbyId !== this.lastNearbyLootId) {
      this.lastNearbyLootId = nextNearbyId;
      useGameStore.getState().setNearbyLoot(closestLoot);
    }

    if (now - this.lastStoreSyncAt >= 45) {
      this.lastStoreSyncAt = now;
      this.syncToStore();
    }
  }

  private stepBot(
    bot: InternalSoloEntity,
    dt: number,
    map: (typeof MAPS)[MapId],
    now: number,
  ) {
    let nearestEnemy: InternalSoloEntity | null = null;
    let nearestDist = map.floor.width > 160 ? 78 : 54;

    this.entities.forEach((other) => {
      if (other.id === bot.id || other.isDead) return;
      if (this.mode !== "ffa" && this.mode !== "br" && other.team === bot.team) return;
      const d = Math.hypot(other.x - bot.x, other.z - bot.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = other;
      }
    });

    let tx = bot.botTargetX ?? 0;
    let tz = bot.botTargetZ ?? 0;

    const storm = this.stormZone;
    const distFromCenter = storm
      ? Math.hypot(bot.x - storm.centerX, bot.z - storm.centerZ)
      : 0;

    if (storm && distFromCenter > storm.currentRadius * 0.82) {
      tx = storm.centerX + (Math.random() - 0.5) * 12;
      tz = storm.centerZ + (Math.random() - 0.5) * 12;
      bot.isSprinting = true;
    } else if (nearestEnemy) {
      bot.isSprinting = false;
      const enemy = nearestEnemy as InternalSoloEntity;
      const dx = enemy.x - bot.x;
      const dy = enemy.y + 0.4 - (bot.y + 0.5);
      const dz = enemy.z - bot.z;
      const horiz = Math.hypot(dx, dz) || 1;

      bot.yaw = Math.atan2(-dx, -dz);
      bot.pitch = Math.atan2(dy, horiz);

      if (horiz > 16) {
        tx = enemy.x;
        tz = enemy.z;
        bot.isSprinting = horiz > 32;
      } else {
        const s = Math.sin(now * 0.002 + bot.x) > 0 ? 1 : -1;
        tx = bot.x + (-dz / horiz) * 6.5 * s;
        tz = bot.z + (dx / horiz) * 6.5 * s;
      }

      if (now >= (bot.botNextShotAt ?? 0)) {
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
          const jitter = 0.055;
          this.performShoot(bot.id, {
            dirX: dx / len + (Math.random() - 0.5) * jitter,
            dirY: dy / len + (Math.random() - 0.5) * jitter,
            dirZ: dz / len + (Math.random() - 0.5) * jitter,
          });
        }
        bot.botNextShotAt = now + 290 + Math.random() * 340;
      }
    } else {
      bot.isSprinting = map.floor.width > 160;
      if (!bot.botNextWanderAt || now > bot.botNextWanderAt) {
        const roamSpan = storm ? Math.min(map.floor.width * 0.42, storm.currentRadius * 0.85) : map.floor.width * 0.34;
        const cx = storm ? storm.centerX : 0;
        const cz = storm ? storm.centerZ : 0;
        bot.botTargetX = cx + (Math.random() - 0.5) * roamSpan * 2;
        bot.botTargetZ = cz + (Math.random() - 0.5) * roamSpan * 2;
        bot.botNextWanderAt = now + 3500 + Math.random() * 3000;
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
    bot.isAiming = Boolean(nearestEnemy);
    if (mLen > 0.6) {
      const cfg = CHARACTERS[bot.characterId] || CHARACTERS.striker;
      const baseSpd = bot.isSprinting
        ? PHYSICS_CONFIG.SPRINT_SPEED
        : PHYSICS_CONFIG.WALK_SPEED;
      const speed = baseSpd * cfg.speedMult * dt;
      const dirX = mdx / mLen;
      const dirZ = mdz / mLen;
      const fwdX = -Math.sin(bot.yaw);
      const fwdZ = -Math.cos(bot.yaw);
      const rgtX = Math.cos(bot.yaw);
      const rgtZ = -Math.sin(bot.yaw);
      bot.moveForward = dirX * fwdX + dirZ * fwdZ;
      bot.moveRight = dirX * rgtX + dirZ * rgtZ;

      const resolved = resolveCylinderBoxCollisions(
        bot.x + dirX * speed,
        bot.y,
        bot.z + dirZ * speed,
        PLAYER_CONFIG.RADIUS,
        map,
      );
      bot.x = resolved.x;
      bot.z = resolved.z;
      bot.isMoving = true;
    } else {
      bot.isMoving = false;
      bot.isSprinting = false;
      bot.moveForward = 0;
      bot.moveRight = 0;
    }
  }

  private tickSecond() {
    if (this.matchState !== "playing") return;
    this.elapsedSeconds += 1;

    if (this.mode === "domination") {
      const map = MAPS[this.mapId];
      const zone = map.captureZone;
      let redIn = 0;
      let blueIn = 0;
      this.entities.forEach((p) => {
        if (!p.isDead && Math.hypot(p.x - zone.x, p.z - zone.z) <= zone.radius) {
          if (p.team === "red") redIn++;
          if (p.team === "blue") blueIn++;
        }
      });

      if (redIn > blueIn) {
        this.dominationProgress = Math.max(-100, this.dominationProgress - 20);
        if (this.dominationProgress <= -50) this.dominationOwner = "red";
      } else if (blueIn > redIn) {
        this.dominationProgress = Math.min(100, this.dominationProgress + 20);
        if (this.dominationProgress >= 50) this.dominationOwner = "blue";
      }

      if (this.dominationOwner === "red") this.teamScores.red += 2;
      if (this.dominationOwner === "blue") this.teamScores.blue += 2;

      if (
        this.teamScores.red >= this.scoreLimit ||
        this.teamScores.blue >= this.scoreLimit
      ) {
        this.endMatch();
        return;
      }
    }

    if (this.mode === "br" && this.stormZone) {
      const mapSpan = MAPS[this.mapId].floor.width;
      const storm = this.stormZone;
      const shrinkPerSec = Math.max(0.35, mapSpan / 320);
      storm.currentRadius = Math.max(storm.targetRadius, storm.currentRadius - shrinkPerSec);
      storm.phase =
        storm.currentRadius < mapSpan * 0.16
          ? 3
          : storm.currentRadius < mapSpan * 0.34
            ? 2
            : 1;
      storm.dps = storm.phase === 3 ? 12 : storm.phase === 2 ? 8 : 5;

      // Drop a legendary Supply Airdrop every 45s in BR
      if (this.elapsedSeconds > 10 && this.elapsedSeconds % 45 === 0) {
        this.spawnAirdrop();
      }

      this.entities.forEach((p) => {
        if (p.isDead) return;
        const d = Math.hypot(p.x - storm.centerX, p.z - storm.centerZ);
        if (d > storm.currentRadius) {
          this.applyDamage(null, p, storm.dps, "Storm Zone", false);
        }
      });

      let alive = 0;
      this.entities.forEach((p) => {
        if (!p.isDead) alive++;
      });
      if (alive <= 1) {
        this.endMatch();
        return;
      }
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - 1);
    if (this.timeRemaining <= 0) {
      this.endMatch();
    }
  }

  private endMatch() {
    if (this.matchState === "ended") return;
    this.matchState = "ended";
    this.syncToStore();

    const authState = useAuthStore.getState();
    const me = this.entities.get(this.localId);
    if (me) {
      const allEnts = Array.from(this.entities.values());
      const topKills = Math.max(...allEnts.map((e) => e.kills), 0);
      const mvpEntity = [...allEnts].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0];
      const didWin =
        this.mode === "br"
          ? !me.isDead
          : this.mode === "ffa"
            ? me.kills >= topKills && me.kills > 0
            : this.teamScores.blue >= this.teamScores.red;

      const scoreText =
        this.mode === "tdm" || this.mode === "domination"
          ? `BLUE ${this.teamScores.blue} - ${this.teamScores.red} RED`
          : `${me.kills} KILLS`;

      recordMatchHistory({
        playMode: "solo",
        mode: this.mode,
        mapId: this.mapId,
        roomName: this.mode === "br" ? "Los Verdant Royale" : "Solo Combat Arena",
        playerName: me.name,
        kills: me.kills,
        deaths: me.deaths,
        didWin,
        mvpName: mvpEntity?.name || me.name,
        mvpKills: mvpEntity?.kills ?? me.kills,
        scoreText,
      });

      if (authState.profile) {
        void recordMatchStats(authState.profile.uid, me.kills, me.deaths, didWin).then(
          (updated) => {
            if (updated) authState.setProfile(updated);
          },
        );
      }
    }

    window.setTimeout(() => {
      if (this.loopTimer === null) return;
      this.matchState = "playing";
      this.elapsedSeconds = 0;
      this.timeRemaining =
        this.mode === "br" ? WINNING_RULES.brMatchSeconds : WINNING_RULES.defaultMatchSeconds;
      this.teamScores = { red: 0, blue: 0 };
      this.dominationOwner = "none";
      this.dominationProgress = 0;
      const mapSpan = MAPS[this.mapId].floor.width;
      this.stormZone =
        this.mode === "br"
          ? {
              centerX: 0,
              centerZ: 0,
              currentRadius: Math.round(mapSpan * 0.56),
              targetRadius: 12,
              phase: 1,
              dps: 5,
            }
          : null;
      this.lootPickups = createLootForMap(this.mapId);
      this.entities.forEach((p) => {
        p.kills = 0;
        p.deaths = 0;
        p.health = p.maxHealth || 100;
        p.shield = this.mode === "br" ? 50 : 0;
        p.isDead = false;
        const sp = this.getRandomSpawn(p.team);
        p.x = sp.x;
        p.y = sp.y + 1.0;
        p.z = sp.z;
      });
      this.syncToStore();
    }, 5000);
  }

  private syncToStore() {
    const out: Record<string, PlayerState> = {};
    this.entities.forEach((e, id) => {
      out[id] = {
        id: e.id,
        name: e.name,
        color: e.color,
        team: e.team,
        characterId: e.characterId,
        skinId: e.skinId,
        isBot: e.isBot,
        x: e.x,
        y: e.y,
        z: e.z,
        yaw: e.yaw,
        pitch: e.pitch,
        isCrouching: e.isCrouching,
        isSprinting: e.isSprinting,
        isSliding: e.isSliding,
        lean: e.lean || 0,
        isMoving: e.isMoving,
        isGrounded: e.isGrounded,
        moveForward: e.moveForward ?? 0,
        moveRight: e.moveRight ?? 0,
        isAiming: Boolean(e.isAiming),
        health: e.health,
        maxHealth: e.maxHealth,
        shield: e.shield,
        isDead: e.isDead,
        kills: e.kills,
        deaths: e.deaths,
        currentWeapon: e.currentWeapon,
        ammo: e.ammo,
        isReloading: e.isReloading,
        lastShotTime: e.lastShotTime,
        skillReadyAt: { ...e.skillReadyAt },
        dashUntil: e.dashUntil,
        lastDoubleJumpAt: e.lastDoubleJumpAt || 0,
      };
    });

    useGameStore.getState().setPlayers(out);
    useGameStore.getState().updateMatchData({
      matchState: this.matchState,
      timeRemaining: this.timeRemaining,
      teamScores: { ...this.teamScores },
      dominationOwner: this.dominationOwner,
      dominationProgress: this.dominationProgress,
      stormZone: this.stormZone ? { ...this.stormZone } : null,
      lootPickups: [...this.lootPickups],
    });
  }
}

export const soloEngine = new SoloGameEngine();
