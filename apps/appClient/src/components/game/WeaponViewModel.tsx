import { useEffect, useRef } from "react";
import { Group, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../stores/useGameStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import {
  combatState,
  computeEffectiveWeaponStats,
  getDefaultAttachments,
  movementState,
  type WeaponId,
} from "@block-shooter/shared";
import {
  useEquipAnimation,
  useIdleSway,
  useMouseSway,
  useRecoil,
  useStrafeSway,
} from "../../hooks/useWeaponAnimations";
import {
  WEAPON_VIEWMODEL_TRANSFORMS as WEAPON_TRANSFORMS,
} from "../../utils/assetPaths";
import MuzzleFlash from "./MuzzleFlash";
import { WeaponModel3D } from "./WeaponModels3D";
import { soundEngine } from "../../utils/soundEngine";

export default function WeaponViewModel() {
  const groupRef = useRef<Group>(null);

  const localId = useGameStore((state) => state.localId);
  const players = useGameStore((state) => state.players);
  const sessionSkin = useGameStore((state) => state.sessionConfig.skinId);
  const perspective = useSettingsStore((state) => state.perspective);
  const hideWeaponOnAds = useSettingsStore((state) => state.hideWeaponOnAds);
  const allAttachments = useSettingsStore((state) => state.weaponAttachments);

  const me = localId ? players[localId] : null;
  const currentWeapon: WeaponId = me?.currentWeapon || "assaultRifle";
  const isReloading = me?.isReloading || false;
  const isDead = me?.isDead || false;
  const activeAttachments = allAttachments[currentWeapon] || getDefaultAttachments(currentWeapon);

  useEffect(() => {
    const onShoot = () => {
      const st = useGameStore.getState();
      const wpn = st.players[st.localId || ""]?.currentWeapon || currentWeapon;
      const att = useSettingsStore.getState().getWeaponAttachments(wpn);
      const eff = computeEffectiveWeaponStats(wpn, att);
      soundEngine.playWeaponFire(wpn, eff.isSuppressed);
    };

    window.addEventListener("weapon-fired", onShoot);
    return () => window.removeEventListener("weapon-fired", onShoot);
  }, [currentWeapon]);

  useEffect(() => {
    if (isReloading) {
      soundEngine.playReload();
    }
  }, [isReloading]);

  const { posX, posY, posZ, adsX, adsY, adsZ, scale, muzzle } =
    WEAPON_TRANSFORMS[currentWeapon] || WEAPON_TRANSFORMS.assaultRifle;

  const getEquipOffset = useEquipAnimation(currentWeapon);
  const getStrafeRoll = useStrafeSway(false);
  const getMouseSway = useMouseSway(false);
  const getIdleSway = useIdleSway(false);
  const getRecoil = useRecoil();
  const sprintPhase = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    const activeScope = activeAttachments.scope;
    const isMagnifiedScope =
      activeScope === "prism_2x" ||
      activeScope === "acog_4x" ||
      activeScope === "sniper_8x";

    // Hide 1P viewmodel cleanly when looking through magnified optics or unobstructed ADS
    const shouldHideForAds =
      combatState.isAiming &&
      (hideWeaponOnAds || isMagnifiedScope);
    groupRef.current.visible = !shouldHideForAds;
    if (shouldHideForAds) return;

    const equipOffset = getEquipOffset();
    const strafeRoll = getStrafeSway ? getStrafeRoll() : 0;
    const mouseSway = getMouseSway();
    const idleSway = getIdleSway(dt);
    const recoil = getRecoil();

    const steadyMult = combatState.isAiming && movementState.holdBreath ? 0.16 : 1.0;
    const isSliding = Boolean(movementState.isSliding);
    const lean = movementState.lean || 0;

    const isSprinting = Boolean(
      !isSliding && me?.isSprinting && me?.isMoving && !combatState.isAiming && !isReloading,
    );
    if (isSprinting) {
      sprintPhase.current += dt * 11.8;
    }

    const sprintBobX = isSprinting ? Math.cos(sprintPhase.current * 0.5) * 0.026 : 0;
    const sprintBobY = isSprinting ? Math.abs(Math.sin(sprintPhase.current)) * 0.024 : 0;

    // Realistic tactical sprint low-ready & kinetic slide canted carry
    const baseTargetX = combatState.isAiming
      ? adsX
      : isSliding
        ? posX - 0.05
        : isSprinting
          ? 0.08
          : posX;
    const baseTargetY = combatState.isAiming
      ? adsY - 0.02
      : isSliding
        ? posY - 0.075
        : isSprinting
          ? -0.26
          : posY;
    const baseTargetZ = combatState.isAiming
      ? adsZ
      : isSliding
        ? posZ + 0.04
        : isSprinting
          ? -0.37
          : posZ;

    const targetRotX =
      recoil.rotX +
      (isReloading ? 0.28 : isSliding ? 0.12 : isSprinting ? -0.26 : 0);
    const targetRotY =
      -mouseSway * steadyMult +
      (isReloading ? 0.25 : isSliding ? 0.22 : isSprinting ? 0.72 : 0);
    const targetRotZ =
      strafeRoll +
      mouseSway * 0.5 * steadyMult -
      lean * 0.22 +
      (isReloading
        ? -0.42
        : isSliding
          ? 0.44
          : isSprinting
            ? -0.24 + Math.sin(sprintPhase.current * 0.5) * 0.05
            : 0);

    const posDamp = combatState.isAiming ? 24 : 16;
    const rotDamp = combatState.isAiming ? 22 : 15;

    groupRef.current.position.set(
      MathUtils.damp(
        groupRef.current.position.x,
        baseTargetX +
          mouseSway * 0.5 * steadyMult +
          idleSway.x * steadyMult +
          sprintBobX +
          strafeRoll * 0.08,
        posDamp,
        dt,
      ),
      MathUtils.damp(
        groupRef.current.position.y,
        baseTargetY +
          equipOffset +
          idleSway.y * steadyMult +
          recoil.y +
          sprintBobY +
          (isReloading ? -0.055 : 0),
        posDamp,
        dt,
      ),
      MathUtils.damp(groupRef.current.position.z, baseTargetZ + recoil.z, posDamp, dt),
    );

    groupRef.current.rotation.set(
      MathUtils.damp(groupRef.current.rotation.x, targetRotX, rotDamp, dt),
      MathUtils.damp(groupRef.current.rotation.y, targetRotY, rotDamp, dt),
      MathUtils.damp(groupRef.current.rotation.z, targetRotZ, rotDamp, dt),
    );
  });

  if (perspective === "3p" || isDead) {
    return null;
  }

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Dedicated Viewmodel Key & Fill Lights for guaranteed 1P gun & hands visibility in all theaters */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[0.4, 1.0, 0.4]} intensity={1.8} />
      <WeaponModel3D
        weaponId={currentWeapon}
        isReloading={isReloading}
        isFirstPerson
        skinId={me?.skinId || sessionSkin}
        attachments={activeAttachments}
      />
      {activeAttachments.muzzle !== "suppressor" && <MuzzleFlash position={muzzle} />}
    </group>
  );
}
