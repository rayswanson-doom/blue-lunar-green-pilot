import * as THREE from "three";
import { CONFIG } from "./config";
import type { ThemeDef } from "./content";
import { CELL } from "./maze";

type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number };

export type ParticleField = {
  mesh: THREE.Points;
  update: (dt: number, px: number, pz: number) => void;
  dispose: () => void;
};

export function createParticleField(theme: ThemeDef, cols: number, rows: number): ParticleField | null {
  const count = CONFIG.fx.particles[theme.id];
  if (!count) return null;
  const width = cols * CELL;
  const depth = rows * CELL;
  const pool: P[] = [];
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const color = new THREE.Color(theme.lantern);

  const spawn = (p: P) => {
    p.x = Math.random() * width;
    p.z = Math.random() * depth;
    if (theme.id === "cyberpunk") {
      p.y = 4 + Math.random() * 6;
      p.vx = 0.4;
      p.vy = -7 - Math.random() * 4;
      p.vz = 0.15;
      p.life = 1;
    } else if (theme.id === "hell") {
      p.y = 0.1 + Math.random() * 1.4;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = 0.6 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 0.4;
      p.life = 0.6 + Math.random() * 0.8;
    } else if (theme.id === "forest") {
      p.y = 1.2 + Math.random() * 3;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = -0.35 - Math.random() * 0.25;
      p.vz = (Math.random() - 0.5) * 0.8;
      p.life = 1;
    } else {
      p.y = 0.4 + Math.random() * 2.4;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = 0.08;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.life = 1;
    }
  };

  for (let i = 0; i < count; i++) {
    const p: P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1 };
    spawn(p);
    pool.push(p);
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: theme.id === "cyberpunk" ? 0.045 : theme.id === "hell" ? 0.09 : 0.07,
    vertexColors: true,
    transparent: true,
    opacity: theme.id === "cyberpunk" ? 0.55 : 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  mesh.name = "particles";

  const update = (dt: number, px: number, pz: number) => {
    const t = dt;
    for (let i = 0; i < count; i++) {
      const p = pool[i]!;
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.z += p.vz * t;
      if (theme.id === "forest") {
        p.x += Math.sin(p.y * 2 + i) * t * 0.25;
      }
      let reset = false;
      if (theme.id === "cyberpunk") reset = p.y < 0;
      else if (theme.id === "hell") reset = p.y > 4.2 || p.life < 0;
      else if (theme.id === "forest") reset = p.y < 0.05;
      else reset = p.y > 3.6;
      p.life -= t * 0.25;
      if (reset) spawn(p);
      const dx = p.x - px;
      const dz = p.z - pz;
      if (dx * dx + dz * dz > 420) spawn(p);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    geo.attributes.position!.needsUpdate = true;
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return { mesh, update, dispose };
}
