export type WeaponId =
  | "assaultRifle"
  | "ak74m"
  | "scarH"
  | "smg"
  | "p90"
  | "shotgun"
  | "burstRifle"
  | "sniper"
  | "kar98"
  | "pistol"
  | "dmr"
  | "lmg"
  | "vector"
  | "revolver";

export type FireMode = "auto" | "semi" | "burst";

export type ScopeId =
  | "iron"
  | "red_dot"
  | "holo"
  | "prism_2x"
  | "acog_4x"
  | "sniper_8x";

export type MuzzleId = "standard" | "compensator" | "suppressor" | "heavy_brake";
export type GripId = "standard" | "vertical" | "angled" | "laser_sight";
export type MagId = "standard" | "extended" | "fast_mag";

export interface WeaponAttachments {
  scope: ScopeId;
  muzzle: MuzzleId;
  grip: GripId;
  mag: MagId;
}

export interface ScopeSpec {
  id: ScopeId;
  name: string;
  shortName: string;
  zoom: number;
  adsSpeedMult: number;
  reticleStyle: "iron" | "red_dot" | "holo" | "prism" | "acog" | "sniper";
  accentColor: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface MuzzleSpec {
  id: MuzzleId;
  name: string;
  shortName: string;
  recoilMult: number;
  spreadMult: number;
  rangeMult: number;
  isSuppressed: boolean;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface GripSpec {
  id: GripId;
  name: string;
  shortName: string;
  recoilMult: number;
  spreadMult: number;
  moveSpeedMult: number;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface MagSpec {
  id: MagId;
  name: string;
  shortName: string;
  magMult: number;
  reloadMult: number;
  moveSpeedMult: number;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const SCOPE_ORDER: ScopeId[] = [
  "iron",
  "red_dot",
  "holo",
  "prism_2x",
  "acog_4x",
  "sniper_8x",
];

export const SCOPES: Record<ScopeId, ScopeSpec> = {
  iron: {
    id: "iron",
    name: "Tactical Iron Sights",
    shortName: "IRON 1.2x",
    zoom: 1.25,
    adsSpeedMult: 1.15,
    reticleStyle: "iron",
    accentColor: "#e2e8f0",
    description: "Fastest ADS snap with unobstructed close-range awareness.",
    rarity: "common",
  },
  red_dot: {
    id: "red_dot",
    name: "Coyote Red Dot 1.45x",
    shortName: "RED DOT",
    zoom: 1.45,
    adsSpeedMult: 1.08,
    reticleStyle: "red_dot",
    accentColor: "#ef4444",
    description: "Crisp reflex sight with high-contrast 2 MOA crimson dot.",
    rarity: "common",
  },
  holo: {
    id: "holo",
    name: "EOTech EXPS Holo 1.75x",
    shortName: "HOLO 1.7x",
    zoom: 1.75,
    adsSpeedMult: 1.0,
    reticleStyle: "holo",
    accentColor: "#22d3ee",
    description: "Holographic ring-and-dot optic ideal for aggressive mid-range tracking.",
    rarity: "rare",
  },
  prism_2x: {
    id: "prism_2x",
    name: "Vortex 2.5x Prism",
    shortName: "2.5x PRISM",
    zoom: 2.5,
    adsSpeedMult: 0.94,
    reticleStyle: "prism",
    accentColor: "#f59e0b",
    description: "Illuminated amber horseshoe prism built for medium battle-royale duels.",
    rarity: "rare",
  },
  acog_4x: {
    id: "acog_4x",
    name: "Trijicon 4x ACOG",
    shortName: "4x ACOG",
    zoom: 4.0,
    adsSpeedMult: 0.86,
    reticleStyle: "acog",
    accentColor: "#10b981",
    description: "Ballistic BDC chevron optic with stadia range markings out to 250m.",
    rarity: "epic",
  },
  sniper_8x: {
    id: "sniper_8x",
    name: "Nightforce 8x Variable",
    shortName: "8x SNIPER",
    zoom: 7.2,
    adsSpeedMult: 0.78,
    reticleStyle: "sniper",
    accentColor: "#f43f5e",
    description: "Extreme long-range mil-dot telescopic scope with rangefinder readout.",
    rarity: "legendary",
  },
};

export const MUZZLE_ORDER: MuzzleId[] = [
  "standard",
  "compensator",
  "suppressor",
  "heavy_brake",
];

export const MUZZLES: Record<MuzzleId, MuzzleSpec> = {
  standard: {
    id: "standard",
    name: "Factory Flash Hider",
    shortName: "STD",
    recoilMult: 1.0,
    spreadMult: 1.0,
    rangeMult: 1.0,
    isSuppressed: false,
    description: "Balanced factory muzzle device.",
    rarity: "common",
  },
  compensator: {
    id: "compensator",
    name: "Tactical Compensator",
    shortName: "COMP",
    recoilMult: 0.76,
    spreadMult: 0.88,
    rangeMult: 1.02,
    isSuppressed: false,
    description: "Vents gases upward to sharply tame vertical recoil climb.",
    rarity: "rare",
  },
  suppressor: {
    id: "suppressor",
    name: "Monolithic Suppressor",
    shortName: "SUPP",
    recoilMult: 0.88,
    spreadMult: 0.9,
    rangeMult: 1.12,
    isSuppressed: true,
    description: "Silences acoustic signature, masks muzzle flash, and boosts velocity.",
    rarity: "epic",
  },
  heavy_brake: {
    id: "heavy_brake",
    name: "Titan Muzzle Brake",
    shortName: "BRAKE",
    recoilMult: 0.68,
    spreadMult: 0.84,
    rangeMult: 1.06,
    isSuppressed: false,
    description: "Maximum full-auto stabilization for heavy rifle control.",
    rarity: "legendary",
  },
};

export const GRIP_ORDER: GripId[] = [
  "standard",
  "vertical",
  "angled",
  "laser_sight",
];

export const GRIPS: Record<GripId, GripSpec> = {
  standard: {
    id: "standard",
    name: "Factory Handguard",
    shortName: "STD",
    recoilMult: 1.0,
    spreadMult: 1.0,
    moveSpeedMult: 1.0,
    description: "Clean stock rail profile.",
    rarity: "common",
  },
  vertical: {
    id: "vertical",
    name: "Vertical Foregrip",
    shortName: "VERT",
    recoilMult: 0.8,
    spreadMult: 0.9,
    moveSpeedMult: 0.98,
    description: "Reduces sustained fire climb and stabilizes bursts.",
    rarity: "rare",
  },
  angled: {
    id: "angled",
    name: "Angled Commando Grip",
    shortName: "ANGLED",
    recoilMult: 0.88,
    spreadMult: 0.92,
    moveSpeedMult: 1.04,
    description: "Snappy strafing mobility and tighter horizontal recoil.",
    rarity: "epic",
  },
  laser_sight: {
    id: "laser_sight",
    name: "PEQ-15 Tactical Laser",
    shortName: "LASER",
    recoilMult: 0.92,
    spreadMult: 0.66,
    moveSpeedMult: 1.02,
    description: "Projects visible tactical laser beam for razor-tight hipfire accuracy.",
    rarity: "legendary",
  },
};

export const MAG_ORDER: MagId[] = ["standard", "extended", "fast_mag"];

export const MAGS: Record<MagId, MagSpec> = {
  standard: {
    id: "standard",
    name: "Standard Magazine",
    shortName: "STD",
    magMult: 1.0,
    reloadMult: 1.0,
    moveSpeedMult: 1.0,
    description: "Standard military-issue magazine.",
    rarity: "common",
  },
  extended: {
    id: "extended",
    name: "Extended Drum / High-Cap",
    shortName: "EXT MAG",
    magMult: 1.45,
    reloadMult: 1.12,
    moveSpeedMult: 0.96,
    description: "+45% magazine capacity for wiping entire squads without reloading.",
    rarity: "epic",
  },
  fast_mag: {
    id: "fast_mag",
    name: "Sleight-of-Hand Fast Mag",
    shortName: "FAST MAG",
    magMult: 1.15,
    reloadMult: 0.72,
    moveSpeedMult: 1.02,
    description: "28% faster tactical reloads with flared magwell.",
    rarity: "rare",
  },
};

export interface WeaponStats {
  id: WeaponId;
  slot: number;
  name: string;
  shortName: string;
  category: string;
  description: string;
  damage: number;
  headshotMult: number;
  fireRate: number; // ms between shots
  magSize: number;
  reloadTime: number; // ms
  range: number;
  mode: FireMode;
  pellets: number;
  spread: number; // radians
  adsZoom: number; // FOV divisor (1.25 to 7.2)
  moveSpeedMult: number;
  recoilKick: number;
  accentColor: string;
  tracerColor: string;
  defaultScope: ScopeId;
}

export const WEAPON_ORDER: WeaponId[] = [
  "assaultRifle",
  "ak74m",
  "scarH",
  "smg",
  "p90",
  "shotgun",
  "burstRifle",
  "sniper",
  "kar98",
  "pistol",
  "dmr",
  "lmg",
  "vector",
  "revolver",
];

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  assaultRifle: {
    id: "assaultRifle",
    slot: 1,
    name: "M4A1 VX-47 Striker",
    shortName: "M4A1",
    category: "Assault Rifle",
    description: "Modular 5.56mm NATO carbine with crisp full-auto control and versatile optics.",
    damage: 25,
    headshotMult: 1.65,
    fireRate: 98,
    magSize: 30,
    reloadTime: 1750,
    range: 185,
    mode: "auto",
    pellets: 1,
    spread: 0.01,
    adsZoom: 1.75,
    moveSpeedMult: 0.96,
    recoilKick: 0,
    accentColor: "#f59e0b",
    tracerColor: "#fcd34d",
    defaultScope: "holo",
  },
  ak74m: {
    id: "ak74m",
    slot: 2,
    name: "AK-74M Zenith",
    shortName: "AK-74M",
    category: "Assault Rifle",
    description: "Hard-hitting 5.45mm Kalashnikov modernized with Zenitco rails and heavy punch.",
    damage: 31,
    headshotMult: 1.75,
    fireRate: 112,
    magSize: 30,
    reloadTime: 1920,
    range: 195,
    mode: "auto",
    pellets: 1,
    spread: 0.013,
    adsZoom: 1.45,
    moveSpeedMult: 0.94,
    recoilKick: 0,
    accentColor: "#ef4444",
    tracerColor: "#fca5a5",
    defaultScope: "red_dot",
  },
  scarH: {
    id: "scarH",
    slot: 3,
    name: "SCAR-H Battle Rifle",
    shortName: "SCAR-H",
    category: "Battle Rifle",
    description: "7.62x51mm heavy battle rifle built for mid-to-long Battle Royale firefights.",
    damage: 36,
    headshotMult: 1.85,
    fireRate: 128,
    magSize: 24,
    reloadTime: 2050,
    range: 230,
    mode: "auto",
    pellets: 1,
    spread: 0.0085,
    adsZoom: 2.5,
    moveSpeedMult: 0.91,
    recoilKick: 0,
    accentColor: "#d97706",
    tracerColor: "#fde68a",
    defaultScope: "prism_2x",
  },
  smg: {
    id: "smg",
    slot: 4,
    name: "Kobra-9 MPX",
    shortName: "MPX-9",
    category: "Submachine Gun",
    description: "Ultra-high RPM CQB shredder built for aggressive indoor pushes.",
    damage: 18,
    headshotMult: 1.55,
    fireRate: 68,
    magSize: 40,
    reloadTime: 1420,
    range: 105,
    mode: "auto",
    pellets: 1,
    spread: 0.021,
    adsZoom: 1.45,
    moveSpeedMult: 1.08,
    recoilKick: 0,
    accentColor: "#22d3ee",
    tracerColor: "#67e8f9",
    defaultScope: "red_dot",
  },
  p90: {
    id: "p90",
    slot: 5,
    name: "FN P90 Tactical",
    shortName: "P90",
    category: "High-Cap PDW",
    description: "50-round bullpup 5.7mm PDW with blistering velocity and ultra-low recoil.",
    damage: 20,
    headshotMult: 1.6,
    fireRate: 66,
    magSize: 50,
    reloadTime: 1850,
    range: 125,
    mode: "auto",
    pellets: 1,
    spread: 0.015,
    adsZoom: 1.75,
    moveSpeedMult: 1.06,
    recoilKick: 0,
    accentColor: "#38bdf8",
    tracerColor: "#bae6fd",
    defaultScope: "holo",
  },
  shotgun: {
    id: "shotgun",
    slot: 6,
    name: "M880 Breacher",
    shortName: "M880",
    category: "Tactical Shotgun",
    description: "Heavy 7-pellet pump breacher devastating in tight interiors.",
    damage: 21,
    headshotMult: 1.45,
    fireRate: 690,
    magSize: 8,
    reloadTime: 2050,
    range: 56,
    mode: "semi",
    pellets: 7,
    spread: 0.06,
    adsZoom: 1.25,
    moveSpeedMult: 0.94,
    recoilKick: 0,
    accentColor: "#f97316",
    tracerColor: "#fdba74",
    defaultScope: "iron",
  },
  burstRifle: {
    id: "burstRifle",
    slot: 7,
    name: "Helios-3 FAMAS",
    shortName: "FAMAS",
    category: "Marksman Burst Rifle",
    description: "Precision 3-round burst bullpup rifle calibrated for mid-to-long duels.",
    damage: 29,
    headshotMult: 1.85,
    fireRate: 88,
    magSize: 27,
    reloadTime: 1900,
    range: 205,
    mode: "burst",
    pellets: 1,
    spread: 0.0048,
    adsZoom: 2.5,
    moveSpeedMult: 0.93,
    recoilKick: 0,
    accentColor: "#a855f7",
    tracerColor: "#d8b4fe",
    defaultScope: "prism_2x",
  },
  sniper: {
    id: "sniper",
    slot: 8,
    name: "AWP-X Spectre",
    shortName: "AWP-X",
    category: "Anti-Materiel Sniper",
    description: ".338 Lapua bolt-action sniper rifle capable of one-shot headshots across the valley.",
    damage: 98,
    headshotMult: 2.3,
    fireRate: 1120,
    magSize: 5,
    reloadTime: 2350,
    range: 340,
    mode: "semi",
    pellets: 1,
    spread: 0.0006,
    adsZoom: 7.2,
    moveSpeedMult: 0.85,
    recoilKick: 0,
    accentColor: "#f43f5e",
    tracerColor: "#fda4af",
    defaultScope: "sniper_8x",
  },
  kar98: {
    id: "kar98",
    slot: 9,
    name: "Kar98k Marksman",
    shortName: "KAR98K",
    category: "Bolt Marksman",
    description: "Agile 7.92mm quick-scope bolt rifle prized by Battle Royale sharpshooters.",
    damage: 82,
    headshotMult: 2.4,
    fireRate: 890,
    magSize: 5,
    reloadTime: 2000,
    range: 300,
    mode: "semi",
    pellets: 1,
    spread: 0.0009,
    adsZoom: 4.0,
    moveSpeedMult: 0.92,
    recoilKick: 0,
    accentColor: "#14b8a6",
    tracerColor: "#99f6e4",
    defaultScope: "acog_4x",
  },
  pistol: {
    id: "pistol",
    slot: 0,
    name: "Deagle-50 Tac",
    shortName: "DEAGLE",
    category: "Heavy Sidearm",
    description: "High-caliber .50 AE sidearm with crisp reflex sights.",
    damage: 40,
    headshotMult: 1.9,
    fireRate: 285,
    magSize: 12,
    reloadTime: 1120,
    range: 100,
    mode: "semi",
    pellets: 1,
    spread: 0.0075,
    adsZoom: 1.45,
    moveSpeedMult: 1.07,
    recoilKick: 0,
    accentColor: "#eab308",
    tracerColor: "#fde047",
    defaultScope: "red_dot",
  },
  dmr: {
    id: "dmr",
    slot: 11,
    name: "MK-14 EBR",
    shortName: "MK-14",
    category: "Designated Marksman",
    description: "Semi-auto 7.62mm designated marksman rifle with 4x ACOG chevron optic.",
    damage: 49,
    headshotMult: 2.05,
    fireRate: 325,
    magSize: 20,
    reloadTime: 1950,
    range: 265,
    mode: "semi",
    pellets: 1,
    spread: 0.0018,
    adsZoom: 4.0,
    moveSpeedMult: 0.91,
    recoilKick: 0,
    accentColor: "#10b981",
    tracerColor: "#6ee7b7",
    defaultScope: "acog_4x",
  },
  lmg: {
    id: "lmg",
    slot: 12,
    name: "M249 Vulcan",
    shortName: "M249",
    category: "Light Machine Gun",
    description: "85-round belt-fed squad automatic weapon built for relentless suppression.",
    damage: 24,
    headshotMult: 1.55,
    fireRate: 90,
    magSize: 85,
    reloadTime: 2800,
    range: 195,
    mode: "auto",
    pellets: 1,
    spread: 0.017,
    adsZoom: 1.75,
    moveSpeedMult: 0.84,
    recoilKick: 0,
    accentColor: "#f59e0b",
    tracerColor: "#fcd34d",
    defaultScope: "holo",
  },
  vector: {
    id: "vector",
    slot: 13,
    name: "Vector-45 Kriss",
    shortName: "VECTOR",
    category: "Suppressed PDW",
    description: "Recoil-mitigated .45 ACP suppressed carbine with blistering 960 RPM output.",
    damage: 19,
    headshotMult: 1.6,
    fireRate: 62,
    magSize: 33,
    reloadTime: 1320,
    range: 112,
    mode: "auto",
    pellets: 1,
    spread: 0.013,
    adsZoom: 1.45,
    moveSpeedMult: 1.07,
    recoilKick: 0,
    accentColor: "#06b6d4",
    tracerColor: "#a5f3fc",
    defaultScope: "red_dot",
  },
  revolver: {
    id: "revolver",
    slot: 14,
    name: "Magnum-44 Python",
    shortName: "MAGNUM",
    category: "Heavy Revolver",
    description: "Precision 6-chamber .44 Magnum wheelgun capable of devastating two-tap precision.",
    damage: 60,
    headshotMult: 2.2,
    fireRate: 425,
    magSize: 6,
    reloadTime: 1500,
    range: 120,
    mode: "semi",
    pellets: 1,
    spread: 0.0045,
    adsZoom: 1.45,
    moveSpeedMult: 1.05,
    recoilKick: 0,
    accentColor: "#ec4899",
    tracerColor: "#f9a8d4",
    defaultScope: "red_dot",
  },
};

export function getDefaultAttachments(weaponId: WeaponId): WeaponAttachments {
  const wpn = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  return {
    scope: wpn.defaultScope,
    muzzle: weaponId === "vector" ? "suppressor" : "standard",
    grip: "standard",
    mag: "standard",
  };
}

export interface EffectiveWeaponStats extends WeaponStats {
  attachments: WeaponAttachments;
  isSuppressed: boolean;
  adsSpeedMult: number;
  scopeSpec: ScopeSpec;
}

export function computeEffectiveWeaponStats(
  weaponId: WeaponId,
  custom?: Partial<WeaponAttachments>,
): EffectiveWeaponStats {
  const base = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  const defaults = getDefaultAttachments(weaponId);
  const attachments: WeaponAttachments = {
    scope: custom?.scope ?? defaults.scope,
    muzzle: custom?.muzzle ?? defaults.muzzle,
    grip: custom?.grip ?? defaults.grip,
    mag: custom?.mag ?? defaults.mag,
  };

  const scopeSpec = SCOPES[attachments.scope] || SCOPES.holo;
  const muzzleSpec = MUZZLES[attachments.muzzle] || MUZZLES.standard;
  const gripSpec = GRIPS[attachments.grip] || GRIPS.standard;
  const magSpec = MAGS[attachments.mag] || MAGS.standard;

  return {
    ...base,
    attachments,
    scopeSpec,
    adsZoom: scopeSpec.zoom,
    adsSpeedMult: scopeSpec.adsSpeedMult,
    recoilKick: 0,
    spread: Number((base.spread * muzzleSpec.spreadMult * gripSpec.spreadMult).toFixed(5)),
    range: Math.round(base.range * muzzleSpec.rangeMult),
    magSize: Math.max(base.magSize, Math.round(base.magSize * magSpec.magMult)),
    reloadTime: Math.round(base.reloadTime * magSpec.reloadMult),
    moveSpeedMult: Number(
      (base.moveSpeedMult * gripSpec.moveSpeedMult * magSpec.moveSpeedMult).toFixed(3),
    ),
    isSuppressed: muzzleSpec.isSuppressed,
  };
}

export const WEAPON_BARREL_LENGTH: Record<WeaponId, number> = {
  assaultRifle: 0.92,
  ak74m: 0.96,
  scarH: 1.0,
  smg: 0.64,
  p90: 0.62,
  shotgun: 0.94,
  burstRifle: 0.88,
  sniper: 1.22,
  kar98: 1.14,
  pistol: 0.44,
  dmr: 1.06,
  lmg: 1.02,
  vector: 0.72,
  revolver: 0.48,
};

export function createInitialMagazines(
  customAttachments?: Partial<Record<WeaponId, Partial<WeaponAttachments>>>,
): Record<WeaponId, number> {
  const result = {} as Record<WeaponId, number>;
  for (const id of WEAPON_ORDER) {
    result[id] = computeEffectiveWeaponStats(id, customAttachments?.[id]).magSize;
  }
  return result;
}

export function computeMuzzleWorldPos(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  weaponId: WeaponId,
  isCrouching = false,
  isAiming = false,
): { x: number; y: number; z: number } {
  const cosPitch = Math.cos(pitch);
  const fx = -Math.sin(yaw) * cosPitch;
  const fy = Math.sin(pitch);
  const fz = -Math.cos(yaw) * cosPitch;

  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);

  const eyeOffset = isCrouching ? 0.14 : 0.48;
  const rightOffset = isAiming ? 0.16 : 0.24;
  const vertOffset = isAiming ? -0.05 : -0.1;
  const barrelLen = WEAPON_BARREL_LENGTH[weaponId] ?? 0.9;

  return {
    x: x + rx * rightOffset + fx * barrelLen,
    y: y + eyeOffset + vertOffset + fy * barrelLen,
    z: z + rz * rightOffset + fz * barrelLen,
  };
}

export function computeDistanceDamage(
  weaponId: WeaponId,
  distanceMeters: number,
  isHeadshot: boolean,
): number {
  const stats = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  const d = Math.max(0, distanceMeters);
  let mult = 1.0;

  if (weaponId === "sniper" || weaponId === "kar98") {
    if (d <= 10) {
      mult = weaponId === "kar98" ? 0.76 : 0.58;
    } else if (d <= 36) {
      mult = 0.65 + ((d - 10) / 26) * 0.45;
    } else {
      mult = Math.min(1.34, 1.1 + ((d - 36) / 70) * 0.24);
    }
  } else if (weaponId === "dmr" || weaponId === "scarH") {
    if (d <= 10) {
      mult = 0.9;
    } else if (d <= 45) {
      mult = 0.9 + ((d - 10) / 35) * 0.24;
    } else {
      mult = Math.max(0.92, 1.14 - ((d - 45) / 130) * 0.22);
    }
  } else if (weaponId === "burstRifle") {
    if (d <= 8) {
      mult = 0.82;
    } else if (d <= 30) {
      mult = 0.82 + ((d - 8) / 22) * 0.3;
    } else if (d <= 85) {
      mult = 1.12;
    } else {
      mult = Math.max(0.88, 1.12 - ((d - 85) / 90) * 0.24);
    }
  } else if (weaponId === "shotgun") {
    if (d <= 9) {
      mult = 1.24;
    } else if (d <= 22) {
      mult = 1.24 - ((d - 9) / 13) * 0.72;
    } else {
      mult = Math.max(0.22, 0.52 - ((d - 22) / 28) * 0.3);
    }
  } else if (
    weaponId === "smg" ||
    weaponId === "p90" ||
    weaponId === "vector" ||
    weaponId === "pistol"
  ) {
    if (d <= 14) {
      mult = 1.15;
    } else if (d <= 40) {
      mult = 1.15 - ((d - 14) / 26) * 0.52;
    } else {
      mult = Math.max(0.42, 0.63 - ((d - 40) / 50) * 0.21);
    }
  } else if (weaponId === "revolver") {
    if (d <= 16) {
      mult = 1.12;
    } else if (d <= 50) {
      mult = 1.12 - ((d - 16) / 34) * 0.42;
    } else {
      mult = Math.max(0.55, 0.7 - ((d - 50) / 55) * 0.15);
    }
  } else if (weaponId === "lmg") {
    if (d <= 55) {
      mult = 1.0;
    } else {
      mult = Math.max(0.78, 1.0 - ((d - 55) / 95) * 0.22);
    }
  } else {
    if (d <= 48) {
      mult = 1.0;
    } else {
      mult = Math.max(0.75, 1.0 - ((d - 48) / 95) * 0.25);
    }
  }

  const hsMult = isHeadshot ? stats.headshotMult : 1.0;
  return Math.max(1, Math.round(stats.damage * mult * hsMult));
}
