import * as THREE from "three";
import type { ShrineId, ThemeId, Weapon, WeaponKind } from "./content";

function hex(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function drawSword(
  ctx: CanvasRenderingContext2D,
  shrine: ShrineId,
  blade: string,
  glow: string,
  grip: string,
) {
  // 32×48 pixel sabre, point up
  const g = grip;
  const b = blade;
  const o = glow;
  const dark = "#1a1410";
  // handle
  px(ctx, 14, 36, g, 4, 10);
  px(ctx, 13, 35, dark, 6, 2);
  px(ctx, 12, 34, o, 8, 2); // guard
  if (shrine === "luma") {
    px(ctx, 14, 44, o, 4, 3); // lantern pommel
    px(ctx, 15, 45, "#fff4c8", 2, 2);
    px(ctx, 13, 8, o, 6, 26);
    px(ctx, 14, 4, b, 4, 30);
    px(ctx, 15, 2, "#fffbe8", 2, 8);
  } else {
    // pearl: thin rapier
    px(ctx, 13, 34, o, 6, 2);
    px(ctx, 15, 3, b, 2, 31);
    px(ctx, 16, 1, "#f4f7ff", 1, 6);
    px(ctx, 14, 18, o, 4, 1);
  }
}

function drawGun(
  ctx: CanvasRenderingContext2D,
  shrine: ShrineId,
  blade: string,
  glow: string,
  grip: string,
) {
  const g = grip;
  const b = blade;
  const o = glow;
  const dark = "#141210";
  if (shrine === "cinder") {
    // chunky scattergun
    px(ctx, 8, 28, g, 6, 12);
    px(ctx, 10, 22, dark, 14, 10);
    px(ctx, 12, 20, b, 16, 8);
    px(ctx, 24, 22, o, 6, 4);
    px(ctx, 26, 21, "#fff3c0", 3, 2);
    px(ctx, 14, 18, o, 4, 3);
  } else {
    // ruby compact burst pistol
    px(ctx, 10, 30, g, 5, 10);
    px(ctx, 12, 24, dark, 12, 8);
    px(ctx, 14, 22, b, 12, 6);
    px(ctx, 24, 23, o, 4, 3);
    px(ctx, 16, 20, o, 3, 2);
    px(ctx, 18, 21, "#ffd0d8", 2, 2);
  }
}

export function makePixelWeaponTexture(w: Weapon): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 48;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 32, 48);
  const shrine = w.shrineId ?? "luma";
  const blade = hex(w.blade);
  const glow = hex(w.glow);
  const grip = hex(w.grip);
  if (w.kind === "sword") drawSword(ctx, shrine, blade, glow, grip);
  else drawGun(ctx, shrine, blade, glow, grip);

  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function pixelWeaponLabel(kind: WeaponKind, shrine: ShrineId, theme: ThemeId) {
  return `${shrine}-${kind}-${theme}`;
}