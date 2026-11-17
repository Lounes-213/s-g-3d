export type SkillId = "dash" | "shield" | "grenade";

export interface SkillConfig {
  id: SkillId;
  name: string;
  shortName: string;
  description: string;
  cooldownMs: number;
  durationMs: number;
  color: string;
  keyAction: "skill1" | "skill2" | "skill3";
}

export const SKILL_ORDER: SkillId[] = ["dash", "shield", "grenade"];

export const SKILLS: Record<SkillId, SkillConfig> = {
  dash: {
    id: "dash",
    name: "Hyper Dash",
    shortName: "DASH",
    description: "Propel rapidly in your movement direction with kinetic thrusters.",
    cooldownMs: 5500,
    durationMs: 350,
    color: "#38bdf8",
    keyAction: "skill1",
  },
  shield: {
    id: "shield",
    name: "Aegis Surge",
    shortName: "SHIELD",
    description: "Activate a +45 energy overshield and regenerate +25 HP instantly.",
    cooldownMs: 11000,
    durationMs: 5000,
    color: "#22c55e",
    keyAction: "skill2",
  },
  grenade: {
    id: "grenade",
    name: "Plasma Blast",
    shortName: "BLAST",
    description: "Launch an explosive plasma charge dealing up to 70 AoE damage in a 7.5m radius.",
    cooldownMs: 9500,
    durationMs: 600,
    color: "#f97316",
    keyAction: "skill3",
  },
};
