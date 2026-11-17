import { formatKeyCode } from "@block-shooter/shared";
import { useAppStore } from "../../../stores/useAppStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";

const ControlsDisplayUI = () => {
  const showControls = useAppStore((state) => state.showControls);
  const kb = useSettingsStore((state) => state.keybindings);
  const theme = useSettingsStore((state) => state.theme);

  if (!showControls) return null;

  const isLight = theme === "light";

  return (
    <div
      className={`absolute bottom-24 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2.5 font-mono text-[10px] pointer-events-none px-4 py-1.5 border whitespace-nowrap uppercase tracking-wider z-10 shadow-md ${
        isLight
          ? "bg-white/95 border-slate-300 text-slate-600"
          : "bg-slate-950/90 border-white/15 text-slate-400"
      }`}
    >
      <span>
        <strong className={isLight ? "text-slate-900" : "text-white"}>
          {formatKeyCode(kb.moveForward)}
          {formatKeyCode(kb.moveLeft)}
          {formatKeyCode(kb.moveBackward)}
          {formatKeyCode(kb.moveRight)}
        </strong>{" "}
        Move
      </span>
      <span>•</span>
      <span>
        <strong className={isLight ? "text-emerald-700" : "text-emerald-400"}>
          {formatKeyCode(kb.sprint)}
        </strong>{" "}
        Sprint
      </span>
      <span>•</span>
      <span>
        <strong className={isLight ? "text-slate-900" : "text-white"}>
          {formatKeyCode(kb.jump)}
        </strong>{" "}
        Jump
      </span>
      <span>•</span>
      <span>
        <strong className={isLight ? "text-slate-900" : "text-white"}>
          {formatKeyCode(kb.crouch)}
        </strong>{" "}
        Crouch
      </span>
      <span>•</span>
      <span>
        <strong className="text-sky-600">{formatKeyCode(kb.togglePerspective)}</strong> 1P/3P
      </span>
      <span>•</span>
      <span>
        <strong className="text-amber-600">
          {formatKeyCode(kb.skill1)}/{formatKeyCode(kb.skill2)}/{formatKeyCode(kb.skill3)}
        </strong>{" "}
        Skills
      </span>
      <span>•</span>
      <span>
        <strong className={isLight ? "text-slate-900" : "text-white"}>
          {formatKeyCode(kb.reload)}
        </strong>{" "}
        Reload
      </span>
      <span>•</span>
      <span>
        <strong className="text-rose-600">{formatKeyCode(kb.toggleControls)}</strong> Hide HUD
      </span>
    </div>
  );
};

export default ControlsDisplayUI;
