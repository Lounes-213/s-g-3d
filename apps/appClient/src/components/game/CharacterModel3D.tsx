import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  CHARACTERS,
  CHARACTER_SKINS,
  type CharacterId,
  type SkinId,
  type WeaponId,
} from "@block-shooter/shared";
import { SCULPTED_GEOS } from "./sculptedGeometries";
import { WeaponModel3D } from "./WeaponModels3D";

interface CharacterModel3DProps {
  characterId: CharacterId;
  skinId?: SkinId;
  team: "red" | "blue" | "none";
  weaponId: WeaponId;
  pitch: number;
  isMoving?: boolean;
  isSprinting?: boolean;
  isCrouching?: boolean;
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
 * Unified, lightweight articulated 3D operator rig shared identically across all classes & skins.
 * Height: ~1.98m (y = -1.0 boots to y = +0.92 helmet crown) — zero glTF cloning/mixer overhead.
 */
export function CharacterModel3D({
  characterId,
  skinId,
  team,
  weaponId,
  pitch,
  isMoving = false,
  isSprinting = false,
  isCrouching = false,
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

  // Articulated joint hierarchy refs
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

  // Materials for unified operator + hit emissive feedback
  const mats = useMemo(() => {
    const uniformPrimary = new THREE.MeshStandardMaterial({
      color: skin.uniformPrimary,
      roughness: 0.72,
      metalness: 0.14,
    });
    const uniformSecondary = new THREE.MeshStandardMaterial({
      color: skin.uniformSecondary,
      roughness: 0.68,
      metalness: 0.18,
    });
    const armor = new THREE.MeshStandardMaterial({
      color: team === "none" ? skin.armorColor : team === "red" ? "#451a1a" : "#172554",
      roughness: 0.45,
      metalness: 0.52,
    });
    const skinTone = new THREE.MeshStandardMaterial({
      color: "#d4a373",
      roughness: 0.75,
      metalness: 0.02,
    });
    const boots = new THREE.MeshStandardMaterial({
      color: skin.bootColor,
      roughness: 0.8,
      metalness: 0.12,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: cfg.visorColor,
      emissive: cfg.visorColor,
      emissiveIntensity: 1.5,
      roughness: 0.16,
      metalness: 0.85,
    });
    return {
      uniformPrimary,
      uniformSecondary,
      armor,
      skinTone,
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

    // 1. Advance locomotion cycle smoothly based on ground movement
    const isMovingSide =
      Math.abs(moveRight) > Math.abs(moveForward) * 1.1 && Math.abs(moveRight) > 0.18;
    const isBack = moveForward < -0.2;
    if (isMoving && isGrounded) {
      const rate = isCrouching ? 7.4 : isSprinting ? 13.2 : 9.6;
      stridePhase.current += dt * rate * (isBack ? -1 : 1);
    }

    if (isReloading) {
      reloadPhase.current += dt * 4.8;
    } else {
      reloadPhase.current = 0;
    }

    const p = stridePhase.current;
    const swing = isMoving && isGrounded ? (isSprinting ? 0.88 : isCrouching ? 0.5 : 0.66) : 0;
    const breathe = Math.sin(t * 2.4) * 0.015;
    const walkBob = isMoving && isGrounded ? Math.abs(Math.sin(p)) : 0;

    // Lower-body turn toward stride direction when strafing or moving diagonally
    const lowerMoveYaw =
      isMoving && isGrounded
        ? THREE.MathUtils.clamp(Math.atan2(-moveRight, Math.abs(moveForward) + 0.35), -0.55, 0.55)
        : 0;

    // 2. Pelvis height, crouch tuck, forward sprint lean & lower-body heading
    if (pelvisRef.current) {
      const targetPelvisY = isCrouching
        ? -0.34
        : !isGrounded
          ? 0.06
          : isMoving
            ? -0.05 + walkBob * (isSprinting ? 0.05 : 0.028)
            : -0.02 + breathe * 0.4;
      pelvisRef.current.position.y = THREE.MathUtils.damp(
        pelvisRef.current.position.y,
        targetPelvisY,
        18,
        dt,
      );

      const targetRoll = isMovingSide ? -moveRight * 0.1 : 0;
      const targetLeanPitch = dashing
        ? -0.38
        : isSprinting && isMoving
          ? -0.14
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

    // 3. Legs: Natural Hip + Knee Articulation (Idle / Walk / Back / Strafe / Crouch / Airborne)
    let hipLX: number;
    let hipRX: number;
    let kneeLX: number;
    let kneeRX: number;
    let hipLZ = 0;
    let hipRZ = 0;

    if (!isGrounded) {
      // Tactical mid-air knee tuck
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
      // Balanced combat ready stance (wide shoulder-width feet)
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

    // 4. Upper Torso & Head: Counter-rotate pelvis heading so shoulders/weapon always aim straight forward (-Z)
    const isOneHand = weaponId === "pistol" || weaponId === "revolver";
    const sprintingWeaponCarry = isSprinting && isMoving && !isAiming && !isReloading;

    // Slight bladed combat stance (-0.16 rad twists right shoulder slightly back so rifle tucks cleanly)
    const desiredTorsoWorldYaw = sprintingWeaponCarry ? 0.14 : isAiming ? -0.18 : -0.14;
    const torsoLocalYaw = desiredTorsoWorldYaw - lowerMoveYaw;

    if (torsoRef.current) {
      const flinchX = hitActive ? -0.22 * hitIntensity : 0;
      const counterSprintLean = sprintingWeaponCarry ? 0.04 : 0;
      torsoRef.current.rotation.x = THREE.MathUtils.damp(
        torsoRef.current.rotation.x,
        clampedPitch * 0.25 + shotKick * 0.06 + flinchX + breathe + counterSprintLean,
        18,
        dt,
      );
      torsoRef.current.rotation.y = THREE.MathUtils.damp(
        torsoRef.current.rotation.y,
        torsoLocalYaw,
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
      // Keep head facing dead ahead (canceling torso twist)
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        -desiredTorsoWorldYaw * 0.85,
        16,
        dt,
      );
    }

    // 5. Combat Arms & Weapon Pivot Kinematics:
    // +rotation.x swings hanging arm FORWARD (-Z).
    // +shoulder.rotation.y swings arm OUT/RIGHT? Check: +Y turns -Z toward -X (LEFT = INWARD for Right shoulder).
    // Right shoulder (+X) uses +ry to reach INWARD toward chest center; Left shoulder (-X) uses -ry to reach INWARD.
    if (shoulderRRef.current && elbowRRef.current && weaponPivotRef.current) {
      const armWalkSway = isMoving && isGrounded ? Math.sin(p) * (isSprinting ? 0.07 : 0.03) : 0;
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

      shoulderRRef.current.rotation.x = THREE.MathUtils.damp(
        shoulderRRef.current.rotation.x,
        targetShRX,
        22,
        dt,
      );
      shoulderRRef.current.rotation.y = THREE.MathUtils.damp(
        shoulderRRef.current.rotation.y,
        targetShRY,
        18,
        dt,
      );
      elbowRRef.current.rotation.x = THREE.MathUtils.damp(
        elbowRRef.current.rotation.x,
        targetElRX,
        22,
        dt,
      );

      // CRITICAL: WeaponModel3D barrel points along local -Z with grip at origin!
      // Cancel accumulated (shoulderR.x + elbowR.x) so barrel stays horizontal + follows aim pitch!
      const curArmPitch =
        shoulderRRef.current.rotation.x + elbowRRef.current.rotation.x;
      const curArmYaw = shoulderRRef.current.rotation.y;

      const desiredWeaponPitch = sprintingWeaponCarry
        ? -0.22
        : isReloading
          ? -0.35
          : clampedPitch * 0.72 + shotKick * 0.1;

      // Keep barrel aimed forward (-Z) during ready/ADS, or angled across chest (+0.62 rad -> left-forward) when sprinting!
      const desiredWeaponYaw = sprintingWeaponCarry
        ? 0.62 + Math.cos(p) * 0.06
        : -desiredTorsoWorldYaw;

      const desiredWeaponRoll = sprintingWeaponCarry
        ? 0.25
        : isReloading
          ? 0.38
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
      const walkArmBob = isMoving && isGrounded ? Math.sin(p) * 0.05 : 0;

      if (isReloading) {
        // Left hand reaches down to magwell and inserts fresh magazine
        const magDip = Math.sin(reloadPhase.current);
        shLX = 0.65 + magDip * 0.35;
        shLY = -0.52;
        shLZ = 0.08;
        elLX = 0.92 + magDip * 0.28;
      } else if (sprintingWeaponCarry) {
        // Left hand supports rifle handguard across the chest while sprinting
        shLX = 0.68 - walkArmBob * 0.8;
        shLY = -0.45;
        shLZ = 0.14;
        elLX = 0.95;
      } else if (isOneHand) {
        // Two-handed tactical weaver pistol support OR crisp off-hand guard
        shLX = 1.05 + clampedPitch * 0.65 + walkArmBob * 0.3;
        shLY = -0.62;
        shLZ = 0.12;
        elLX = 0.48;
      } else {
        // Two-handed rifle/SMG/shotgun/sniper foregrip lock directly onto barrel handguard
        shLX = (isAiming ? 0.82 : 0.72) + clampedPitch * 0.65 + shotKick * 0.1 + walkArmBob * 0.35;
        shLY = isAiming ? -0.66 : -0.62;
        shLZ = 0.1;
        elLX = isAiming ? 0.68 : 0.74;
      }

      shoulderLRef.current.rotation.x = THREE.MathUtils.damp(
        shoulderLRef.current.rotation.x,
        shLX,
        20,
        dt,
      );
      shoulderLRef.current.rotation.y = THREE.MathUtils.damp(
        shoulderLRef.current.rotation.y,
        shLY,
        18,
        dt,
      );
      shoulderLRef.current.rotation.z = THREE.MathUtils.damp(
        shoulderLRef.current.rotation.z,
        shLZ,
        18,
        dt,
      );
      elbowLRef.current.rotation.x = THREE.MathUtils.damp(
        elbowLRef.current.rotation.x,
        elLX,
        20,
        dt,
      );
    }

    // 6. Hit emissive reaction & shield/beacon polish
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
      {/* Unified Articulated Rig: Pelvis centered so boots rest at y = -1.0 */}
      <group ref={pelvisRef} position={[0, -0.02, 0]}>
        <mesh castShadow geometry={SCULPTED_GEOS.pelvis} material={mats.uniformSecondary} />

        {/* Left Leg (Hip -> Thigh -> Knee -> Shin -> Boot) */}
        <group ref={hipLRef} position={[-0.11, -0.06, 0]}>
          <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.thigh} material={mats.uniformPrimary} />
          <group ref={kneeLRef} position={[0, -0.39, 0]}>
            <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.shin} material={mats.uniformSecondary} />
            <mesh castShadow position={[0, -0.42, -0.03]} geometry={SCULPTED_GEOS.boot} material={mats.boots} />
          </group>
        </group>

        {/* Right Leg */}
        <group ref={hipRRef} position={[0.11, -0.06, 0]}>
          <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.thigh} material={mats.uniformPrimary} />
          <group ref={kneeRRef} position={[0, -0.39, 0]}>
            <mesh castShadow position={[0, -0.195, 0]} geometry={SCULPTED_GEOS.shin} material={mats.uniformSecondary} />
            <mesh castShadow position={[0, -0.42, -0.03]} geometry={SCULPTED_GEOS.boot} material={mats.boots} />
          </group>
        </group>

        {/* Upper Spine & Torso Armor */}
        <group ref={torsoRef} position={[0, 0.08, 0]}>
          <mesh castShadow userData={{ flashable: true }} position={[0, 0.24, 0]} geometry={SCULPTED_GEOS.chestArmor} material={mats.armor} />
          <mesh castShadow userData={{ flashable: true }} position={[0, 0.24, 0.14]} geometry={SCULPTED_GEOS.backpack} material={mats.uniformSecondary} />

          {/* Class-specific Backpack / Trauma Cross Accent */}
          {isMedic && (
            <group position={[0, 0.25, 0.205]}>
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

          {/* Team IFF Tactical Chest & Back Patch */}
          {team !== "none" && (
            <group position={[0, 0.28, 0]}>
              <mesh position={[0, 0, -0.135]}>
                <boxGeometry args={[0.16, 0.05, 0.02]} />
                <meshStandardMaterial
                  ref={beaconMatRef}
                  color={teamBadge}
                  emissive={teamBadge}
                  emissiveIntensity={1.8}
                />
              </mesh>
              <mesh position={[0, 0, 0.205]}>
                <boxGeometry args={[0.16, 0.05, 0.02]} />
                <meshStandardMaterial
                  color={teamBadge}
                  emissive={teamBadge}
                  emissiveIntensity={1.8}
                />
              </mesh>
            </group>
          )}

          {/* Neck + Head + Distinct Same-Proportion Headgear & Visor */}
          <group ref={headRef} position={[0, 0.56, 0]}>
            <mesh castShadow geometry={SCULPTED_GEOS.head} material={mats.skinTone} />
            {isCommando ? (
              /* Commando Slanted Beret + Headset Earcup */
              <group>
                <mesh castShadow position={[-0.02, 0.09, 0]} rotation={[0.1, 0, -0.26]}>
                  <cylinderGeometry args={[0.145, 0.135, 0.075, 14]} />
                  <meshStandardMaterial color="#991b1b" roughness={0.75} />
                </mesh>
                <mesh position={[0.14, 0.01, 0]} material={mats.armor}>
                  <boxGeometry args={[0.035, 0.08, 0.07]} />
                </mesh>
                <mesh position={[-0.14, 0.01, 0]} material={mats.armor}>
                  <boxGeometry args={[0.035, 0.08, 0.07]} />
                </mesh>
              </group>
            ) : (
              <mesh
                castShadow
                position={[0, 0.04, 0]}
                geometry={isHeavy ? SCULPTED_GEOS.heavyHelmet : SCULPTED_GEOS.helmet}
                material={mats.armor}
              />
            )}

            <mesh position={[0, 0.025, -0.12]} geometry={SCULPTED_GEOS.visor} material={mats.visor} />

            {isJuggernaut && (
              <mesh castShadow position={[0, -0.05, -0.12]} material={mats.armor}>
                <boxGeometry args={[0.21, 0.08, 0.06]} />
              </mesh>
            )}

            {isSniper && (
              /* Ballistic Rangefinder Monocle Lens */
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

          {/* Right Shoulder -> Upper Arm -> Elbow -> Forearm -> Weapon Hand Socket */}
          <group ref={shoulderRRef} position={[0.22, 0.39, 0]}>
            <mesh castShadow geometry={SCULPTED_GEOS.shoulderPad} material={mats.armor} />
            <mesh castShadow position={[0, -0.14, 0]} geometry={SCULPTED_GEOS.upperArm} material={mats.uniformPrimary} />
            <group ref={elbowRRef} position={[0, -0.28, 0]}>
              <mesh castShadow position={[0, -0.135, 0]} geometry={SCULPTED_GEOS.forearm} material={mats.uniformPrimary} />
              <mesh castShadow position={[0, -0.27, 0]} geometry={SCULPTED_GEOS.glove} material={mats.boots} />
              {/* Weapon Pivot Mounted Upright in Right Hand (Barrel points along -Z) */}
              <group ref={weaponPivotRef} position={[-0.02, -0.27, -0.02]} scale={weaponId === "pistol" ? 0.94 : 0.86}>
                <WeaponModel3D weaponId={weaponId} isReloading={isReloading} skinId={resolvedSkinId} />
              </group>
            </group>
          </group>

          {/* Left Shoulder -> Upper Arm -> Elbow -> Support Forearm */}
          <group ref={shoulderLRef} position={[-0.22, 0.39, 0]}>
            <mesh castShadow geometry={SCULPTED_GEOS.shoulderPad} material={mats.armor} />
            <mesh castShadow position={[0, -0.14, 0]} geometry={SCULPTED_GEOS.upperArm} material={mats.uniformPrimary} />
            <group ref={elbowLRef} position={[0, -0.28, 0]}>
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
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1.1}
            transparent
            opacity={0.22}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
