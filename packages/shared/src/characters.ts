export type CharacterId =
  | "striker"
  | "ghost"
  | "titan"
  | "nova"
  | "spectre"
  | "valkyrie"
  | "juggernaut"
  | "medic";

export type SkinId =
  | "tactical_olive"
  | "desert_camo"
  | "urban_ops"
  | "arctic_ghost"
  | "crimson_strike"
  | "specops_gold";

export interface CharacterSkinConfig {
  id: SkinId;
  name: string;
  badgeColor: string;
  uniformPrimary: string;
  uniformSecondary: string;
  vestColor: string;
  helmetColor: string;
  bootColor: string;
  skinTone: string;
  accentColor: string;
}

export const SKIN_ORDER: SkinId[] = [
  "tactical_olive",
  "desert_camo",
  "urban_ops",
  "arctic_ghost",
  "crimson_strike",
  "specops_gold",
];

export const CHARACTER_SKINS: Record<SkinId, CharacterSkinConfig> = {
  tactical_olive: {
    id: "tactical_olive",
    name: "Ranger Olive",
    badgeColor: "#4d7c0f",
    uniformPrimary: "#3f4d36",
    uniformSecondary: "#2c3626",
    vestColor: "#292f24",
    helmetColor: "#36422e",
    bootColor: "#1c1917",
    skinTone: "#d8a986",
    accentColor: "#84cc16",
  },
  desert_camo: {
    id: "desert_camo",
    name: "Desert Viper",
    badgeColor: "#d97706",
    uniformPrimary: "#b59b73",
    uniformSecondary: "#8c7350",
    vestColor: "#574a37",
    helmetColor: "#a38862",
    bootColor: "#423322",
    skinTone: "#c6926c",
    accentColor: "#f59e0b",
  },
  urban_ops: {
    id: "urban_ops",
    name: "SWAT Urban",
    badgeColor: "#0284c7",
    uniformPrimary: "#27303f",
    uniformSecondary: "#1b222e",
    vestColor: "#111827",
    helmetColor: "#1e293b",
    bootColor: "#090d16",
    skinTone: "#e0b394",
    accentColor: "#38bdf8",
  },
  arctic_ghost: {
    id: "arctic_ghost",
    name: "Arctic Wolf",
    badgeColor: "#64748b",
    uniformPrimary: "#cbd5e1",
    uniformSecondary: "#94a3b8",
    vestColor: "#334155",
    helmetColor: "#e2e8f0",
    bootColor: "#1e293b",
    skinTone: "#e4b99d",
    accentColor: "#22d3ee",
  },
  crimson_strike: {
    id: "crimson_strike",
    name: "Crimson Merc",
    badgeColor: "#dc2626",
    uniformPrimary: "#3b1d23",
    uniformSecondary: "#241115",
    vestColor: "#18181b",
    helmetColor: "#451a22",
    bootColor: "#09090b",
    skinTone: "#b6805c",
    accentColor: "#ef4444",
  },
  specops_gold: {
    id: "specops_gold",
    name: "Apex Gold",
    badgeColor: "#eab308",
    uniformPrimary: "#18181b",
    uniformSecondary: "#27272a",
    vestColor: "#111114",
    helmetColor: "#1f1f23",
    bootColor: "#09090b",
    skinTone: "#d29e78",
    accentColor: "#facc15",
  },
};

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  codename: string;
  role: string;
  description: string;
  maxHealth: number;
  speedMult: number;
  cooldownMult: number;
  reloadMult: number;
  armorColor: string;
  secondaryColor: string;
  visorColor: string;
  helmetStyle:
    | "tactical"
    | "recon"
    | "heavy"
    | "cyber"
    | "sniper"
    | "commando"
    | "juggernaut"
    | "medic";
  defaultWeapon: "assaultRifle" | "smg" | "shotgun" | "burstRifle" | "sniper" | "pistol";
  defaultSkin: SkinId;
}

