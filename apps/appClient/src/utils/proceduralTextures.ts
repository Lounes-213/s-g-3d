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

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
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
  tex.anisotropy = 8;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function getProceduralTexture(kind: TexKind): THREE.CanvasTexture {
  const existing = colorCache.get(kind);
  if (existing) return existing;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size);

  if (kind === "brick_wall") {
    ctx.fillStyle = "#b8afa2";
    ctx.fillRect(0, 0, size, size);
    const rows = 12;
    const cols = 6;
    const bh = size / rows;
    const bw = size / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const shade = ((r * 11 + c * 17) % 34) - 17;
        const R = Math.min(220, Math.max(95, 162 + shade));
        const G = Math.min(150, Math.max(55, 82 + Math.floor(shade * 0.55)));
        const B = Math.min(125, Math.max(45, 64 + Math.floor(shade * 0.45)));
        ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
        // Subtle weathered highlight along top edge of brick
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, 3);
      }
    }
    // Weathering grime
    for (let i = 0; i < 1800; i++) {
      const x = (i * 97) % size;
      const y = (i * 193) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(30,20,15,0.1)" : "rgba(255,245,235,0.08)";
      ctx.fillRect(x, y, 4, 3);
    }
  } else if (kind === "plaster_wall") {
    ctx.fillStyle = "#ebe2d2";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = (i * 73) % size;
      const y = (i * 137) % size;
      ctx.fillStyle = i % 3 === 0 ? "rgba(165,148,124,0.15)" : "rgba(255,255,255,0.2)";
      ctx.fillRect(x, y, 4, 4);
    }
    // Subtle architectural stucco seam & warm bottom weathering
    const grad = ctx.createLinearGradient(0, size * 0.72, 0, size);
    grad.addColorStop(0, "rgba(110,95,78,0)");
    grad.addColorStop(1, "rgba(110,95,78,0.18)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, size * 0.72, size, size * 0.28);
  } else if (kind === "wood_plank") {
    ctx.fillStyle = "#8a5c36";
    ctx.fillRect(0, 0, size, size);
    const planks = 8;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      const delta = ((p * 23) % 26) - 13;
      ctx.fillStyle = `rgb(${144 + delta}, ${96 + Math.floor(delta * 0.8)}, ${58 + Math.floor(delta * 0.5)})`;
      ctx.fillRect(0, p * ph + 2, size, ph - 4);
      // Wood grain streaks
      for (let g = 0; g < 6; g++) {
        ctx.fillStyle = g % 2 === 0 ? "rgba(52,28,12,0.18)" : "rgba(210,165,115,0.12)";
        ctx.fillRect(0, p * ph + 6 + g * (ph / 7), size, 2);
      }
      // Plank separator shadow
      ctx.fillStyle = "rgba(30,15,5,0.5)";
      ctx.fillRect(0, p * ph, size, 2);
    }
  } else if (kind === "asphalt") {
    // Realistic GTA-style sunlit weathered tarmac with aggregate speckle & yellow/white road markings
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 7500; i++) {
      const x = (i * 53 + (i >> 3) * 19) % size;
      const y = (i * 97 + (i >> 2) * 31) % size;
      const tone = i % 4;
      ctx.fillStyle =
        tone === 0
          ? "rgba(255,255,255,0.12)"
          : tone === 1
            ? "rgba(15,23,42,0.22)"
            : tone === 2
              ? "rgba(148,163,184,0.14)"
              : "rgba(30,41,59,0.18)";
      ctx.fillRect(x, y, 3, 3);
    }
    // Tire wear tracks
    ctx.fillStyle = "rgba(15,23,42,0.14)";
    ctx.fillRect(size * 0.18, 0, size * 0.16, size);
    ctx.fillRect(size * 0.66, 0, size * 0.16, size);
    // Double amber center dashes + outer crisp white shoulder lines
    ctx.fillStyle = "rgba(245, 185, 55, 0.72)";
    ctx.fillRect(size / 2 - 7, 24, 5, 170);
    ctx.fillRect(size / 2 + 2, 24, 5, 170);
    ctx.fillRect(size / 2 - 7, 280, 5, 170);
    ctx.fillRect(size / 2 + 2, 280, 5, 170);
    ctx.fillStyle = "rgba(241, 245, 249, 0.42)";
    ctx.fillRect(14, 0, 5, size);
    ctx.fillRect(size - 19, 0, 5, size);
  } else if (kind === "grass_terrain") {
    // Rich sunlit California/Mediterranean valley grass with soil mottling & fine blade clusters
    ctx.fillStyle = "#5b8c42";
    ctx.fillRect(0, 0, size, size);
    // Large organic soil/meadow patches
    for (let i = 0; i < 65; i++) {
      const x = (i * 139) % size;
      const y = (i * 227) % size;
      const rad = 28 + (i % 45);
      const g = ctx.createRadialGradient(x, y, 4, x, y, rad);
      if (i % 3 === 0) {
        g.addColorStop(0, "rgba(122, 166, 68, 0.28)");
        g.addColorStop(1, "rgba(122, 166, 68, 0)");
      } else if (i % 3 === 1) {
        g.addColorStop(0, "rgba(118, 96, 64, 0.2)");
        g.addColorStop(1, "rgba(118, 96, 64, 0)");
      } else {
        g.addColorStop(0, "rgba(56, 102, 42, 0.25)");
        g.addColorStop(1, "rgba(56, 102, 42, 0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crisp grass blades
    for (let i = 0; i < 6500; i++) {
      const x = (i * 61) % size;
      const y = (i * 113) % size;
      ctx.fillStyle =
        i % 4 === 0
          ? "rgba(163, 214, 78, 0.26)"
          : i % 4 === 1
            ? "rgba(42, 92, 38, 0.28)"
            : i % 4 === 2
              ? "rgba(202, 182, 110, 0.16)"
              : "rgba(92, 148, 56, 0.22)";
      ctx.fillRect(x, y, 2, 7);
    }
  } else if (kind === "stone_sand") {
    ctx.fillStyle = "#d9bf94";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5000; i++) {
      const x = (i * 47) % size;
      const y = (i * 89) % size;
      ctx.fillStyle =
        i % 3 === 0
          ? "rgba(155,118,72,0.18)"
          : i % 3 === 1
            ? "rgba(255,248,230,0.2)"
            : "rgba(110,88,62,0.12)";
      ctx.fillRect(x, y, 5, 3);
    }
  } else if (kind === "concrete") {
    ctx.fillStyle = "#c5ced9";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4500; i++) {
      const x = (i * 43) % size;
      const y = (i * 101) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(71,85,105,0.1)" : "rgba(255,255,255,0.14)";
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = "rgba(71,85,105,0.32)";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(size / 2 + 2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
  } else if (kind === "metal_panel") {
    ctx.fillStyle = "#3f4c5e";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 67) % size;
      const y = (i * 131) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.12)";
      ctx.fillRect(x, y, 6, 2);
    }
    ctx.strokeStyle = "rgba(148,163,184,0.32)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, size / 2 - 12, size / 2 - 12);
    ctx.strokeRect(size / 2 + 6, 6, size / 2 - 12, size / 2 - 12);
    ctx.strokeRect(6, size / 2 + 6, size / 2 - 12, size / 2 - 12);
    ctx.strokeRect(size / 2 + 6, size / 2 + 6, size / 2 - 12, size / 2 - 12);
    // Rivets
    ctx.fillStyle = "rgba(203,213,225,0.45)";
    const pts = [18, size / 2 - 18, size / 2 + 18, size - 18];
    for (const rx of pts) {
      for (const ry of pts) {
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === "roof_shingle") {
    ctx.fillStyle = "#8a3114";
    ctx.fillRect(0, 0, size, size);
    const rows = 12;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(0, r * rh, size, rh - 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, (r + 1) * rh - 3, size, 3);
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect((c * size) / 8 + ((r % 2) * size) / 16, r * rh, 2, rh);
      }
    }
  } else if (kind === "tactical_weave") {
    // High-detail Ripstop Kevlar & Micro-Tactical Uniform Fabric
    ctx.fillStyle = "#bcbcbc";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        const alt = ((x + y) / 8) % 2 === 0;
        ctx.fillStyle = alt ? "#cfcfcf" : "#a6a6a6";
        ctx.fillRect(x, y, 7, 7);
      }
    }
    // Subtle ripstop reinforcement grid
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let k = 0; k < size; k += 32) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, k);
      ctx.lineTo(size, k);
      ctx.stroke();
    }
  }

  const tex = finalizeTexture(canvas, 1, 1, true);
  colorCache.set(kind, tex);
  return tex;
}

