import { useGameStore } from "../../../stores/useGameStore";
import { Wifi, WifiOff, Cpu } from "lucide-react";

const ConnectionStateUI = () => {
  const ping = useGameStore((state) => state.ping);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const playMode = useGameStore((state) => state.sessionConfig.playMode);

  if (playMode === "solo") {
    return (
      <div className="absolute top-4 left-20 z-30 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 font-black uppercase tracking-wider text-xs bg-slate-950/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
          <Cpu size={14} />
          <span>SOLO OFFLINE</span>
        </div>
      </div>
    );
  }

  const ui =
    connectionStatus === "disconnected"
      ? {
          color: "bg-red-500/80 text-white border-red-500",
          icon: <WifiOff size={14} />,
          label: "disconnected",
        }
      : connectionStatus === "disconnecting"
        ? {
            color: "bg-amber-500/80 text-amber-100 border-amber-500",
            icon: <Wifi size={14} />,
            label: `${ping} ms`,
          }
        : {
            color: "bg-slate-950/80 text-sky-300 border-white/20",
            icon: <Wifi size={14} />,
            label: `${ping} ms`,
          };

  return (
    <div className="absolute top-4 left-20 z-30 pointer-events-none">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 font-black uppercase tracking-wider text-xs backdrop-blur-sm border ${ui.color}`}
      >
        {ui.icon}
        <span>{ui.label}</span>
      </div>
    </div>
  );
};

export default ConnectionStateUI;