export const CHARACTER_ORDER: CharacterId[] = [
  "striker",
  "ghost",
  "titan",
  "nova",
  "spectre",
  "valkyrie",
  "juggernaut",
  "medic",
];

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  striker: {
    id: "striker",
    name: "Alex 'Vanguard' Mercer",
    codename: "STRIKER",
    role: "Frontline Assault",
    description: "Balanced special forces rifleman with +10 HP reinforced kevlar plate carrier.",
    maxHealth: 110,
    speedMult: 1.02,
    cooldownMult: 1.0,
    reloadMult: 0.95,
    armorColor: "#27303f",
    secondaryColor: "#38bdf8",
    visorColor: "#38bdf8",
    helmetStyle: "tactical",
    defaultWeapon: "assaultRifle",
    defaultSkin: "urban_ops",
  },
  ghost: {
    id: "ghost",
    name: "Karim 'Ghost' Zayd",
    codename: "GHOST",
    role: "Stealth Recon",
    description: "Agile recon marksman with +12% sprint speed and rapid tactical reloads.",
    maxHealth: 95,
    speedMult: 1.12,
    cooldownMult: 0.95,
    reloadMult: 0.82,
    armorColor: "#3f4d36",
    secondaryColor: "#10b981",
    visorColor: "#34d399",
    helmetStyle: "recon",
    defaultWeapon: "sniper",
    defaultSkin: "tactical_olive",
  },
  titan: {
    id: "titan",
    name: "Marcus 'Titan' Vance",
    codename: "TITAN",
    role: "Heavy Breacher",
    description: "Armored shock trooper boasting 135 Max HP and reinforced ballistic shoulder pads.",
    maxHealth: 135,
    speedMult: 0.92,
    cooldownMult: 1.05,
    reloadMult: 1.05,
    armorColor: "#574a37",
    secondaryColor: "#f59e0b",
    visorColor: "#fbbf24",
    helmetStyle: "heavy",
    defaultWeapon: "shotgun",
    defaultSkin: "desert_camo",
  },
  nova: {
    id: "nova",
    name: "Elena 'Nova' Volkov",
    codename: "NOVA",
    role: "Tactical Specialist",
    description: "Field electronics operator reducing all active Skill Cooldowns by 25%.",
    maxHealth: 100,
    speedMult: 1.04,
    cooldownMult: 0.75,
    reloadMult: 0.9,
    armorColor: "#334155",
    secondaryColor: "#c084fc",
    visorColor: "#e879f9",
    helmetStyle: "cyber",
    defaultWeapon: "burstRifle",
    defaultSkin: "arctic_ghost",
  },
  spectre: {
    id: "spectre",
    name: "Tariq 'Spectre' Mansour",
    codename: "SPECTRE",
    role: "Long-Range Marksman",
    description: "Sharp-eyed desert sniper equipped with ballistic rangefinder visor & quick bolt cycle.",
    maxHealth: 100,
    speedMult: 1.06,
    cooldownMult: 0.92,
    reloadMult: 0.84,
    armorColor: "#1f1f23",
    secondaryColor: "#facc15",
    visorColor: "#facc15",
    helmetStyle: "sniper",
    defaultWeapon: "sniper",
    defaultSkin: "specops_gold",
  },
  valkyrie: {
    id: "valkyrie",
    name: "Maya 'Valkyrie' Chen",
    codename: "VALKYRIE",
    role: "CQB Rusher",
    description: "Fast close-quarters commando with +14% mobility & rapid tactical beret headset.",
    maxHealth: 105,
    speedMult: 1.14,
    cooldownMult: 0.88,
    reloadMult: 0.88,
    armorColor: "#3b1d23",
    secondaryColor: "#ef4444",
    visorColor: "#fb7185",
    helmetStyle: "commando",
    defaultWeapon: "smg",
    defaultSkin: "crimson_strike",
  },
  juggernaut: {
    id: "juggernaut",
    name: "Viktor 'Kodiak' Kozlov",
    codename: "KODIAK",
    role: "Armored Vanguard",
    description: "Full-visor blast helmet & twin heavy comms providing 140 HP durability.",
    maxHealth: 140,
    speedMult: 0.9,
    cooldownMult: 1.08,
    reloadMult: 1.08,
    armorColor: "#292f24",
    secondaryColor: "#84cc16",
    visorColor: "#a3e635",
    helmetStyle: "juggernaut",
    defaultWeapon: "shotgun",
    defaultSkin: "tactical_olive",
  },
  medic: {
    id: "medic",
    name: "Nadia 'Aegis' Kouri",
    codename: "AEGIS",
    role: "Combat Support",
    description: "Tactical field medic with rapid skill recharge (-20%) & armored trauma pack.",
    maxHealth: 115,
    speedMult: 1.03,
    cooldownMult: 0.8,
    reloadMult: 0.92,
    armorColor: "#1e293b",
    secondaryColor: "#22d3ee",
    visorColor: "#22d3ee",
    helmetStyle: "medic",
    defaultWeapon: "assaultRifle",
    defaultSkin: "arctic_ghost",
  },
};