export function getProceduralBumpMap(kind: TexKind): THREE.CanvasTexture {
  const existing = bumpCache.get(kind);
  if (existing) return existing;

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  if (kind === "brick_wall") {
    ctx.fillStyle = "#383838";
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = "#d0d0d0";
        ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  } else if (kind === "wood_plank") {
    const planks = 6;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = "#c4c4c4";
      ctx.fillRect(0, p * ph + 2, size, ph - 4);
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, p * ph, size, 2);
    }
  } else if (kind === "roof_shingle") {
    const rows = 8;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? "#a0a0a0" : "#e0e0e0";
      ctx.fillRect(0, r * rh, size, rh - 2);
    }
  } else if (kind === "tactical_weave") {
    for (let y = 0; y < size; y += 6) {
      for (let x = 0; x < size; x += 6) {
        ctx.fillStyle = (x + y) % 12 === 0 ? "#b8b8b8" : "#686868";
        ctx.fillRect(x, y, 5, 5);
      }
    }
  } else if (kind === "asphalt" || kind === "grass_terrain") {
    for (let i = 0; i < 3200; i++) {
      const x = (i * 53) % size;
      const y = (i * 97) % size;
      ctx.fillStyle = i % 2 === 0 ? "#b2b2b2" : "#565656";
      ctx.fillRect(x, y, 2, 2);
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
