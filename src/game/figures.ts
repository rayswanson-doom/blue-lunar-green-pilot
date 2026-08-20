import * as THREE from "three";
import type { MuseDef, ThemeId, Weapon } from "./content";
import { musePalette } from "./content";
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

function accessory(kind: MuseDef["correct"], accent: number, hair: number) {
  const g = new THREE.Group();
  const a = mat(accent, { em: 0.2, emCol: accent, metal: 0.4 });
  const h = mat(hair);
  const dark = mat(0x2a2420);
  const sphere = new THREE.SphereGeometry(1, 12, 10);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const cone = new THREE.ConeGeometry(1, 1, 8);
  if (kind === "crown") {
    addMesh(g, cone, a, 0, 1.72, 0, 0.18, 0.22, 0.18);
    addMesh(g, sphere, a, 0, 1.86, 0, 0.07, 0.07, 0.07);
  } else if (kind === "ribbon") {
    addMesh(g, sphere, h, 0.22, 1.52, 0.08, 0.16, 0.1, 0.08);
    addMesh(g, sphere, h, 0.34, 1.48, 0.02, 0.16, 0.1, 0.08);
    addMesh(g, cyl, h, 0.28, 1.4, 0.02, 0.04, 0.22, 0.04);
  } else if (kind === "spectacles") {
    const ring = new THREE.TorusGeometry(0.09, 0.018, 8, 14);
    const l = new THREE.Mesh(ring, dark);
    l.position.set(-0.11, 1.28, 0.28);
    g.add(l);
    const r = new THREE.Mesh(ring, dark);
    r.position.set(0.11, 1.28, 0.28);
    g.add(r);
    addMesh(g, cyl, dark, 0, 1.28, 0.28, 0.018, 0.12, 0.018);
  } else {
    addMesh(g, cyl, a, 0.16, 0.16, 0.06, 0.16, 0.32, 0.2);
    addMesh(g, cyl, a, -0.16, 0.16, 0.06, 0.16, 0.32, 0.2);
    addMesh(g, sphere, mat(0xe8d7a5, { em: 0.4, emCol: 0xe8d7a5 }), 0.16, 0.22, 0.2, 0.06, 0.06, 0.06);
    addMesh(g, sphere, mat(0xe8d7a5, { em: 0.4, emCol: 0xe8d7a5 }), -0.16, 0.22, 0.2, 0.06, 0.06, 0.06);
  }
  return g;
}

