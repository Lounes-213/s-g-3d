import * as THREE from "three";

export type TexKind =
  | "brick_wall"
  | "plaster_wall"
  | "wood_plank"
  | "asphalt"
  | "grass_terrain"
  | "stone_sand"
  | "concrete"
  | "roof_shingle"
  | "metal_panel"
  | "tactical_weave";

const colorCache = new Map<TexKind, THREE.CanvasTexture>();
const bumpCache = new Map<TexKind, THREE.CanvasTexture>();

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function getProceduralTexture(kind: TexKind): THREE.CanvasTexture {
  const existing = colorCache.get(kind);
  if (existing) return existing;

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);

  if (kind === "brick_wall") {
    ctx.fillStyle = "#c8bfb2";
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const shade = ((r * 7 + c * 13) % 24) - 12;
        ctx.fillStyle = `rgb(${168 + shade}, ${84 + Math.floor(shade * 0.5)}, ${66 + Math.floor(shade * 0.4)})`;
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  } else if (kind === "plaster_wall") {
    ctx.fillStyle = "#f2eadc";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
      const x = (i * 73) % size;
      const y = (i * 137) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(180,165,140,0.16)" : "rgba(255,255,255,0.22)";
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = "rgba(150,135,115,0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size - 8, size - 8);
  } else if (kind === "wood_plank") {
    ctx.fillStyle = "#9c6b42";
    ctx.fillRect(0, 0, size, size);
    const planks = 6;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      const delta = ((p * 19) % 20) - 10;
      ctx.fillStyle = `rgb(${152 + delta}, ${106 + delta}, ${64 + Math.floor(delta * 0.6)})`;
      ctx.fillRect(0, p * ph + 2, size, ph - 4);
      ctx.fillStyle = "rgba(65,38,18,0.22)";
      ctx.fillRect(0, p * ph + ph * 0.35, size, 2);
      ctx.fillRect(0, p * ph + ph * 0.72, size, 1.5);
    }
  } else if (kind === "asphalt") {
    // Bright sunlit weathered tarmac road (clearly visible, zero dark crush)
    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2000; i++) {
      const x = (i * 53) % size;
      const y = (i * 97) % size;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.12)" : "rgba(51,65,85,0.2)";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = "rgba(241, 245, 249, 0.36)";
    ctx.fillRect(size / 2 - 3, 18, 6, 86);
    ctx.fillRect(size / 2 - 3, 148, 6, 86);
  } else if (kind === "grass_terrain") {
    // Sunlit green field terrain with subtle blade variation
    ctx.fillStyle = "#5f9d49";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2200; i++) {
      const x = (i * 61) % size;
      const y = (i * 113) % size;
      ctx.fillStyle =
        i % 3 === 0
          ? "rgba(163, 230, 53, 0.24)"
          : i % 3 === 1
            ? "rgba(34, 120, 48, 0.22)"
            : "rgba(217, 198, 120, 0.14)";
      ctx.fillRect(x, y, 3, 5);
    }
  } else if (kind === "stone_sand") {
    ctx.fillStyle = "#e6ca9d";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      const x = (i * 47) % size;
      const y = (i * 89) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(180,140,85,0.16)" : "rgba(255,248,230,0.22)";
      ctx.fillRect(x, y, 4, 2);
    }
  } else if (kind === "concrete") {
    // Crisp bright architectural stone/concrete pavers — ZERO numbers, ZERO dark grid
    ctx.fillStyle = "#cfd8e3";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1200; i++) {
      const x = (i * 43) % size;
      const y = (i * 101) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(100,116,139,0.08)" : "rgba(255,255,255,0.14)";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = "rgba(100,116,139,0.24)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
  } else if (kind === "metal_panel") {
    // Clean futuristic slate metal floor plating — zero numbers
    ctx.fillStyle = "#475569";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(148,163,184,0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size / 2 - 8, size / 2 - 8);
    ctx.strokeRect(size / 2 + 4, 4, size / 2 - 8, size / 2 - 8);
    ctx.strokeRect(4, size / 2 + 4, size / 2 - 8, size / 2 - 8);
    ctx.strokeRect(size / 2 + 4, size / 2 + 4, size / 2 - 8, size / 2 - 8);
    ctx.fillStyle = "rgba(56,189,248,0.16)";
    ctx.fillRect(size / 2 - 2, 16, 4, size - 32);
    ctx.fillRect(16, size / 2 - 2, size - 32, 4);
  } else if (kind === "roof_shingle") {
    ctx.fillStyle = "#9a3412";
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(0, r * rh, size, rh - 2);
      for (let c = 0; c < 6; c++) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect((c * size) / 6 + ((r % 2) * size) / 12, r * rh, 2, rh);
      }
    }
  } else if (kind === "tactical_weave") {
    ctx.fillStyle = "#949494";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        ctx.fillStyle = (x + y) % 16 === 0 ? "#a8a8a8" : "#808080";
        ctx.fillRect(x, y, 7, 7);
      }
    }
  }

  const tex = finalizeTexture(canvas, 1, 1, true);
  colorCache.set(kind, tex);
  return tex;
}

export function getProceduralBumpMap(kind: TexKind): THREE.CanvasTexture {
  const existing = bumpCache.get(kind);
  if (existing) return existing;

  const size = 128;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  if (kind === "brick_wall") {
    ctx.fillStyle = "#404040";
    ctx.fillRect(0, 0, size, size);
    const rows = 6;
    const cols = 3;
    const bh = size / rows;
    const bw = size / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = "#c8c8c8";
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  } else if (kind === "wood_plank") {
    const planks = 5;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = "#bdbdbd";
      ctx.fillRect(0, p * ph + 2, size, ph - 4);
      ctx.fillStyle = "#404040";
      ctx.fillRect(0, p * ph, size, 2);
    }
  } else if (kind === "roof_shingle") {
    const rows = 6;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? "#9e9e9e" : "#dcdcdc";
      ctx.fillRect(0, r * rh, size, rh - 2);
    }
  } else {
    ctx.fillStyle = "#a8a8a8";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#525252";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
  }

  const tex = finalizeTexture(canvas, 1, 1, false);
  bumpCache.set(kind, tex);
  return tex;
}
