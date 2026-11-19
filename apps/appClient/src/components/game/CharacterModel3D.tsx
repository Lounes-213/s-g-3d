import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  CHARACTERS,
  CHARACTER_SKINS,
  type CharacterId,
  type SkinId,
  type WeaponAttachments,
  type WeaponId,
} from "@block-shooter/shared";
import { SCULPTED_GEOS } from "./sculptedGeometries";
import { WeaponModel3D } from "./WeaponModels3D";
import {
  getProceduralBumpMap,
  getProceduralTexture,
} from "../../utils/proceduralTextures";

interface CharacterModel3DProps {
  characterId: CharacterId;
  skinId?: SkinId;
  team: "red" | "blue" | "none";
  weaponId: WeaponId;
  weaponAttachments?: Partial<WeaponAttachments>;
  pitch: number;
  isMoving?: boolean;
  isSprinting?: boolean;
  isCrouching?: boolean;
  isSliding?: boolean;
  lean?: number;
  isReloading?: boolean;
  isGrounded?: boolean;
  isAiming?: boolean;
  moveForward?: number;
  moveRight?: number;
  lastShotAt?: number;
  shield?: number;
  dashUntil?: number;
  lastHitAt?: number;
  lastHitHeadshot?: boolean;
  lastDoubleJumpAt?: number;
}

/**
 * High-detail realistic articulated 3D tactical operator rig:
 * - Procedural ripstop fabric & kevlar weave PBR maps
 * - Anatomical neck, balaclava mask, Comtac headset, NVG mount, plate carrier w/ mag pouches & radio
 * - Tactical belt, drop-leg holster, sculpted knee/elbow pads
 * - Full locomotion: Idle breathing, Walk, Sprint, Strafe, Crouch, Kinetic Slide, Q/E Tactical Lean, Reload & Recoil
 */
