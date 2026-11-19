import * as CANNON from "cannon-es";
import {
  GRAVITY,
  MAPS,
  PLAYER_CONFIG,
  getSupportHeightAt,
  type MapData,
  type MapId,
} from "@block-shooter/shared";

export interface DynamicPropDesc {
  id: string;
  kind: "crate" | "barrel";
  halfW: number;
  halfH: number;
  halfD: number;
  color: string;
  body: CANNON.Body;
}

const SLEEPING_STATE = 2; // CANNON.Body.SLEEPING

function isOverlappingSolidStructure(
  x: number,
  z: number,
  padRadius: number,
  map: MapData,
): boolean {
  for (const box of map.structures) {
    // Ignore flat ground decals / asphalt lanes
    if (box.height <= 0.14 && box.y - box.height / 2 < 0.05) continue;
    const hw = box.width / 2 + padRadius;
    const hd = box.depth / 2 + padRadius;
    if (Math.abs(x - box.x) < hw && Math.abs(z - box.z) < hd) {
      return true;
    }
  }
  return false;
}

export class ArenaPhysicsWorld {
  public world: CANNON.World;
  public playerBody: CANNON.Body;
  public dynamicProps: DynamicPropDesc[] = [];
  public currentMapId: MapId | null = null;

  private map: MapData = MAPS.compound_05;
  private worldMaterial: CANNON.Material;
  private playerMaterial: CANNON.Material;
  private propMaterial: CANNON.Material;
  private staticBodies: CANNON.Body[] = [];

  // Reusable zero-GC math scratch vectors
  private tmpImpulse = new CANNON.Vec3();
  private tmpRelPoint = new CANNON.Vec3();
  private lastGrounded = true;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY.y, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 6;
    this.world.defaultContactMaterial.friction = 0.0;
    this.world.defaultContactMaterial.restitution = 0.0;

    this.worldMaterial = new CANNON.Material("world");
    this.playerMaterial = new CANNON.Material("player");
    this.propMaterial = new CANNON.Material("prop");

