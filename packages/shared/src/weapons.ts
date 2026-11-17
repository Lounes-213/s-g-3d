export type WeaponId =
  | "assaultRifle"
  | "smg"
  | "shotgun"
  | "burstRifle"
  | "sniper"
  | "pistol";

export type FireMode = "auto" | "semi" | "burst";

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
  adsZoom: number; // FOV divisor (1.35 to 2.8)
  moveSpeedMult: number;
  recoilKick: number;
  accentColor: string;
  tracerColor: string;
}

export const WEAPON_ORDER: WeaponId[] = [
  "assaultRifle",
  "smg",
  "shotgun",
  "burstRifle",
  "sniper",
  "pistol",
];

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  assaultRifle: {
    id: "assaultRifle",
    slot: 1,
    name: "VX-47 Striker",
    shortName: "VX-47",
    category: "Assault Rifle",
    description: "Balanced full-auto tactical carbine with holographic reflex optic.",
    damage: 24,
    headshotMult: 1.6,
    fireRate: 105,
    magSize: 30,
    reloadTime: 1800,
    range: 160,
    mode: "auto",
    pellets: 1,
    spread: 0.011,
    adsZoom: 1.65,
    moveSpeedMult: 0.96,
    recoilKick: 1.0,
    accentColor: "#38bdf8",
    tracerColor: "#7dd3fc",
  },
  smg: {
    id: "smg",
    slot: 2,
    name: "Kobra-9 SMG",
    shortName: "KOBRA-9",
    category: "Submachine Gun",
    description: "Ultra-high RPM CQB shredder built for aggressive close-quarters combat.",
    damage: 17,
    headshotMult: 1.55,
    fireRate: 70,
    magSize: 40,
    reloadTime: 1450,
    range: 95,
    mode: "auto",
    pellets: 1,
    spread: 0.024,
    adsZoom: 1.35,
    moveSpeedMult: 1.08,
    recoilKick: 0.75,
    accentColor: "#22d3ee",
    tracerColor: "#67e8f9",
  },
  shotgun: {
    id: "shotgun",
    slot: 3,
    name: "M880 Breacher",
    shortName: "M880",
    category: "Tactical Shotgun",
    description: "Heavy 7-pellet pump breacher devastating up close with sharp range drop.",
    damage: 20,
    headshotMult: 1.45,
    fireRate: 720,
    magSize: 8,
    reloadTime: 2100,
    range: 52,
    mode: "semi",
    pellets: 7,
    spread: 0.065,
    adsZoom: 1.25,
    moveSpeedMult: 0.94,
    recoilKick: 2.1,
    accentColor: "#f97316",
    tracerColor: "#fdba74",
  },
  burstRifle: {
    id: "burstRifle",
    slot: 4,
    name: "Helios-3 Burst",
    shortName: "HELIOS-3",
    category: "Marksman Burst Rifle",
    description: "Precision 3-round burst marksman rifle calibrated for mid-to-long engagements.",
    damage: 29,
    headshotMult: 1.85,
    fireRate: 90,
    magSize: 24,
    reloadTime: 1950,
    range: 190,
    mode: "burst",
    pellets: 1,
    spread: 0.005,
    adsZoom: 2.05,
    moveSpeedMult: 0.92,
    recoilKick: 0.9,
    accentColor: "#a855f7",
    tracerColor: "#d8b4fe",
  },
  sniper: {
    id: "sniper",
    slot: 5,
    name: "AWP-X Spectre",
    shortName: "AWP-X",
    category: "Anti-Materiel Sniper",
    description: "4.8x optical sniper scaling up to extreme lethality at long distance.",
    damage: 96,
    headshotMult: 2.2,
    fireRate: 1150,
    magSize: 5,
    reloadTime: 2400,
    range: 280,
    mode: "semi",
    pellets: 1,
    spread: 0.0008,
    adsZoom: 4.8,
    moveSpeedMult: 0.85,
    recoilKick: 2.6,
    accentColor: "#f43f5e",
    tracerColor: "#fda4af",
  },
  pistol: {
    id: "pistol",
    slot: 6,
    name: "Deagle-50 Tac",
    shortName: "DEAGLE-50",
    category: "Heavy Sidearm",
    description: "High-caliber close-range sidearm with crisp reflex sights.",
    damage: 38,
    headshotMult: 1.85,
    fireRate: 300,
    magSize: 12,
    reloadTime: 1150,
    range: 90,
    mode: "semi",
    pellets: 1,
    spread: 0.008,
    adsZoom: 1.38,
    moveSpeedMult: 1.06,
    recoilKick: 1.3,
    accentColor: "#eab308",
    tracerColor: "#fde047",
  },
};

