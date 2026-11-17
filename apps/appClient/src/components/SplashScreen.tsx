import { useEffect, useState } from "react";
import { Crosshair, LogIn, Play, ShieldCheck, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { signInOperator } from "../services/firebaseService";
import { soundEngine } from "../utils/soundEngine";
import { OperatorAvatar } from "./OperatorAvatar";

export default function SplashScreen() {
  const splashDismissed = useAppStore((s) => s.splashDismissed);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const { firebaseUser, profile, authReady } = useAuthStore();
  const theme = useSettingsStore((s) => s.theme);
  const [progress, setProgress] = useState(18);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (splashDismissed) return;
    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 14));
    }, 85);
    return () => clearInterval(id);
  }, [splashDismissed]);

  if (splashDismissed) return null;

  const isLight = theme === "light";

  const handleEnter = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    dismissSplash();
  };

  const handleGoogleSignIn = async () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setSigningIn(true);
    try {
      await signInOperator();
      toast.success("Google account connected for Online & Room play");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center p-6 font-tactical transition-colors ${
        isLight
          ? "bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 text-slate-900"
          : "bg-gradient-to-br from-[#060911] via-slate-950 to-[#0b1220] text-white"
      }`}
    >
      {/* Architectural Grid Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(to right, rgba(14,165,233,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,165,233,0.12) 1px, transparent 1px)"
            : "linear-gradient(to right, rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center gap-5">
        {/* Emblem */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-24 h-24 flex items-center justify-center border-2 shadow-2xl ${
              isLight
                ? "bg-sky-600 border-sky-400 text-white shadow-sky-500/30"
                : "bg-sky-500 border-sky-300 text-slate-950 shadow-sky-500/40"
            }`}
          >
            <Crosshair size={44} strokeWidth={2.4} />
          </div>
          <span
            className={`absolute -bottom-3 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.3em] border ${
              isLight
                ? "bg-white border-slate-300 text-sky-700"
                : "bg-slate-950 border-sky-400/50 text-sky-300"
            }`}
          >
            NEXT-GEN 3D ARENA
          </span>
        </div>

        <div className="space-y-2 mt-2">
          <h1 className="text-5xl sm:text-6xl font-black tracking-[0.26em] uppercase leading-none">
            S-G-3D
          </h1>
          <p
            className={`text-xs sm:text-sm font-bold uppercase tracking-[0.26em] ${
              isLight ? "text-sky-700" : "text-sky-400"
            }`}
          >
            Competitive Tactical Shooter • 1P / 3P • Battle Royale & Online Rooms
          </p>
        </div>

        {/* Readiness Specs */}
        <div
          className={`w-full grid grid-cols-3 gap-2 p-3 border text-[11px] font-black uppercase tracking-wider ${
            isLight
              ? "bg-white/90 border-slate-200 text-slate-700 shadow-sm"
              : "bg-slate-900/80 border-white/15 text-slate-300"
          }`}
        >
          <div className="flex flex-col items-center gap-1 py-1">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>4 Tactical Maps</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-1">
            <Crosshair size={16} className="text-sky-500" />
            <span>6 Pro Weapons</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-1">
            <Volume2 size={16} className="text-amber-500" />
            <span>Voice & Bots</span>
          </div>
        </div>

        {/* Google Account Identity Status / Sign-In Card */}
        <div
          className={`w-full border p-3.5 flex flex-wrap items-center justify-between gap-3 text-left ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/90 border-white/15"
          }`}
        >
          {firebaseUser ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <OperatorAvatar
                  photoURL={firebaseUser.photoURL}
                  name={profile?.username || firebaseUser.displayName}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-wider truncate">
                    {profile?.username || firebaseUser.displayName || "Operator"}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {firebaseUser.email || "Verified Google Account"}
                  </div>
                </div>
              </div>
              {profile && (
                <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">
                  {profile.rankTier} • {profile.rankPoints} PTS
                </span>
              )}
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-wider">
                  {authReady ? "Google Account Required for Online & Rooms" : "Checking Command Auth..."}
                </div>
                <div
                  className={`text-[11px] ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Sign in with Gmail to show your profile photo, unlock Online/Rooms & save Rank.
                </div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn || !authReady}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogIn size={14} />
                <span>{signingIn ? "Connecting..." : "Sign In With Google"}</span>
              </button>
            </>
          )}
        </div>

        {/* Loader Progress Bar */}
        <div className="w-full space-y-2">
          <div
            className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <span>{progress >= 100 ? "Tactical Systems Ready" : "Initializing 3D Ballistics Engine..."}</span>
            <span>{progress}%</span>
          </div>
          <div className={`w-full h-2 ${isLight ? "bg-slate-200" : "bg-slate-800"} overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleEnter}
          className="w-full py-4 bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:brightness-110 text-white font-black text-xl uppercase tracking-[0.24em] flex items-center justify-center gap-3 shadow-xl cursor-pointer transition-transform active:scale-[0.99]"
        >
          <Play size={22} fill="currentColor" />
          <span>Enter S-G-3D</span>
        </button>
      </div>
    </div>
  );
}
