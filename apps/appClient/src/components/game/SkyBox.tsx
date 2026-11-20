import { Environment } from "@react-three/drei";
import { useMemo } from "react";
import { skyboxBank } from "../../utils/assetPaths";
import { useGameStore } from "../../stores/useGameStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { MAPS } from "@block-shooter/shared";

const SkyBox = () => {
  const mapId = useGameStore((state) => state.mapId);
  const theme = useSettingsStore((state) => state.theme);
  const quality = useSettingsStore((state) => state.graphicsQuality);
  const currentMap = MAPS[mapId] || MAPS.royale_valley;

  const isFoundry = currentMap.id === "crimson_foundry";
  const isRoyale = currentMap.id === "royale_valley";
  const effectiveDay = (theme === "light" && !isFoundry) || currentMap.isDaylight;
  const skyKey =
    theme === "light" && currentMap.skybox === "night"
      ? "afternoon"
      : currentMap.skybox;

  const skyFiles = useMemo(() => {
    const s = skyboxBank[skyKey] || skyboxBank.afternoon;
    return [s.px, s.nx, s.py, s.ny, s.pz, s.nz];
  }, [skyKey]);

  const fogColor = isFoundry
    ? "#261113"
    : isRoyale
      ? "#c9dff2"
      : theme === "light"
        ? currentMap.fogColor
        : "#1e293b";

  const mapSpan = Math.max(currentMap.floor.width, currentMap.floor.depth);
  const shadowCam = Math.min(155, Math.max(85, mapSpan * 0.54));
  const fogNear = Math.max(95, mapSpan * 0.42);
  const fogFar = Math.max(255, mapSpan * 1.38);
  const shadowSize = quality === "high" ? 1024 : quality === "medium" ? 768 : 512;

  return (
    <>
      <Environment
        files={skyFiles}
        background
        environmentIntensity={isRoyale ? 1.12 : effectiveDay ? 1.05 : isFoundry ? 0.92 : 0.78}
      />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Atmospheric solar disc for bright open-world daylight maps */}
      {effectiveDay && (
        <group position={[145, 130, 95]}>
          <mesh>
            <sphereGeometry args={[7.5, 16, 16]} />
            <meshBasicMaterial color="#fff7d6" fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[14, 16, 16]} />
            <meshBasicMaterial
              color="#fde68a"
              transparent
              opacity={0.22}
              fog={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      <hemisphereLight
        args={[
          isFoundry ? "#fdba74" : effectiveDay ? "#e0f2fe" : "#94a3b8",
          isFoundry ? "#451a1a" : isRoyale ? "#658457" : effectiveDay ? "#94a3b8" : "#334155",
          isRoyale ? 1.38 : effectiveDay ? 1.28 : isFoundry ? 1.08 : 0.88,
        ]}
      />
      <directionalLight
        position={[72, 105, 52]}
        intensity={isRoyale ? 2.45 : effectiveDay ? 2.25 : isFoundry ? 1.75 : 1.45}
        color={isFoundry ? "#ffedd5" : effectiveDay ? "#fff7ed" : "#e2e8f0"}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-shadowCam}
        shadow-camera-right={shadowCam}
        shadow-camera-top={shadowCam}
        shadow-camera-bottom={-shadowCam}
        shadow-camera-near={5}
        shadow-camera-far={240}
        shadow-bias={-0.0005}
      />
      {/* Cool opposing sky rim fill for realistic GTA-style sunlit shading */}
      <directionalLight
        position={[-65, 42, -58]}
        intensity={effectiveDay ? 0.45 : 0.35}
        color={isFoundry ? "#fb7185" : "#93c5fd"}
      />
    </>
  );
};

export default SkyBox;
