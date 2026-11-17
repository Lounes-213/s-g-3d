import { MAPS } from "@block-shooter/shared";
import { useAppStore } from "../../../stores/useAppStore";
import { useGameStore } from "../../../stores/useGameStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";

const MinimapUI = () => {
  const showMinimap = useAppStore((state) => state.showMinimap);
  const mapId = useGameStore((state) => state.mapId);
  const mode = useGameStore((state) => state.mode);
  const players = useGameStore((state) => state.players);
  const localId = useGameStore((state) => state.localId);
  const stormZone = useGameStore((state) => state.stormZone);
  const lootPickups = useGameStore((state) => state.lootPickups);
  const theme = useSettingsStore((state) => state.theme);

  if (!showMinimap) return null;

  const map = MAPS[mapId] || MAPS.veridian_04;
  const me = localId ? players[localId] : null;
  if (!me) return null;

  const isLight = theme === "light";
  const size = 156;
  const scale = size / map.floor.width;
  const toMapCoord = (val: number) => size / 2 + val * scale;

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-1">
      <div
        className={`relative border-2 shadow-xl overflow-hidden ${
          isLight ? "bg-white/95 border-slate-400" : "bg-slate-950/92 border-white/20"
        }`}
        style={{ width: size, height: size }}
      >
        {/* Subtle Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)",
            backgroundSize: "19.5px 19.5px",
          }}
        />

        {/* Map Structures */}
        {map.structures.map((box) => {
          const w = Math.max(2, box.width * scale);
          const d = Math.max(2, box.depth * scale);
          const x = toMapCoord(box.x) - w / 2;
          const y = toMapCoord(box.z) - d / 2;
          return (
            <div
              key={box.name}
              className={`absolute border ${
                isLight
                  ? "bg-slate-400/75 border-slate-500/40"
                  : "bg-slate-600/70 border-white/10"
              }`}
              style={{ left: x, top: y, width: w, height: d }}
            />
          );
        })}

        {/* Active Loot Crates on Radar */}
        {lootPickups
          .filter((item) => item.active)
          .map((item) => (
            <div
              key={item.id}
              className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: toMapCoord(item.x),
                top: toMapCoord(item.z),
                backgroundColor:
                  item.kind === "medkit"
                    ? "#22c55e"
                    : item.kind === "armor"
                      ? "#0284c7"
                      : item.kind === "ammo"
                        ? "#f59e0b"
                        : "#9333ea",
              }}
            />
          ))}

        {/* Domination Capture Zone */}
        {mode === "domination" && (
          <div
            className="absolute rounded-full border border-sky-500 bg-sky-500/15"
            style={{
              width: map.captureZone.radius * 2 * scale,
              height: map.captureZone.radius * 2 * scale,
              left: toMapCoord(map.captureZone.x) - map.captureZone.radius * scale,
              top: toMapCoord(map.captureZone.z) - map.captureZone.radius * scale,
            }}
          />
        )}

        {/* Battle Royale Storm Ring */}
        {mode === "br" && stormZone && (
          <div
            className="absolute rounded-full border-2 border-sky-500/90"
            style={{
              width: stormZone.currentRadius * 2 * scale,
              height: stormZone.currentRadius * 2 * scale,
              left: toMapCoord(stormZone.centerX) - stormZone.currentRadius * scale,
              top: toMapCoord(stormZone.centerZ) - stormZone.currentRadius * scale,
            }}
          />
        )}

        {/* Other Players & Bots */}
        {Object.entries(players).map(([id, p]) => {
          if (id === localId || p.isDead) return null;
          const isAlly = mode !== "ffa" && mode !== "br" && p.team === me.team;
          const px = toMapCoord(p.x);
          const pz = toMapCoord(p.z);

          return (
            <div
              key={id}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                isAlly
                  ? "bg-sky-500"
                  : "bg-rose-500"
              }`}
              style={{ left: px, top: pz }}
            />
          );
        })}

        {/* Local Player Arrow */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: toMapCoord(me.x),
            top: toMapCoord(me.z),
            transform: `translate(-50%, -50%) rotate(${-me.yaw}rad)`,
          }}
        >
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-emerald-500" />
        </div>
      </div>

      <span
        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
          isLight
            ? "bg-white/95 border-slate-300 text-slate-800"
            : "bg-slate-950/90 border-white/15 text-slate-300"
        }`}
      >
        {map.name}
      </span>
    </div>
  );
};

export default MinimapUI;
