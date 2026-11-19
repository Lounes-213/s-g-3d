import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CHARACTER_SKINS,
  getDefaultAttachments,
  type SkinId,
  type WeaponAttachments,
  type WeaponId,
} from "@block-shooter/shared";
import { useMagazineReload } from "../../hooks/useWeaponAnimations";
import { SCULPTED_GEOS } from "./sculptedGeometries";
import { WEAPON_VIEWMODEL_TRANSFORMS } from "../../utils/assetPaths";
import {
  cloneDriveWeaponInstance,
  getCachedDriveWeaponSync,
  loadDriveWeaponTemplate,
  preloadAllDriveWeapons,
} from "../../utils/driveModelLoaders";

preloadAllDriveWeapons();

interface WeaponModel3DProps {
  weaponId: WeaponId;
  isReloading?: boolean;
  isFirstPerson?: boolean;
  skinId?: SkinId;
  attachments?: Partial<WeaponAttachments>;
}

function WeaponAttachments3D({
  weaponId,
  attachments,
}: {
  weaponId: WeaponId;
  attachments: WeaponAttachments;
}) {
  const isSidearm = weaponId === "pistol" || weaponId === "revolver";
  const tf = WEAPON_VIEWMODEL_TRANSFORMS[weaponId] || WEAPON_VIEWMODEL_TRANSFORMS.assaultRifle;
  const muzzleZ = tf.muzzle[2];
  const muzzleY = tf.muzzle[1];
  const railY = isSidearm ? 0.068 : weaponId === "lmg" ? 0.088 : 0.072;
  const railZ = isSidearm ? -0.06 : -0.1;

  return (
    <group>
      {/* 1. OPTICS / SCOPES ON TOP RAIL */}
      {attachments.scope === "red_dot" && (
        <group position={[0, railY, railZ]}>
          <mesh>
            <boxGeometry args={[0.036, 0.014, 0.062]} />
            <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[-0.017, 0.022, 0]}>
            <boxGeometry args={[0.005, 0.034, 0.044]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.017, 0.022, 0]}>
            <boxGeometry args={[0.005, 0.034, 0.044]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.038, 0]}>
            <boxGeometry args={[0.038, 0.005, 0.044]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.022, 0]}>
            <sphereGeometry args={[0.004, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}

      {attachments.scope === "holo" && (
        <group position={[0, railY, railZ]}>
          <mesh>
            <boxGeometry args={[0.044, 0.018, 0.082]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0.026, -0.005]}>
            <boxGeometry args={[0.046, 0.038, 0.064]} />
            <meshStandardMaterial color="#111827" metalness={0.82} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.026, 0.029]}>
            <planeGeometry args={[0.032, 0.024]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.85}
              transparent
              opacity={0.42}
            />
          </mesh>
        </group>
      )}

      {attachments.scope === "prism_2x" && (
        <group position={[0, railY + 0.01, railZ - 0.01]}>
          <mesh position={[0, -0.008, 0]}>
            <boxGeometry args={[0.03, 0.02, 0.085]} />
            <meshStandardMaterial color="#18181b" metalness={0.82} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.02, 0.13, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.86} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.02, -0.068]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.008, 12]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.75} />
          </mesh>
        </group>
      )}

      {attachments.scope === "acog_4x" && (
        <group position={[0, railY + 0.012, railZ - 0.02]}>
          <mesh position={[0, -0.01, 0]}>
            <boxGeometry args={[0.032, 0.022, 0.12]} />
            <meshStandardMaterial color="#18181b" metalness={0.82} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.023, 0.021, 0.18, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.022, -0.095]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.023, 0.036, 14]} />
            <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.22} />
          </mesh>
          {/* Fiber-optic illuminated top bar */}
          <mesh position={[0, 0.048, -0.01]}>
            <boxGeometry args={[0.012, 0.009, 0.075]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.1} />
          </mesh>
        </group>
      )}

      {attachments.scope === "sniper_8x" && (
        <group position={[0, railY + 0.018, railZ - 0.03]}>
          <mesh position={[0, -0.014, 0.05]}>
            <boxGeometry args={[0.032, 0.026, 0.022]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.26} />
          </mesh>
          <mesh position={[0, -0.014, -0.06]}>
            <boxGeometry args={[0.032, 0.026, 0.022]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0.024, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.021, 0.021, 0.28, 14]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.024, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.022, 0.075, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Windage & elevation turrets */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.018, 10]} />
            <meshStandardMaterial color="#f43f5e" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.025, 0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 0.016, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* 2. MUZZLE ATTACHMENTS */}
      {attachments.muzzle === "suppressor" && (
        <mesh position={[0, muzzleY, muzzleZ - 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.023, 0.023, 0.22, 14]} />
          <meshStandardMaterial color="#18181b" metalness={0.78} roughness={0.36} />
        </mesh>
      )}

      {attachments.muzzle === "compensator" && (
        <mesh position={[0, muzzleY, muzzleZ - 0.04]} castShadow>
          <boxGeometry args={[0.032, 0.032, 0.085]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.22} />
        </mesh>
      )}

      {attachments.muzzle === "heavy_brake" && (
        <mesh position={[0, muzzleY, muzzleZ - 0.045]} castShadow>
          <boxGeometry args={[0.044, 0.036, 0.095]} />
          <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.2} />
        </mesh>
      )}

      {/* 3. UNDERBARREL GRIPS & TACTICAL LASER */}
      {!isSidearm && attachments.grip === "vertical" && (
        <mesh position={[0, -0.075, -0.34]} castShadow>
          <cylinderGeometry args={[0.016, 0.015, 0.12, 10]} />
          <meshStandardMaterial color="#18181b" roughness={0.62} />
        </mesh>
      )}

      {!isSidearm && attachments.grip === "angled" && (
        <mesh position={[0, -0.042, -0.34]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.034, 0.038, 0.11]} />
          <meshStandardMaterial color="#27272a" roughness={0.58} />
        </mesh>
      )}

      {attachments.grip === "laser_sight" && (
        <group position={[0.034, 0.01, isSidearm ? -0.14 : -0.36]}>
          <mesh>
            <boxGeometry args={[0.024, 0.024, 0.075]} />
            <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.042]}>
            <sphereGeometry args={[0.005, 6, 6]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0016, 0.0016, 3.1, 6]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.35} />
          </mesh>
        </group>
      )}

      {/* 4. EXTENDED / FAST MAGAZINE ACCENT */}
      {!isSidearm && attachments.mag === "extended" && (
        <mesh position={[0, -0.145, -0.14]} rotation={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.068, 12]} />
          <meshStandardMaterial color="#18181b" metalness={0.55} roughness={0.42} />
        </mesh>
      )}
      {!isSidearm && attachments.mag === "fast_mag" && (
        <mesh position={[0, -0.155, -0.14]}>
          <boxGeometry args={[0.042, 0.026, 0.068]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} />
        </mesh>
      )}
    </group>
  );
}

