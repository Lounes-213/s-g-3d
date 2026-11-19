import type { WeaponId } from "@block-shooter/shared";

export const iconBank: Record<string, string> = {
  assaultRifle: "/images/assault_rifle.png",
  burstRifle: "/images/burst_rifle.png",
  pistol: "/images/pistol.png",
};

export const soundBank: Record<string, string> = {
  click: "/sounds/click.mp3",
  hit: "/sounds/hitMarker.mp3",
  kill: "/sounds/kill.mp3",
  thunder: "/sounds/thunder.mp3",
  pistolFire: "/sounds/pistolFire.mp3",
  pistolReload: "/sounds/pistolReload.mp3",
  assaultRifleFire: "/sounds/assaultRifleFire.mp3",
  assaultRifleReload: "/sounds/assaultRifleReload.mp3",
  burstRifleFire: "/sounds/burstRifleFire.mp3",
  burstRifleReload: "/sounds/burstRifleReload.mp3",
};

export interface DriveWeaponAssetSpec {
  obj: string;
  mtl: string;
  targetLength: number;
  muzzleZ: number;
  muzzleY: number;
}

export const driveWeapons: Partial<Record<WeaponId, DriveWeaponAssetSpec>> = {
  assaultRifle: {
    obj: "/models/drive/weapons/AssaultRifle_2.obj",
    mtl: "/models/drive/weapons/AssaultRifle_2.mtl",
    targetLength: 0.96,
    muzzleZ: -0.62,
    muzzleY: 0.04,
  },
  smg: {
    obj: "/models/drive/weapons/SubmachineGun_1.obj",
    mtl: "/models/drive/weapons/SubmachineGun_1.mtl",
    targetLength: 0.64,
    muzzleZ: -0.42,
    muzzleY: 0.03,
  },
  shotgun: {
    obj: "/models/drive/weapons/Shotgun_1.obj",
    mtl: "/models/drive/weapons/Shotgun_1.mtl",
    targetLength: 0.98,
    muzzleZ: -0.66,
    muzzleY: 0.03,
  },
  burstRifle: {
    obj: "/models/drive/weapons/Bullpup_1.obj",
    mtl: "/models/drive/weapons/Bullpup_1.mtl",
    targetLength: 0.88,
    muzzleZ: -0.52,
    muzzleY: 0.04,
  },
  sniper: {
    obj: "/models/drive/weapons/SniperRifle_1.obj",
    mtl: "/models/drive/weapons/SniperRifle_1.mtl",
    targetLength: 1.24,
    muzzleZ: -0.84,
    muzzleY: 0.04,
  },
  pistol: {
    obj: "/models/drive/weapons/Pistol_1.obj",
    mtl: "/models/drive/weapons/Pistol_1.mtl",
    targetLength: 0.34,
    muzzleZ: -0.24,
    muzzleY: 0.03,
  },
};

export const skyboxBank = {
  dawn: {
    px: "/images/dawnSkybox/px.png",
    nx: "/images/dawnSkybox/nx.png",
    py: "/images/dawnSkybox/py.png",
    ny: "/images/dawnSkybox/ny.png",
    pz: "/images/dawnSkybox/pz.png",
    nz: "/images/dawnSkybox/nz.png",
  },
  afternoon: {
    px: "/images/daySkybox/px.png",
    nx: "/images/daySkybox/nx.png",
    py: "/images/daySkybox/py.png",
    ny: "/images/daySkybox/ny.png",
    pz: "/images/daySkybox/pz.png",
    nz: "/images/daySkybox/nz.png",
  },
  evening: {
    px: "/images/eveningSkybox/px.png",
    nx: "/images/eveningSkybox/nx.png",
    py: "/images/eveningSkybox/py.png",
    ny: "/images/eveningSkybox/ny.png",
    pz: "/images/eveningSkybox/pz.png",
    nz: "/images/eveningSkybox/nz.png",
  },
  night: {
    px: "/images/nightSkybox/px.png",
    nx: "/images/nightSkybox/nx.png",
    py: "/images/nightSkybox/py.png",
    ny: "/images/nightSkybox/ny.png",
    pz: "/images/nightSkybox/pz.png",
    nz: "/images/nightSkybox/nz.png",
  },
};