export function buildMuse(def: MuseDef, themeId: ThemeId = "victorian"): THREE.Group {
  const g = new THREE.Group();
  g.name = def.id;
  const pal = musePalette(def, themeId ?? "victorian");
  const skin = mat(pal.skin, { rough: 0.48 });
  const suit = mat(pal.suit, { rough: 0.42, metal: themeId === "cyberpunk" ? 0.35 : 0.1 });
  const hair = mat(pal.hair, { rough: 0.58 });
  const accent = mat(def.accent, { em: 0.18, emCol: def.accent });
  const dark = mat(0x2a2420);
  const sphere = new THREE.SphereGeometry(1, 14, 12);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  const wide = def.id === "ruby" ? 1.12 : 1;

  const legs = new THREE.Group();
  legs.name = "legs";
  addMesh(legs, cyl, dark, 0.15 * wide, 0.18, 0.02, 0.12 * wide, 0.36, 0.16);
  addMesh(legs, cyl, dark, -0.15 * wide, 0.18, 0.02, 0.12 * wide, 0.36, 0.16);
  if (def.correct === "boots") {
    addMesh(legs, cyl, accent, 0.16, 0.14, 0.08, 0.15, 0.28, 0.2);
    addMesh(legs, cyl, accent, -0.16, 0.14, 0.08, 0.15, 0.28, 0.2);
  }
  g.add(legs);

  const torso = new THREE.Group();
  torso.name = "torso";
  addMesh(torso, cyl, suit, 0, 0.82, 0, 0.34 * wide, 0.95, 0.26);
  addMesh(torso, sphere, accent, 0, 1.12, 0.14, 0.2 * wide, 0.08, 0.06);
  g.add(torso);

  const armL = new THREE.Group();
  armL.name = "armL";
  armL.position.set(-0.38 * wide, 1.05, 0);
  addMesh(armL, cyl, suit, 0, -0.22, 0, 0.08, 0.5, 0.08);
  addMesh(armL, sphere, skin, 0, -0.48, 0, 0.07, 0.07, 0.07);
  g.add(armL);
  const armR = new THREE.Group();
  armR.name = "armR";
  armR.position.set(0.38 * wide, 1.05, 0);
  addMesh(armR, cyl, suit, 0, -0.22, 0, 0.08, 0.5, 0.08);
  addMesh(armR, sphere, skin, 0, -0.48, 0, 0.07, 0.07, 0.07);
  g.add(armR);

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 1.48, 0);
  addMesh(head, sphere, skin, 0, 0, 0, 0.28, 0.3, 0.26);
  const hairMesh =
    def.id === "pearl"
      ? addMesh(head, sphere, hair, 0, 0.12, -0.04, 0.3, 0.16, 0.3)
      : def.id === "cinder"
        ? addMesh(head, sphere, hair, 0, 0.08, -0.02, 0.32, 0.16, 0.3)
        : addMesh(head, sphere, hair, 0, 0.1, -0.06, 0.34, 0.22, 0.34);
  hairMesh.name = "hair";
  addMesh(head, sphere, dark, 0.09, 0.04, 0.22, 0.04, 0.045, 0.03);
  addMesh(head, sphere, dark, -0.09, 0.04, 0.22, 0.04, 0.045, 0.03);
  addMesh(head, sphere, dark, 0, -0.08, 0.24, 0.06, 0.025, 0.03);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.4),
    new THREE.MeshBasicMaterial({ color: pal.skin, transparent: true }),
  );
  face.position.set(0, 0.02, 0.22);
  face.name = "face";
  head.add(face);
  g.add(head);
  g.add(accessory(def.correct, def.accent, pal.hair));

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 22),
    new THREE.MeshBasicMaterial({
      color: def.accent,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  glow.name = "glow";
  g.add(glow);
  return g;
}

export function applyMuseFace(mesh: THREE.Group, tex: THREE.Texture) {
  const face = mesh.getObjectByName("face") as THREE.Mesh | undefined;
  if (!face) return;
  tex.colorSpace = THREE.SRGBColorSpace;
  face.material = new THREE.MeshBasicMaterial({ map: tex });
}

export function animateMuse(mesh: THREE.Group, t: number) {
  const armL = mesh.getObjectByName("armL");
  const armR = mesh.getObjectByName("armR");
  const torso = mesh.getObjectByName("torso");
  const head = mesh.getObjectByName("head");
  if (armL) armL.rotation.z = 0.12 + Math.sin(t * 1.6) * 0.12;
  if (armR) armR.rotation.z = -0.12 - Math.sin(t * 1.6 + 0.4) * 0.12;
  if (torso) torso.rotation.y = Math.sin(t * 0.8) * 0.05;
  if (head) head.rotation.y = Math.sin(t * 1.1) * 0.08;
}

export function buildPortraitMuse(tex: THREE.Texture | null, accent: number, id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = id;
  const dark = mat(0x2a2420, { metal: 0.2 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  addMesh(g, cyl, dark, 0, 0.08, 0, 0.32, 0.16, 0.32);
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 1.62),
    tex
      ? new THREE.MeshBasicMaterial({ map: tex })
      : new THREE.MeshBasicMaterial({ color: accent }),
  );
  card.position.set(0, 1.05, 0.02);
  card.name = "portrait";
  g.add(card);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.62), mat(0x1a1612));
  back.position.set(0, 1.05, -0.02);
  back.rotation.y = Math.PI;
  g.add(back);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 22),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  glow.name = "glow";
  g.add(glow);
  return g;
}

export function buildDiamond(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({
      color: 0xcfe8ff,
      emissive: 0x4aa8d8,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.55,
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
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.35,
      roughness: 0.35,
    }),
  );
  lamp.position.y = 2.15;
  g.add(lamp);
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
  return g;
}