export function CharacterModel3D({
  characterId,
  skinId,
  team,
  weaponId,
  weaponAttachments,
  pitch,
  isMoving = false,
  isSprinting = false,
  isCrouching = false,
  isSliding = false,
  lean = 0,
  isReloading = false,
  isGrounded = true,
  isAiming = false,
  moveForward = 0,
  moveRight = 0,
  lastShotAt = 0,
  shield = 0,
  dashUntil = 0,
  lastHitAt = 0,
  lastHitHeadshot = false,
  lastDoubleJumpAt = 0,
}: CharacterModel3DProps) {
  const cfg = CHARACTERS[characterId] || CHARACTERS.striker;
  const resolvedSkinId = skinId && CHARACTER_SKINS[skinId] ? skinId : cfg.defaultSkin;
  const skin = CHARACTER_SKINS[resolvedSkinId];

  const teamBadge =
    team === "red"
      ? "#ef4444"
      : team === "blue"
        ? "#3b82f6"
        : skin.accentColor;

  const rootRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const hipLRef = useRef<THREE.Group>(null);
  const kneeLRef = useRef<THREE.Group>(null);
  const hipRRef = useRef<THREE.Group>(null);
  const kneeRRef = useRef<THREE.Group>(null);

  const shoulderRRef = useRef<THREE.Group>(null);
  const elbowRRef = useRef<THREE.Group>(null);
  const shoulderLRef = useRef<THREE.Group>(null);
  const elbowLRef = useRef<THREE.Group>(null);
  const weaponPivotRef = useRef<THREE.Group>(null);

  const shieldRef = useRef<THREE.Mesh>(null);
  const beaconMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const mats = useMemo(() => {
    const weaveColor = getProceduralTexture("tactical_weave");
    const weaveBump = getProceduralBumpMap("tactical_weave");

    const uniformPrimary = new THREE.MeshStandardMaterial({
      color: skin.uniformPrimary,
      map: weaveColor,
      bumpMap: weaveBump,
      bumpScale: 0.015,
      roughness: 0.78,
      metalness: 0.08,
    });
    const uniformSecondary = new THREE.MeshStandardMaterial({
      color: skin.uniformSecondary,
      map: weaveColor,
      bumpMap: weaveBump,
      bumpScale: 0.012,
      roughness: 0.72,
      metalness: 0.14,
    });
    const armor = new THREE.MeshStandardMaterial({
      color: team === "none" ? skin.armorColor : team === "red" ? "#4a1b1b" : "#182854",
      bumpMap: weaveBump,
      bumpScale: 0.018,
      roughness: 0.44,
      metalness: 0.46,
    });
    const gearDark = new THREE.MeshStandardMaterial({
      color: "#181a20",
      roughness: 0.62,
      metalness: 0.25,
    });
    const pouchMat = new THREE.MeshStandardMaterial({
      color: skin.uniformSecondary,
      roughness: 0.82,
      metalness: 0.08,
    });
    const skinTone = new THREE.MeshStandardMaterial({
      color: "#cfa078",
      roughness: 0.72,
      metalness: 0.02,
    });
    const balaclava = new THREE.MeshStandardMaterial({
      color: "#1e222a",
      bumpMap: weaveBump,
      bumpScale: 0.01,
      roughness: 0.86,
      metalness: 0.05,
    });
    const boots = new THREE.MeshStandardMaterial({
      color: skin.bootColor,
      roughness: 0.78,
      metalness: 0.14,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: cfg.visorColor,
      emissive: cfg.visorColor,
      emissiveIntensity: 1.35,
      roughness: 0.14,
      metalness: 0.88,
    });
    return {
      uniformPrimary,
      uniformSecondary,
      armor,
      gearDark,
      pouchMat,
      skinTone,
      balaclava,
      boots,
      visor,
    };
  }, [skin, team, cfg.visorColor]);

  const stridePhase = useRef(0);
  const reloadPhase = useRef(0);
  const wasHitFlashing = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const nowMs = Date.now();
    const t = state.clock.elapsedTime;
    const clampedPitch = THREE.MathUtils.clamp(pitch || 0, -1.15, 1.15);

    const hitWindow = lastHitHeadshot ? 0.32 : 0.22;
    const hitAge = lastHitAt > 0 ? (nowMs - lastHitAt) / 1000 : 99;
    const hitActive = hitAge >= 0 && hitAge < hitWindow;
    const hitIntensity = hitActive ? Math.sin((1 - hitAge / hitWindow) * Math.PI) : 0;

    const shotAgeMs = lastShotAt > 0 ? nowMs - lastShotAt : 9999;
    const shotKick =
      shotAgeMs >= 0 && shotAgeMs < 130
        ? Math.sin((1 - shotAgeMs / 130) * Math.PI)
        : 0;

    const dashing = dashUntil > nowMs;
    const dJumpAge = lastDoubleJumpAt > 0 ? (nowMs - lastDoubleJumpAt) / 1000 : 99;
    const inDoubleJumpSpin = !isGrounded && dJumpAge >= 0 && dJumpAge < 0.42;

    const isMovingSide =
      Math.abs(moveRight) > Math.abs(moveForward) * 1.1 && Math.abs(moveRight) > 0.18;
    const isBack = moveForward < -0.2;
    if (isMoving && isGrounded && !isSliding) {
      const rate = isCrouching ? 7.4 : isSprinting ? 13.4 : 9.6;
      stridePhase.current += dt * rate * (isBack ? -1 : 1);
    }

    if (isReloading) {
      reloadPhase.current += dt * 4.8;
    } else {
      reloadPhase.current = 0;
    }

    const p = stridePhase.current;
    const swing =
      isMoving && isGrounded && !isSliding
        ? isSprinting
          ? 0.9
          : isCrouching
            ? 0.5
            : 0.68
        : 0;
    const breathe = Math.sin(t * 2.3) * 0.014;
    const walkBob = isMoving && isGrounded && !isSliding ? Math.abs(Math.sin(p)) : 0;

    const lowerMoveYaw =
      isMoving && isGrounded && !isSliding
        ? THREE.MathUtils.clamp(Math.atan2(-moveRight, Math.abs(moveForward) + 0.35), -0.55, 0.55)
        : 0;

    // 1. Pelvis height, kinetic slide posture, crouch tuck & stride lean
    if (pelvisRef.current) {
      const targetPelvisY = isSliding
        ? -0.52
        : isCrouching
          ? -0.34
          : !isGrounded
            ? 0.06
            : isMoving
              ? -0.05 + walkBob * (isSprinting ? 0.052 : 0.028)
              : -0.02 + breathe * 0.4;

      pelvisRef.current.position.y = THREE.MathUtils.damp(
        pelvisRef.current.position.y,
        targetPelvisY,
        18,
        dt,
      );

      const targetRoll = isSliding ? 0.16 : isMovingSide ? -moveRight * 0.1 : 0;
      const targetLeanPitch = isSliding
        ? 0.48
        : dashing
          ? -0.38
          : isSprinting && isMoving
            ? -0.15
            : isCrouching
              ? -0.14
              : 0;

      pelvisRef.current.rotation.y = THREE.MathUtils.damp(
        pelvisRef.current.rotation.y,
        lowerMoveYaw,
        12,
        dt,
      );
      pelvisRef.current.rotation.z = THREE.MathUtils.damp(
        pelvisRef.current.rotation.z,
        targetRoll,
        14,
        dt,
      );
      pelvisRef.current.rotation.x = THREE.MathUtils.damp(
        pelvisRef.current.rotation.x,
        inDoubleJumpSpin ? -((dJumpAge / 0.42) * Math.PI * 2) : targetLeanPitch,
        inDoubleJumpSpin ? 40 : 14,
        dt,
      );
    }

    // 2. Realistic Leg Kinematics (including Kinetic Slide)
    let hipLX: number;
    let hipRX: number;
    let kneeLX: number;
    let kneeRX: number;
    let hipLZ = 0;
    let hipRZ = 0;

    if (isSliding) {
      // Right leg extended forward sliding on boot, left knee bent tucked under
      hipRX = 1.08;
      kneeRX = -0.22;
      hipLX = 0.25;
      kneeLX = -1.35;
      hipLZ = -0.18;
    } else if (!isGrounded) {
      hipLX = 0.55;
      kneeLX = -1.02;
      hipRX = 0.25;
      kneeRX = -0.64;
    } else if (isMoving) {
      if (isMovingSide && Math.abs(moveForward) < 0.25) {
        const s = Math.sin(p) * 0.48;
        hipLZ = s * 0.45;
        hipRZ = -s * 0.45;
        hipLX = Math.max(0, s * 0.38);
        hipRX = Math.max(0, -s * 0.38);
        kneeLX = -Math.max(0, Math.sin(p)) * 0.52 - 0.12;
        kneeRX = -Math.max(0, -Math.sin(p)) * 0.52 - 0.12;
      } else {
        hipLX = Math.sin(p) * swing + (isCrouching ? 0.52 : 0.04);
        hipRX = -Math.sin(p) * swing + (isCrouching ? 0.52 : 0.04);
        kneeLX =
          -Math.max(0, -Math.sin(p + 0.45)) * (swing * 1.1) - (isCrouching ? 0.92 : 0.1);
        kneeRX =
          -Math.max(0, Math.sin(p + 0.45)) * (swing * 1.1) - (isCrouching ? 0.92 : 0.1);
      }
    } else if (isCrouching) {
      hipLX = 0.54;
      hipRX = 0.34;
      kneeLX = -0.94;
      kneeRX = -0.84;
    } else {
      hipLX = 0.07;
      hipRX = -0.07;
      kneeLX = -0.07;
      kneeRX = -0.05;
      hipLZ = -0.04;
      hipRZ = 0.04;
    }

    if (hipLRef.current) {
      hipLRef.current.rotation.x = THREE.MathUtils.damp(hipLRef.current.rotation.x, hipLX, 18, dt);
      hipLRef.current.rotation.z = THREE.MathUtils.damp(hipLRef.current.rotation.z, hipLZ, 18, dt);
    }
    if (hipRRef.current) {
      hipRRef.current.rotation.x = THREE.MathUtils.damp(hipRRef.current.rotation.x, hipRX, 18, dt);
      hipRRef.current.rotation.z = THREE.MathUtils.damp(hipRRef.current.rotation.z, hipRZ, 18, dt);
    }
    if (kneeLRef.current) {
      kneeLRef.current.rotation.x = THREE.MathUtils.damp(kneeLRef.current.rotation.x, kneeLX, 18, dt);
    }
    if (kneeRRef.current) {
      kneeRRef.current.rotation.x = THREE.MathUtils.damp(kneeRRef.current.rotation.x, kneeRX, 18, dt);
    }

    // 3. Upper Torso & Tactical Q/E Lean Peek
    const isOneHand = weaponId === "pistol" || weaponId === "revolver";
    const sprintingWeaponCarry = isSprinting && isMoving && !isAiming && !isReloading && !isSliding;
    const desiredTorsoWorldYaw = sprintingWeaponCarry ? 0.14 : isAiming ? -0.18 : -0.14;
    const torsoLocalYaw = desiredTorsoWorldYaw - lowerMoveYaw;

    if (torsoRef.current) {
      const flinchX = hitActive ? -0.22 * hitIntensity : 0;
      const counterSlidePitch = isSliding ? -0.45 : sprintingWeaponCarry ? 0.04 : 0;
      const leanRoll = -(lean || 0) * 0.28;
      torsoRef.current.rotation.x = THREE.MathUtils.damp(
        torsoRef.current.rotation.x,
        clampedPitch * 0.25 + shotKick * 0.06 + flinchX + breathe + counterSlidePitch,
        18,
        dt,
      );
      torsoRef.current.rotation.y = THREE.MathUtils.damp(
        torsoRef.current.rotation.y,
        torsoLocalYaw,
        16,
        dt,
      );
      torsoRef.current.rotation.z = THREE.MathUtils.damp(
        torsoRef.current.rotation.z,
        leanRoll,
        16,
        dt,
      );
    }

    if (headRef.current) {
      const hsSnap = hitActive && lastHitHeadshot ? -0.36 * hitIntensity : 0;
      headRef.current.rotation.x = THREE.MathUtils.damp(
        headRef.current.rotation.x,
        clampedPitch * 0.6 + hsSnap,
        20,
        dt,
      );
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        -desiredTorsoWorldYaw * 0.85,
        16,
        dt,
      );
    }

    // 4. Arms & Weapon Pivot Kinematics
    if (shoulderRRef.current && elbowRRef.current && weaponPivotRef.current) {
      const armWalkSway = isMoving && isGrounded && !isSliding ? Math.sin(p) * (isSprinting ? 0.07 : 0.03) : 0;
      const targetShRX = sprintingWeaponCarry
        ? 0.42 + armWalkSway
        : isReloading
          ? 0.48
          : isOneHand
            ? (isAiming ? 1.15 : 0.95) + clampedPitch * 0.65 + shotKick * 0.16
            : (isAiming ? 0.56 : 0.44) + clampedPitch * 0.62 + shotKick * 0.14 + armWalkSway * 0.5;

      const targetShRY = sprintingWeaponCarry
        ? 0.42
        : isOneHand
          ? 0.14
          : isAiming
            ? 0.22
            : 0.18;

      const targetElRX = sprintingWeaponCarry
        ? 1.05
        : isReloading
          ? 1.15
          : isOneHand
            ? (isAiming ? 0.35 : 0.52)
            : (isAiming ? 1.18 : 1.12);

      shoulderRRef.current.rotation.x = THREE.MathUtils.damp(shoulderRRef.current.rotation.x, targetShRX, 22, dt);
      shoulderRRef.current.rotation.y = THREE.MathUtils.damp(shoulderRRef.current.rotation.y, targetShRY, 18, dt);
      elbowRRef.current.rotation.x = THREE.MathUtils.damp(elbowRRef.current.rotation.x, targetElRX, 22, dt);

      const curArmPitch = shoulderRRef.current.rotation.x + elbowRRef.current.rotation.x;
      const curArmYaw = shoulderRRef.current.rotation.y;

      const desiredWeaponPitch = sprintingWeaponCarry
        ? -0.22
        : isReloading
          ? -0.35
          : clampedPitch * 0.72 + shotKick * 0.1;

      const desiredWeaponYaw = sprintingWeaponCarry
        ? 0.62 + Math.cos(p) * 0.06
        : -desiredTorsoWorldYaw;

      const desiredWeaponRoll = sprintingWeaponCarry
        ? 0.25
        : isReloading
          ? 0.38
          : isSliding
            ? -0.28
            : 0;

      weaponPivotRef.current.rotation.x = -curArmPitch + desiredWeaponPitch;
      weaponPivotRef.current.rotation.y = -curArmYaw + desiredWeaponYaw;
      weaponPivotRef.current.rotation.z = THREE.MathUtils.damp(
        weaponPivotRef.current.rotation.z,
        desiredWeaponRoll,
        18,
        dt,
      );

      weaponPivotRef.current.position.set(
        isOneHand ? -0.01 : -0.02,
        -0.27,
        -0.02 + shotKick * 0.045,
      );
    }

    if (shoulderLRef.current && elbowLRef.current) {
      let shLX: number;
      let shLY: number;
      let shLZ: number;
      let elLX: number;
      const walkArmBob = isMoving && isGrounded && !isSliding ? Math.sin(p) * 0.05 : 0;

      if (isReloading) {
        const magDip = Math.sin(reloadPhase.current);
        shLX = 0.65 + magDip * 0.35;
        shLY = -0.52;
        shLZ = 0.08;
        elLX = 0.92 + magDip * 0.28;
      } else if (sprintingWeaponCarry) {
        shLX = 0.68 - walkArmBob * 0.8;
        shLY = -0.45;
        shLZ = 0.14;
        elLX = 0.95;
      } else if (isOneHand) {
        shLX = 1.05 + clampedPitch * 0.65 + walkArmBob * 0.3;
        shLY = -0.62;
        shLZ = 0.12;
        elLX = 0.48;
      } else {
        shLX = (isAiming ? 0.82 : 0.72) + clampedPitch * 0.65 + shotKick * 0.1 + walkArmBob * 0.35;
        shLY = isAiming ? -0.66 : -0.62;
        shLZ = 0.1;
        elLX = isAiming ? 0.68 : 0.74;
      }

      shoulderLRef.current.rotation.x = THREE.MathUtils.damp(shoulderLRef.current.rotation.x, shLX, 20, dt);
      shoulderLRef.current.rotation.y = THREE.MathUtils.damp(shoulderLRef.current.rotation.y, shLY, 18, dt);
      shoulderLRef.current.rotation.z = THREE.MathUtils.damp(shoulderLRef.current.rotation.z, shLZ, 18, dt);
      elbowLRef.current.rotation.x = THREE.MathUtils.damp(elbowLRef.current.rotation.x, elLX, 20, dt);
    }

    // 5. Hit Flash & Shield Feedback
    if (pelvisRef.current && (hitIntensity > 0.05 || wasHitFlashing.current)) {
      const nextFlash = hitIntensity > 0.05;
      wasHitFlashing.current = nextFlash;
      pelvisRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.flashable) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (nextFlash) {
            mat.emissive.set(lastHitHeadshot ? "#fbbf24" : "#dc2626");
            mat.emissiveIntensity = hitIntensity * (lastHitHeadshot ? 1.55 : 1.0);
          } else {
            mat.emissive.set("#000000");
            mat.emissiveIntensity = 0;
          }
        }
      });
    }

    if (shieldRef.current) {
      shieldRef.current.rotation.y += dt * 1.4;
    }

    if (beaconMatRef.current) {
      beaconMatRef.current.emissiveIntensity = hitActive ? 4.2 : dashing ? 4.6 : 1.8;
      beaconMatRef.current.emissive.set(hitActive ? "#ef4444" : teamBadge);
    }
  });

  const style = cfg.helmetStyle;
  const isHeavy = style === "heavy" || style === "juggernaut";
  const isRecon = style === "recon";
  const isCyber = style === "cyber";
  const isSniper = style === "sniper";
  const isCommando = style === "commando";
  const isMedic = style === "medic";
  const isJuggernaut = style === "juggernaut";

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      <group ref={pelvisRef} position={[0, -0.02, 0]}>
        {/* Pelvis + Tactical Utility Belt & Buckle */}
        <mesh castShadow geometry={SCULPTED_GEOS.pelvis} material={mats.uniformSecondary} />
        <mesh castShadow position={[0, 0.04, 0]} material={mats.gearDark}>
          <boxGeometry args={[0.36, 0.065, 0.24]} />
        </mesh>
        <mesh position={[0, 0.04, -0.125]} material={mats.armor}>
          <boxGeometry args={[0.075, 0.055, 0.02]} />
        </mesh>
        {/* Belt hip pouches */}
        <mesh castShadow position={[-0.185, 0.02, -0.02]} material={mats.pouchMat}>
          <boxGeometry args={[0.05, 0.1, 0.09]} />
        </mesh>
        <mesh castShadow position={[0.185, 0.02, 0.02]} material={mats.pouchMat}>
          <boxGeometry args={[0.05, 0.09, 0.08]} />
        </mesh>

        {/* Left Leg + Tactical Knee Pad + Combat Boot */}
        <group ref={hipLRef} position={[-0.11, -0.06, 0]}>
          <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.thigh} material={mats.uniformPrimary} />
          {/* Thigh utility strap */}
          <mesh position={[0, -0.18, 0]} material={mats.gearDark}>
            <cylinderGeometry args={[0.092, 0.09, 0.04, 10]} />
          </mesh>
          <group ref={kneeLRef} position={[0, -0.39, 0]}>
            {/* Sculpted Hard-Shell Knee Pad */}
            <mesh castShadow position={[0, 0.01, -0.078]} material={mats.gearDark}>
              <boxGeometry args={[0.095, 0.11, 0.042]} />
            </mesh>
            <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.shin} material={mats.uniformSecondary} />
            <mesh castShadow position={[0, -0.42, -0.03]} geometry={SCULPTED_GEOS.boot} material={mats.boots} />
          </group>
        </group>

        {/* Right Leg + Drop-Leg Sidearm Holster + Knee Pad + Boot */}
        <group ref={hipRRef} position={[0.11, -0.06, 0]}>
          <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.thigh} material={mats.uniformPrimary} />
          {/* Drop-leg Tactical Holster */}
          <mesh castShadow position={[0.09, -0.18, -0.01]} material={mats.gearDark}>
            <boxGeometry args={[0.055, 0.14, 0.085]} />
          </mesh>
          <group ref={kneeRRef} position={[0, -0.39, 0]}>
            <mesh castShadow position={[0, 0.01, -0.078]} material={mats.gearDark}>
              <boxGeometry args={[0.095, 0.11, 0.042]} />
            </mesh>
            <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.shin} material={mats.uniformSecondary} />
            <mesh castShadow position={[0, -0.42, -0.03]} geometry={SCULPTED_GEOS.boot} material={mats.boots} />
          </group>
        </group>

        {/* Upper Spine, Kevlar Plate Carrier, Magazine Pouches & Radio */}
        <group ref={torsoRef} position={[0, 0.08, 0]}>
          {/* Inner Combat Shirt Torso */}
          <mesh castShadow position={[0, 0.24, 0]} material={mats.uniformPrimary}>
            <cylinderGeometry args={[0.18, 0.16, 0.44, 12]} />
          </mesh>
          {/* Sculpted Ballistic Plate Carrier */}
          <mesh castShadow userData={{ flashable: true }} position={[0, 0.24, 0]} geometry={SCULPTED_GEOS.chestArmor} material={mats.armor} />
          {/* 3x Front Rifle Magazine Pouches on Chest Rig */}
          {[-0.085, 0, 0.085].map((px, idx) => (
            <mesh key={idx} castShadow position={[px, 0.15, -0.145]} material={mats.pouchMat}>
              <boxGeometry args={[0.062, 0.125, 0.05]} />
            </mesh>
          ))}
          {/* Tactical Shoulder Straps & Comms Radio + Whip Antenna */}
          <mesh position={[-0.12, 0.42, -0.03]} material={mats.gearDark}>
            <boxGeometry args={[0.058, 0.09, 0.18]} />
          </mesh>
          <mesh position={[0.12, 0.42, -0.03]} material={mats.gearDark}>
            <boxGeometry args={[0.058, 0.09, 0.18]} />
          </mesh>
          <mesh castShadow position={[-0.12, 0.31, -0.135]} material={mats.gearDark}>
            <boxGeometry args={[0.045, 0.09, 0.035]} />
          </mesh>
          <mesh position={[-0.13, 0.48, 0.13]} material={mats.gearDark}>
            <cylinderGeometry args={[0.005, 0.006, 0.28, 6]} />
          </mesh>

          {/* Tactical Assault Backpack */}
          <mesh castShadow userData={{ flashable: true }} position={[0, 0.24, 0.145]} geometry={SCULPTED_GEOS.backpack} material={mats.uniformSecondary} />

          {isMedic && (
            <group position={[0, 0.25, 0.21]}>
              <mesh>
                <boxGeometry args={[0.12, 0.035, 0.015]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.035, 0.12, 0.015]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} />
              </mesh>
            </group>
          )}

          {isJuggernaut && (
            <mesh castShadow position={[0, 0.44, 0]} material={mats.armor}>
              <cylinderGeometry args={[0.19, 0.21, 0.08, 12, 1, true]} />
            </mesh>
          )}

          {/* Team IFF Patch */}
          {team !== "none" && (
            <group position={[0, 0.31, 0]}>
              <mesh position={[0, 0, -0.142]}>
                <boxGeometry args={[0.14, 0.042, 0.018]} />
                <meshStandardMaterial
                  ref={beaconMatRef}
                  color={teamBadge}
                  emissive={teamBadge}
                  emissiveIntensity={1.8}
                />
              </mesh>
              <mesh position={[0, 0, 0.21]}>
                <boxGeometry args={[0.14, 0.042, 0.018]} />
                <meshStandardMaterial
                  color={teamBadge}
                  emissive={teamBadge}
                  emissiveIntensity={1.8}
                />
              </mesh>
            </group>
          )}

          {/* Anatomical Neck + Shemagh Collar */}
          <mesh castShadow position={[0, 0.46, 0]} material={mats.balaclava}>
            <cylinderGeometry args={[0.072, 0.088, 0.11, 12]} />
          </mesh>

          {/* Realistic Sculpted Head + Balaclava + FAST Helmet + Comtac Headset + NVG */}
          <group ref={headRef} position={[0, 0.56, 0]}>
            {/* Head upper skin */}
            <mesh castShadow geometry={SCULPTED_GEOS.head} material={mats.skinTone} />
            {/* Lower face tactical balaclava mask */}
            <mesh castShadow position={[0, -0.042, -0.012]} material={mats.balaclava}>
              <cylinderGeometry args={[0.122, 0.105, 0.125, 14]} />
            </mesh>
            {/* Comtac Tactical Headset Earcups + Mic */}
            <mesh position={[0.132, -0.005, 0]} material={mats.gearDark}>
              <boxGeometry args={[0.04, 0.085, 0.072]} />
            </mesh>
            <mesh position={[-0.132, -0.005, 0]} material={mats.gearDark}>
              <boxGeometry args={[0.04, 0.085, 0.072]} />
            </mesh>

            {isCommando ? (
              <mesh castShadow position={[-0.02, 0.095, 0]} rotation={[0.1, 0, -0.26]}>
                <cylinderGeometry args={[0.145, 0.135, 0.075, 14]} />
                <meshStandardMaterial color="#991b1b" roughness={0.75} />
              </mesh>
            ) : (
              <group>
                <mesh
                  castShadow
                  position={[0, 0.042, 0]}
                  geometry={isHeavy ? SCULPTED_GEOS.heavyHelmet : SCULPTED_GEOS.helmet}
                  material={mats.armor}
                />
                {/* Front NVG Shroud Mount + Flipped-up Dual Night-Vision Tubes */}
                <mesh position={[0, 0.11, -0.135]} material={mats.gearDark}>
                  <boxGeometry args={[0.075, 0.045, 0.045]} />
                </mesh>
                <mesh position={[-0.032, 0.13, -0.16]} rotation={[Math.PI / 2 - 0.35, 0, 0]} material={mats.gearDark}>
                  <cylinderGeometry args={[0.019, 0.019, 0.068, 10]} />
                </mesh>
                <mesh position={[0.032, 0.13, -0.16]} rotation={[Math.PI / 2 - 0.35, 0, 0]} material={mats.gearDark}>
                  <cylinderGeometry args={[0.019, 0.019, 0.068, 10]} />
                </mesh>
              </group>
            )}

            {/* Ballistic Goggles / Visor */}
            <mesh position={[0, 0.025, -0.122]} geometry={SCULPTED_GEOS.visor} material={mats.visor} />

            {isJuggernaut && (
              <mesh castShadow position={[0, -0.05, -0.125]} material={mats.armor}>
                <boxGeometry args={[0.21, 0.08, 0.06]} />
              </mesh>
            )}

            {isSniper && (
              <mesh position={[0.085, 0.035, -0.155]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.028, 0.028, 0.05, 10]} />
                <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2.0} />
              </mesh>
            )}

            {(isRecon || isCyber) && (
              <mesh position={[0.145, 0.06, -0.02]}>
                <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
                <meshStandardMaterial color={teamBadge} emissive={teamBadge} emissiveIntensity={1.2} />
              </mesh>
            )}
            {isCyber && (
              <mesh position={[-0.145, 0.06, -0.02]}>
                <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
                <meshStandardMaterial color={cfg.visorColor} emissive={cfg.visorColor} emissiveIntensity={1.5} />
              </mesh>
            )}
          </group>

          {/* Right Arm + Elbow Pad + Weapon Socket */}
          <group ref={shoulderRRef} position={[0.22, 0.39, 0]}>
            <mesh castShadow geometry={SCULPTED_GEOS.shoulderPad} material={mats.armor} />
            <mesh castShadow position={[0, -0.14, 0]} geometry={SCULPTED_GEOS.upperArm} material={mats.uniformPrimary} />
            <group ref={elbowRRef} position={[0, -0.28, 0]}>
              <mesh castShadow position={[0, 0, 0.055]} material={mats.gearDark}>
                <boxGeometry args={[0.072, 0.085, 0.032]} />
              </mesh>
              <mesh castShadow position={[0, -0.135, 0]} geometry={SCULPTED_GEOS.forearm} material={mats.uniformPrimary} />
              <mesh castShadow position={[0, -0.27, 0]} geometry={SCULPTED_GEOS.glove} material={mats.boots} />
              <group ref={weaponPivotRef} position={[-0.02, -0.27, -0.02]} scale={weaponId === "pistol" || weaponId === "revolver" ? 0.94 : 0.86}>
                <WeaponModel3D
                  weaponId={weaponId}
                  isReloading={isReloading}
                  skinId={resolvedSkinId}
                  attachments={weaponAttachments}
                />
              </group>
            </group>
          </group>

          {/* Left Arm + Elbow Pad */}
          <group ref={shoulderLRef} position={[-0.22, 0.39, 0]}>
            <mesh castShadow geometry={SCULPTED_GEOS.shoulderPad} material={mats.armor} />
            <mesh castShadow position={[0, -0.14, 0]} geometry={SCULPTED_GEOS.upperArm} material={mats.uniformPrimary} />
            <group ref={elbowLRef} position={[0, -0.28, 0]}>
              <mesh castShadow position={[0, 0, 0.055]} material={mats.gearDark}>
                <boxGeometry args={[0.072, 0.085, 0.032]} />
              </mesh>
              <mesh castShadow position={[0, -0.135, 0]} geometry={SCULPTED_GEOS.forearm} material={mats.uniformPrimary} />
              <mesh castShadow position={[0, -0.27, 0]} geometry={SCULPTED_GEOS.glove} material={mats.boots} />
            </group>
          </group>
        </group>
      </group>

      {/* Active Aegis Shield Bubble */}
      {shield > 0 && (
        <mesh ref={shieldRef} position={[0, 0, 0]}>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={1.1}
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
