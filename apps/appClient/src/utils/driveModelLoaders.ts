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

  baseColor.convertLinearToSRGB();
  baseColor.multiplyScalar(0.84);

  const isMetal = matName.includes("metal") || matName.includes("grey") || matName.includes("silver");
  const isWood = matName.includes("wood");
  const isAccent = matName.includes("gold") || matName.includes("orange") || matName.includes("red");

  return new THREE.MeshStandardMaterial({
    name: mat.name,
    color: baseColor,
    metalness: isMetal ? 0.88 : isAccent ? 0.58 : isWood ? 0.08 : 0.34,
    roughness: isMetal ? 0.22 : isWood ? 0.6 : 0.44,
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
    color: "#1b2230",
    metalness: 0.86,
    roughness: 0.24,
  });
  const gunSteel = new THREE.MeshStandardMaterial({
    color: "#475569",
    metalness: 0.88,
    roughness: 0.22,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: "#14161a",
    metalness: 0.24,
    roughness: 0.54,
  });
  const fdeTan = new THREE.MeshStandardMaterial({
    color: "#b7996e",
    metalness: 0.34,
    roughness: 0.46,
  });
  const walnut = new THREE.MeshStandardMaterial({
    color: "#6b3e22",
    metalness: 0.08,
    roughness: 0.58,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#cbd5e1",
    metalness: 0.92,
    roughness: 0.16,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#d97706",
    metalness: 0.78,
    roughness: 0.28,
  });

  if (weaponId === "ak74m") {
    // AK-74M Zenith: stamped receiver, Zenitco railed handguard, slanted gas tube, banana mag, folding stock
    addBoxPart(root, 0.056, 0.082, 0.34, 0, 0.012, -0.06, darkMetal);
    addBoxPart(root, 0.052, 0.066, 0.26, 0, 0.015, -0.34, polymer); // Railed handguard
    addBoxPart(root, 0.044, 0.09, 0.24, 0, -0.008, 0.21, polymer, -0.06); // Folding buttstock
    addBoxPart(root, 0.04, 0.115, 0.044, 0, -0.075, 0.04, polymer, 0.3); // Pistol grip
    // Iconic curved Kalashnikov banana magazine
    addBoxPart(root, 0.036, 0.11, 0.062, 0, -0.085, -0.14, new THREE.MeshStandardMaterial({ color: "#8c4223", roughness: 0.52 }), -0.16);
    addBoxPart(root, 0.035, 0.11, 0.06, 0, -0.17, -0.175, new THREE.MeshStandardMaterial({ color: "#8c4223", roughness: 0.52 }), -0.44);
    // Barrel + upper gas tube + front sight post
    addCylPart(root, 0.013, 0.013, 0.36, 0, 0.016, -0.58, gunSteel);
    addCylPart(root, 0.011, 0.011, 0.24, 0, 0.044, -0.44, darkMetal);
    addBoxPart(root, 0.016, 0.046, 0.024, 0, 0.042, -0.68, darkMetal);
    // Top dust-cover Picatinny rail
    addBoxPart(root, 0.028, 0.012, 0.3, 0, 0.058, -0.08, gunSteel);
  } else if (weaponId === "scarH") {
    // SCAR-H Heavy 7.62 Battle Rifle in FDE Tan & Matte Black
    addBoxPart(root, 0.066, 0.094, 0.44, 0, 0.018, -0.12, fdeTan);
    addBoxPart(root, 0.058, 0.056, 0.22, 0, 0.014, -0.42, fdeTan);
    // Signature SCAR cheek-riser boot stock
    addBoxPart(root, 0.052, 0.105, 0.24, 0, -0.004, 0.2, fdeTan);
    addBoxPart(root, 0.056, 0.035, 0.14, 0, 0.042, 0.18, polymer);
    addBoxPart(root, 0.042, 0.118, 0.046, 0, -0.075, 0.03, polymer, 0.24);
    // Heavy straight 7.62mm 24-rd magazine
    addBoxPart(root, 0.042, 0.155, 0.072, 0, -0.115, -0.13, fdeTan, -0.04);
    // Free-float barrel + gas block + full-length top rail
    addCylPart(root, 0.015, 0.015, 0.36, 0, 0.022, -0.64, gunSteel);
    addBoxPart(root, 0.032, 0.014, 0.56, 0, 0.07, -0.2, darkMetal);
    addBoxPart(root, 0.014, 0.022, 0.05, 0.038, 0.035, -0.22, gunSteel); // Charging handle
  } else if (weaponId === "p90") {
    // FN P90 Tactical Bullpup PDW: thumbhole polymer body, top horizontal 50-rd magazine
    addBoxPart(root, 0.062, 0.125, 0.48, 0, -0.008, -0.02, polymer);
    addBoxPart(root, 0.054, 0.046, 0.14, 0, -0.068, -0.18, polymer);
    addBoxPart(root, 0.05, 0.11, 0.12, 0, -0.02, 0.21, polymer);
    // Top translucent 50-round horizontal magazine with brass rounds visible
    addBoxPart(
      root,
      0.048,
      0.032,
      0.32,
      0,
      0.066,
      -0.06,
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.25, metalness: 0.4 }),
    );
    addBoxPart(root, 0.036, 0.016, 0.24, 0, 0.066, -0.06, brass);
    // Integrated front receiver bridge & compact barrel
    addBoxPart(root, 0.046, 0.055, 0.12, 0, 0.068, -0.26, darkMetal);
    addCylPart(root, 0.014, 0.014, 0.16, 0, 0.012, -0.34, gunSteel);
  } else if (weaponId === "kar98") {
    // Kar98k Marksman Bolt-Action: full walnut wooden stock, blued steel barrel & receiver, bolt handle
    addBoxPart(root, 0.054, 0.078, 0.68, 0, -0.012, -0.12, walnut);
    addBoxPart(root, 0.05, 0.105, 0.28, 0, -0.028, 0.3, walnut, -0.08); // Wooden buttstock
    addBoxPart(root, 0.048, 0.065, 0.18, 0, 0.022, -0.04, darkMetal); // Steel receiver
    // Bolt handle sticking out to right
    addCylPart(root, 0.008, 0.008, 0.07, 0.045, 0.02, 0.01, chrome, 0, 8);
    // Long precision rifled barrel + barrel bands + iron front hood
    addCylPart(root, 0.014, 0.016, 0.72, 0, 0.028, -0.52, gunSteel);
    addBoxPart(root, 0.058, 0.052, 0.022, 0, 0.005, -0.38, darkMetal);
    addBoxPart(root, 0.056, 0.048, 0.022, 0, 0.005, -0.56, darkMetal);
    addBoxPart(root, 0.016, 0.034, 0.024, 0, 0.048, -0.84, darkMetal);
  } else if (weaponId === "dmr") {
    // MK-14 EBR Marksman Rifle
    addBoxPart(root, 0.062, 0.085, 0.42, 0, 0.01, -0.1, darkMetal);
    addBoxPart(root, 0.054, 0.068, 0.28, 0, 0.012, -0.38, gunSteel);
    addBoxPart(root, 0.048, 0.095, 0.22, 0, -0.005, 0.2, polymer);
    addBoxPart(root, 0.044, 0.12, 0.045, 0, -0.08, 0.02, polymer, 0.26);
    addBoxPart(root, 0.038, 0.13, 0.068, 0, -0.11, -0.12, darkMetal, -0.08);
    addCylPart(root, 0.014, 0.014, 0.46, 0, 0.022, -0.62, gunSteel);
    addCylPart(root, 0.02, 0.018, 0.08, 0, 0.022, -0.86, darkMetal);
    addCylPart(root, 0.008, 0.008, 0.2, -0.026, -0.032, -0.44, gunSteel);
    addCylPart(root, 0.008, 0.008, 0.2, 0.026, -0.032, -0.44, gunSteel);
  } else if (weaponId === "lmg") {
    // M249 Vulcan LMG
    addBoxPart(root, 0.086, 0.115, 0.46, 0, 0.01, -0.12, darkMetal);
    addBoxPart(root, 0.078, 0.095, 0.32, 0, 0.015, -0.44, gunSteel);
    addBoxPart(root, 0.06, 0.115, 0.24, 0, -0.01, 0.22, polymer);
    addBoxPart(root, 0.046, 0.12, 0.048, 0, -0.085, 0.04, polymer, 0.22);
    addBoxPart(root, 0.15, 0.125, 0.12, -0.02, -0.105, -0.12, new THREE.MeshStandardMaterial({ color: "#365314", roughness: 0.5 }));
    addBoxPart(root, 0.045, 0.03, 0.06, -0.052, -0.02, -0.12, brass);
    addCylPart(root, 0.018, 0.018, 0.36, 0, 0.02, -0.7, gunSteel);
    addCylPart(root, 0.012, 0.012, 0.26, 0, -0.01, -0.62, darkMetal);
    addBoxPart(root, 0.025, 0.018, 0.15, 0, 0.09, -0.12, polymer);
    addBoxPart(root, 0.025, 0.035, 0.025, 0, 0.072, -0.06, darkMetal);
    addBoxPart(root, 0.025, 0.035, 0.025, 0, 0.072, -0.18, darkMetal);
  } else if (weaponId === "vector") {
    // Vector-45 Kriss PDW
    addBoxPart(root, 0.056, 0.082, 0.34, 0, 0.018, -0.08, polymer);
    addBoxPart(root, 0.054, 0.125, 0.11, 0, -0.052, -0.18, darkMetal, -0.25);
    addBoxPart(root, 0.032, 0.17, 0.042, 0, -0.125, -0.22, gunSteel, -0.28);
    addBoxPart(root, 0.042, 0.11, 0.042, 0, -0.072, 0.01, polymer, 0.28);
    addBoxPart(root, 0.036, 0.08, 0.21, 0, 0.005, 0.18, darkMetal);
    addCylPart(root, 0.022, 0.022, 0.2, 0, 0.018, -0.34, darkMetal);
  } else {
    // Magnum-44 Python Revolver
    addBoxPart(root, 0.036, 0.065, 0.16, 0, 0.015, -0.02, chrome);
    addBoxPart(root, 0.038, 0.11, 0.05, 0, -0.065, 0.045, walnut, 0.35);
    addCylPart(root, 0.03, 0.03, 0.068, 0, 0.02, -0.04, gunSteel, Math.PI / 2, 6);
    addCylPart(root, 0.015, 0.015, 0.25, 0, 0.036, -0.2, chrome);
    addBoxPart(root, 0.022, 0.022, 0.23, 0, 0.018, -0.19, chrome);
    addBoxPart(root, 0.018, 0.014, 0.24, 0, 0.052, -0.2, darkMetal);
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

  try {
    const mtlLoader = new MTLLoader();
    mtlLoader.setResourcePath("/models/drive/weapons/");
    const materials = await mtlLoader.loadAsync(spec.mtl);
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    const rawObj = await objLoader.loadAsync(spec.obj);

    const rawBox = new THREE.Box3().setFromObject(rawObj);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const rawLength = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
    const scaleFactor = spec.targetLength / rawLength;

    const gripPivotX = rawBox.min.x + rawSize.x * 0.34;
    rawObj.position.set(-gripPivotX, -rawCenter.y, -rawCenter.z);

    const normalizedRoot = new THREE.Group();
    const barrelRotateWrapper = new THREE.Group();
    barrelRotateWrapper.rotation.y = Math.PI / 2;
    barrelRotateWrapper.scale.setScalar(scaleFactor);
    barrelRotateWrapper.add(rawObj);
    normalizedRoot.add(barrelRotateWrapper);

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
  } catch (err) {
    console.warn("Drive weapon load failed, using procedural fallback:", weaponId, err);
    return createProceduralWeaponTemplate(weaponId);
  }
}

export function getCachedDriveWeaponSync(weaponId: WeaponId): THREE.Group | null {
  const cached = weaponTemplateResolvedCache.get(weaponId);
  if (cached) return cached;
  // Instantly return procedural template so viewmodel is NEVER blank or empty
  return createProceduralWeaponTemplate(weaponId);
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
      void loadDriveWeaponTemplate(id).catch(() => {});
    } else {
      createProceduralWeaponTemplate(id);
    }
  }
}
