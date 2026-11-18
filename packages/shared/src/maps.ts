export type MapMaterialKind =
  | "floor_grid"
  | "concrete"
  | "metal_dark"
  | "container_blue"
  | "container_red"
  | "crate_orange"
  | "cyber_glow"
  | "stone_sand"
  | "brick_wall"
  | "plaster_wall"
  | "wood_plank"
  | "asphalt"
  | "grass_terrain";

export interface MapBox {
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  material: MapMaterialKind;
  color?: string;
  emissive?: string;
  hidden?: boolean;
}

export type MapPropKind =
  | "house_cottage"
  | "house_two_story"
  | "tree_pine"
  | "tree_oak"
  | "vehicle_jeep"
  | "vehicle_truck"
  | "sandbags"
  | "jersey_barrier"
  | "barrel"
  | "streetlamp"
  | "ph_crate_wood"
  | "ph_crate_ammo"
  | "ph_car"
  | "ph_generator"
  | "ph_propane"
  | "ph_rock_moss"
  | "ph_tyre"
  | "ph_utility_box";

export interface MapProp {
  id: string;
  kind: MapPropKind;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
}

export interface JumpPad {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  boostY: number;
  color: string;
}

export interface CaptureZone {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

export interface MapData {
  id: string;
  name: string;
  subtitle: string;
  skybox: "afternoon" | "dawn" | "evening" | "night";
  isDaylight: boolean;
  fogColor: string;
  floorMaterial: MapMaterialKind;
  floor: {
    width: number;
    depth: number;
    thickness: number;
    x: number;
    y: number;
    z: number;
  };
  walls: MapBox[];
  structures: MapBox[];
  props: MapProp[];
  jumpPads: JumpPad[];
  captureZone: CaptureZone;
  redSpawns: SpawnPoint[];
  blueSpawns: SpawnPoint[];
  ffaSpawns: SpawnPoint[];
  lootSpawns: SpawnPoint[];
}

function createPerimeterWalls(
  floorWidth: number,
  floorDepth: number,
  wallHeight: number,
  wallThick: number,
  material: MapMaterialKind,
): MapBox[] {
  const halfHeight = wallHeight / 2;
  return [
    {
      name: "north",
      x: 0,
      y: halfHeight,
      z: -floorDepth / 2,
      width: floorWidth + wallThick,
      height: wallHeight,
      depth: wallThick,
      material,
    },
    {
      name: "south",
      x: 0,
      y: halfHeight,
      z: floorDepth / 2,
      width: floorWidth + wallThick,
      height: wallHeight,
      depth: wallThick,
      material,
    },
    {
      name: "east",
      x: floorWidth / 2,
      y: halfHeight,
      z: 0,
      width: wallThick,
      height: wallHeight,
      depth: floorDepth + wallThick,
      material,
    },
    {
      name: "west",
      x: -floorWidth / 2,
      y: halfHeight,
      z: 0,
      width: wallThick,
      height: wallHeight,
      depth: floorDepth + wallThick,
      material,
    },
  ];
}

function createStairs(
  prefix: string,
  startX: number,
  startZ: number,
  dirX: number,
  dirZ: number,
  width: number,
  length: number,
  height: number,
  steps: number,
  material: MapMaterialKind,
): MapBox[] {
  const result: MapBox[] = [];
  const stepLen = length / steps;
  const stepH = height / steps;

  for (let i = 0; i < steps; i++) {
    const curH = stepH * (i + 1);
    const offset = stepLen * (i + 0.5);
    const isX = dirX !== 0;
    result.push({
      name: `${prefix}_step_${i}`,
      x: startX + dirX * offset,
      y: curH / 2,
      z: startZ + dirZ * offset,
      width: isX ? stepLen : width,
      height: curH,
      depth: isX ? width : stepLen,
      material,
    });
  }
  return result;
}

// Build a walkable realistic house with doorway openings, interior room, optional 2nd floor stairs, and roof prop
function buildWalkableHouse(opts: {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  wallHeight: number;
  wallMaterial: MapMaterialKind;
  roofColor?: string;
  twoStory?: boolean;
}): { boxes: MapBox[]; prop: MapProp } {
  const { id, x, z, width, depth, wallHeight, wallMaterial, roofColor, twoStory } = opts;
  const wallT = 0.65;
  const doorW = 2.8;
  const sideSpan = Math.max(1.5, (width - doorW) / 2);
  const boxes: MapBox[] = [
    // Foundation slab
    {
      name: `${id}_foundation`,
      x,
      y: 0.12,
      z,
      width: width + 0.8,
      height: 0.24,
      depth: depth + 0.8,
      material: "concrete",
    },
    // North wall (left & right of doorway)
    {
      name: `${id}_n_l`,
      x: x - (doorW / 2 + sideSpan / 2),
      y: wallHeight / 2 + 0.2,
      z: z - depth / 2 + wallT / 2,
      width: sideSpan,
      height: wallHeight,
      depth: wallT,
      material: wallMaterial,
    },
    {
      name: `${id}_n_r`,
      x: x + (doorW / 2 + sideSpan / 2),
      y: wallHeight / 2 + 0.2,
      z: z - depth / 2 + wallT / 2,
      width: sideSpan,
      height: wallHeight,
      depth: wallT,
      material: wallMaterial,
    },
    // North doorway lintel
    {
      name: `${id}_n_top`,
      x,
      y: wallHeight - 0.35,
      z: z - depth / 2 + wallT / 2,
      width: doorW,
      height: 1.1,
      depth: wallT,
      material: wallMaterial,
    },
    // South wall (left & right of doorway)
    {
      name: `${id}_s_l`,
      x: x - (doorW / 2 + sideSpan / 2),
      y: wallHeight / 2 + 0.2,
      z: z + depth / 2 - wallT / 2,
      width: sideSpan,
      height: wallHeight,
      depth: wallT,
      material: wallMaterial,
    },
    {
      name: `${id}_s_r`,
      x: x + (doorW / 2 + sideSpan / 2),
      y: wallHeight / 2 + 0.2,
      z: z + depth / 2 - wallT / 2,
      width: sideSpan,
      height: wallHeight,
      depth: wallT,
      material: wallMaterial,
    },
    {
      name: `${id}_s_top`,
      x,
      y: wallHeight - 0.35,
      z: z + depth / 2 - wallT / 2,
      width: doorW,
      height: 1.1,
      depth: wallT,
      material: wallMaterial,
    },
    // West & East walls (with lower solid + window gap + upper lintel)
    {
      name: `${id}_w_low`,
      x: x - width / 2 + wallT / 2,
      y: 0.75,
      z,
      width: wallT,
      height: 1.3,
      depth: depth - wallT * 2,
      material: wallMaterial,
    },
    {
      name: `${id}_w_high`,
      x: x - width / 2 + wallT / 2,
      y: wallHeight - 0.45,
      z,
      width: wallT,
      height: 1.3,
      depth: depth - wallT * 2,
      material: wallMaterial,
    },
    {
      name: `${id}_e_low`,
      x: x + width / 2 - wallT / 2,
      y: 0.75,
      z,
      width: wallT,
      height: 1.3,
      depth: depth - wallT * 2,
      material: wallMaterial,
    },
    {
      name: `${id}_e_high`,
      x: x + width / 2 - wallT / 2,
      y: wallHeight - 0.45,
      z,
      width: wallT,
      height: 1.3,
      depth: depth - wallT * 2,
      material: wallMaterial,
    },
    // Roof ceiling deck (walkable if twoStory or exterior stairs)
    {
      name: `${id}_ceiling`,
      x,
      y: wallHeight + 0.35,
      z,
      width: width + 0.6,
      height: 0.4,
      depth: depth + 0.6,
      material: "wood_plank",
    },
  ];

  if (twoStory) {
    boxes.push(
      ...createStairs(
        `${id}_stairs`,
        x + width / 2 + 1.4,
        z + depth / 2 - 1.5,
        0,
        -1,
        2.4,
        depth - 2,
        wallHeight + 0.55,
        8,
        "concrete",
      ),
      {
        name: `${id}_parapet_n`,
        x,
        y: wallHeight + 1.05,
        z: z - depth / 2 + 0.25,
        width,
        height: 1.0,
        depth: 0.45,
        material: wallMaterial,
      },
    );
  }

  return {
    boxes,
    prop: {
      id: `${id}_roof_prop`,
      kind: twoStory ? "house_two_story" : "house_cottage",
      x,
      y: 0,
      z,
      width,
      height: wallHeight,
      depth,
      color: roofColor || "#9a3412",
    },
  };
}

function buildVeridianMap(): MapData {
  const structures: MapBox[] = [];
  const props: MapProp[] = [];

  // Central Town Plaza Houses (walkable interiors & rooftops)
  const h1 = buildWalkableHouse({
    id: "villa_nw",
    x: -26,
    z: -24,
    width: 12,
    depth: 11,
    wallHeight: 3.8,
    wallMaterial: "plaster_wall",
    roofColor: "#b45309",
    twoStory: true,
  });
  const h2 = buildWalkableHouse({
    id: "villa_se",
    x: 26,
    z: 24,
    width: 12,
    depth: 11,
    wallHeight: 3.8,
    wallMaterial: "brick_wall",
    roofColor: "#991b1b",
    twoStory: true,
  });
  const h3 = buildWalkableHouse({
    id: "cottage_ne",
    x: 28,
    z: -28,
    width: 10,
    depth: 9,
    wallHeight: 3.5,
    wallMaterial: "plaster_wall",
    roofColor: "#7c2d12",
    twoStory: false,
  });
  const h4 = buildWalkableHouse({
    id: "cottage_sw",
    x: -28,
    z: 28,
    width: 10,
    depth: 9,
    wallHeight: 3.5,
    wallMaterial: "brick_wall",
    roofColor: "#854d0e",
    twoStory: false,
  });
  const h5 = buildWalkableHouse({
    id: "barn_n",
    x: 0,
    z: -48,
    width: 14,
    depth: 10,
    wallHeight: 4.0,
    wallMaterial: "wood_plank",
    roofColor: "#9a3412",
    twoStory: true,
  });
  const h6 = buildWalkableHouse({
    id: "barn_s",
    x: 0,
    z: 48,
    width: 14,
    depth: 10,
    wallHeight: 4.0,
    wallMaterial: "wood_plank",
    roofColor: "#7f1d1d",
    twoStory: true,
  });

  [h1, h2, h3, h4, h5, h6].forEach((h) => {
    structures.push(...h.boxes);
    props.push(h.prop);
  });

  // Main Paved Crossroad Strips & Tactical Cover
  structures.push(
    { name: "road_ns", x: 0, y: 0.03, z: 0, width: 10, height: 0.06, depth: 156, material: "asphalt" },
    { name: "road_ew", x: 0, y: 0.03, z: 0, width: 156, height: 0.06, depth: 10, material: "asphalt" },
    // Central Fountain / Monument Base + Cover
    { name: "plaza_ring", x: 0, y: 0.35, z: 0, width: 7, height: 0.7, depth: 7, material: "concrete" },
    { name: "plaza_obelisk", x: 0, y: 2.2, z: 0, width: 2.2, height: 3.8, depth: 2.2, material: "stone_sand" },
    // Tactical Vehicles & cover collision proxies (rendered by photorealistic props)
    { name: "jeep_mid_w_col", x: -11, y: 1.0, z: 4, width: 2.4, height: 2.0, depth: 4.5, material: "metal_dark", hidden: true },
    { name: "jeep_mid_e_col", x: 11, y: 1.0, z: -4, width: 2.4, height: 2.0, depth: 4.5, material: "metal_dark", hidden: true },
    { name: "truck_w_col", x: -46, y: 1.5, z: 0, width: 3.1, height: 2.8, depth: 7.0, material: "metal_dark", hidden: true },
    { name: "truck_e_col", x: 46, y: 1.5, z: 0, width: 3.1, height: 2.8, depth: 7.0, material: "metal_dark", hidden: true },
    { name: "ph_v_crate_1", x: -9, y: 0.75, z: -12, width: 2.2, height: 1.5, depth: 1.4, material: "crate_orange", hidden: true },
    { name: "ph_v_crate_2", x: 9, y: 0.75, z: 12, width: 2.2, height: 1.5, depth: 1.4, material: "crate_orange", hidden: true },
    { name: "sandbag_n_col", x: -6, y: 0.65, z: -18, width: 4.2, height: 1.3, depth: 1.1, material: "stone_sand", hidden: true },
    { name: "sandbag_s_col", x: 6, y: 0.65, z: 18, width: 4.2, height: 1.3, depth: 1.1, material: "stone_sand", hidden: true },
    { name: "jb_1_col", x: 15, y: 0.56, z: 15, width: 2.5, height: 1.12, depth: 2.5, material: "concrete", hidden: true },
    { name: "jb_2_col", x: -15, y: 0.56, z: -15, width: 2.5, height: 1.12, depth: 2.5, material: "concrete", hidden: true },
  );

  // Realistic Trees, Vehicles, Sandbags & Poly Haven Tactical Cover
  props.push(
    { id: "v_jeep_w", kind: "vehicle_jeep", x: -11, y: 0, z: 4, rotY: 0.25, color: "#4d7c0f" },
    { id: "v_jeep_e", kind: "vehicle_jeep", x: 11, y: 0, z: -4, rotY: -2.8, color: "#92400e" },
    { id: "v_truck_w", kind: "vehicle_truck", x: -46, y: 0, z: 0, rotY: 0, color: "#3f4d36" },
    { id: "v_truck_e", kind: "vehicle_truck", x: 46, y: 0, z: 0, rotY: Math.PI, color: "#334155" },
    { id: "v_crate_w", kind: "ph_crate_wood", x: -9, y: 0, z: -12, rotY: 0.2 },
    { id: "v_crate_e", kind: "ph_crate_wood", x: 9, y: 0, z: 12, rotY: 0.2 },
    { id: "v_ammo_1", kind: "ph_crate_ammo", x: -16, y: 0, z: 14, rotY: 0.6 },
    { id: "v_ammo_2", kind: "ph_crate_ammo", x: 16, y: 0, z: -14, rotY: -0.6 },
    { id: "v_gen_1", kind: "ph_generator", x: -20, y: 0, z: -18, rotY: 0.4 },
    { id: "v_gen_2", kind: "ph_generator", x: 20, y: 0, z: 18, rotY: -2.5 },
    { id: "v_tyre_1", kind: "ph_tyre", x: -34, y: 0, z: 10, rotY: 0.3 },
    { id: "v_tyre_2", kind: "ph_tyre", x: 34, y: 0, z: -10, rotY: 2.2 },
    { id: "sb_1", kind: "sandbags", x: -6, y: 0, z: -18, rotY: 0 },
    { id: "sb_2", kind: "sandbags", x: 6, y: 0, z: 18, rotY: 0 },
    { id: "jb_1", kind: "jersey_barrier", x: 15, y: 0, z: 15, rotY: 0.7 },
    { id: "jb_2", kind: "jersey_barrier", x: -15, y: 0, z: -15, rotY: 0.7 },
    // Natural Pines, Oaks & Poly Haven Mossy Rocks framing the village perimeter
    { id: "t1", kind: "tree_oak", x: -40, y: 0, z: -42 },
    { id: "t2", kind: "tree_pine", x: -55, y: 0, z: -30 },
    { id: "t3", kind: "tree_oak", x: -58, y: 0, z: 18 },
    { id: "t4", kind: "tree_pine", x: -42, y: 0, z: 46 },
    { id: "t5", kind: "tree_oak", x: 40, y: 0, z: 42 },
    { id: "t6", kind: "tree_pine", x: 56, y: 0, z: 26 },
    { id: "t7", kind: "tree_oak", x: 58, y: 0, z: -20 },
    { id: "t8", kind: "tree_pine", x: 42, y: 0, z: -46 },
    { id: "t9", kind: "tree_oak", x: -16, y: 0, z: -58 },
    { id: "t10", kind: "tree_pine", x: 18, y: 0, z: 58 },
    { id: "t11", kind: "tree_oak", x: 16, y: 0, z: -38 },
    { id: "t12", kind: "tree_pine", x: -16, y: 0, z: 38 },
    { id: "v_rock_1", kind: "ph_rock_moss", x: -50, y: 0, z: -50, rotY: 0.5 },
    { id: "v_rock_2", kind: "ph_rock_moss", x: 50, y: 0, z: 50, rotY: 2.3 },
    // Streetlamps along crossroads
    { id: "sl_1", kind: "streetlamp", x: -6.5, y: 0, z: -22, rotY: Math.PI / 2 },
    { id: "sl_2", kind: "streetlamp", x: 6.5, y: 0, z: 22, rotY: -Math.PI / 2 },
    { id: "sl_3", kind: "streetlamp", x: -22, y: 0, z: 6.5, rotY: Math.PI },
    { id: "sl_4", kind: "streetlamp", x: 22, y: 0, z: -6.5, rotY: 0 },
    // Pressurized Tanks / Barrels
    { id: "br_1", kind: "barrel", x: -18, y: 0, z: -20, color: "#dc2626" },
    { id: "br_2", kind: "barrel", x: 18, y: 0, z: 20, color: "#0284c7" },
    { id: "br_3", kind: "barrel", x: -34, y: 0, z: -6, color: "#d97706" },
    { id: "br_4", kind: "barrel", x: 34, y: 0, z: 6, color: "#dc2626" },
  );

  return {
    id: "veridian_04",
    name: "Veridian Village",
    subtitle: "160x160m Daylight Houses, Vehicles & Valley",
    skybox: "afternoon",
    isDaylight: true,
    fogColor: "#cbe6ff",
    floorMaterial: "grass_terrain",
    floor: { width: 160, depth: 160, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(160, 160, 9, 2, "concrete"),
    structures,
    props,
    jumpPads: [
      { id: "v_jp_w", x: -38, y: 0.2, z: -10, radius: 2.0, boostY: 22, color: "#0ea5e9" },
      { id: "v_jp_e", x: 38, y: 0.2, z: 10, radius: 2.0, boostY: 22, color: "#0ea5e9" },
    ],
    captureZone: { x: 0, y: 0.1, z: 0, radius: 8.5 },
    redSpawns: [
      { x: -64, y: 2, z: -64 },
      { x: -62, y: 2, z: -28 },
      { x: -34, y: 2, z: -64 },
      { x: -56, y: 2, z: -42 },
    ],
    blueSpawns: [
      { x: 64, y: 2, z: 64 },
      { x: 62, y: 2, z: 28 },
      { x: 34, y: 2, z: 64 },
      { x: 56, y: 2, z: 42 },
    ],
    ffaSpawns: [
      { x: -64, y: 2, z: -64 },
      { x: 64, y: 2, z: 64 },
      { x: 64, y: 2, z: -64 },
      { x: -64, y: 2, z: 64 },
      { x: 0, y: 2, z: -66 },
      { x: 0, y: 2, z: 66 },
      { x: -66, y: 2, z: 0 },
      { x: 66, y: 2, z: 0 },
    ],
    lootSpawns: [
      { x: -26, y: 0.4, z: -24 },
      { x: 26, y: 0.4, z: 24 },
      { x: 28, y: 0.4, z: -28 },
      { x: -28, y: 0.4, z: 28 },
      { x: 0, y: 0.4, z: -48 },
      { x: 0, y: 0.4, z: 48 },
      { x: -12, y: 0.4, z: 0 },
      { x: 12, y: 0.4, z: 0 },
      { x: 0, y: 0.4, z: -15 },
      { x: 0, y: 0.4, z: 15 },
      { x: -40, y: 0.4, z: 12 },
      { x: 40, y: 0.4, z: -12 },
    ],
  };
}

function buildCitadelMap(): MapData {
  const structures: MapBox[] = [
    { name: "center_deck", x: 0, y: 3.3, z: 0, width: 16, height: 0.6, depth: 16, material: "metal_dark" },
    { name: "center_pillar_nw", x: -6.8, y: 1.65, z: -6.8, width: 2.4, height: 3.3, depth: 2.4, material: "concrete" },
    { name: "center_pillar_ne", x: 6.8, y: 1.65, z: -6.8, width: 2.4, height: 3.3, depth: 2.4, material: "concrete" },
    { name: "center_pillar_sw", x: -6.8, y: 1.65, z: 6.8, width: 2.4, height: 3.3, depth: 2.4, material: "concrete" },
    { name: "center_pillar_se", x: 6.8, y: 1.65, z: 6.8, width: 2.4, height: 3.3, depth: 2.4, material: "concrete" },
    { name: "center_parapet_n", x: 0, y: 4.1, z: -7.2, width: 8, height: 1.0, depth: 0.8, material: "concrete" },
    { name: "center_parapet_s", x: 0, y: 4.1, z: 7.2, width: 8, height: 1.0, depth: 0.8, material: "concrete" },
    ...createStairs("center_stairs_w", -15, 0, 1, 0, 4.5, 7, 3.6, 8, "concrete"),
    ...createStairs("center_stairs_e", 15, 0, -1, 0, 4.5, 7, 3.6, 8, "concrete"),
    { name: "red_base_wall_1", x: -36, y: 2.5, z: -30, width: 14, height: 5, depth: 2, material: "brick_wall" },
    { name: "red_base_wall_2", x: -28, y: 2.5, z: -42, width: 2, height: 5, depth: 12, material: "brick_wall" },
    { name: "red_tower_platform", x: -48, y: 4.5, z: -48, width: 12, height: 0.7, depth: 12, material: "concrete" },
    ...createStairs("red_tower_stairs", -48, -32, 0, -1, 4, 10, 4.85, 10, "concrete"),
    { name: "blue_base_wall_1", x: 36, y: 2.5, z: 30, width: 14, height: 5, depth: 2, material: "brick_wall" },
    { name: "blue_base_wall_2", x: 28, y: 2.5, z: 42, width: 2, height: 5, depth: 12, material: "brick_wall" },
    { name: "blue_tower_platform", x: 48, y: 4.5, z: 48, width: 12, height: 0.7, depth: 12, material: "concrete" },
    ...createStairs("blue_tower_stairs", 48, 32, 0, 1, 4, 10, 4.85, 10, "concrete"),
    { name: "container_nw_1", x: -22, y: 1.8, z: -16, width: 4, height: 3.6, depth: 10, material: "container_red" },
    { name: "container_se_1", x: 22, y: 1.8, z: 16, width: 4, height: 3.6, depth: 10, material: "container_blue" },
    { name: "container_ne_1", x: 24, y: 1.8, z: -24, width: 10, height: 3.6, depth: 4, material: "container_blue" },
    { name: "container_sw_1", x: -24, y: 1.8, z: 24, width: 10, height: 3.6, depth: 4, material: "container_red" },
    { name: "barrier_n", x: 0, y: 1.1, z: -20, width: 12, height: 2.2, depth: 1.6, material: "concrete" },
    { name: "barrier_s", x: 0, y: 1.1, z: 20, width: 12, height: 2.2, depth: 1.6, material: "concrete" },
    { name: "crate_cluster_1", x: -10, y: 1.0, z: 12, width: 2.4, height: 2.0, depth: 2.4, material: "crate_orange" },
    { name: "crate_cluster_3", x: 10, y: 1.0, z: -12, width: 2.4, height: 2.0, depth: 2.4, material: "crate_orange" },
  ];

  const props: MapProp[] = [];
  const guardHouseN = buildWalkableHouse({
    id: "citadel_gh_n",
    x: 0,
    z: -42,
    width: 11,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "plaster_wall",
    roofColor: "#334155",
  });
  const guardHouseS = buildWalkableHouse({
    id: "citadel_gh_s",
    x: 0,
    z: 42,
    width: 11,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "plaster_wall",
    roofColor: "#334155",
  });
  structures.push(...guardHouseN.boxes, ...guardHouseS.boxes);
  props.push(
    guardHouseN.prop,
    guardHouseS.prop,
    { id: "c_tree_1", kind: "tree_pine", x: -46, y: 0, z: 36 },
    { id: "c_tree_2", kind: "tree_pine", x: 46, y: 0, z: -36 },
    { id: "c_jeep_1", kind: "vehicle_jeep", x: -36, y: 0, z: 6, rotY: 0.4, color: "#334155" },
    { id: "c_jeep_2", kind: "vehicle_jeep", x: 36, y: 0, z: -6, rotY: -2.7, color: "#475569" },
  );

  return {
    id: "citadel_01",
    name: "Sunny Citadel",
    subtitle: "140x140m Daylight Command Fortress",
    skybox: "dawn",
    isDaylight: true,
    fogColor: "#fde68a",
    floorMaterial: "asphalt",
    floor: { width: 140, depth: 140, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(140, 140, 12, 2, "concrete"),
    structures,
    props,
    jumpPads: [
      { id: "jp_nw", x: -28, y: 0.2, z: -4, radius: 2.0, boostY: 22, color: "#38bdf8" },
      { id: "jp_se", x: 28, y: 0.2, z: 4, radius: 2.0, boostY: 22, color: "#38bdf8" },
    ],
    captureZone: { x: 0, y: 0.1, z: 0, radius: 7.5 },
    redSpawns: [
      { x: -54, y: 2, z: -54 },
      { x: -56, y: 2, z: -36 },
      { x: -36, y: 2, z: -56 },
    ],
    blueSpawns: [
      { x: 54, y: 2, z: 54 },
      { x: 56, y: 2, z: 36 },
      { x: 36, y: 2, z: 56 },
    ],
    ffaSpawns: [
      { x: -54, y: 2, z: -54 },
      { x: 54, y: 2, z: 54 },
      { x: 54, y: 2, z: -54 },
      { x: -54, y: 2, z: 54 },
      { x: -40, y: 2, z: 0 },
      { x: 40, y: 2, z: 0 },
    ],
    lootSpawns: [
      { x: 0, y: 4.0, z: 0 },
      { x: 0, y: 0.4, z: -42 },
      { x: 0, y: 0.4, z: 42 },
      { x: -22, y: 0.4, z: -6 },
      { x: 22, y: 0.4, z: 6 },
      { x: -48, y: 5.0, z: -48 },
      { x: 48, y: 5.0, z: 48 },
    ],
  };
}

function buildOutpostMap(): MapData {
  const structures: MapBox[] = [
    { name: "outpost_hq", x: 0, y: 2.2, z: 0, width: 12, height: 4.4, depth: 12, material: "stone_sand" },
    { name: "outpost_bridge_w", x: -15, y: 3.4, z: 0, width: 10, height: 0.6, depth: 6, material: "crate_orange" },
    { name: "outpost_bridge_e", x: 15, y: 3.4, z: 0, width: 10, height: 0.6, depth: 6, material: "crate_orange" },
    ...createStairs("outpost_stairs_w", -25, 0, 1, 0, 5, 6, 3.7, 7, "stone_sand"),
    ...createStairs("outpost_stairs_e", 25, 0, -1, 0, 5, 6, 3.7, 7, "stone_sand"),
    { name: "c_nw", x: -14, y: 1.2, z: -14, width: 4, height: 2.4, depth: 4, material: "crate_orange" },
    { name: "c_ne", x: 14, y: 1.2, z: -14, width: 4, height: 2.4, depth: 4, material: "crate_orange" },
    { name: "c_sw", x: -14, y: 1.2, z: 14, width: 4, height: 2.4, depth: 4, material: "crate_orange" },
    { name: "c_se", x: 14, y: 1.2, z: 14, width: 4, height: 2.4, depth: 4, material: "crate_orange" },
  ];

  const props: MapProp[] = [];
  const dh1 = buildWalkableHouse({
    id: "desert_h_n",
    x: -24,
    z: -32,
    width: 11,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "stone_sand",
    roofColor: "#b45309",
  });
  const dh2 = buildWalkableHouse({
    id: "desert_h_s",
    x: 24,
    z: 32,
    width: 11,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "stone_sand",
    roofColor: "#b45309",
  });
  structures.push(...dh1.boxes, ...dh2.boxes);
  props.push(
    dh1.prop,
    dh2.prop,
    { id: "o_sb_1", kind: "sandbags", x: 0, y: 0, z: -24, rotY: 0 },
    { id: "o_sb_2", kind: "sandbags", x: 0, y: 0, z: 24, rotY: 0 },
    { id: "o_truck_1", kind: "vehicle_truck", x: 28, y: 0, z: -28, rotY: 0.5, color: "#a38862" },
    { id: "o_truck_2", kind: "vehicle_truck", x: -28, y: 0, z: 28, rotY: -2.6, color: "#a38862" },
  );

  return {
    id: "outpost_02",
    name: "Solar Outpost",
    subtitle: "130x130m Desert Tactical Compound",
    skybox: "afternoon",
    isDaylight: true,
    fogColor: "#fef3c7",
    floorMaterial: "stone_sand",
    floor: { width: 130, depth: 130, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(130, 130, 10, 2, "stone_sand"),
    structures,
    props,
    jumpPads: [
      { id: "jp_1", x: -32, y: 0.2, z: 0, radius: 2, boostY: 22, color: "#f97316" },
      { id: "jp_2", x: 32, y: 0.2, z: 0, radius: 2, boostY: 22, color: "#f97316" },
    ],
    captureZone: { x: 0, y: 4.5, z: 0, radius: 6.5 },
    redSpawns: [
      { x: -48, y: 2, z: -46 },
      { x: -50, y: 2, z: -20 },
      { x: -34, y: 2, z: -50 },
    ],
    blueSpawns: [
      { x: 48, y: 2, z: 46 },
      { x: 50, y: 2, z: 20 },
      { x: 34, y: 2, z: 50 },
    ],
    ffaSpawns: [
      { x: -48, y: 2, z: -46 },
      { x: 48, y: 2, z: 46 },
      { x: 48, y: 2, z: -46 },
      { x: -48, y: 2, z: 46 },
      { x: 0, y: 2, z: -28 },
      { x: 0, y: 2, z: 28 },
    ],
    lootSpawns: [
      { x: -24, y: 0.4, z: -32 },
      { x: 24, y: 0.4, z: 32 },
      { x: 0, y: 4.8, z: 0 },
      { x: -14, y: 0.4, z: 14 },
      { x: 14, y: 0.4, z: -14 },
    ],
  };
}

function buildNexusMap(): MapData {
  const structures: MapBox[] = [
    { name: "reactor_core", x: 0, y: 4.5, z: 0, width: 6, height: 9, depth: 6, material: "cyber_glow", emissive: "#22d3ee" },
    { name: "ring_n", x: 0, y: 1.4, z: -16, width: 16, height: 2.8, depth: 2.5, material: "metal_dark" },
    { name: "ring_s", x: 0, y: 1.4, z: 16, width: 16, height: 2.8, depth: 2.5, material: "metal_dark" },
    { name: "ring_e", x: 16, y: 1.4, z: 0, width: 2.5, height: 2.8, depth: 16, material: "metal_dark" },
    { name: "ring_w", x: -16, y: 1.4, z: 0, width: 2.5, height: 2.8, depth: 16, material: "metal_dark" },
    { name: "deck_nw", x: -32, y: 3.6, z: -32, width: 18, height: 0.7, depth: 18, material: "cyber_glow", emissive: "#a855f7" },
    ...createStairs("nexus_st_nw", -32, -16, 0, -1, 4, 8, 3.95, 8, "metal_dark"),
    { name: "deck_se", x: 32, y: 3.6, z: 32, width: 18, height: 0.7, depth: 18, material: "cyber_glow", emissive: "#38bdf8" },
    ...createStairs("nexus_st_se", 32, 16, 0, 1, 4, 8, 3.95, 8, "metal_dark"),
    { name: "block_1", x: 26, y: 2.0, z: -26, width: 6, height: 4, depth: 6, material: "container_blue" },
    { name: "block_2", x: -26, y: 2.0, z: 26, width: 6, height: 4, depth: 6, material: "container_red" },
  ];

  return {
    id: "nexus_03",
    name: "Cyber Nexus",
    subtitle: "120x120m Night Neon Arena",
    skybox: "night",
    isDaylight: false,
    fogColor: "#0b1120",
    floorMaterial: "metal_dark",
    floor: { width: 120, depth: 120, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(120, 120, 14, 2, "cyber_glow"),
    structures,
    props: [
      { id: "nx_jb_1", kind: "jersey_barrier", x: 0, y: 0, z: -24, rotY: 0 },
      { id: "nx_jb_2", kind: "jersey_barrier", x: 0, y: 0, z: 24, rotY: 0 },
    ],
    jumpPads: [
      { id: "jp_n", x: 0, y: 0.2, z: -28, radius: 2.2, boostY: 24, color: "#22d3ee" },
      { id: "jp_s", x: 0, y: 0.2, z: 28, radius: 2.2, boostY: 24, color: "#22d3ee" },
      { id: "jp_e", x: 28, y: 0.2, z: 0, radius: 2.2, boostY: 24, color: "#e879f9" },
      { id: "jp_w", x: -28, y: 0.2, z: 0, radius: 2.2, boostY: 24, color: "#e879f9" },
    ],
    captureZone: { x: 0, y: 0.1, z: 0, radius: 9.0 },
    redSpawns: [
      { x: -46, y: 2, z: -46 },
      { x: -46, y: 2, z: -24 },
      { x: -24, y: 2, z: -46 },
    ],
    blueSpawns: [
      { x: 46, y: 2, z: 46 },
      { x: 46, y: 2, z: 24 },
      { x: 24, y: 2, z: 46 },
    ],
    ffaSpawns: [
      { x: -46, y: 2, z: -46 },
      { x: 46, y: 2, z: 46 },
      { x: 46, y: 2, z: -46 },
      { x: -46, y: 2, z: 46 },
      { x: 0, y: 2, z: -34 },
      { x: 0, y: 2, z: 34 },
    ],
    lootSpawns: [
      { x: -32, y: 4.1, z: -32 },
      { x: 32, y: 4.1, z: 32 },
      { x: -16, y: 0.4, z: 0 },
      { x: 16, y: 0.4, z: 0 },
    ],
  };
}

function buildCompoundMap(): MapData {
  const structures: MapBox[] = [];
  const props: MapProp[] = [];

  // Two-story realistic warehouses & guard stations with walkable interiors + stairs
  const whNW = buildWalkableHouse({
    id: "ph_wh_nw",
    x: -34,
    z: -32,
    width: 14,
    depth: 12,
    wallHeight: 4.0,
    wallMaterial: "concrete",
    roofColor: "#334155",
    twoStory: true,
  });
  const whSE = buildWalkableHouse({
    id: "ph_wh_se",
    x: 34,
    z: 32,
    width: 14,
    depth: 12,
    wallHeight: 4.0,
    wallMaterial: "brick_wall",
    roofColor: "#475569",
    twoStory: true,
  });
  const bunkerNE = buildWalkableHouse({
    id: "ph_bk_ne",
    x: 32,
    z: -32,
    width: 10,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "plaster_wall",
    roofColor: "#3f3f46",
    twoStory: false,
  });
  const bunkerSW = buildWalkableHouse({
    id: "ph_bk_sw",
    x: -32,
    z: 32,
    width: 10,
    depth: 9,
    wallHeight: 3.6,
    wallMaterial: "plaster_wall",
    roofColor: "#3f3f46",
    twoStory: false,
  });

  [whNW, whSE, bunkerNE, bunkerSW].forEach((b) => {
    structures.push(...b.boxes);
    props.push(b.prop);
  });

  // Asphalt Logistics Yard Roads + Central Elevated Steel Command Deck + Shipping Containers
  structures.push(
    { name: "ph_road_ns", x: 0, y: 0.03, z: 0, width: 14, height: 0.06, depth: 156, material: "asphalt" },
    { name: "ph_road_ew", x: 0, y: 0.03, z: 0, width: 156, height: 0.06, depth: 12, material: "asphalt" },
    { name: "ph_cmd_deck", x: 0, y: 3.0, z: 0, width: 14, height: 0.6, depth: 14, material: "metal_dark" },
    { name: "ph_cmd_pil_nw", x: -5.8, y: 1.5, z: -5.8, width: 2.0, height: 3.0, depth: 2.0, material: "concrete" },
    { name: "ph_cmd_pil_ne", x: 5.8, y: 1.5, z: -5.8, width: 2.0, height: 3.0, depth: 2.0, material: "concrete" },
    { name: "ph_cmd_pil_sw", x: -5.8, y: 1.5, z: 5.8, width: 2.0, height: 3.0, depth: 2.0, material: "concrete" },
    { name: "ph_cmd_pil_se", x: 5.8, y: 1.5, z: 5.8, width: 2.0, height: 3.0, depth: 2.0, material: "concrete" },
    ...createStairs("ph_cmd_st_w", -13, 0, 1, 0, 4.2, 6, 3.3, 8, "concrete"),
    ...createStairs("ph_cmd_st_e", 13, 0, -1, 0, 4.2, 6, 3.3, 8, "concrete"),

    // Cargo Shipping Containers
    { name: "ph_cont_red_1", x: -20, y: 1.8, z: -15, width: 4, height: 3.6, depth: 10, material: "container_red" },
    { name: "ph_cont_blue_1", x: 20, y: 1.8, z: 15, width: 4, height: 3.6, depth: 10, material: "container_blue" },
    { name: "ph_cont_blue_2", x: 18, y: 1.8, z: -20, width: 10, height: 3.6, depth: 4, material: "container_blue" },
    { name: "ph_cont_red_2", x: -18, y: 1.8, z: 20, width: 10, height: 3.6, depth: 4, material: "container_red" },

    // Exact Bullet & Movement Collision Proxies for Poly Haven PBR Cover Props
    { name: "ph_car_n_col", x: -4.2, y: 0.98, z: -20, width: 2.1, height: 1.95, depth: 5.0, material: "metal_dark", hidden: true },
    { name: "ph_car_s_col", x: 4.2, y: 0.98, z: 20, width: 2.1, height: 1.95, depth: 5.0, material: "metal_dark", hidden: true },
    { name: "ph_car_w_col", x: -46, y: 0.98, z: -5, width: 5.0, height: 1.95, depth: 2.1, material: "metal_dark", hidden: true },
    { name: "ph_car_e_col", x: 46, y: 0.98, z: 5, width: 5.0, height: 1.95, depth: 2.1, material: "metal_dark", hidden: true },

    { name: "ph_jb_n1_col", x: 0, y: 0.56, z: -14, width: 3.1, height: 1.12, depth: 0.9, material: "concrete", hidden: true },
    { name: "ph_jb_s1_col", x: 0, y: 0.56, z: 14, width: 3.1, height: 1.12, depth: 0.9, material: "concrete", hidden: true },
    { name: "ph_jb_w1_col", x: -24, y: 0.56, z: 0, width: 0.9, height: 1.12, depth: 3.1, material: "concrete", hidden: true },
    { name: "ph_jb_e1_col", x: 24, y: 0.56, z: 0, width: 0.9, height: 1.12, depth: 3.1, material: "concrete", hidden: true },
    { name: "ph_jb_nw_col", x: -12, y: 0.56, z: -32, width: 3.1, height: 1.12, depth: 0.9, material: "concrete", hidden: true },
    { name: "ph_jb_se_col", x: 12, y: 0.56, z: 32, width: 3.1, height: 1.12, depth: 0.9, material: "concrete", hidden: true },

    { name: "ph_cr_c1_col", x: -10, y: 0.78, z: -10, width: 2.2, height: 1.55, depth: 1.35, material: "crate_orange", hidden: true },
    { name: "ph_cr_c2_col", x: 10, y: 0.78, z: 10, width: 2.2, height: 1.55, depth: 1.35, material: "crate_orange", hidden: true },
    { name: "ph_cr_c3_col", x: -10, y: 0.75, z: 10, width: 1.7, height: 1.5, depth: 1.3, material: "crate_orange", hidden: true },
    { name: "ph_cr_c4_col", x: 10, y: 0.75, z: -10, width: 1.7, height: 1.5, depth: 1.3, material: "crate_orange", hidden: true },

    { name: "ph_gen_1_col", x: -28, y: 0.52, z: -12, width: 1.4, height: 1.05, depth: 1.0, material: "metal_dark", hidden: true },
    { name: "ph_gen_2_col", x: 28, y: 0.52, z: 12, width: 1.4, height: 1.05, depth: 1.0, material: "metal_dark", hidden: true },
    { name: "ph_ubox_1_col", x: -15, y: 0.87, z: -26, width: 0.9, height: 1.74, depth: 0.7, material: "metal_dark", hidden: true },
    { name: "ph_ubox_2_col", x: 15, y: 0.87, z: 26, width: 0.9, height: 1.74, depth: 0.7, material: "metal_dark", hidden: true },
    { name: "ph_tyre_1_col", x: -34, y: 0.45, z: 10, width: 1.7, height: 0.9, depth: 1.2, material: "metal_dark", hidden: true },
    { name: "ph_tyre_2_col", x: 34, y: 0.45, z: -10, width: 1.7, height: 0.9, depth: 1.2, material: "metal_dark", hidden: true },
  );

  // Full Poly Haven 3D Compound Prop Layout
  props.push(
    // Covered Tactical Vehicles
    { id: "cmp_car_n", kind: "ph_car", x: -4.2, y: 0, z: -20, rotY: 0.15 },
    { id: "cmp_car_s", kind: "ph_car", x: 4.2, y: 0, z: 20, rotY: Math.PI + 0.15 },
    { id: "cmp_car_w", kind: "ph_car", x: -46, y: 0, z: -5, rotY: Math.PI / 2 },
    { id: "cmp_car_e", kind: "ph_car", x: 46, y: 0, z: 5, rotY: -Math.PI / 2 },

    // Concrete Road Barriers (real Poly Haven concrete_road_barrier)
    { id: "cmp_jb_n1", kind: "jersey_barrier", x: 0, y: 0, z: -14, rotY: 0 },
    { id: "cmp_jb_s1", kind: "jersey_barrier", x: 0, y: 0, z: 14, rotY: Math.PI },
    { id: "cmp_jb_w1", kind: "jersey_barrier", x: -24, y: 0, z: 0, rotY: Math.PI / 2 },
    { id: "cmp_jb_e1", kind: "jersey_barrier", x: 24, y: 0, z: 0, rotY: -Math.PI / 2 },
    { id: "cmp_jb_nw", kind: "jersey_barrier", x: -12, y: 0, z: -32, rotY: 0 },
    { id: "cmp_jb_se", kind: "jersey_barrier", x: 12, y: 0, z: 32, rotY: Math.PI },

    // Military Supply Crates & Ammo Cases
    { id: "cmp_cr_w1", kind: "ph_crate_wood", x: -10, y: 0, z: -10, rotY: 0.25 },
    { id: "cmp_cr_w2", kind: "ph_crate_wood", x: 10, y: 0, z: 10, rotY: 0.25 },
    { id: "cmp_cr_a1", kind: "ph_crate_ammo", x: -10, y: 0, z: 10, rotY: -0.4 },
    { id: "cmp_cr_a2", kind: "ph_crate_ammo", x: 10, y: 0, z: -10, rotY: -0.4 },
    { id: "cmp_cr_w3", kind: "ph_crate_wood", x: -42, y: 0, z: 18, rotY: 0.8 },
    { id: "cmp_cr_w4", kind: "ph_crate_wood", x: 42, y: 0, z: -18, rotY: -0.8 },

    // Portable Generators, Utility Boxes & Propane Tanks
    { id: "cmp_gen_1", kind: "ph_generator", x: -28, y: 0, z: -12, rotY: 0.3 },
    { id: "cmp_gen_2", kind: "ph_generator", x: 28, y: 0, z: 12, rotY: -2.8 },
    { id: "cmp_ub_1", kind: "ph_utility_box", x: -15, y: 0, z: -26, rotY: 0 },
    { id: "cmp_ub_2", kind: "ph_utility_box", x: 15, y: 0, z: 26, rotY: Math.PI },
    { id: "cmp_pr_1", kind: "ph_propane", x: -22, y: 0, z: -22, rotY: 0 },
    { id: "cmp_pr_2", kind: "ph_propane", x: 22, y: 0, z: 22, rotY: 1.2 },
    { id: "cmp_pr_3", kind: "ph_propane", x: -42, y: 0, z: -20, rotY: 0.5 },
    { id: "cmp_pr_4", kind: "ph_propane", x: 42, y: 0, z: 20, rotY: 2.1 },

    // Tactical Tire Barricades
    { id: "cmp_tyre_1", kind: "ph_tyre", x: -34, y: 0, z: 10, rotY: 0.4 },
    { id: "cmp_tyre_2", kind: "ph_tyre", x: 34, y: 0, z: -10, rotY: -2.4 },
    { id: "cmp_tyre_3", kind: "ph_tyre", x: -14, y: 0, z: 38, rotY: 1.1 },
    { id: "cmp_tyre_4", kind: "ph_tyre", x: 14, y: 0, z: -38, rotY: -2.0 },

    // Street Lamps along Convoy Roads (real Poly Haven street_lamp_01)
    { id: "cmp_sl_1", kind: "streetlamp", x: -7.5, y: 0, z: -28, rotY: Math.PI / 2 },
    { id: "cmp_sl_2", kind: "streetlamp", x: 7.5, y: 0, z: 28, rotY: -Math.PI / 2 },
    { id: "cmp_sl_3", kind: "streetlamp", x: -28, y: 0, z: 7.5, rotY: Math.PI },
    { id: "cmp_sl_4", kind: "streetlamp", x: 28, y: 0, z: -7.5, rotY: 0 },
    { id: "cmp_sl_5", kind: "streetlamp", x: -7.5, y: 0, z: 46, rotY: Math.PI / 2 },
    { id: "cmp_sl_6", kind: "streetlamp", x: 7.5, y: 0, z: -46, rotY: -Math.PI / 2 },

    // Natural Perimeter Mossy Rocks & Trees
    { id: "cmp_rk_1", kind: "ph_rock_moss", x: -56, y: 0, z: -50, rotY: 0.4 },
    { id: "cmp_rk_2", kind: "ph_rock_moss", x: 56, y: 0, z: 50, rotY: 2.5 },
    { id: "cmp_rk_3", kind: "ph_rock_moss", x: 54, y: 0, z: -46, rotY: 1.3 },
    { id: "cmp_rk_4", kind: "ph_rock_moss", x: -54, y: 0, z: 46, rotY: -1.1 },
    { id: "cmp_tr_1", kind: "tree_pine", x: -62, y: 0, z: -26 },
    { id: "cmp_tr_2", kind: "tree_oak", x: -58, y: 0, z: 24 },
    { id: "cmp_tr_3", kind: "tree_pine", x: 62, y: 0, z: 26 },
    { id: "cmp_tr_4", kind: "tree_oak", x: 58, y: 0, z: -24 },
  );

  return {
    id: "compound_05",
    name: "Tactical Compound",
    subtitle: "160x160m Daylight Tactical Logistics Yard",
    skybox: "afternoon",
    isDaylight: true,
    fogColor: "#d6ebff",
    floorMaterial: "concrete",
    floor: { width: 160, depth: 160, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(160, 160, 10, 2, "concrete"),
    structures,
    props,
    jumpPads: [
      { id: "cmp_jp_w", x: -36, y: 0.2, z: 0, radius: 2.0, boostY: 22, color: "#0ea5e9" },
      { id: "cmp_jp_e", x: 36, y: 0.2, z: 0, radius: 2.0, boostY: 22, color: "#0ea5e9" },
    ],
    captureZone: { x: 0, y: 3.35, z: 0, radius: 7.0 },
    redSpawns: [
      { x: -64, y: 2, z: -64 },
      { x: -62, y: 2, z: -24 },
      { x: -30, y: 2, z: -64 },
      { x: -54, y: 2, z: -44 },
    ],
    blueSpawns: [
      { x: 64, y: 2, z: 64 },
      { x: 62, y: 2, z: 24 },
      { x: 30, y: 2, z: 64 },
      { x: 54, y: 2, z: 44 },
    ],
    ffaSpawns: [
      { x: -64, y: 2, z: -64 },
      { x: 64, y: 2, z: 64 },
      { x: 64, y: 2, z: -64 },
      { x: -64, y: 2, z: 64 },
      { x: 0, y: 2, z: -66 },
      { x: 0, y: 2, z: 66 },
      { x: -66, y: 2, z: 0 },
      { x: 66, y: 2, z: 0 },
    ],
    lootSpawns: [
      { x: 0, y: 3.7, z: 0 },
      { x: -34, y: 0.4, z: -32 },
      { x: 34, y: 0.4, z: 32 },
      { x: 32, y: 0.4, z: -32 },
      { x: -32, y: 0.4, z: 32 },
      { x: -14, y: 0.4, z: 0 },
      { x: 14, y: 0.4, z: 0 },
      { x: 0, y: 0.4, z: -26 },
      { x: 0, y: 0.4, z: 26 },
      { x: -46, y: 0.4, z: 12 },
      { x: 46, y: 0.4, z: -12 },
    ],
  };
}

function buildTitanHarborMap(): MapData {
  const floorW = 170;
  const floorD = 148;
  const structures: MapBox[] = [
    // Central moored cargo freighter hull & flight deck (accessible via twin dock ramps)
    { name: "ship_hull", x: 0, y: 1.4, z: 0, width: 34, height: 2.8, depth: 18, material: "metal_dark" },
    { name: "ship_bridge", x: 11, y: 4.4, z: 0, width: 7, height: 3.4, depth: 12, material: "container_blue" },
    { name: "ship_funnel", x: 11, y: 7.4, z: 0, width: 3.2, height: 2.6, depth: 4, material: "container_red" },
    ...createStairs("ship_stair_w", -24, 0, 1, 0, 5.5, 7, 2.8, 7, "wood_plank"),
    ...createStairs("ship_stair_n", 0, -16, 0, 1, 5.5, 7, 2.8, 7, "wood_plank"),

    // Stacked Container Yards (North & South lanes)
    { name: "cont_n1", x: -34, y: 1.8, z: -36, width: 12, height: 3.6, depth: 4.5, material: "container_red" },
    { name: "cont_n2", x: -34, y: 5.4, z: -36, width: 12, height: 3.6, depth: 4.5, material: "container_blue" },
    { name: "cont_n3", x: -12, y: 1.8, z: -40, width: 12, height: 3.6, depth: 4.5, material: "container_blue" },
    { name: "cont_n4", x: 18, y: 1.8, z: -36, width: 14, height: 3.6, depth: 4.5, material: "crate_orange" },
    { name: "cont_n5", x: 38, y: 1.8, z: -34, width: 12, height: 3.6, depth: 4.5, material: "container_red" },
    { name: "cont_s1", x: -36, y: 1.8, z: 36, width: 12, height: 3.6, depth: 4.5, material: "container_blue" },
    { name: "cont_s2", x: -10, y: 1.8, z: 38, width: 12, height: 3.6, depth: 4.5, material: "container_red" },
    { name: "cont_s3", x: 20, y: 1.8, z: 36, width: 12, height: 3.6, depth: 4.5, material: "crate_orange" },
    { name: "cont_s4", x: 36, y: 5.4, z: 34, width: 12, height: 3.6, depth: 4.5, material: "container_blue" },
    { name: "cont_s4_base", x: 36, y: 1.8, z: 34, width: 12, height: 3.6, depth: 4.5, material: "container_red" },

    // Heavy Shipyard Crane Gantries (West & East Sniper Perches)
    { name: "crane_w_p1", x: -46, y: 5, z: -14, width: 2.4, height: 10, depth: 2.4, material: "crate_orange" },
    { name: "crane_w_p2", x: -46, y: 5, z: 14, width: 2.4, height: 10, depth: 2.4, material: "crate_orange" },
    { name: "crane_w_deck", x: -46, y: 6.2, z: 0, width: 5.5, height: 0.7, depth: 32, material: "metal_dark" },
    { name: "crane_e_p1", x: 46, y: 5, z: -14, width: 2.4, height: 10, depth: 2.4, material: "crate_orange" },
    { name: "crane_e_p2", x: 46, y: 5, z: 14, width: 2.4, height: 10, depth: 2.4, material: "crate_orange" },
    { name: "crane_e_deck", x: 46, y: 6.2, z: 0, width: 5.5, height: 0.7, depth: 32, material: "metal_dark" },

    // Dock Warehouse Sheds & Concrete Bollards
    ...buildWalkableHouse({
      id: "harbor_office_nw",
      x: -54,
      z: -48,
      width: 14,
      depth: 12,
      wallHeight: 4.6,
      wallMaterial: "concrete",
      roofColor: "#334155",
    }).boxes,
    ...buildWalkableHouse({
      id: "harbor_office_se",
      x: 54,
      z: 48,
      width: 14,
      depth: 12,
      wallHeight: 4.6,
      wallMaterial: "concrete",
      roofColor: "#1e3a5f",
    }).boxes,
    { name: "bollard_1", x: -24, y: 1.0, z: -18, width: 2.4, height: 2.0, depth: 2.4, material: "concrete" },
    { name: "bollard_2", x: -24, y: 1.0, z: 18, width: 2.4, height: 2.0, depth: 2.4, material: "concrete" },
    { name: "bollard_3", x: 24, y: 1.0, z: -18, width: 2.4, height: 2.0, depth: 2.4, material: "concrete" },
    { name: "bollard_4", x: 24, y: 1.0, z: 18, width: 2.4, height: 2.0, depth: 2.4, material: "concrete" },
  ];

  const props: MapProp[] = [
    { id: "hb_truck_1", kind: "vehicle_truck", x: -60, y: 0, z: -18, rotY: 0.25 },
    { id: "hb_truck_2", kind: "vehicle_truck", x: 60, y: 0, z: 18, rotY: -2.85 },
    { id: "hb_jeep_1", kind: "vehicle_jeep", x: -16, y: 0, z: -26, rotY: 1.1 },
    { id: "hb_jeep_2", kind: "vehicle_jeep", x: 16, y: 0, z: 26, rotY: -1.9 },
    { id: "hb_gen_1", kind: "ph_generator", x: -32, y: 0, z: -8, rotY: 0 },
    { id: "hb_gen_2", kind: "ph_generator", x: 32, y: 0, z: 8, rotY: 3.14 },
    { id: "hb_ammo_1", kind: "ph_crate_ammo", x: -4, y: 2.8, z: 0, rotY: 0.4 },
    { id: "hb_wood_1", kind: "ph_crate_wood", x: -28, y: 0, z: 22, rotY: 0.3 },
    { id: "hb_wood_2", kind: "ph_crate_wood", x: 28, y: 0, z: -22, rotY: -0.5 },
    { id: "hb_util_1", kind: "ph_utility_box", x: -42, y: 0, z: -24, rotY: 0 },
    { id: "hb_util_2", kind: "ph_utility_box", x: 42, y: 0, z: 24, rotY: 1.57 },
    { id: "hb_sb_1", kind: "sandbags", x: -50, y: 0, z: 0, rotY: 1.57 },
    { id: "hb_sb_2", kind: "sandbags", x: 50, y: 0, z: 0, rotY: 1.57 },
    { id: "hb_lamp_1", kind: "streetlamp", x: -22, y: 0, z: -48, rotY: 0 },
    { id: "hb_lamp_2", kind: "streetlamp", x: 22, y: 0, z: 48, rotY: 3.14 },
  ];

  return {
    id: "titan_harbor",
    name: "Titan Harbor",
    subtitle: "Industrial Cargo Dock & Moored Freighter Deck",
    skybox: "afternoon",
    isDaylight: true,
    fogColor: "#cbe6ff",
    floorMaterial: "concrete",
    floor: { width: floorW, depth: floorD, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(floorW, floorD, 11, 2, "concrete"),
    structures,
    props,
    jumpPads: [
      { id: "hb_jp_w", x: -46, y: 0.15, z: -24, radius: 2.0, boostY: 22, color: "#0ea5e9" },
      { id: "hb_jp_e", x: 46, y: 0.15, z: 24, radius: 2.0, boostY: 22, color: "#0ea5e9" },
      { id: "hb_jp_ship_s", x: 0, y: 0.15, z: 16, radius: 2.0, boostY: 20, color: "#f97316" },
    ],
    captureZone: { x: -2, y: 2.9, z: 0, radius: 9.0 },
    redSpawns: [
      { x: -72, y: 1.2, z: -14 },
      { x: -72, y: 1.2, z: 14 },
      { x: -64, y: 1.2, z: -38 },
      { x: -64, y: 1.2, z: 38 },
    ],
    blueSpawns: [
      { x: 72, y: 1.2, z: -14 },
      { x: 72, y: 1.2, z: 14 },
      { x: 64, y: 1.2, z: -38 },
      { x: 64, y: 1.2, z: 38 },
    ],
    ffaSpawns: [
      { x: -68, y: 1.2, z: -28 },
      { x: 68, y: 1.2, z: 28 },
      { x: -68, y: 1.2, z: 28 },
      { x: 68, y: 1.2, z: -28 },
      { x: 0, y: 1.2, z: -56 },
      { x: 0, y: 1.2, z: 56 },
      { x: -4, y: 3.6, z: 0 },
    ],
    lootSpawns: [
      { x: -4, y: 3.2, z: 0 },
      { x: -46, y: 7.0, z: 0 },
      { x: 46, y: 7.0, z: 0 },
      { x: 0, y: 0.4, z: -34 },
      { x: 0, y: 0.4, z: 34 },
      { x: -54, y: 0.6, z: -48 },
      { x: 54, y: 0.6, z: 48 },
    ],
  };
}

function buildAetherSkyportMap(): MapData {
  const floorW = 152;
  const floorD = 152;
  const structures: MapBox[] = [
    // Elevated Central Sky-Citadel Command Deck
    { name: "sky_core_deck", x: 0, y: 2.2, z: 0, width: 22, height: 4.4, depth: 22, material: "plaster_wall" },
    { name: "sky_core_ring", x: 0, y: 4.5, z: 0, width: 10, height: 0.35, depth: 10, material: "cyber_glow", emissive: "#38bdf8" },
    ...createStairs("sky_st_n", 0, -18, 0, 1, 5, 7, 4.4, 8, "concrete"),
    ...createStairs("sky_st_s", 0, 18, 0, -1, 5, 7, 4.4, 8, "concrete"),

    // Dual Elevated Wing Decks (West & East) + Skybridges connecting to center
    { name: "wing_w", x: -42, y: 2.2, z: 0, width: 18, height: 4.4, depth: 34, material: "plaster_wall" },
    { name: "wing_e", x: 42, y: 2.2, z: 0, width: 18, height: 4.4, depth: 34, material: "plaster_wall" },
    { name: "bridge_w", x: -22, y: 4.05, z: 0, width: 22, height: 0.7, depth: 5.5, material: "concrete" },
    { name: "bridge_e", x: 22, y: 4.05, z: 0, width: 22, height: 0.7, depth: 5.5, material: "concrete" },
    ...createStairs("wing_w_st_n", -42, -24, 0, 1, 5, 7, 4.4, 8, "concrete"),
    ...createStairs("wing_e_st_s", 42, 24, 0, -1, 5, 7, 4.4, 8, "concrete"),

    // Symmetrical Tactical Pillars & Ballistic Shields
    { name: "monolith_nw", x: -24, y: 3.0, z: -32, width: 4.5, height: 6.0, depth: 4.5, material: "plaster_wall" },
    { name: "monolith_ne", x: 24, y: 3.0, z: -32, width: 4.5, height: 6.0, depth: 4.5, material: "plaster_wall" },
    { name: "monolith_sw", x: -24, y: 3.0, z: 32, width: 4.5, height: 6.0, depth: 4.5, material: "plaster_wall" },
    { name: "monolith_se", x: 24, y: 3.0, z: 32, width: 4.5, height: 6.0, depth: 4.5, material: "plaster_wall" },

    { name: "cover_n_mid", x: 0, y: 1.1, z: -42, width: 12, height: 2.2, depth: 2.2, material: "concrete" },
    { name: "cover_s_mid", x: 0, y: 1.1, z: 42, width: 12, height: 2.2, depth: 2.2, material: "concrete" },
    { name: "cover_nw_bunk", x: -50, y: 1.2, z: -42, width: 10, height: 2.4, depth: 3.0, material: "metal_dark" },
    { name: "cover_se_bunk", x: 50, y: 1.2, z: 42, width: 10, height: 2.4, depth: 3.0, material: "metal_dark" },
    { name: "beacon_n", x: 0, y: 4.2, z: -56, width: 2.2, height: 8.4, depth: 2.2, material: "cyber_glow", emissive: "#38bdf8" },
    { name: "beacon_s", x: 0, y: 4.2, z: 56, width: 2.2, height: 8.4, depth: 2.2, material: "cyber_glow", emissive: "#f43f5e" },
  ];

  const props: MapProp[] = [
    { id: "ae_bar_1", kind: "jersey_barrier", x: -15, y: 0, z: -24, rotY: 0 },
    { id: "ae_bar_2", kind: "jersey_barrier", x: 15, y: 0, z: 24, rotY: 0 },
    { id: "ae_bar_3", kind: "jersey_barrier", x: -15, y: 0, z: 24, rotY: 0 },
    { id: "ae_bar_4", kind: "jersey_barrier", x: 15, y: 0, z: -24, rotY: 0 },
    { id: "ae_gen_1", kind: "ph_generator", x: -34, y: 0, z: -18, rotY: 0.7 },
    { id: "ae_gen_2", kind: "ph_generator", x: 34, y: 0, z: 18, rotY: -2.4 },
    { id: "ae_util_1", kind: "ph_utility_box", x: -42, y: 4.4, z: 10, rotY: 0 },
    { id: "ae_util_2", kind: "ph_utility_box", x: 42, y: 4.4, z: -10, rotY: 3.14 },
    { id: "ae_crate_1", kind: "ph_crate_ammo", x: -6, y: 4.4, z: -6, rotY: 0.5 },
    { id: "ae_crate_2", kind: "ph_crate_ammo", x: 6, y: 4.4, z: 6, rotY: -0.5 },
  ];

  return {
    id: "aether_skyport",
    name: "Aether Skyport",
    subtitle: "High-Altitude Citadel & Dual Skybridges",
    skybox: "dawn",
    isDaylight: true,
    fogColor: "#e0f2fe",
    floorMaterial: "plaster_wall",
    floor: { width: floorW, depth: floorD, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(floorW, floorD, 10, 2, "concrete"),
    structures,
    props,
    jumpPads: [
      { id: "ae_jp_nw", x: -34, y: 0.15, z: -34, radius: 2.0, boostY: 24, color: "#38bdf8" },
      { id: "ae_jp_ne", x: 34, y: 0.15, z: -34, radius: 2.0, boostY: 24, color: "#38bdf8" },
      { id: "ae_jp_sw", x: -34, y: 0.15, z: 34, radius: 2.0, boostY: 24, color: "#38bdf8" },
      { id: "ae_jp_se", x: 34, y: 0.15, z: 34, radius: 2.0, boostY: 24, color: "#38bdf8" },
    ],
    captureZone: { x: 0, y: 4.7, z: 0, radius: 8.5 },
    redSpawns: [
      { x: -62, y: 1.2, z: -22 },
      { x: -62, y: 1.2, z: 22 },
      { x: -62, y: 1.2, z: 0 },
      { x: -50, y: 1.2, z: -50 },
    ],
    blueSpawns: [
      { x: 62, y: 1.2, z: -22 },
      { x: 62, y: 1.2, z: 22 },
      { x: 62, y: 1.2, z: 0 },
      { x: 50, y: 1.2, z: 50 },
    ],
    ffaSpawns: [
      { x: -58, y: 1.2, z: -42 },
      { x: 58, y: 1.2, z: 42 },
      { x: -58, y: 1.2, z: 42 },
      { x: 58, y: 1.2, z: -42 },
      { x: 0, y: 1.2, z: -58 },
      { x: 0, y: 1.2, z: 58 },
      { x: 0, y: 5.2, z: 0 },
    ],
    lootSpawns: [
      { x: 0, y: 5.0, z: 0 },
      { x: -42, y: 4.9, z: 0 },
      { x: 42, y: 4.9, z: 0 },
      { x: 0, y: 0.4, z: -36 },
      { x: 0, y: 0.4, z: 36 },
      { x: -24, y: 0.4, z: -18 },
      { x: 24, y: 0.4, z: 18 },
    ],
  };
}

function buildCrimsonFoundryMap(): MapData {
  const floorW = 154;
  const floorD = 154;
  const structures: MapBox[] = [
    // Glowing Molten Crucible Core & Catwalk Platform
    { name: "crucible_pedestal", x: 0, y: 1.6, z: 0, width: 12, height: 3.2, depth: 12, material: "metal_dark" },
    { name: "crucible_glow", x: 0, y: 6.0, z: 0, width: 4.2, height: 6.5, depth: 4.2, material: "cyber_glow", emissive: "#f97316" },
    { name: "catwalk_n", x: 0, y: 2.85, z: -18, width: 6, height: 0.7, depth: 24, material: "metal_dark" },
    { name: "catwalk_s", x: 0, y: 2.85, z: 18, width: 6, height: 0.7, depth: 24, material: "metal_dark" },
    ...createStairs("fn_st_n", 0, -37, 0, 1, 5.5, 7, 3.2, 7, "metal_dark"),
    ...createStairs("fn_st_s", 0, 37, 0, -1, 5.5, 7, 3.2, 7, "metal_dark"),

    // Heavy Smelter Blast Walls & Forges
    { name: "forge_nw", x: -32, y: 3.2, z: -26, width: 10, height: 6.4, depth: 10, material: "brick_wall" },
    { name: "forge_ne", x: 32, y: 3.2, z: -26, width: 10, height: 6.4, depth: 10, material: "brick_wall" },
    { name: "forge_sw", x: -32, y: 3.2, z: 26, width: 10, height: 6.4, depth: 10, material: "brick_wall" },
    { name: "forge_se", x: 32, y: 3.2, z: 26, width: 10, height: 6.4, depth: 10, material: "brick_wall" },
    { name: "forge_trim_nw", x: -32, y: 6.6, z: -26, width: 10.6, height: 0.4, depth: 10.6, material: "cyber_glow", emissive: "#ef4444" },
    { name: "forge_trim_se", x: 32, y: 6.6, z: 26, width: 10.6, height: 0.4, depth: 10.6, material: "cyber_glow", emissive: "#f97316" },

    // Side Industrial Galleries
    ...buildWalkableHouse({
      id: "foundry_bay_w",
      x: -44,
      z: 0,
      width: 14,
      depth: 18,
      wallHeight: 5.0,
      wallMaterial: "metal_dark",
      roofColor: "#291d1d",
    }).boxes,
    ...buildWalkableHouse({
      id: "foundry_bay_e",
      x: 44,
      z: 0,
      width: 14,
      depth: 18,
      wallHeight: 5.0,
      wallMaterial: "metal_dark",
      roofColor: "#291d1d",
    }).boxes,

    { name: "slag_wall_w", x: -20, y: 1.2, z: 0, width: 2.2, height: 2.4, depth: 14, material: "concrete" },
    { name: "slag_wall_e", x: 20, y: 1.2, z: 0, width: 2.2, height: 2.4, depth: 14, material: "concrete" },
  ];

  const props: MapProp[] = [
    { id: "cf_truck_1", kind: "vehicle_truck", x: -56, y: 0, z: -36, rotY: 0.6 },
    { id: "cf_truck_2", kind: "vehicle_truck", x: 56, y: 0, z: 36, rotY: -2.5 },
    { id: "cf_gen_1", kind: "ph_generator", x: -24, y: 0, z: -12, rotY: 0 },
    { id: "cf_gen_2", kind: "ph_generator", x: 24, y: 0, z: 12, rotY: 3.14 },
    { id: "cf_prop_1", kind: "ph_propane", x: -16, y: 0, z: -26, rotY: 0.2 },
    { id: "cf_prop_2", kind: "ph_propane", x: 16, y: 0, z: 26, rotY: -0.2 },
    { id: "cf_bar_1", kind: "barrel", x: -12, y: 0, z: 12, rotY: 0 },
    { id: "cf_bar_2", kind: "barrel", x: 12, y: 0, z: -12, rotY: 0 },
    { id: "cf_lamp_1", kind: "streetlamp", x: -20, y: 0, z: -42, rotY: 0 },
    { id: "cf_lamp_2", kind: "streetlamp", x: 20, y: 0, z: 42, rotY: 3.14 },
  ];

  return {
    id: "crimson_foundry",
    name: "Obsidian Foundry",
    subtitle: "Molten Crucible & Smelter Catwalks",
    skybox: "evening",
    isDaylight: false,
    fogColor: "#261113",
    floorMaterial: "metal_dark",
    floor: { width: floorW, depth: floorD, thickness: 1, x: 0, y: -0.5, z: 0 },
    walls: createPerimeterWalls(floorW, floorD, 11, 2, "metal_dark"),
    structures,
    props,
    jumpPads: [
      { id: "cf_jp_w", x: -30, y: 0.15, z: 0, radius: 2.0, boostY: 22, color: "#f97316" },
      { id: "cf_jp_e", x: 30, y: 0.15, z: 0, radius: 2.0, boostY: 22, color: "#f97316" },
    ],
    captureZone: { x: 0, y: 3.25, z: 0, radius: 9.0 },
    redSpawns: [
      { x: -62, y: 1.2, z: -18 },
      { x: -62, y: 1.2, z: 18 },
      { x: -58, y: 1.2, z: -44 },
      { x: -58, y: 1.2, z: 44 },
    ],
    blueSpawns: [
      { x: 62, y: 1.2, z: -18 },
      { x: 62, y: 1.2, z: 18 },
      { x: 58, y: 1.2, z: -44 },
      { x: 58, y: 1.2, z: 44 },
    ],
    ffaSpawns: [
      { x: -56, y: 1.2, z: -44 },
      { x: 56, y: 1.2, z: 44 },
      { x: -56, y: 1.2, z: 44 },
      { x: 56, y: 1.2, z: -44 },
      { x: 0, y: 1.2, z: -56 },
      { x: 0, y: 1.2, z: 56 },
    ],
    lootSpawns: [
      { x: 0, y: 3.6, z: -14 },
      { x: 0, y: 3.6, z: 14 },
      { x: -44, y: 0.6, z: 0 },
      { x: 44, y: 0.6, z: 0 },
      { x: -24, y: 0.4, z: -38 },
      { x: 24, y: 0.4, z: 38 },
    ],
  };
}

export const MAP_ORDER = [
  "compound_05",
  "veridian_04",
  "citadel_01",
  "outpost_02",
  "nexus_03",
  "titan_harbor",
  "aether_skyport",
  "crimson_foundry",
] as const;
export type MapId = (typeof MAP_ORDER)[number];

export const MAPS: Record<MapId, MapData> = {
  compound_05: buildCompoundMap(),
  veridian_04: buildVeridianMap(),
  citadel_01: buildCitadelMap(),
  outpost_02: buildOutpostMap(),
  nexus_03: buildNexusMap(),
  titan_harbor: buildTitanHarborMap(),
  aether_skyport: buildAetherSkyportMap(),
  crimson_foundry: buildCrimsonFoundryMap(),
};

export function resolveCylinderBoxCollisions(
  posX: number,
  posY: number,
  posZ: number,
  radius: number,
  map: MapData,
): { x: number; z: number } {
  let x = posX;
  let z = posZ;

  const maxX = map.floor.width / 2 - 1.2 - radius;
  const maxZ = map.floor.depth / 2 - 1.2 - radius;

  const playerBottom = posY - 1.0;
  const playerTop = posY + 1.0;

  for (const box of map.structures) {
    const boxTop = box.y + box.height / 2;
    const boxBottom = box.y - box.height / 2;

    if (boxTop <= playerBottom + 0.56) continue;
    if (boxBottom >= playerTop - 0.1) continue;

    const halfW = box.width / 2;
    const halfD = box.depth / 2;

    const closestX = Math.max(box.x - halfW, Math.min(x, box.x + halfW));
    const closestZ = Math.max(box.z - halfD, Math.min(z, box.z + halfD));

    const dx = x - closestX;
    const dz = z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        x += (dx / dist) * push;
        z += (dz / dist) * push;
      } else {
        const overlapX = halfW + radius - Math.abs(x - box.x);
        const overlapZ = halfD + radius - Math.abs(z - box.z);
        if (overlapX < overlapZ) {
          x += x >= box.x ? overlapX : -overlapX;
        } else {
          z += z >= box.z ? overlapZ : -overlapZ;
        }
      }
    }
  }

  x = Math.max(-maxX, Math.min(maxX, x));
  z = Math.max(-maxZ, Math.min(maxZ, z));

  return { x, z };
}

export function getSupportHeightAt(
  x: number,
  z: number,
  currentFeetY: number,
  radius: number,
  map: MapData,
): number {
  let highest = 0;
  for (const box of map.structures) {
    const top = box.y + box.height / 2;
    if (top > currentFeetY + 0.6) continue;
    const halfW = box.width / 2 + radius * 0.6;
    const halfD = box.depth / 2 + radius * 0.6;
    if (
      x >= box.x - halfW &&
      x <= box.x + halfW &&
      z >= box.z - halfD &&
      z <= box.z + halfD
    ) {
      if (top > highest) highest = top;
    }
  }
  return highest;
}

export function raycastMapBoxes(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  map: MapData,
): number {
  let closest = maxDist;
  const allBoxes = [...map.walls, ...map.structures];

  for (const b of allBoxes) {
    const minX = b.x - b.width / 2;
    const maxX = b.x + b.width / 2;
    const minY = b.y - b.height / 2;
    const maxY = b.y + b.height / 2;
    const minZ = b.z - b.depth / 2;
    const maxZ = b.z + b.depth / 2;

    let tmin = 0;
    let tmax = closest;

    if (Math.abs(dx) < 1e-8) {
      if (ox < minX || ox > maxX) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (minX - ox) * inv;
      let t2 = (maxX - ox) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (Math.abs(dy) < 1e-8) {
      if (oy < minY || oy > maxY) continue;
    } else {
      const inv = 1 / dy;
      let t1 = (minY - oy) * inv;
      let t2 = (maxY - oy) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (Math.abs(dz) < 1e-8) {
      if (oz < minZ || oz > maxZ) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (minZ - oz) * inv;
      let t2 = (maxZ - oz) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (tmin > 0 && tmin < closest) {
      closest = tmin;
    }
  }

  return closest;
}
