import { useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "../../stores/useGameStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useAppStore } from "../../stores/useAppStore";
import {
  CHARACTERS,
  MAPS,
  PHYSICS_CONFIG,
  PLAYER_CONFIG,
  WEAPONS,
  WEAPON_ORDER,
  combatState,
  computeMuzzleWorldPos,
  movementState,
  raycastMapBoxes,
  type SkillId,
  type WeaponId,
} from "@block-shooter/shared";
import { arenaPhysics } from "../../utils/cannonPhysics";
import { calculateHeadbobOffset } from "../../utils/headbob";
import { soloEngine } from "../../utils/soloEngine";
import { soundEngine } from "../../utils/soundEngine";
import { touchInputState } from "../../utils/touchControlsState";
import { WEAPON_VIEWMODEL_TRANSFORMS } from "../../utils/assetPaths";
import { CharacterModel3D } from "./CharacterModel3D";

const euler = new THREE.Euler(0, 0, 0, "YXZ");

const LocalPlayer = () => {
  const localId = useGameStore((state) => state.localId);
  const channel = useGameStore((state) => state.channel);
  const me = useGameStore((state) =>
    state.localId ? state.players[state.localId] : null,
  );
  const myHit = useGameStore((state) =>
    state.localId ? state.hitEntities[state.localId] : undefined,
  );
  const mapId = useGameStore((state) => state.mapId);
  const playMode = useGameStore((state) => state.sessionConfig.playMode);
  const sessionSkin = useGameStore((state) => state.sessionConfig.skinId);
  const setLocked = useGameStore((state) => state.setLocked);
  const setCrosshairSpread = useGameStore((state) => state.setCrosshairSpread);

  const perspective = useSettingsStore((state) => state.perspective);
  const fov = useSettingsStore((state) => state.fov);

  const playerPos = useRef(new THREE.Vector3(0, 1.5, 0));
  const localBodyY = useRef(1.0);
  const localVy = useRef(0);
  const localGrounded = useRef(true);
  const jumpsUsedRef = useRef(0);
  const lastDoubleJumpAtRef = useRef(0);
  const jumpPadHoldUntil = useRef(0);

  const localCharGroupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<{ pointerSpeed: number } | null>(null);

  const lastEmit = useRef(0);
  const initialized = useRef(false);
  const lastShotClient = useRef(0);
  const triggerReady = useRef(true);
  const burstShotsLeft = useRef(0);
  const currentSpread = useRef(0);
  const lastSpreadSent = useRef(0);
  const bobTime = useRef(0);
  const nextStepAt = useRef(0);
  const sprintToggled = useRef(false);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const smoothCamDist = useRef(3.4);

  // Pre-allocated vectors for zero-GC frame loop
  const direction = useRef(new THREE.Vector3());
  const frontVector = useRef(new THREE.Vector3());
  const sideVector = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());
  const camUpRef = useRef(new THREE.Vector3());
  const eyeOriginRef = useRef(new THREE.Vector3());
  const camRightRef = useRef(new THREE.Vector3());
  const desiredCamPosRef = useRef(new THREE.Vector3());
  const toCamRef = useRef(new THREE.Vector3());
  const toCamNormRef = useRef(new THREE.Vector3());
  const shootOriginRef = useRef(new THREE.Vector3());
  const shootTargetRef = useRef(new THREE.Vector3());
  const shootDirRef = useRef(new THREE.Vector3());
  const muzzleVecRef = useRef(new THREE.Vector3());

  // Reset initialization & build Cannon-es arena colliders when map or localId changes
  useEffect(() => {
    arenaPhysics.initMap(mapId);
    initialized.current = false;
    jumpsUsedRef.current = 0;
  }, [mapId, localId]);

  useEffect(() => {
    const triggerJumpAction = () => {
      const st = useGameStore.getState();
      const curMe = st.localId ? st.players[st.localId] : null;
      if (curMe?.isDead) return;

      if (localGrounded.current) {
        localVy.current = PHYSICS_CONFIG.JUMP_FORCE;
        localGrounded.current = false;
        jumpsUsedRef.current = 1;
        arenaPhysics.setJumpVelocity(PHYSICS_CONFIG.JUMP_FORCE);
        soundEngine.playJump(false);
      } else if (jumpsUsedRef.current < PHYSICS_CONFIG.MAX_JUMPS) {
        localVy.current = PHYSICS_CONFIG.DOUBLE_JUMP_FORCE;
        jumpsUsedRef.current += 1;
        lastDoubleJumpAtRef.current = Date.now();
        arenaPhysics.setJumpVelocity(PHYSICS_CONFIG.DOUBLE_JUMP_FORCE);
        soundEngine.playJump(true);
      } else {
        return;
      }

      if (playMode === "solo") {
        soloEngine.jumpLocal();
      } else if (channel) {
        channel.emit("jump");
      }
    };

    const handleJumpPad = (e: Event) => {
      const custom = e as CustomEvent<{ boostY?: number }>;
      const boost = custom.detail?.boostY ?? 28;
      localVy.current = boost;
      localGrounded.current = false;
      jumpsUsedRef.current = 1;
      jumpPadHoldUntil.current = performance.now() + 260;
      arenaPhysics.setJumpVelocity(boost);
    };

    const handleTeamSwitched = (e: Event) => {
      const custom = e as CustomEvent<{ x: number; y: number; z: number }>;
      if (!custom.detail) return;
      const { x, y, z } = custom.detail;
      localBodyY.current = y;
      localVy.current = 0;
      localGrounded.current = true;
      jumpsUsedRef.current = 0;
      arenaPhysics.teleportPlayer(x, y, z);
      playerPos.current.set(x, y + PLAYER_CONFIG.EYE_LEVEL_OFFSET, z);
    };

    window.addEventListener("local-jump-pad", handleJumpPad);
    window.addEventListener("local-touch-jump", triggerJumpAction);
    window.addEventListener("local-team-switched", handleTeamSwitched);

    const emitWeaponSwitch = (weaponId: WeaponId) => {
      if (playMode === "solo") {
        soloEngine.switchWeaponLocal(weaponId);
      } else if (channel) {
        channel.emit("switchWeapon", weaponId);
      }
    };

    const emitSkill = (skillId: SkillId) => {
      const dir = camDir.current;
      if (playMode === "solo") {
        soloEngine.useSkillLocal(skillId, {
          dirX: dir.x,
          dirY: dir.y,
          dirZ: dir.z,
        });
      } else if (channel) {
        channel.emit("use_skill", {
          skillId,
          dirX: dir.x,
          dirY: dir.y,
          dirZ: dir.z,
        });
        soundEngine.playSkill(skillId);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const settings = useSettingsStore.getState();
      const kb = settings.keybindings;
      const code = e.code;

      if (code === kb.moveForward) movementState.forward = true;
      if (code === kb.moveBackward) movementState.backward = true;
      if (code === kb.moveLeft) movementState.left = true;
      if (code === kb.moveRight) movementState.right = true;
      if (code === kb.crouch) movementState.crouch = true;

      if (code === kb.sprint && !e.repeat) {
        if (settings.sprintMode === "toggle") {
          sprintToggled.current = !sprintToggled.current;
          movementState.sprint = sprintToggled.current;
        } else {
          movementState.sprint = true;
        }
      }

      if (code === kb.jump && !e.repeat) {
        movementState.jump = true;
        triggerJumpAction();
      }

      if (code === kb.togglePerspective && !e.repeat) {
        settings.togglePerspective();
        soundEngine.playClick();
      }

      if (code === kb.toggleControls && !e.repeat) {
        useAppStore.getState().toggleControls();
        soundEngine.playClick();
      }

      if (code === kb.weapon1) emitWeaponSwitch(WEAPON_ORDER[0]);
      if (code === kb.weapon2) emitWeaponSwitch(WEAPON_ORDER[1]);
      if (code === kb.weapon3) emitWeaponSwitch(WEAPON_ORDER[2]);
      if (code === kb.weapon4) emitWeaponSwitch(WEAPON_ORDER[3]);
      if (code === kb.weapon5) emitWeaponSwitch(WEAPON_ORDER[4]);
      if (code === kb.weapon6) emitWeaponSwitch(WEAPON_ORDER[5]);
      if (code === kb.weapon7) emitWeaponSwitch(WEAPON_ORDER[6]);
      if (code === kb.weapon8) emitWeaponSwitch(WEAPON_ORDER[7]);
      if (code === kb.weapon9) emitWeaponSwitch(WEAPON_ORDER[8]);
      if (code === kb.weapon10) emitWeaponSwitch(WEAPON_ORDER[9]);

      if (code === kb.reload && !e.repeat) {
        combatState.isAiming = false;
        if (playMode === "solo") {
          soloEngine.reloadLocal();
        } else if (channel) {
          channel.emit("reload");
        }
      }

      if (code === kb.skill1 && !e.repeat) emitSkill("dash");
      if (code === kb.skill2 && !e.repeat) emitSkill("shield");
      if (code === kb.skill3 && !e.repeat) emitSkill("grenade");
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const settings = useSettingsStore.getState();
      const kb = settings.keybindings;
      const code = e.code;

      if (code === kb.moveForward) movementState.forward = false;
      if (code === kb.moveBackward) movementState.backward = false;
      if (code === kb.moveLeft) movementState.left = false;
      if (code === kb.moveRight) movementState.right = false;
      if (code === kb.sprint && settings.sprintMode === "hold") {
        movementState.sprint = false;
      }
      if (code === kb.crouch) movementState.crouch = false;
      if (code === kb.jump) movementState.jump = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!useGameStore.getState().isLocked) return;
      const state = useGameStore.getState();
      const curMe = state.localId ? state.players[state.localId] : null;
      if (!curMe) return;
      const idx = WEAPON_ORDER.indexOf(curMe.currentWeapon);
      const nextIdx =
        (idx + (e.deltaY > 0 ? 1 : -1) + WEAPON_ORDER.length) %
        WEAPON_ORDER.length;
      emitWeaponSwitch(WEAPON_ORDER[nextIdx]);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!useGameStore.getState().isLocked) return;
      if (e.button === 0) combatState.isShooting = true;
      if (e.button === 2) {
        const mode = useSettingsStore.getState().adsMode;
        combatState.isAiming = mode === "toggle" ? !combatState.isAiming : true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        combatState.isShooting = false;
        triggerReady.current = true;
      }
      if (e.button === 2) {
        const mode = useSettingsStore.getState().adsMode;
        if (mode === "hold") {
          combatState.isAiming = false;
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel);

    return () => {
      window.removeEventListener("local-jump-pad", handleJumpPad);
      window.removeEventListener("local-touch-jump", triggerJumpAction);
      window.removeEventListener("local-team-switched", handleTeamSwitched);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [channel, playMode]);

  useFrame((state, delta) => {
    if (!localId) return;

    const dt = Math.min(delta, 0.05);
    const camera = state.camera as THREE.PerspectiveCamera;
    const curMe = useGameStore.getState().players[localId];
    const map = MAPS[mapId] || MAPS.veridian_04;
    const nowPerf = performance.now();

    const activeWeaponId: WeaponId = curMe?.currentWeapon || "assaultRifle";
    const wpnStats = WEAPONS[activeWeaponId] || WEAPONS.assaultRifle;
    const baseFov = fov;
    const zoomRatio = THREE.MathUtils.clamp(
      camera.fov / Math.max(10, baseFov),
      0.16,
      1.0,
    );

    if (controlsRef.current) {
      controlsRef.current.pointerSpeed =
        useSettingsStore.getState().mouseSensitivity * zoomRatio;
    }

    // Apply mobile touch look deltas cleanly scaled to current optical zoom
    if (
      Math.abs(touchInputState.lookYawDelta) > 0.0001 ||
      Math.abs(touchInputState.lookPitchDelta) > 0.0001
    ) {
      euler.setFromQuaternion(camera.quaternion, "YXZ");
      euler.y += touchInputState.lookYawDelta * zoomRatio;
      euler.x = THREE.MathUtils.clamp(
        euler.x + touchInputState.lookPitchDelta * zoomRatio,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05,
      );
      camera.quaternion.setFromEuler(euler);
      touchInputState.lookYawDelta = 0;
      touchInputState.lookPitchDelta = 0;
    }

    const eyeOffset = movementState.crouch
      ? PLAYER_CONFIG.CROUCH_EYE_OFFSET
      : PLAYER_CONFIG.EYE_LEVEL_OFFSET;

    if (curMe) {
      const dist = Math.hypot(
        curMe.x - playerPos.current.x,
        curMe.z - playerPos.current.z,
      );
      if (!initialized.current || curMe.isDead || dist > 10.0) {
        localBodyY.current = curMe.y;
        localVy.current = 0;
        localGrounded.current = curMe.isGrounded ?? true;
        if (localGrounded.current) jumpsUsedRef.current = 0;
        arenaPhysics.teleportPlayer(curMe.x, curMe.y, curMe.z);
        playerPos.current.set(curMe.x, curMe.y + eyeOffset, curMe.z);
        initialized.current = true;
      }
    }

    if (currentSpread.current > 0) {
      currentSpread.current = Math.max(0, currentSpread.current - dt * 60);
    }

    const targetFov = combatState.isAiming
      ? baseFov / (wpnStats.adsZoom || 1.45)
      : baseFov;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 18, dt);
      camera.updateProjectionMatrix();
    }

    const liveSettings = useSettingsStore.getState();

    // Combine keyboard + touch joystick movement
    const keyForward =
      (movementState.forward ? 1 : 0) - (movementState.backward ? 1 : 0);
    const keyRight = (movementState.left ? 1 : 0) - (movementState.right ? 1 : 0);
    const forward = THREE.MathUtils.clamp(keyForward + touchInputState.moveY, -1, 1);
    const right = THREE.MathUtils.clamp(keyRight - touchInputState.moveX, -1, 1);
    const isMoving = Math.hypot(forward, right) > 0.05;
    const autoSprintEngaged = liveSettings.autoSprint && forward > 0.45;
    const effectiveSprint =
      (movementState.sprint || touchInputState.sprintActive || autoSprintEngaged) &&
      !movementState.crouch &&
      !combatState.isAiming;

    if (curMe?.isDead || curMe?.isReloading) {
      combatState.isAiming = false;
    }

    // Desired horizontal velocity fed into Cannon-es rigid body
    let targetVx = 0;
    let targetVz = 0;

    if (isMoving && (!curMe || !curMe.isDead)) {
      const charCfg = curMe
        ? CHARACTERS[curMe.characterId] || CHARACTERS.striker
        : CHARACTERS.striker;
      const aimPenalty = combatState.isAiming ? 0.72 : 1.0;
      const isDashing = curMe?.dashUntil && curMe.dashUntil > Date.now();

      let baseSpeed = movementState.crouch
        ? PHYSICS_CONFIG.CROUCH_SPEED
        : effectiveSprint
          ? PHYSICS_CONFIG.SPRINT_SPEED
          : PHYSICS_CONFIG.WALK_SPEED;

      if (isDashing) {
        baseSpeed = PHYSICS_CONFIG.DASH_IMPULSE;
      }

      const moveStrength = Math.min(1, Math.hypot(forward, right));
      const finalSpeedPerSec =
        baseSpeed *
        charCfg.speedMult *
        wpnStats.moveSpeedMult *
        aimPenalty *
        moveStrength;

      camera.getWorldDirection(frontVector.current);
      frontVector.current.y = 0;
      if (frontVector.current.lengthSq() < 0.0001) {
        frontVector.current.set(0, 0, -1);
      }
      frontVector.current.normalize();

      sideVector.current.crossVectors(camera.up, frontVector.current).normalize();

      direction.current
        .set(0, 0, 0)
        .addScaledVector(frontVector.current, forward)
        .addScaledVector(sideVector.current, right)
        .normalize()
        .multiplyScalar(finalSpeedPerSec);

      targetVx = direction.current.x;
      targetVz = direction.current.z;

      currentSpread.current = Math.min(
        currentSpread.current + dt * 28 * (movementState.crouch ? 0.65 : 1.0),
        combatState.isAiming ? 7 : 16,
      );
      bobTime.current += dt;

      if (localGrounded.current && nowPerf >= nextStepAt.current) {
        soundEngine.playFootstep(effectiveSprint);
        nextStepAt.current = nowPerf + (effectiveSprint ? 300 : 460);
      }
    } else {
      bobTime.current = 0;
      if (useSettingsStore.getState().sprintMode === "toggle" && !isMoving) {
        sprintToggled.current = false;
        movementState.sprint = false;
      }
    }

    // Step Cannon-es physics world for gravity, wall/prop collisions, jump pads & stair glide
    if (!curMe || !curMe.isDead) {
      if (nowPerf > jumpPadHoldUntil.current) {
        for (const pad of map.jumpPads) {
          const dPad = Math.hypot(
            playerPos.current.x - pad.x,
            playerPos.current.z - pad.z,
          );
          if (
            dPad <= pad.radius + 0.45 &&
            Math.abs(localBodyY.current - 1.0 - pad.y) < 1.5
          ) {
            localVy.current = pad.boostY;
            localGrounded.current = false;
            jumpsUsedRef.current = 1;
            jumpPadHoldUntil.current = nowPerf + 280;
            arenaPhysics.setJumpVelocity(pad.boostY);
            soundEngine.playJumpPad();
            break;
          }
        }
      }

      const phys = arenaPhysics.step(
        dt,
        targetVx,
        targetVz,
        nowPerf <= jumpPadHoldUntil.current,
      );

      playerPos.current.x = phys.x;
      playerPos.current.z = phys.z;
      localBodyY.current = phys.y;
      localGrounded.current = phys.grounded;
      localVy.current = arenaPhysics.playerBody.velocity.y;

      if (phys.grounded) {
        jumpsUsedRef.current = 0;
      }
      if (phys.landedImpactSpeed > 0) {
        soundEngine.playFootstep(true);
      }

      const targetEyeY = localBodyY.current + eyeOffset;
      playerPos.current.y = THREE.MathUtils.damp(
        playerPos.current.y,
        targetEyeY,
        32,
        dt,
      );
    }

    euler.setFromQuaternion(camera.quaternion);
    currentYaw.current = euler.y;
    currentPitch.current = euler.x;

    camera.getWorldDirection(camDir.current);
    const camRight = camRightRef.current
      .crossVectors(camDir.current, camera.up)
      .normalize();
    const camUp = camUpRef.current.crossVectors(camRight, camDir.current).normalize();

    const bobOffset =
      isMoving && localGrounded.current
        ? calculateHeadbobOffset(bobTime.current, effectiveSprint) * 0.72
        : 0;

    if (perspective === "1p") {
      camera.position.set(
        playerPos.current.x,
        playerPos.current.y + bobOffset,
        playerPos.current.z,
      );
      if (localCharGroupRef.current) {
        localCharGroupRef.current.visible = false;
      }
    } else {
      const eyeOrigin = eyeOriginRef.current.set(
        playerPos.current.x,
        playerPos.current.y + (combatState.isAiming ? 0.14 : 0.2),
        playerPos.current.z,
      );

      const shoulderSign = liveSettings.cameraShoulder === "left" ? -1 : 1;
      const shoulderRight =
        (combatState.isAiming ? 0.64 : 0.62) * shoulderSign;
      const baseDist = THREE.MathUtils.clamp(liveSettings.cameraDistance || 3.8, 2.4, 5.5);
      const isScopedSniper = combatState.isAiming && activeWeaponId === "sniper";
      const desiredBack = isScopedSniper
        ? 0.25
        : combatState.isAiming
          ? Math.max(1.45, baseDist * 0.46)
          : baseDist;

      const desiredCamPos = desiredCamPosRef.current
        .copy(eyeOrigin)
        .addScaledVector(camRight, isScopedSniper ? 0 : shoulderRight)
        .addScaledVector(camDir.current, -desiredBack);
      desiredCamPos.y += combatState.isAiming ? 0.08 : 0.14;

      const toCam = toCamRef.current.subVectors(desiredCamPos, eyeOrigin);
      const maxLen = Math.max(0.01, toCam.length());
      const toCamNorm = toCamNormRef.current.copy(toCam).divideScalar(maxLen);

      const wallDist = raycastMapBoxes(
        eyeOrigin.x,
        eyeOrigin.y,
        eyeOrigin.z,
        toCamNorm.x,
        toCamNorm.y,
        toCamNorm.z,
        maxLen,
        map,
      );

      const targetSafe = isScopedSniper ? 0.1 : Math.max(0.45, wallDist - 0.25);
      smoothCamDist.current = THREE.MathUtils.damp(
        smoothCamDist.current,
        targetSafe,
        isScopedSniper ? 35 : 18,
        dt,
      );
      camera.position
        .copy(eyeOrigin)
        .addScaledVector(toCamNorm, smoothCamDist.current);

      if (localCharGroupRef.current) {
        localCharGroupRef.current.visible = !curMe?.isDead && !isScopedSniper;
        localCharGroupRef.current.position.set(
          playerPos.current.x,
          localBodyY.current,
          playerPos.current.z,
        );
        localCharGroupRef.current.rotation.set(0, euler.y, 0);
      }
    }

    const fireShot = () => {
      const origin = shootOriginRef.current.set(
        playerPos.current.x,
        playerPos.current.y,
        playerPos.current.z,
      );
      const shootDir = shootDirRef.current.copy(camDir.current);

      let muzzleWorld: { x: number; y: number; z: number };
      if (perspective === "1p") {
        const vt =
          WEAPON_VIEWMODEL_TRANSFORMS[activeWeaponId] ||
          WEAPON_VIEWMODEL_TRANSFORMS.assaultRifle;
        const baseX = combatState.isAiming ? vt.adsX : vt.posX;
        const baseY = combatState.isAiming ? vt.adsY : vt.posY;
        const baseZ = combatState.isAiming ? vt.adsZ : vt.posZ;
        const lx = baseX + vt.muzzle[0] * vt.scale;
        const ly = baseY + vt.muzzle[1] * vt.scale;
        const lz = baseZ + vt.muzzle[2] * vt.scale;

        const mVec = muzzleVecRef.current
          .copy(camera.position)
          .addScaledVector(camRight, lx)
          .addScaledVector(camUp, ly)
          .addScaledVector(camDir.current, -lz);
        muzzleWorld = { x: mVec.x, y: mVec.y, z: mVec.z };
      } else {
        const hitDist = raycastMapBoxes(
          camera.position.x,
          camera.position.y,
          camera.position.z,
          camDir.current.x,
          camDir.current.y,
          camDir.current.z,
          140,
          map,
        );
        const targetPt = shootTargetRef.current
          .copy(camera.position)
          .addScaledVector(camDir.current, Math.max(2.2, hitDist));
        shootDir.subVectors(targetPt, origin).normalize();

        muzzleWorld = computeMuzzleWorldPos(
          playerPos.current.x,
          localBodyY.current,
          playerPos.current.z,
          currentYaw.current,
          currentPitch.current,
          activeWeaponId,
          movementState.crouch,
          combatState.isAiming,
        );
      }

      const payload = {
        dirX: shootDir.x,
        dirY: shootDir.y,
        dirZ: shootDir.z,
        muzzle: muzzleWorld,
      };

      if (playMode === "solo") {
        soloEngine.shootLocal(payload);
      } else if (channel) {
        channel.emit("shoot", payload);
      }

      // Apply physical impulse to nearby dynamic Cannon-es crates & barrels along shot line
      arenaPhysics.applyShotImpulse(
        origin.x,
        origin.y,
        origin.z,
        shootDir.x,
        shootDir.y,
        shootDir.z,
        46,
      );

      const crouchMult = movementState.crouch ? 0.72 : 1.0;
      const aimMult = combatState.isAiming ? 0.74 : 1.0;
      window.dispatchEvent(
        new CustomEvent("weapon-fired", {
          detail: { kick: wpnStats.recoilKick * crouchMult * aimMult },
        }),
      );
    };

    if (curMe && !curMe.isDead && !curMe.isReloading && curMe.ammo > 0) {
      const shotSpreadGain =
        14 *
        (combatState.isAiming ? 0.45 : 1.0) *
        (movementState.crouch ? 0.72 : 1.0);
      if (burstShotsLeft.current > 0) {
        if (nowPerf - lastShotClient.current >= wpnStats.fireRate) {
          fireShot();
          lastShotClient.current = nowPerf;
          burstShotsLeft.current -= 1;
          currentSpread.current = Math.min(currentSpread.current + shotSpreadGain, 42);
        }
      } else if (combatState.isShooting) {
        if (nowPerf - lastShotClient.current >= wpnStats.fireRate) {
          if (wpnStats.mode === "auto" || triggerReady.current) {
            fireShot();
            lastShotClient.current = nowPerf;
            currentSpread.current = Math.min(currentSpread.current + shotSpreadGain, 42);

            if (wpnStats.mode === "burst") {
              burstShotsLeft.current = Math.min(3, curMe.ammo) - 1;
            }
            if (wpnStats.mode !== "auto") {
              triggerReady.current = false;
            }
          }
        }
      }
    }

    if (
      Math.abs(currentSpread.current - lastSpreadSent.current) > 0.35 ||
      (currentSpread.current === 0 && lastSpreadSent.current !== 0)
    ) {
      lastSpreadSent.current = currentSpread.current;
      setCrosshairSpread(currentSpread.current);
    }

    const moveForward = forward;
    const moveRight = -right;

    if (playMode === "solo") {
      soloEngine.updateLocalInput({
        x: playerPos.current.x,
        y: localBodyY.current,
        z: playerPos.current.z,
        yaw: currentYaw.current,
        pitch: currentPitch.current,
        isCrouching: movementState.crouch,
        isSprinting: effectiveSprint,
        isMoving,
        isGrounded: localGrounded.current,
        moveForward,
        moveRight,
        isAiming: combatState.isAiming,
        lastDoubleJumpAt: lastDoubleJumpAtRef.current,
      });
    } else if (channel && nowPerf - lastEmit.current > 33) {
      channel.emit("playerInput", {
        yaw: currentYaw.current,
        pitch: currentPitch.current,
        x: playerPos.current.x,
        y: localBodyY.current,
        z: playerPos.current.z,
        isCrouching: movementState.crouch,
        isSprinting: effectiveSprint,
        isMoving,
        isGrounded: localGrounded.current,
        moveForward,
        moveRight,
        isAiming: combatState.isAiming,
        lastDoubleJumpAt: lastDoubleJumpAtRef.current,
      });
      lastEmit.current = nowPerf;
    }
  });

  return (
    <>
      <PointerLockControls
        ref={controlsRef as never}
        selector="#play-button"
        onLock={() => setLocked(true)}
        onUnlock={() => setLocked(false)}
      />

      {/* Local Player's Third-Person Articulated Humanoid Model */}
      <group ref={localCharGroupRef} visible={false}>
        {me && (
          <Suspense fallback={null}>
            <CharacterModel3D
              characterId={me.characterId || "striker"}
              skinId={me.skinId || sessionSkin}
              team={me.team}
              weaponId={me.currentWeapon || "assaultRifle"}
              pitch={me.pitch || 0}
              isMoving={me.isMoving}
              isSprinting={me.isSprinting}
              isCrouching={me.isCrouching}
              isReloading={me.isReloading}
              isGrounded={me.isGrounded ?? true}
              isAiming={combatState.isAiming}
              moveForward={me.moveForward ?? 0}
              moveRight={me.moveRight ?? 0}
              lastShotAt={me.lastShotTime || 0}
              shield={me.shield || 0}
              dashUntil={me.dashUntil || 0}
              lastDoubleJumpAt={me.lastDoubleJumpAt || 0}
              lastHitAt={myHit?.at || 0}
              lastHitHeadshot={myHit?.isHeadshot || false}
            />
          </Suspense>
        )}
      </group>
    </>
  );
};

export default LocalPlayer;