export const WEAPON_BARREL_LENGTH: Record<WeaponId, number> = {
  assaultRifle: 0.92,
  smg: 0.64,
  shotgun: 0.94,
  burstRifle: 0.88,
  sniper: 1.18,
  pistol: 0.44,
};

/**
 * Computes the world-space barrel muzzle tip for a character so bullet tracers
 * and 3D muzzle flash bursts originate from the weapon barrel rather than the chest or eye center.
 */
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
  const vertOffset = isAiming ? -0.05 : -0.10;
  const barrelLen = WEAPON_BARREL_LENGTH[weaponId] ?? 0.9;

  return {
    x: x + rx * rightOffset + fx * barrelLen,
    y: y + eyeOffset + vertOffset + fy * barrelLen,
    z: z + rz * rightOffset + fz * barrelLen,
  };
}

/**
 * Ballistic range curve:
 * - Long-range weapons (sniper, burstRifle) deal significantly MORE damage at long distance and less up close.
 * - Close-range weapons (shotgun, smg, pistol) deal MAXIMUM damage up close and fall off steeply with distance.
 */
export function computeDistanceDamage(
  weaponId: WeaponId,
  distanceMeters: number,
  isHeadshot: boolean,
): number {
  const stats = WEAPONS[weaponId] || WEAPONS.assaultRifle;
  const d = Math.max(0, distanceMeters);
  let mult = 1.0;

  if (weaponId === "sniper") {
    if (d <= 10) {
      mult = 0.54;
    } else if (d <= 36) {
      mult = 0.54 + ((d - 10) / 26) * 0.54; // 0.54 -> 1.08
    } else {
      mult = Math.min(1.32, 1.08 + ((d - 36) / 64) * 0.24);
    }
  } else if (weaponId === "burstRifle") {
    if (d <= 8) {
      mult = 0.78;
    } else if (d <= 28) {
      mult = 0.78 + ((d - 8) / 20) * 0.34; // 0.78 -> 1.12
    } else if (d <= 75) {
      mult = 1.12;
    } else {
      mult = Math.max(0.88, 1.12 - ((d - 75) / 80) * 0.24);
    }
  } else if (weaponId === "shotgun") {
    if (d <= 9) {
      mult = 1.22;
    } else if (d <= 22) {
      mult = 1.22 - ((d - 9) / 13) * 0.72; // 1.22 -> 0.50
    } else {
      mult = Math.max(0.22, 0.50 - ((d - 22) / 26) * 0.28);
    }
  } else if (weaponId === "smg" || weaponId === "pistol") {
    if (d <= 12) {
      mult = 1.15;
    } else if (d <= 36) {
      mult = 1.15 - ((d - 12) / 24) * 0.55; // 1.15 -> 0.60
    } else {
      mult = Math.max(0.4, 0.60 - ((d - 36) / 45) * 0.2);
    }
  } else {
    // Assault Rifle balanced mid-range curve
    if (d <= 40) {
      mult = 1.0;
    } else {
      mult = Math.max(0.74, 1.0 - ((d - 40) / 80) * 0.26);
    }
  }

  const hsMult = isHeadshot ? stats.headshotMult : 1.0;
  return Math.max(1, Math.round(stats.damage * mult * hsMult));
}