export function WeaponModel3D({
  weaponId,
  isReloading = false,
  isFirstPerson = false,
  skinId = "urban_ops",
  attachments,
}: WeaponModel3DProps) {
  const skin = CHARACTER_SKINS[skinId] || CHARACTER_SKINS.urban_ops;
  const resolvedAttachments = useMemo<WeaponAttachments>(
    () => ({ ...getDefaultAttachments(weaponId), ...(attachments || {}) }),
    [weaponId, attachments],
  );

  const weaponGroupRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const getMagDrop = useMagazineReload(isReloading);

  const syncWeapon = useMemo(() => {
    const cached = getCachedDriveWeaponSync(weaponId);
    return cached ? cloneDriveWeaponInstance(cached) : null;
  }, [weaponId]);

  const [asyncWeapon, setAsyncWeapon] = useState<{
    id: WeaponId;
    obj: THREE.Group;
  } | null>(null);

  useEffect(() => {
    if (syncWeapon) return;
    let cancelled = false;

    loadDriveWeaponTemplate(weaponId)
      .then((template) => {
        if (!cancelled) {
          setAsyncWeapon({
            id: weaponId,
            obj: cloneDriveWeaponInstance(template),
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [weaponId, syncWeapon]);

  useFrame((_, delta) => {
    const offset = getMagDrop(delta);
    if (weaponGroupRef.current) {
      if (isReloading) {
        weaponGroupRef.current.position.y = Math.max(-0.08, offset * 0.25);
        weaponGroupRef.current.rotation.z = -offset * 0.65;
        weaponGroupRef.current.rotation.x = offset * 0.35;
      } else {
        weaponGroupRef.current.position.y = 0;
        weaponGroupRef.current.rotation.set(0, 0, 0);
      }
    }
    if (leftHandRef.current && isFirstPerson) {
      leftHandRef.current.position.y = Math.max(-0.22, offset * 0.55);
      leftHandRef.current.position.z = isReloading ? 0.08 : 0;
    }
  });

  const activeMesh =
    syncWeapon ?? (asyncWeapon?.id === weaponId ? asyncWeapon.obj : null);

  return (
    <group>
      {/* Realistic 1st-Person Tactical Sleeves, Watch & Kevlar Gloves */}
      {isFirstPerson && (
        <group>
          <mesh
            position={[0.02, -0.22, 0.42]}
            rotation={[0.35, 0, 0]}
            geometry={SCULPTED_GEOS.forearm}
          >
            <meshStandardMaterial color={skin.uniformPrimary} roughness={0.78} />
          </mesh>
          <mesh position={[0.0, -0.13, 0.2]}>
            <boxGeometry args={[0.085, 0.095, 0.13]} />
            <meshStandardMaterial color={skin.bootColor} roughness={0.72} />
          </mesh>

          {weaponId !== "pistol" && weaponId !== "revolver" && (
            <group ref={leftHandRef}>
              <mesh
                position={[-0.14, -0.18, 0.05]}
                rotation={[0.25, -0.35, 0.2]}
                geometry={SCULPTED_GEOS.forearm}
              >
                <meshStandardMaterial color={skin.uniformPrimary} roughness={0.78} />
              </mesh>
              {/* Tactical wrist GPS watch */}
              <mesh position={[-0.08, -0.135, -0.08]}>
                <boxGeometry args={[0.095, 0.032, 0.048]} />
                <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[-0.08, -0.118, -0.08]}>
                <boxGeometry args={[0.042, 0.008, 0.032]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.85} />
              </mesh>
              <mesh position={[-0.03, -0.11, -0.18]}>
                <boxGeometry args={[0.09, 0.088, 0.14]} />
                <meshStandardMaterial color={skin.bootColor} roughness={0.72} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Weapon Body + Live 3D Attachments */}
      <group ref={weaponGroupRef}>
        {activeMesh ? (
          <primitive object={activeMesh} />
        ) : (
          <mesh castShadow position={[0, 0, -0.15]}>
            <boxGeometry args={[0.07, 0.12, weaponId === "pistol" ? 0.28 : 0.68]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
          </mesh>
        )}
        <WeaponAttachments3D weaponId={weaponId} attachments={resolvedAttachments} />
      </group>
    </group>
  );
}
