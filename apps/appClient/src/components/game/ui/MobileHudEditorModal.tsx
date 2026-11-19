import { useRef, useState } from "react";
import {
  MOBILE_CONTROL_LABELS,
  useSettingsStore,
  type MobileControlId,
} from "../../../stores/useSettingsStore";
import { soundEngine } from "../../../utils/soundEngine";
import {
  Check,
  Eye,
  EyeOff,
  Move,
  RotateCcw,
  Sliders,
  Smartphone,
  X,
} from "lucide-react";

const ALL_CONTROL_IDS = Object.keys(MOBILE_CONTROL_LABELS) as MobileControlId[];

export function MobileHudEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const layout = useSettingsStore((s) => s.mobileHudLayout);
  const updateMobileControl = useSettingsStore((s) => s.updateMobileControl);
  const applyMobilePreset = useSettingsStore((s) => s.applyMobilePreset);
  const resetMobileHudLayout = useSettingsStore((s) => s.resetMobileHudLayout);
  const mobileControlsMode = useSettingsStore((s) => s.mobileControlsMode);
  const setMobileControlsMode = useSettingsStore((s) => s.setMobileControlsMode);

  const [selectedId, setSelectedId] = useState<MobileControlId>("fire");
  const [draggingId, setDraggingId] = useState<MobileControlId | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const selected = layout[selectedId];

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!draggingId || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const xPct = Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(95, Math.max(6, ((clientY - rect.top) / rect.height) * 100));
    updateMobileControl(draggingId, {
      x: Math.round(xPct * 10) / 10,
      y: Math.round(yPct * 10) / 10,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[140] bg-[#060910] text-white font-tactical flex flex-col select-none overflow-hidden"
      onPointerMove={(e) => {
        if (draggingId) handlePointerMove(e.clientX, e.clientY);
      }}
      onPointerUp={() => setDraggingId(null)}
    >
      {/* Top Editor Inspector Bar */}
      <div className="shrink-0 bg-[#0c101a] border-b border-amber-500/30 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-amber-400" />
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-[0.18em]">
              Mobile HUD Controls Customizer
            </div>
            <div className="text-[10px] text-slate-400">
              Drag any button to reposition • Resize & set opacity
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "thumb2", label: "2-Finger" },
              { id: "claw3", label: "3-Finger Claw" },
              { id: "claw4", label: "4-Finger Pro" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                applyMobilePreset(p.id);
              }}
              className="px-2.5 py-1.5 bg-[#141a27] hover:bg-amber-500 hover:text-slate-950 border border-white/15 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
            >
              {p.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMobileControlsMode(mobileControlsMode === "on" ? "auto" : "on");
            }}
            className={`px-2.5 py-1.5 border text-[10px] font-black uppercase tracking-wider cursor-pointer ${
              mobileControlsMode === "on"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : "bg-[#141a27] border-white/15 text-slate-300"
            }`}
          >
            HUD: {mobileControlsMode.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              resetMobileHudLayout();
            }}
            className="px-2.5 py-1.5 bg-[#141a27] hover:border-rose-400 border border-white/15 text-slate-300 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer clip-tactical-btn"
          >
            <Check size={14} /> Save & Close
          </button>
        </div>
      </div>

      {/* Interactive Drag Canvas */}
      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden touch-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(245,158,11,0.08), transparent 60%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 40px 40px, 40px 40px",
        }}
      >
        {/* Center Crosshair Reference */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-35">
          <div className="w-6 h-0.5 bg-cyan-400" />
          <div className="w-0.5 h-6 bg-cyan-400 mx-auto -mt-3.5" />
        </div>

        {ALL_CONTROL_IDS.map((id) => {
          const ctrl = layout[id];
          const isSelected = selectedId === id;
          const isJoystick = id === "joystick";
          const isFire = id === "fire" || id === "fireLeft";
          const basePx = isJoystick ? 96 : isFire ? 64 : 46;

          return (
            <div
              key={id}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setSelectedId(id);
                setDraggingId(id);
              }}
              style={{
                left: `${ctrl.x}%`,
                top: `${ctrl.y}%`,
                width: `${basePx}px`,
                height: `${basePx}px`,
                transform: `translate(-50%, -50%) scale(${ctrl.scale})`,
                opacity: ctrl.visible ? ctrl.opacity : 0.25,
              }}
              className={`absolute flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing border-2 transition-shadow ${
                isJoystick || isFire ? "rounded-full" : "clip-tactical-sm"
              } ${
                isSelected
                  ? "border-amber-400 bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.55)] z-30"
                  : isFire
                    ? "border-rose-400/80 bg-rose-600/40 z-20"
                    : "border-white/35 bg-slate-900/80 z-10"
              }`}
            >
              <Move size={11} className="text-amber-300 opacity-75 mb-0.5" />
              <span className="text-[8px] font-black uppercase leading-tight px-1">
                {MOBILE_CONTROL_LABELS[id]}
              </span>
              {!ctrl.visible && (
                <span className="text-[7px] font-bold text-rose-400 uppercase">HIDDEN</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Selected Control Inspector Bar */}
      <div className="shrink-0 bg-[#0c101a] border-t border-white/15 px-4 py-3 z-20">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[160px]">
            <Sliders size={15} className="text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">
                Selected Control
              </div>
              <div className="text-sm font-black uppercase text-amber-300">
                {MOBILE_CONTROL_LABELS[selectedId]}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[160px] max-w-[240px]">
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
              <span className="text-slate-300">Button Size</span>
              <span className="text-amber-400 font-mono">
                {Math.round(selected.scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={selected.scale}
              onChange={(e) =>
                updateMobileControl(selectedId, { scale: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex-1 min-w-[160px] max-w-[240px]">
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
              <span className="text-slate-300">Opacity</span>
              <span className="text-cyan-400 font-mono">
                {Math.round(selected.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1.0}
              step={0.05}
              value={selected.opacity}
              onChange={(e) =>
                updateMobileControl(selectedId, { opacity: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateMobileControl(selectedId, { visible: !selected.visible })
              }
              className={`px-3 py-2 border text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer ${
                selected.visible
                  ? "bg-emerald-600/25 border-emerald-400 text-emerald-300"
                  : "bg-rose-600/25 border-rose-400 text-rose-300"
              }`}
            >
              {selected.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              {selected.visible ? "Visible" : "Hidden"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-300 cursor-pointer sm:hidden"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