export interface WeaponViewTransform {
  posX: number;
  posY: number;
  posZ: number;
  adsX: number;
  adsY: number;
  adsZ: number;
  scale: number;
  muzzle: [number, number, number];
}

export const WEAPON_VIEWMODEL_TRANSFORMS: Record<WeaponId, WeaponViewTransform> = {
  assaultRifle: {
    posX: 0.27,
    posY: -0.21,
    posZ: -0.45,
    adsX: 0.0,
    adsY: -0.175,
    adsZ: -0.34,
    scale: 0.65,
    muzzle: [0, 0.04, -0.62],
  },
  ak74m: {
    posX: 0.27,
    posY: -0.21,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.175,
    adsZ: -0.34,
    scale: 0.66,
    muzzle: [0, 0.04, -0.66],
  },
  scarH: {
    posX: 0.28,
    posY: -0.215,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.18,
    adsZ: -0.33,
    scale: 0.66,
    muzzle: [0, 0.045, -0.68],
  },
  smg: {
    posX: 0.25,
    posY: -0.2,
    posZ: -0.42,
    adsX: 0.0,
    adsY: -0.16,
    adsZ: -0.32,
    scale: 0.65,
    muzzle: [0, 0.03, -0.42],
  },
  p90: {
    posX: 0.24,
    posY: -0.195,
    posZ: -0.41,
    adsX: 0.0,
    adsY: -0.165,
    adsZ: -0.31,
    scale: 0.66,
    muzzle: [0, 0.035, -0.4],
  },
  shotgun: {
    posX: 0.28,
    posY: -0.22,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.175,
    adsZ: -0.35,
    scale: 0.65,
    muzzle: [0, 0.03, -0.66],
  },
  burstRifle: {
    posX: 0.27,
    posY: -0.21,
    posZ: -0.45,
    adsX: 0.0,
    adsY: -0.175,
    adsZ: -0.34,
    scale: 0.65,
    muzzle: [0, 0.04, -0.52],
  },
  sniper: {
    posX: 0.28,
    posY: -0.22,
    posZ: -0.48,
    adsX: 0.0,
    adsY: -0.18,
    adsZ: -0.3,
    scale: 0.66,
    muzzle: [0, 0.04, -0.84],
  },
  kar98: {
    posX: 0.27,
    posY: -0.21,
    posZ: -0.47,
    adsX: 0.0,
    adsY: -0.178,
    adsZ: -0.31,
    scale: 0.66,
    muzzle: [0, 0.04, -0.78],
  },
  pistol: {
    posX: 0.24,
    posY: -0.22,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.16,
    adsZ: -0.36,
    scale: 0.7,
    muzzle: [0, 0.03, -0.24],
  },
  dmr: {
    posX: 0.27,
    posY: -0.21,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.18,
    adsZ: -0.33,
    scale: 0.66,
    muzzle: [0, 0.04, -0.72],
  },
  lmg: {
    posX: 0.29,
    posY: -0.23,
    posZ: -0.47,
    adsX: 0.0,
    adsY: -0.185,
    adsZ: -0.36,
    scale: 0.67,
    muzzle: [0, 0.04, -0.68],
  },
  vector: {
    posX: 0.25,
    posY: -0.2,
    posZ: -0.42,
    adsX: 0.0,
    adsY: -0.165,
    adsZ: -0.33,
    scale: 0.66,
    muzzle: [0, 0.03, -0.48],
  },
  revolver: {
    posX: 0.24,
    posY: -0.21,
    posZ: -0.46,
    adsX: 0.0,
    adsY: -0.16,
    adsZ: -0.36,
    scale: 0.72,
    muzzle: [0, 0.04, -0.28],
  },
};
