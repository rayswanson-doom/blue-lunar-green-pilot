import * as THREE from "three";
import type { ThemeDef } from "./content";

function hex(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function makeThemeEnv(theme: ThemeDef, renderer: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, hex(theme.hemiSky));
  g.addColorStop(0.42, hex(theme.fog));
  g.addColorStop(0.55, hex(theme.bg));
  g.addColorStop(1, hex(theme.hemiGround));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = hex(theme.sun);
  ctx.beginPath();
  ctx.arc(theme.id === "cyberpunk" ? 420 : 350, 58, theme.id === "hell" ? 36 : 24, 0, Math.PI * 2);
  ctx.fill();
  if (theme.id === "cyberpunk") {
    ctx.fillStyle = "rgba(80,220,255,0.28)";
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 64, 90 + (i % 3) * 8, 48, 3);
  }
  if (theme.id === "hell") {
    ctx.fillStyle = "rgba(255,80,20,0.3)";
    ctx.fillRect(0, 170, 512, 86);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return envMap;
}
