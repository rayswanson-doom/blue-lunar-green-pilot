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

function texFrom(c: HTMLCanvasElement, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function hexRgb(n: number) {
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

export function makeThemeTextures(theme: ThemeDef) {
  const wall = noiseCanvas(256, hexRgb(theme.wallA), 28);
  wall.ctx.fillStyle = "rgba(0,0,0,0.18)";
  wall.ctx.fillRect(0, 168, 256, 88);
  wall.ctx.fillStyle = "rgba(255,255,255,0.08)";
  wall.ctx.fillRect(0, 160, 256, 6);
  if (theme.id === "cyberpunk") {
    wall.ctx.fillStyle = "rgba(60,200,220,0.35)";
    wall.ctx.fillRect(0, 40, 256, 4);
    wall.ctx.fillRect(0, 210, 256, 3);
  }
  if (theme.id === "hell") {
    wall.ctx.fillStyle = "rgba(220,70,30,0.2)";
    for (let i = 0; i < 12; i++) {
      wall.ctx.fillRect(Math.random() * 256, Math.random() * 256, 8, 40);
    }
  }
  if (theme.id === "forest") {
    wall.ctx.strokeStyle = "rgba(30,20,10,0.25)";
    for (let x = 0; x < 256; x += 42) {
      wall.ctx.beginPath();
      wall.ctx.moveTo(x, 0);
      wall.ctx.lineTo(x + 6, 256);
      wall.ctx.stroke();
    }
  }
  if (theme.id === "battlefield") {
    wall.ctx.fillStyle = "rgba(40,30,20,0.2)";
    for (let i = 0; i < 18; i++) {
      wall.ctx.fillRect(Math.random() * 240, Math.random() * 240, 12 + Math.random() * 20, 8);
    }
  }

  const floor = noiseCanvas(256, hexRgb(theme.floorA), 22);
  floor.ctx.strokeStyle = "rgba(0,0,0,0.12)";
  floor.ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    floor.ctx.beginPath();
    floor.ctx.moveTo(i, 0);
    floor.ctx.lineTo(i, 256);
    floor.ctx.moveTo(0, i);
    floor.ctx.lineTo(256, i);
    floor.ctx.stroke();
  }

  const cap = noiseCanvas(64, hexRgb(theme.cap), 16);

  const wallTex = texFrom(wall.c, 1);
  const floorTex = texFrom(floor.c, 2);
  const capTex = texFrom(cap.c, 1);
  const bump = wallTex.clone();
  bump.colorSpace = THREE.NoColorSpace;

  return { wallTex, floorTex, capTex, bump };
}
