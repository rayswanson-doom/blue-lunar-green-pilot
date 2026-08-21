import * as THREE from "three";
import type { ThemeDef } from "./content";

function noiseCanvas(size: number, base: string, variance: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * variance;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n * 0.92));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n * 0.8));
  }
  ctx.putImageData(img, 0, 0);
  return { c, ctx };
}

function texFrom(c: HTMLCanvasElement, repeat = 1, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = colorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function hexRgb(n: number) {
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

function lumaAt(data: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  const xx = ((x % w) + w) % w;
  const yy = ((y % h) + h) % h;
  const i = (yy * w + xx) * 4;
  return (data[i]! * 0.3 + data[i + 1]! * 0.59 + data[i + 2]! * 0.11) / 255;
}

function sobelNormal(src: HTMLCanvasElement, strength = 3.2) {
  const w = src.width;
  const h = src.height;
  const srcData = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const dst = octx.createImageData(w, h);
  const d = dst.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        lumaAt(srcData, w, h, x + 1, y - 1) +
        2 * lumaAt(srcData, w, h, x + 1, y) +
        lumaAt(srcData, w, h, x + 1, y + 1) -
        (lumaAt(srcData, w, h, x - 1, y - 1) +
          2 * lumaAt(srcData, w, h, x - 1, y) +
          lumaAt(srcData, w, h, x - 1, y + 1));
      const dy =
        lumaAt(srcData, w, h, x - 1, y + 1) +
        2 * lumaAt(srcData, w, h, x, y + 1) +
        lumaAt(srcData, w, h, x + 1, y + 1) -
        (lumaAt(srcData, w, h, x - 1, y - 1) +
          2 * lumaAt(srcData, w, h, x, y - 1) +
          lumaAt(srcData, w, h, x + 1, y - 1));
      const nx = -dx * strength;
      const ny = dy * strength;
      const inv = 1 / Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      d[i] = (nx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (1 * inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function roughnessCanvas(src: HTMLCanvasElement) {
  const w = src.width;
  const h = src.height;
  const srcData = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const dst = octx.createImageData(w, h);
  for (let i = 0; i < srcData.length; i += 4) {
    const l = (srcData[i]! * 0.3 + srcData[i + 1]! * 0.59 + srcData[i + 2]! * 0.11) / 255;
    const r = Math.max(0.18, Math.min(0.96, 0.72 - (l - 0.5) * 0.55 + (Math.random() - 0.5) * 0.08));
    const v = r * 255;
    dst.data[i] = v;
    dst.data[i + 1] = v;
    dst.data[i + 2] = v;
    dst.data[i + 3] = 255;
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

export function makeThemeTextures(theme: ThemeDef) {
  const wall = noiseCanvas(256, hexRgb(theme.wallA), 34);
  wall.ctx.fillStyle = "rgba(0,0,0,0.18)";
  wall.ctx.fillRect(0, 168, 256, 88);
  wall.ctx.fillStyle = "rgba(255,255,255,0.1)";
  wall.ctx.fillRect(0, 160, 256, 6);
  if (theme.id === "cyberpunk") {
    wall.ctx.fillStyle = "rgba(60,200,220,0.4)";
    wall.ctx.fillRect(0, 40, 256, 5);
    wall.ctx.fillRect(0, 210, 256, 3);
    wall.ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 256; y += 32) wall.ctx.fillRect(0, y, 256, 2);
  }
  if (theme.id === "hell") {
    wall.ctx.fillStyle = "rgba(255,120,40,0.35)";
    for (let i = 0; i < 18; i++) {
      wall.ctx.fillRect(Math.random() * 256, Math.random() * 256, 10, 50);
    }
    wall.ctx.fillStyle = "rgba(255,200,120,0.18)";
    wall.ctx.fillRect(0, 80, 256, 12);
  }
  if (theme.id === "forest") {
    wall.ctx.strokeStyle = "rgba(30,20,10,0.28)";
    wall.ctx.lineWidth = 3;
    for (let x = 0; x < 256; x += 42) {
      wall.ctx.beginPath();
      wall.ctx.moveTo(x, 0);
      wall.ctx.lineTo(x + 6, 256);
      wall.ctx.stroke();
    }
  }
  if (theme.id === "battlefield") {
    wall.ctx.fillStyle = "rgba(40,30,20,0.22)";
    for (let i = 0; i < 18; i++) {
      wall.ctx.fillRect(Math.random() * 240, Math.random() * 240, 12 + Math.random() * 20, 8);
    }
  }
  if (theme.id === "victorian") {
    wall.ctx.strokeStyle = "rgba(80,50,30,0.16)";
    wall.ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 36) {
      wall.ctx.beginPath();
      wall.ctx.moveTo(0, y);
      wall.ctx.lineTo(256, y);
      wall.ctx.stroke();
    }
  }

  const floor = noiseCanvas(256, hexRgb(theme.floorA), 26);
  floor.ctx.strokeStyle = "rgba(0,0,0,0.14)";
  floor.ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    floor.ctx.beginPath();
    floor.ctx.moveTo(i, 0);
    floor.ctx.lineTo(i, 256);
    floor.ctx.moveTo(0, i);
    floor.ctx.lineTo(256, i);
    floor.ctx.stroke();
  }
  const floorImg = floor.ctx.getImageData(0, 0, 256, 256);
  const fd = floorImg.data;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x % 64) / 64;
      const v = (y % 64) / 64;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const ao = 0.52 + 0.48 * Math.min(1, edge * 4.2);
      const i = (y * 256 + x) * 4;
      fd[i] = fd[i]! * ao;
      fd[i + 1] = fd[i + 1]! * ao;
      fd[i + 2] = fd[i + 2]! * ao;
    }
  }
  floor.ctx.putImageData(floorImg, 0, 0);

  const cap = noiseCanvas(64, hexRgb(theme.cap), 16);
  const wallNormal = texFrom(sobelNormal(wall.c, theme.id === "cyberpunk" ? 2.4 : 3.4), 1, THREE.NoColorSpace);
  const floorNormal = texFrom(sobelNormal(floor.c, 2.6), 2, THREE.NoColorSpace);
  const wallRough = texFrom(roughnessCanvas(wall.c), 1, THREE.NoColorSpace);
  const floorRough = texFrom(roughnessCanvas(floor.c), 2, THREE.NoColorSpace);

  return {
    wallTex: texFrom(wall.c, 1),
    floorTex: texFrom(floor.c, 2),
    capTex: texFrom(cap.c, 1),
    wallNormal,
    floorNormal,
    wallRough,
    floorRough,
  };
}
