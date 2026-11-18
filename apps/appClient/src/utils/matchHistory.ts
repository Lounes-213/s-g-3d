import { MAPS, type GameMode, type MapId, type PlayMode } from "@block-shooter/shared";

export interface MatchHistoryEntry {
  id: string;
  playedAt: number;
  playMode: PlayMode;
  mode: GameMode;
  mapId: MapId;
  mapName: string;
  roomName: string;
  playerName: string;
  kills: number;
  deaths: number;
  didWin: boolean;
  mvpName: string;
  mvpKills: number;
  scoreText: string;
}

const STORAGE_KEY = "sg3d_match_history_v1";
const MAX_ENTRIES = 30;

export function getMatchHistory(): MatchHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordMatchHistory(
  entry: Omit<MatchHistoryEntry, "id" | "playedAt" | "mapName"> & {
    mapId: MapId;
  },
): MatchHistoryEntry[] {
  const mapName = MAPS[entry.mapId]?.name || entry.mapId;
  const nextItem: MatchHistoryEntry = {
    ...entry,
    id: `mh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    playedAt: Date.now(),
    mapName,
  };
  const current = getMatchHistory();
  const updated = [nextItem, ...current].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function clearMatchHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