    // Zero wall-stick friction between player & static geometry
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.playerMaterial, this.worldMaterial, {
        friction: 0.0,
        restitution: 0.0,
      }),
    );

    // Light pushable feel between player & dynamic crates/barrels
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.playerMaterial, this.propMaterial, {
        friction: 0.06,
        restitution: 0.12,
      }),
    );

    // Realistic sliding & bounce for dynamic tactical props on terrain/walls
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.propMaterial, this.worldMaterial, {
        friction: 0.55,
        restitution: 0.16,
      }),
    );

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.propMaterial, this.propMaterial, {
        friction: 0.45,
        restitution: 0.14,
      }),
    );

    // Create dual-sphere compound player rigid body (glides on walls & stairs smoothly)
    this.playerBody = new CANNON.Body({
      mass: 75,
      material: this.playerMaterial,
      fixedRotation: true,
      linearDamping: 0.02,
      allowSleep: false,
    });

    const r = Math.max(0.42, PLAYER_CONFIG.RADIUS - 0.02);
    this.playerBody.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, -(1.0 - r), 0));
    this.playerBody.addShape(new CANNON.Sphere(r * 0.94), new CANNON.Vec3(0, 0.34, 0));
    this.playerBody.position.set(0, 1.5, 0);
    this.world.addBody(this.playerBody);
  }

  public initMap(mapId: MapId): void {
    if (this.currentMapId === mapId && this.staticBodies.length > 0) {
      return;
    }

    this.clearLevelBodies();
    this.currentMapId = mapId;
    this.map = MAPS[mapId] || MAPS.compound_05;

    // 1. Arena ground plane at y = 0
    const ground = new CANNON.Body({
      mass: 0,
      material: this.worldMaterial,
    });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(ground);
    this.staticBodies.push(ground);

    // 2. Perimeter walls & map buildings/cover structures
    const addStaticBox = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
    ) => {
      if (w <= 0.01 || h <= 0.01 || d <= 0.01) return;
      const body = new CANNON.Body({
        mass: 0,
        material: this.worldMaterial,
        position: new CANNON.Vec3(x, y, z),
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
      this.world.addBody(body);
      this.staticBodies.push(body);
    };

    for (const wall of this.map.walls) {
      addStaticBox(wall.x, wall.y, wall.z, wall.width, wall.height, wall.depth);
    }

    for (const box of this.map.structures) {
      // Skip ultra-thin decorative ground stripes so spheres never catch seams
      if (box.height <= 0.09 && box.y - box.height / 2 < 0.03) continue;
      addStaticBox(box.x, box.y, box.z, box.width, box.height, box.depth);
    }

    // 3. Solid prop colliders (vehicles, rocks, jersey barriers, generators, tree trunks)
    for (const prop of this.map.props) {
      if (prop.kind === "jersey_barrier") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, prop.y + 0.52, prop.z),
        });
        body.quaternion.setFromEuler(0, prop.rotY || 0, 0);
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.3, 0.52, 0.42)));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "vehicle_jeep" || prop.kind === "ph_car") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, 0.9, prop.z),
        });
        body.quaternion.setFromEuler(0, prop.rotY || 0, 0);
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.08, 0.9, 2.08)));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "vehicle_truck") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, 1.45, prop.z),
        });
        body.quaternion.setFromEuler(0, prop.rotY || 0, 0);
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 1.45, 3.25)));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "ph_generator") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, prop.y + 0.72, prop.z),
        });
        body.quaternion.setFromEuler(0, prop.rotY || 0, 0);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.84, 0.72, 0.54)));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "ph_rock_moss") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, prop.y + 0.75, prop.z),
        });
        body.addShape(new CANNON.Sphere(1.15));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "tree_pine" || prop.kind === "tree_oak" || prop.kind === "palm_tree") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, 2.2, prop.z),
        });
        body.addShape(new CANNON.Cylinder(0.42, 0.48, 4.4, 8));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "boulder_cluster") {
        const body = new CANNON.Body({
          mass: 0,
          material: this.worldMaterial,
          position: new CANNON.Vec3(prop.x, prop.y + 1.0, prop.z),
        });
        body.addShape(new CANNON.Sphere(1.55));
        this.world.addBody(body);
        this.staticBodies.push(body);
      } else if (prop.kind === "watchtower") {
        const h = prop.height || 7.2;
        const corners: Array<[number, number]> = [
          [-1.55, -1.55],
          [1.55, -1.55],
          [-1.55, 1.55],
          [1.55, 1.55],
        ];
        for (const [cx, cz] of corners) {
          const body = new CANNON.Body({
            mass: 0,
            material: this.worldMaterial,
            position: new CANNON.Vec3(prop.x + cx, prop.y + h / 2, prop.z + cz),
          });
          body.addShape(new CANNON.Box(new CANNON.Vec3(0.2, h / 2, 0.2)));
          this.world.addBody(body);
          this.staticBodies.push(body);
        }
      }
    }

    // 4. Dynamic interactive physics tactical crates & barrels (sleep at rest -> zero CPU)
    this.spawnDynamicProps(this.map);
  }

  private spawnDynamicProps(map: MapData): void {
    const candidateSpots: Array<[number, number, "crate" | "barrel", string]> = [
      [-6.5, -10.5, "crate", "#b97e48"],
      [6.5, 10.5, "crate", "#b97e48"],
      [-9.5, 4.2, "barrel", "#dc2626"],
      [9.5, -4.2, "barrel", "#2563eb"],
      [-3.8, 15.5, "crate", "#c2864d"],
      [3.8, -15.5, "crate", "#c2864d"],
      [-15.5, -3.5, "barrel", "#ea580c"],
      [15.5, 3.5, "barrel", "#dc2626"],
      [-12.0, 14.0, "crate", "#a8703d"],
      [12.0, -14.0, "crate", "#a8703d"],
    ];

    const halfWLimit = map.floor.width / 2 - 4;
    const halfDLimit = map.floor.depth / 2 - 4;

    candidateSpots.forEach(([x, z, kind, color], idx) => {
      if (Math.abs(x) > halfWLimit || Math.abs(z) > halfDLimit) return;
      if (isOverlappingSolidStructure(x, z, 1.1, map)) return;

      const isCrate = kind === "crate";
      const halfW = isCrate ? 0.5 : 0.38;
      const halfH = isCrate ? 0.5 : 0.6;
      const halfD = isCrate ? 0.5 : 0.38;

      const body = new CANNON.Body({
        mass: isCrate ? 22 : 16,
        material: this.propMaterial,
        position: new CANNON.Vec3(x, halfH + 0.02, z),
        linearDamping: 0.28,
        angularDamping: 0.45,
        allowSleep: true,
        sleepSpeedLimit: 0.16,
        sleepTimeLimit: 0.45,
      });

      if (isCrate) {
        body.addShape(new CANNON.Box(new CANNON.Vec3(halfW, halfH, halfD)));
      } else {
        body.addShape(new CANNON.Cylinder(halfW, halfW, halfH * 2, 10));
      }

      this.world.addBody(body);
      this.dynamicProps.push({
        id: `dyn_prop_${idx}`,
        kind,
        halfW,
        halfH,
        halfD,
        color,
        body,
      });
    });
  }

  private clearLevelBodies(): void {
    for (const body of this.staticBodies) {
      this.world.removeBody(body);
    }
    this.staticBodies = [];

    for (const prop of this.dynamicProps) {
      this.world.removeBody(prop.body);
    }
    this.dynamicProps = [];
  }

  public teleportPlayer(x: number, bodyY: number, z: number): void {
    this.playerBody.wakeUp();
    this.playerBody.position.set(x, bodyY, z);
    this.playerBody.velocity.set(0, 0, 0);
    this.lastGrounded = true;
  }

  public setJumpVelocity(vy: number): void {
    this.playerBody.wakeUp();
    this.playerBody.velocity.y = vy;
    this.lastGrounded = false;
  }

  public isPlayerGrounded(skipGroundSnap = false): boolean {
    if (skipGroundSnap) return false;
    const feetY = this.playerBody.position.y - 1.0;

    // 1. Check active Cannon-es contacts with upward normal pushing player
    for (const c of this.world.contacts) {
      if (c.bi === this.playerBody) {
        // Normal points from bi -> bj, so downward normal (-y) means ground below player
        if (c.ni.y < -0.45) return true;
      } else if (c.bj === this.playerBody) {
        if (c.ni.y > 0.45) return true;
      }
    }

    // 2. Fallback floor/platform epsilon check when moving over stair treads
    const supportTop = getSupportHeightAt(
      this.playerBody.position.x,
      this.playerBody.position.z,
      feetY,
      PLAYER_CONFIG.RADIUS,
      this.map,
    );
    return feetY <= supportTop + 0.14 && this.playerBody.velocity.y <= 1.25;
  }

  public step(
    dt: number,
    targetVx: number,
    targetVz: number,
    inJumpPadHold: boolean,
  ): { x: number; y: number; z: number; grounded: boolean; landedImpactSpeed: number } {
    const body = this.playerBody;
    body.wakeUp();

    const wasGrounded = this.lastGrounded;
    const preVy = body.velocity.y;

    // Responsive tactical horizontal control (full ground response, smooth air steering)
    const accelAlpha = wasGrounded ? 1.0 : Math.min(1, dt * 11.5);
    body.velocity.x += (targetVx - body.velocity.x) * accelAlpha;
    body.velocity.z += (targetVz - body.velocity.z) * accelAlpha;

    // Step Cannon-es fixed physics tick
    this.world.step(1 / 60, dt, 3);

    // Gentle step-up assist for 0.25-0.55m stairs & curbs when moving horizontally
    if (!inJumpPadHold && (Math.abs(targetVx) > 0.2 || Math.abs(targetVz) > 0.2)) {
      const feetY = body.position.y - 1.0;
      const supportTop = getSupportHeightAt(
        body.position.x,
        body.position.z,
        feetY,
        PLAYER_CONFIG.RADIUS,
        this.map,
      );
      if (supportTop > feetY + 0.03 && supportTop <= feetY + 0.58 && body.velocity.y <= 2.5) {
        body.position.y = supportTop + 1.0;
        if (body.velocity.y < 0) body.velocity.y = 0;
      }
    }

    // Clamp cleanly inside arena bounds
    const maxX = this.map.floor.width / 2 - 1.2 - PLAYER_CONFIG.RADIUS;
    const maxZ = this.map.floor.depth / 2 - 1.2 - PLAYER_CONFIG.RADIUS;
    if (body.position.x < -maxX) {
      body.position.x = -maxX;
      body.velocity.x = Math.max(0, body.velocity.x);
    } else if (body.position.x > maxX) {
      body.position.x = maxX;
      body.velocity.x = Math.min(0, body.velocity.x);
    }
    if (body.position.z < -maxZ) {
      body.position.z = -maxZ;
      body.velocity.z = Math.max(0, body.velocity.z);
    } else if (body.position.z > maxZ) {
      body.position.z = maxZ;
      body.velocity.z = Math.min(0, body.velocity.z);
    }

    // Prevent tunneling below ground plane
    if (body.position.y < 1.0) {
      body.position.y = 1.0;
      if (body.velocity.y < 0) body.velocity.y = 0;
    }

    const grounded = this.isPlayerGrounded(inJumpPadHold);
    const landedImpactSpeed = !wasGrounded && grounded && preVy < -7 ? Math.abs(preVy) : 0;
    this.lastGrounded = grounded;

    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z,
      grounded,
      landedImpactSpeed,
    };
  }

  public applyShotImpulse(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    force = 48,
  ): void {
    for (const prop of this.dynamicProps) {
      const bx = prop.body.position.x;
      const by = prop.body.position.y;
      const bz = prop.body.position.z;
      const vx = bx - ox;
      const vy = by - oy;
      const vz = bz - oz;
      const proj = vx * dx + vy * dy + vz * dz;
      if (proj < 0 || proj > 75) continue;

      const cx = ox + dx * proj;
      const cy = oy + dy * proj;
      const cz = oz + dz * proj;
      const dist = Math.hypot(bx - cx, by - cy, bz - cz);
      const hitRadius = Math.max(prop.halfW, prop.halfH) + 0.35;
      if (dist <= hitRadius) {
        prop.body.wakeUp();
        this.tmpImpulse.set(dx * force, (dy + 0.22) * force, dz * force);
        this.tmpRelPoint.set(0, prop.halfH * 0.35, 0);
        prop.body.applyImpulse(this.tmpImpulse, this.tmpRelPoint);
      }
    }
  }

  public applyExplosionImpulse(x: number, y: number, z: number, radius = 8, force = 210): void {
    for (const prop of this.dynamicProps) {
      const dx = prop.body.position.x - x;
      const dy = prop.body.position.y - y;
      const dz = prop.body.position.z - z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > radius) continue;
      const falloff = 1 - dist / radius;
      const inv = 1 / Math.max(0.25, dist);
      prop.body.wakeUp();
      this.tmpImpulse.set(
        dx * inv * force * falloff,
        (Math.max(0.35, dy * inv) + 0.45) * force * falloff,
        dz * inv * force * falloff,
      );
      this.tmpRelPoint.set(0, 0.15, 0);
      prop.body.applyImpulse(this.tmpImpulse, this.tmpRelPoint);
    }
  }

  public isBodySleeping(body: CANNON.Body): boolean {
    return body.sleepState === SLEEPING_STATE;
  }
}

export const arenaPhysics = new ArenaPhysicsWorld();
