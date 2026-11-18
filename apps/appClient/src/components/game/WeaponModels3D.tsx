import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CHARACTER_SKINS,
  type SkinId,
  type WeaponId,
} from "@block-shooter/shared";
import { useMagazineReload } from "../../hooks/useWeaponAnimations";
import { SCULPTED_GEOS } from "./sculptedGeometries";
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
}

export function WeaponModel3D({
  weaponId,
  isReloading = false,
  isFirstPerson = false,
  skinId = "urban_ops",
}: WeaponModel3DProps) {
  const skin = CHARACTER_SKINS[skinId] || CHARACTER_SKINS.urban_ops;

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
      .catch(() => {
        // Fallback mesh renders cleanly if asset fetch fails
      });

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
      {/* Realistic 1st-Person Sleeves & Tactical Gloves */}
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
              <mesh position={[-0.03, -0.11, -0.18]}>
                <boxGeometry args={[0.09, 0.088, 0.14]} />
                <meshStandardMaterial color={skin.bootColor} roughness={0.72} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Real Blender OBJ+MTL Weapon Mesh from Google Drive */}
      <group ref={weaponGroupRef}>
        {activeMesh ? (
          <primitive object={activeMesh} />
        ) : (
          <mesh castShadow position={[0, 0, -0.15]}>
            <boxGeometry args={[0.07, 0.12, weaponId === "pistol" ? 0.28 : 0.68]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
}
