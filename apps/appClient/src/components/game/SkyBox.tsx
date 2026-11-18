import { Environment } from "@react-three/drei";
import { useMemo } from "react";
import { skyboxBank } from "../../utils/assetPaths";
import { useGameStore } from "../../stores/useGameStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { MAPS } from "@block-shooter/shared";

const SkyBox = () => {
  const mapId = useGameStore((state) => state.mapId);
  const theme = useSettingsStore((state) => state.theme);
  const currentMap = MAPS[mapId] || MAPS.veridian_04;

  const isFoundry = currentMap.id === "crimson_foundry";
  const effectiveDay = (theme === "light" && !isFoundry) || currentMap.isDaylight;
  const skyKey =
    theme === "light" && currentMap.skybox === "night"
      ? "afternoon"
      : currentMap.skybox;

  // Load ONLY the active map's single cubemap declaratively via drei Environment
  const skyFiles = useMemo(() => {
    const s = skyboxBank[skyKey] || skyboxBank.afternoon;
    return [s.px, s.nx, s.py, s.ny, s.pz, s.nz];
  }, [skyKey]);

  const fogColor = isFoundry
    ? "#261113"
    : theme === "light"
      ? currentMap.fogColor
      : "#1e293b";

  return (
    <>
      <Environment
        files={skyFiles}
        background
        environmentIntensity={effectiveDay ? 1.05 : isFoundry ? 0.92 : 0.75}
      />
      <fog attach="fog" args={[fogColor, 85, 240]} />
      <hemisphereLight
        args={[
          isFoundry ? "#fdba74" : effectiveDay ? "#f0f9ff" : "#94a3b8",
          isFoundry ? "#451a1a" : effectiveDay ? "#94a3b8" : "#334155",
          effectiveDay ? 1.28 : isFoundry ? 1.08 : 0.88,
        ]}
      />
      <directionalLight
        position={[55, 85, 42]}
        intensity={effectiveDay ? 2.25 : isFoundry ? 1.75 : 1.45}
        color={isFoundry ? "#ffedd5" : effectiveDay ? "#fff7ed" : "#e2e8f0"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={85}
        shadow-camera-bottom={-85}
        shadow-bias={-0.0005}
      />
    </>
  );
};

export default SkyBox;
