import * as THREE from "three";

// Cached sculpted BufferGeometries (created once per module load for zero GC pressure & instant spawn)

function createChestArmorGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, -0.17);
  shape.lineTo(0.15, -0.17);
  shape.lineTo(0.2, -0.02);
  shape.lineTo(0.18, 0.14);
  shape.lineTo(0.08, 0.17);
  shape.lineTo(0.05, 0.11);
  shape.lineTo(-0.05, 0.11);
  shape.lineTo(-0.08, 0.17);
  shape.lineTo(-0.18, 0.14);
  shape.lineTo(-0.2, -0.02);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createTacticalHelmetGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.001, 0.145),
    new THREE.Vector2(0.068, 0.138),
    new THREE.Vector2(0.122, 0.112),
    new THREE.Vector2(0.152, 0.068),
    new THREE.Vector2(0.16, 0.014),
    new THREE.Vector2(0.166, -0.026),
    new THREE.Vector2(0.15, -0.032),
  ];
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return geo;
}

function createHeavyHelmetGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.001, 0.16),
    new THREE.Vector2(0.085, 0.152),
    new THREE.Vector2(0.142, 0.12),
    new THREE.Vector2(0.172, 0.065),
    new THREE.Vector2(0.178, -0.03),
    new THREE.Vector2(0.158, -0.042),
  ];
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return geo;
}

function createMuscularLimbGeo(
  topR: number,
  midR: number,
  botR: number,
  len: number,
): THREE.LatheGeometry {
  const h = len / 2;
  const pts = [
    new THREE.Vector2(0.001, -h),
    new THREE.Vector2(botR * 0.85, -h + 0.015),
    new THREE.Vector2(botR, -h * 0.55),
    new THREE.Vector2(midR, 0.02),
    new THREE.Vector2(topR, h * 0.65),
    new THREE.Vector2(topR * 0.82, h - 0.01),
    new THREE.Vector2(0.001, h),
  ];
  const geo = new THREE.LatheGeometry(pts, 12);
  geo.computeVertexNormals();
  return geo;
}

function createCombatBootGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.1, -0.06);
  shape.lineTo(0.13, -0.06);
  shape.lineTo(0.14, -0.02);
  shape.lineTo(0.05, 0.01);
  shape.lineTo(0.02, 0.08);
  shape.lineTo(-0.08, 0.08);
  shape.lineTo(-0.1, -0.06);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.center();
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createShoulderPadGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.075, -0.065);
  shape.lineTo(0.075, -0.065);
  shape.lineTo(0.09, 0.04);
  shape.lineTo(0.04, 0.08);
  shape.lineTo(-0.04, 0.08);
  shape.lineTo(-0.09, 0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export const SCULPTED_GEOS = {
  chestArmor: createChestArmorGeo(),
  helmet: createTacticalHelmetGeo(),
  heavyHelmet: createHeavyHelmetGeo(),
  head: new THREE.SphereGeometry(0.138, 14, 12),
  pelvis: new THREE.BoxGeometry(0.32, 0.14, 0.21),
  shoulderPad: createShoulderPadGeo(),
  backpack: new THREE.BoxGeometry(0.24, 0.3, 0.11),
  visor: new THREE.BoxGeometry(0.22, 0.062, 0.07),
  thigh: createMuscularLimbGeo(0.084, 0.076, 0.062, 0.39),
  shin: createMuscularLimbGeo(0.064, 0.068, 0.048, 0.39),
  upperArm: createMuscularLimbGeo(0.056, 0.052, 0.045, 0.28),
  forearm: createMuscularLimbGeo(0.048, 0.044, 0.037, 0.27),
  glove: new THREE.BoxGeometry(0.075, 0.08, 0.095),
  boot: createCombatBootGeo(),
};
