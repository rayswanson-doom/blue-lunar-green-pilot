import * as THREE from "three";
import type { ShrineDef, ThemeId, Weapon } from "./content";
import { makePixelWeaponTexture } from "./pixelWeapons";

function mat(color: number, opts: { rough?: number; metal?: number; em?: number; emCol?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.72,
    metalness: opts.metal ?? 0.08,
    emissive: opts.emCol ?? 0x000000,
    emissiveIntensity: opts.em ?? 0,
  });
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = false;
  parent.add(m);
  return m;
}

export function buildHunter(color: number, skin = 0xe8c4a4): THREE.Group {
  const g = new THREE.Group();
  g.name = "hunter";
  const suit = mat(color, { rough: 0.55, metal: 0.18 });
  const sk = mat(skin, { rough: 0.55 });
  const dark = mat(0x1c1814, { rough: 0.5 });
  const sphere = new THREE.SphereGeometry(1, 12, 10);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  addMesh(g, cyl, dark, 0.14, 0.16, 0.02, 0.12, 0.32, 0.16);
  addMesh(g, cyl, dark, -0.14, 0.16, 0.02, 0.12, 0.32, 0.16);
  addMesh(g, cyl, suit, 0, 0.72, 0, 0.3, 0.82, 0.24);
  addMesh(g, sphere, sk, 0, 1.28, 0, 0.22, 0.22, 0.22);
  addMesh(g, sphere, dark, 0, 1.4, -0.02, 0.24, 0.12, 0.24);
  addMesh(g, sphere, dark, 0.07, 1.3, 0.18, 0.04, 0.04, 0.03);
  addMesh(g, sphere, dark, -0.07, 1.3, 0.18, 0.04, 0.04, 0.03);
  addMesh(g, sphere, suit, 0.32, 0.78, 0, 0.09, 0.09, 0.09);
  addMesh(g, sphere, suit, -0.32, 0.78, 0, 0.09, 0.09, 0.09);
  return g;
}

export function buildDiamond(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe8ff,
      emissive: 0x4aa8d8,
      emissiveIntensity: 0.95,
      roughness: 0.12,
      metalness: 0.35,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
    }),
  );
  g.add(core);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x7ecfff, transparent: true, opacity: 0.16 }),
  );
  g.add(halo);
  return g;
}

export function buildExit(): THREE.Group {
  const g = new THREE.Group();
  const cream = mat(0xe8d7c0, { metal: 0.2, rough: 0.4 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  addMesh(g, cyl, cream, -1.05, 1.4, 0, 0.16, 2.8, 0.16);
  addMesh(g, cyl, cream, 1.05, 1.4, 0, 0.16, 2.8, 0.16);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 10, 20, Math.PI), cream);
  arch.rotation.z = Math.PI;
  arch.position.y = 2.7;
  g.add(arch);
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.4),
    new THREE.MeshBasicMaterial({
      color: 0x7fdad2,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  veil.position.y = 1.35;
  veil.name = "veil";
  g.add(veil);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xe8fff8,
      emissive: 0x4a9b96,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    }),
  );
  core.position.y = 1.4;
  core.name = "core";
  g.add(core);
  return g;
}

export function buildLantern(color: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 2.1, 8),
    mat(0x3a3028, { metal: 0.4, rough: 0.4 }),
  );
  pole.position.y = 1.05;
  pole.castShadow = true;
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.05,
      transmission: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
  );
  lamp.position.y = 2.15;
  lamp.name = "lampGlow";
  g.add(lamp);
  return g;
}

export function buildViewHands(): THREE.Group {
  const g = new THREE.Group();
  g.name = "hands";
  const skin = new THREE.MeshStandardMaterial({ color: 0xe2b496, roughness: 0.62, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7 });
  const palmGeo = new THREE.BoxGeometry(0.075, 0.038, 0.1);
  const fingerGeo = new THREE.BoxGeometry(0.016, 0.016, 0.055);
  const right = new THREE.Group();
  right.position.set(0.2, -0.24, -0.42);
  right.rotation.set(-0.35, -0.25, 0.35);
  const palm = new THREE.Mesh(palmGeo, skin);
  right.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(fingerGeo, skin);
    f.position.set(-0.026 + i * 0.018, 0.012, -0.068);
    f.rotation.x = -0.4;
    right.add(f);
  }
  const thumb = new THREE.Mesh(fingerGeo, skin);
  thumb.position.set(-0.042, 0.0, -0.02);
  thumb.rotation.set(0.2, 0.8, 0.4);
  right.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.06, 8), dark);
  cuff.position.set(0.02, -0.01, 0.07);
  cuff.rotation.x = 1.1;
  right.add(cuff);
  g.add(right);
  const left = right.clone();
  left.position.set(-0.14, -0.26, -0.4);
  left.rotation.set(-0.3, 0.2, -0.45);
  left.scale.x = -1;
  g.add(left);
  return g;
}

