import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { WEAPON_ORDER, type WeaponId } from "@block-shooter/shared";
import { driveWeapons } from "./assetPaths";

const weaponTemplatePromiseCache = new Map<WeaponId, Promise<THREE.Group>>();
const weaponTemplateResolvedCache = new Map<WeaponId, THREE.Group>();

function upgradeMtlMaterial(mat: THREE.Material): THREE.MeshStandardMaterial {
  const matName = (mat.name || "").toLowerCase();
  const baseColor =
    "color" in mat && mat.color instanceof THREE.Color
      ? mat.color.clone()
      : new THREE.Color("#27272a");

  // Blender OBJ/MTL linear diffuse values are quite dark in sRGB Three.js scenes;
  // gently brighten dark metals & woods while preserving tactical contrast.
  baseColor.convertLinearToSRGB();
  baseColor.multiplyScalar(0.82);

  const isMetal = matName.includes("metal") || matName.includes("grey") || matName.includes("silver");
  const isWood = matName.includes("wood");
  const isAccent = matName.includes("gold") || matName.includes("orange") || matName.includes("red");

  return new THREE.MeshStandardMaterial({
    name: mat.name,
    color: baseColor,
    metalness: isMetal ? 0.86 : isAccent ? 0.55 : isWood ? 0.08 : 0.32,
    roughness: isMetal ? 0.24 : isWood ? 0.62 : 0.46,
  });
}

async function fetchAndNormalizeDriveWeapon(weaponId: WeaponId): Promise<THREE.Group> {
  const spec = driveWeapons[weaponId] || driveWeapons.assaultRifle;

  const mtlLoader = new MTLLoader();
  mtlLoader.setResourcePath("/models/drive/weapons/");
  const materials = await mtlLoader.loadAsync(spec.mtl);
  materials.preload();

  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  const rawObj = await objLoader.loadAsync(spec.obj);

  // Compute raw bounds along +X barrel axis
  const rawBox = new THREE.Box3().setFromObject(rawObj);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const rawLength = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
  const scaleFactor = spec.targetLength / rawLength;

  // Pivot around rear-grip/receiver center (35% from buttstock along X)
  const gripPivotX = rawBox.min.x + rawSize.x * 0.34;
  rawObj.position.set(-gripPivotX, -rawCenter.y, -rawCenter.z);

  const normalizedRoot = new THREE.Group();
  const barrelRotateWrapper = new THREE.Group();
  // Drive OBJ weapons point barrel along +X; +Math.PI/2 around Y turns +X -> -Z forward aim
  barrelRotateWrapper.rotation.y = Math.PI / 2;
  barrelRotateWrapper.scale.setScalar(scaleFactor);
  barrelRotateWrapper.add(rawObj);
  normalizedRoot.add(barrelRotateWrapper);

  // Convert legacy MeshPhongMaterials from MTLLoader into PBR MeshStandardMaterials + shadow support
  rawObj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (Array.isArray(child.material)) {
        child.material = child.material.map(upgradeMtlMaterial);
      } else if (child.material) {
        child.material = upgradeMtlMaterial(child.material);
      }
    }
  });

  weaponTemplateResolvedCache.set(weaponId, normalizedRoot);
  return normalizedRoot;
}

export function getCachedDriveWeaponSync(weaponId: WeaponId): THREE.Group | null {
  return weaponTemplateResolvedCache.get(weaponId) ?? null;
}

export function loadDriveWeaponTemplate(weaponId: WeaponId): Promise<THREE.Group> {
  const existing = weaponTemplatePromiseCache.get(weaponId);
  if (existing) return existing;
  const promise = fetchAndNormalizeDriveWeapon(weaponId);
  weaponTemplatePromiseCache.set(weaponId, promise);
  return promise;
}

export function cloneDriveWeaponInstance(template: THREE.Group): THREE.Group {
  return template.clone(true);
}

let preloadedWeapons = false;
export function preloadAllDriveWeapons(): void {
  if (preloadedWeapons) return;
  preloadedWeapons = true;
  for (const id of WEAPON_ORDER) {
    void loadDriveWeaponTemplate(id).catch(() => {
      // Ignore individual preload network errors during teardown
    });
  }
}
