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

function addBoxPart(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  rx = 0,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}

function addCylPart(
  parent: THREE.Group,
  rTop: number,
  rBot: number,
  len: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  rx = Math.PI / 2,
  seg = 12,
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}

function createProceduralWeaponTemplate(weaponId: WeaponId): THREE.Group {
  const root = new THREE.Group();
  const darkMetal = new THREE.MeshStandardMaterial({
    color: "#1e293b",
    metalness: 0.85,
    roughness: 0.26,
  });
  const gunSteel = new THREE.MeshStandardMaterial({
    color: "#475569",
    metalness: 0.88,
    roughness: 0.22,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: "#18181b",
    metalness: 0.22,
    roughness: 0.56,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#cbd5e1",
    metalness: 0.92,
    roughness: 0.16,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#d97706",
    metalness: 0.75,
    roughness: 0.28,
  });

  if (weaponId === "dmr") {
    // MK-14 EBR Marksman Rifle: chassis, stock, precision fluted barrel, ACOG optic, mag, bipod
    addBoxPart(root, 0.062, 0.085, 0.42, 0, 0.01, -0.1, darkMetal);
    addBoxPart(root, 0.054, 0.068, 0.28, 0, 0.012, -0.38, gunSteel);
    addBoxPart(root, 0.048, 0.095, 0.22, 0, -0.005, 0.2, polymer);
    addBoxPart(root, 0.044, 0.12, 0.045, 0, -0.08, 0.02, polymer, 0.26); // Grip
    addBoxPart(root, 0.038, 0.13, 0.068, 0, -0.11, -0.12, darkMetal, -0.08); // 20-rd Mag
    addCylPart(root, 0.014, 0.014, 0.46, 0, 0.022, -0.62, gunSteel); // Heavy barrel
    addCylPart(root, 0.02, 0.018, 0.08, 0, 0.022, -0.86, darkMetal); // Muzzle brake
    // ACOG Scope + mounts
    addBoxPart(root, 0.036, 0.022, 0.16, 0, 0.06, -0.1, polymer);
    addCylPart(root, 0.024, 0.024, 0.2, 0, 0.088, -0.11, darkMetal);
    addCylPart(root, 0.029, 0.024, 0.04, 0, 0.088, -0.22, gunSteel);
    addBoxPart(root, 0.016, 0.012, 0.08, 0, 0.112, -0.11, new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 0.7 }));
    // Folded bipod legs
    addCylPart(root, 0.008, 0.008, 0.2, -0.026, -0.032, -0.44, gunSteel);
    addCylPart(root, 0.008, 0.008, 0.2, 0.026, -0.032, -0.44, gunSteel);
  } else if (weaponId === "lmg") {
    // M249 Vulcan LMG: chunky receiver, vented heatshield shroud, 85-rd box drum, carry handle
    addBoxPart(root, 0.086, 0.115, 0.46, 0, 0.01, -0.12, darkMetal);
    addBoxPart(root, 0.078, 0.095, 0.32, 0, 0.015, -0.44, gunSteel);
    addBoxPart(root, 0.06, 0.115, 0.24, 0, -0.01, 0.22, polymer);
    addBoxPart(root, 0.046, 0.12, 0.048, 0, -0.085, 0.04, polymer, 0.22); // Grip
    // 85-rd Ammo Drum & Brass Feed Belt
    addBoxPart(root, 0.15, 0.125, 0.12, -0.02, -0.105, -0.12, new THREE.MeshStandardMaterial({ color: "#365314", roughness: 0.5 }));
    addBoxPart(root, 0.045, 0.03, 0.06, -0.052, -0.02, -0.12, brass);
    // Heavy Barrel + Gas Tube + Carry Handle
    addCylPart(root, 0.018, 0.018, 0.36, 0, 0.02, -0.7, gunSteel);
    addCylPart(root, 0.012, 0.012, 0.26, 0, -0.01, -0.62, darkMetal);
    addBoxPart(root, 0.025, 0.018, 0.15, 0, 0.09, -0.12, polymer); // Carry handle bar
    addBoxPart(root, 0.025, 0.035, 0.025, 0, 0.072, -0.06, darkMetal);
    addBoxPart(root, 0.025, 0.035, 0.025, 0, 0.072, -0.18, darkMetal);
  } else if (weaponId === "vector") {
    // Vector-45 Kriss PDW: signature angled Super-V mag housing, compact stock, suppressor, holo optic
    addBoxPart(root, 0.056, 0.082, 0.34, 0, 0.018, -0.08, polymer);
    addBoxPart(root, 0.054, 0.125, 0.11, 0, -0.052, -0.18, darkMetal, -0.25); // Super-V housing
    addBoxPart(root, 0.032, 0.17, 0.042, 0, -0.125, -0.22, gunSteel, -0.28); // Extended 33rd stick mag
    addBoxPart(root, 0.042, 0.11, 0.042, 0, -0.072, 0.01, polymer, 0.28); // Grip
    addBoxPart(root, 0.036, 0.08, 0.21, 0, 0.005, 0.18, darkMetal); // Folding stock
    addCylPart(root, 0.024, 0.024, 0.24, 0, 0.018, -0.36, darkMetal); // Integral Osprey/cyl suppressor
    // Micro Holo Reflex
    addBoxPart(root, 0.038, 0.038, 0.065, 0, 0.075, -0.08, gunSteel);
    addBoxPart(root, 0.012, 0.012, 0.01, 0, 0.078, -0.08, new THREE.MeshStandardMaterial({ color: "#06b6d4", emissive: "#06b6d4", emissiveIntensity: 0.9 }));
  } else {
    // Magnum-44 Python Revolver: sculpted walnut grip, 6-chamber cylinder, ventilated top rib barrel
    addBoxPart(root, 0.036, 0.065, 0.16, 0, 0.015, -0.02, chrome);
    addBoxPart(root, 0.038, 0.11, 0.05, 0, -0.065, 0.045, new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.58 }), 0.35);
    addCylPart(root, 0.03, 0.03, 0.068, 0, 0.02, -0.04, gunSteel, Math.PI / 2, 6); // 6-shot cylinder
    addCylPart(root, 0.015, 0.015, 0.25, 0, 0.036, -0.2, chrome); // Heavy barrel
    addBoxPart(root, 0.022, 0.022, 0.23, 0, 0.018, -0.19, chrome); // Underlug
    addBoxPart(root, 0.018, 0.014, 0.24, 0, 0.052, -0.2, darkMetal); // Vent rib + front sight
    addBoxPart(root, 0.012, 0.016, 0.02, 0, 0.062, -0.31, new THREE.MeshStandardMaterial({ color: "#ec4899", emissive: "#ec4899", emissiveIntensity: 0.8 }));
  }

  weaponTemplateResolvedCache.set(weaponId, root);
  return root;
}

async function fetchAndNormalizeDriveWeapon(weaponId: WeaponId): Promise<THREE.Group> {
  const spec = driveWeapons[weaponId];
  if (!spec) {
    return createProceduralWeaponTemplate(weaponId);
  }

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
  const cached = weaponTemplateResolvedCache.get(weaponId);
  if (cached) return cached;
  if (!driveWeapons[weaponId]) {
    return createProceduralWeaponTemplate(weaponId);
  }
  return null;
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
    if (driveWeapons[id]) {
      void loadDriveWeaponTemplate(id).catch(() => {
        // Ignore individual preload network errors during teardown
      });
    } else {
      createProceduralWeaponTemplate(id);
    }
  }
}