export function buildViewWeapon(w: Weapon | null): THREE.Group {
  const g = new THREE.Group();
  g.name = "viewWeapon";
  const anim = new THREE.Group();
  anim.name = "anim";
  g.add(anim);
  if (!w) return g;
  const tex = makePixelWeaponTexture(w);
  const sprite = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.82),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
  );
  sprite.position.set(0.28, -0.16, -0.55);
  sprite.rotation.y = -0.18;
  sprite.name = "pixel";
  anim.add(sprite);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshBasicMaterial({ color: w.glow, transparent: true, opacity: 0 }),
  );
  flash.position.set(0.42, -0.06, -0.92);
  flash.name = "muzzle";
  anim.add(flash);
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xe2b496, roughness: 0.6 }),
  );
  grip.position.set(0.22, -0.22, -0.48);
  grip.name = "grip";
  anim.add(grip);
  return g;
}

export function buildShrine(def: ShrineDef, themeId: ThemeId = "victorian"): THREE.Group {
  const g = new THREE.Group();
  g.name = `shrine-${def.id}`;
  const stoneCol =
    themeId === "cyberpunk"
      ? 0x3a4e5c
      : themeId === "hell"
        ? 0x4a2a20
        : themeId === "forest"
          ? 0x4a3a28
          : themeId === "battlefield"
            ? 0x5a4a3a
            : 0x5a5248;
  const stone = mat(stoneCol, { rough: 0.88, metal: themeId === "cyberpunk" ? 0.35 : 0.04 });
  const accent = new THREE.MeshPhysicalMaterial({
    color: def.accent,
    emissive: def.accent,
    emissiveIntensity: themeId === "cyberpunk" || themeId === "hell" ? 1.1 : 0.7,
    roughness: 0.28,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.74, 0.3, 10), stone);
  base.position.y = 0.15;
  base.castShadow = true;
  g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.15, 8), stone);
  pillar.position.y = 0.85;
  pillar.castShadow = true;
  g.add(pillar);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), accent);
  core.position.y = 1.55;
  core.name = "core";
  g.add(core);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.82, 22),
    new THREE.MeshBasicMaterial({
      color: def.accent,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = "glow";
  g.add(ring);

  const neon = mat(def.accent, { em: 1.35, emCol: def.accent, metal: 0.4, rough: 0.25 });
  if (themeId === "cyberpunk") {
    for (const a of [-0.48, 0.48]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.35, 6), neon);
      tube.position.set(a, 0.85, a * 0.2);
      g.add(tube);
    }
  } else if (themeId === "forest") {
    const log = mat(0x6a4e32, { rough: 0.92 });
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + 0.4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 6), log);
      post.position.set(Math.cos(ang) * 0.62, 0.38, Math.sin(ang) * 0.62);
      g.add(post);
    }
  } else if (themeId === "battlefield") {
    const iron = mat(0x4a4036, { metal: 0.45, rough: 0.5 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.28, 10), iron);
    drum.position.y = 0.42;
    g.add(drum);
  } else if (themeId === "hell") {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.4, 6),
      mat(def.accent, { em: 1.6, emCol: def.accent, rough: 0.4 }),
    );
    flame.position.y = 1.9;
    flame.name = "flame";
    g.add(flame);
  } else {
    const brass = mat(0xb08948, { metal: 0.7, rough: 0.35, em: 0.15, emCol: 0xb08948 });
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 16), brass);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 1.22;
    g.add(lip);
  }

  const pads: { id: "w" | "a" | "s" | "d" | "f"; x: number; z: number; y: number }[] = [
    { id: "w", x: 0, z: -0.42, y: 0.34 },
    { id: "s", x: 0, z: 0.42, y: 0.34 },
    { id: "a", x: -0.42, z: 0, y: 0.34 },
    { id: "d", x: 0.42, z: 0, y: 0.34 },
    { id: "f", x: 0, z: 0, y: 0.42 },
  ];
  for (const p of pads) {
    const geo = p.id === "f" ? new THREE.OctahedronGeometry(0.11, 0) : new THREE.SphereGeometry(0.1, 10, 8);
    const pad = new THREE.Mesh(geo, accent.clone());
    pad.position.set(p.x, p.y, p.z);
    pad.name = `pad-${p.id}`;
    g.add(pad);
  }
  return g;
}

