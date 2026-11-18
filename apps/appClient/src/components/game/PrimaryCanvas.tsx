import { PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, Suspense } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useVoiceChat } from "../../hooks/useVoiceChat";
import AdsVignette from "./AdsVigette";
import ArenaGeometry from "./ArenaGeometry";
import CombatVFX from "./CombatVFX";
import LocalPlayer from "./LocalPlayer";
import NetworkManager from "./NetworkManager";
import RemotePlayers from "./RemotePlayers";
import SkyBox from "./SkyBox";
import SoundManager from "./SoundManager";
import ControlsDisplayUI from "./ui/ControlsDisplayUI";
import CrosshairUI from "./ui/CrosshairUI";
import KillFeedUI from "./ui/KillFeedUI";
import LoadingScreenUI from "./ui/LoadingScreenUI";
import LocalPlayerUI from "./ui/LocalPlayerUI";
import MatchTimerUI from "./ui/MatchTimerUI";
import MinimapUI from "./ui/MinimapUI";
import MobileControlsUI from "./ui/MobileControlsUI";
import PlayButtonUI from "./ui/PlayButtonUI";
import ScoreboardUI from "./ui/ScoreboardUI";
import WeaponViewmodel from "./WeaponViewModel";
import ConnectionStateUI from "./ui/ConnectionStateUI";

function VoiceChatBridge() {
  useVoiceChat();
  return null;
}

const PrimaryScene = () => {
  const fov = useSettingsStore((state) => state.fov);

  return (
    <>
      <PerspectiveCamera makeDefault fov={fov} near={0.08} far={420}>
        <WeaponViewmodel />
      </PerspectiveCamera>
      <SkyBox />
      <LocalPlayer />
      <RemotePlayers />
      <ArenaGeometry />
      <CombatVFX />
    </>
  );
};

const PrimaryCanvas = () => {
  const setActivePage = useAppStore((state) => state.setActivePage);
  const theme = useSettingsStore((state) => state.theme);
  const graphicsQuality = useSettingsStore((state) => state.graphicsQuality);

  useEffect(() => {
    setActivePage("ingame");
  }, [setActivePage]);

  const bgHex = theme === "light" ? "#cbe6ff" : "#090d16";
  const dpr: [number, number] =
    graphicsQuality === "low" ? [0.75, 1] : graphicsQuality === "high" ? [1, 1.8] : [1, 1.35];

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgHex }}>
      <ControlsDisplayUI />
      <CrosshairUI />
      <PlayButtonUI />
      <MatchTimerUI />
      <MinimapUI />
      <ScoreboardUI />
      <KillFeedUI />
      <LocalPlayerUI />
      <MobileControlsUI />
      <NetworkManager />
      <VoiceChatBridge />
      <SoundManager />
      <LoadingScreenUI />
      <ConnectionStateUI />

      <Canvas
        shadows={graphicsQuality !== "low"}
        dpr={dpr}
        gl={{ antialias: graphicsQuality !== "low", powerPreference: "high-performance" }}
        style={{ backgroundColor: bgHex }}
      >
        <color attach="background" args={[bgHex]} />
        <Suspense fallback={null}>
          <PrimaryScene />
          <AdsVignette />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default PrimaryCanvas;
