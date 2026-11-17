import { MAPS, type MapId, type TeamType } from "@block-shooter/shared";

const adjectives = ["Apex", "Viper", "Shadow", "Hyper", "Nova", "Cobalt", "Iron", "Ghost"];
const nouns = ["Striker", "Reaper", "Phantom", "Sentinel", "Warden", "Ranger", "Wolf", "Valkyrie"];

export const getRandomName = () =>
  `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(10 + Math.random() * 89)}`;

export const getBotName = (index: number) => {
  const botTags = ["BOT-Alpha", "BOT-Spectre", "BOT-Vortex", "BOT-Titan", "BOT-Pulse", "BOT-Kobra", "BOT-Zero", "BOT-Echo"];
  return botTags[index % botTags.length];
};

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getRandomSpawn(mapId: MapId, team: TeamType) {
  const map = MAPS[mapId] || MAPS.citadel_01;
  const pool =
    team === "red"
      ? map.redSpawns
      : team === "blue"
        ? map.blueSpawns
        : map.ffaSpawns;
  return pool[Math.floor(Math.random() * pool.length)];
}
