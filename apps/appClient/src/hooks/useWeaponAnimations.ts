import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import { useSettingsStore } from "../stores/useSettingsStore";

export function useEquipAnimation(currentWeapon: string) {
  const equipYOffset = useRef(-0.65);

  useEffect(() => {
    equipYOffset.current = -0.65;
  }, [currentWeapon]);

  const update = () => {
    equipYOffset.current = MathUtils.lerp(equipYOffset.current, 0, 0.16);
    return equipYOffset.current;
  };

  return update;
}

export function useStrafeSway(isAiming: boolean) {
  const targetTilt = useRef(0);
  const currentTilt = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const kb = useSettingsStore.getState().keybindings;
      if (e.code === kb.moveLeft) targetTilt.current = 0.08;
      if (e.code === kb.moveRight) targetTilt.current = -0.08;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const kb = useSettingsStore.getState().keybindings;
      if (e.code === kb.moveLeft && targetTilt.current > 0) targetTilt.current = 0;
      if (e.code === kb.moveRight && targetTilt.current < 0) targetTilt.current = 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const update = () => {
    currentTilt.current = MathUtils.lerp(currentTilt.current, targetTilt.current, 0.12);
    const adsMultiplier = isAiming ? 0.18 : 1.0;
    return currentTilt.current * adsMultiplier;
  };

  return update;
}

export function useMouseSway(isAiming: boolean) {
  const mouseDeltaX = useRef(0);
  const currentSway = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        mouseDeltaX.current = MathUtils.clamp(e.movementX * -0.002, -0.15, 0.15);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const update = () => {
    mouseDeltaX.current = MathUtils.lerp(mouseDeltaX.current, 0, 0.2);
    currentSway.current = MathUtils.lerp(currentSway.current, mouseDeltaX.current, 0.15);
    const adsMultiplier = isAiming ? 0.1 : 1.0;
    return currentSway.current * adsMultiplier;
  };

  return update;
}

export function useIdleSway(isAiming: boolean) {
  const time = useRef(0);

  const update = (delta: number) => {
    time.current += delta;
    const adsMultiplier = isAiming ? 0.1 : 1.0;
    return {
      y: Math.sin(time.current * 1.6) * 0.004 * adsMultiplier,
      x: Math.cos(time.current * 1.2) * 0.002 * adsMultiplier,
    };
  };

  return update;
}

export function useRecoil() {
  const update = () => {
    return {
      z: 0,
      y: 0,
      rotX: 0,
    };
  };

  return update;
}

export function useMagazineReload(isReloading: boolean) {
  const magOffset = useRef(0);
  const reloadPhase = useRef(0);

  const update = (delta: number) => {
    if (isReloading) {
      reloadPhase.current += delta;
      if (reloadPhase.current < 0.4) {
        magOffset.current = MathUtils.lerp(magOffset.current, -0.35, 0.18);
      } else if (reloadPhase.current < 0.7) {
        magOffset.current = -0.6;
      } else {
        magOffset.current = MathUtils.lerp(magOffset.current, 0, 0.28);
      }
    } else {
      reloadPhase.current = 0;
      magOffset.current = MathUtils.lerp(magOffset.current, 0, 0.22);
    }

    return magOffset.current;
  };

  return update;
}
