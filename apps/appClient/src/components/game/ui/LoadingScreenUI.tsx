import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

const LoadingScreenUI = () => {
  const { progress, active, loaded, total } = useProgress();
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!active) {
      const fadeTimer = setTimeout(() => {
        setFadingOut(true);
      }, 300);

      const unmountTimer = setTimeout(() => {
        setVisible(false);
      }, 900);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-100 flex items-center justify-center bg-[#060911]/95 backdrop-blur-md pointer-events-none p-8 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-md bg-slate-950 border border-white/20 border-t-4 border-t-sky-400 p-6 shadow-2xl font-tactical">
        <div className="text-center text-xs font-bold uppercase tracking-[0.35em] text-sky-400 mb-1">
          S-G-3D ENGINE
        </div>
        <h2 className="text-center font-black text-xl tracking-widest uppercase text-white mb-5">
          Initializing Tactical Arena
        </h2>

        <div className="w-full h-3 bg-white/10 mb-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-200"
            style={{ width: `${Math.max(15, progress)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs uppercase text-slate-400 font-bold tracking-widest">
          <span>
            {loaded} / {Math.max(loaded, total)} Assets
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreenUI;
