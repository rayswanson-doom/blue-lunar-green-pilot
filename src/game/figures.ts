import * as THREE from "three";
import type { MuseDef } from "./content";

function mat(color: number, emissive = 0x000000, emInt = 0) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
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
  parent.add(m);
  return m;
}

export function buildPlayer(): THREE.Group {
  const g = new THREE.Group();
  g.name = "player";
  const skin = mat(0xf0c4a8);
  const suit = mat(0x3d8b86);
  const dark = mat(0x2a2420);
  const cream = mat(0xf4efe6);
  const sphere = new THREE.SphereGeometry(1, 14, 12);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  addMesh(g, cyl, dark, 0.16, 0.12, 0.04, 0.12, 0.22, 0.18);
  addMesh(g, cyl, dark, -0.16, 0.12, 0.04, 0.12, 0.22, 0.18);
  addMesh(g, cyl, suit, 0, 0.62, 0, 0.32, 0.7, 0.26);
  addMesh(g, sphere, cream, 0, 0.92, 0.18, 0.2, 0.12, 0.08);
  addMesh(g, sphere, skin, 0, 1.18, 0, 0.28, 0.28, 0.28);
  addMesh(g, sphere, dark, 0, 1.32, -0.02, 0.3, 0.16, 0.3);
  addMesh(g, sphere, dark, 0.09, 1.22, 0.22, 0.045, 0.05, 0.04);
  addMesh(g, sphere, dark, -0.09, 1.22, 0.22, 0.045, 0.05, 0.04);
  addMesh(g, sphere, dark, 0, 1.1, 0.24, 0.07, 0.03, 0.03);
  addMesh(g, sphere, suit, 0.38, 0.7, 0, 0.1, 0.1, 0.1);
  addMesh(g, sphere, suit, -0.38, 0.7, 0, 0.1, 0.1, 0.1);
  addMesh(g, cyl, dark, 0, 0.72, -0.22, 0.22, 0.38, 0.1);
  return g;
}

function accessory(kind: MuseDef["correct"], accent: number, hair: number) {
  const g = new THREE.Group();
  const a = mat(accent, accent, 0.15);
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
    r.rotation.y = l.rotation.y = 0;
  } else {
    addMesh(g, cyl, a, 0.16, 0.16, 0.06, 0.16, 0.32, 0.2);
    addMesh(g, cyl, a, -0.16, 0.16, 0.06, 0.16, 0.32, 0.2);
    addMesh(g, sphere, mat(0xe8d7a5, 0xe8d7a5, 0.4), 0.16, 0.22, 0.2, 0.06, 0.06, 0.06);
    addMesh(g, sphere, mat(0xe8d7a5, 0xe8d7a5, 0.4), -0.16, 0.22, 0.2, 0.06, 0.06, 0.06);
  }
  return g;
}

export function buildMuse(def: MuseDef): THREE.Group {
  const g = new THREE.Group();
  g.name = def.id;
  const skin = mat(def.skin);
  const suit = mat(def.suit);
  const hair = mat(def.hair);
  const accent = mat(def.accent);
  const dark = mat(0x2a2420);
  const sphere = new THREE.SphereGeometry(1, 14, 12);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  addMesh(g, cyl, dark, 0.14, 0.14, 0.02, 0.11, 0.26, 0.16);
  addMesh(g, cyl, dark, -0.14, 0.14, 0.02, 0.11, 0.26, 0.16);
  addMesh(g, cyl, suit, 0, 0.78, 0, 0.34, 0.9, 0.26);
  addMesh(g, sphere, accent, 0, 1.1, 0.16, 0.22, 0.1, 0.08);
  addMesh(g, sphere, skin, 0, 1.42, 0, 0.3, 0.3, 0.3);
  addMesh(g, sphere, hair, 0, 1.56, -0.04, 0.34, 0.22, 0.34);
  addMesh(g, sphere, dark, 0.1, 1.46, 0.24, 0.045, 0.05, 0.04);
  addMesh(g, sphere, dark, -0.1, 1.46, 0.24, 0.045, 0.05, 0.04);
  addMesh(g, sphere, dark, 0, 1.34, 0.26, 0.07, 0.03, 0.03);
  addMesh(g, sphere, suit, 0.42, 0.86, 0, 0.1, 0.1, 0.1);
  addMesh(g, sphere, suit, -0.42, 0.86, 0, 0.1, 0.1, 0.1);
  g.add(accessory(def.correct, def.accent, def.hair));
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 20),
    new THREE.MeshBasicMaterial({
      color: def.accent,
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

export function buildStar(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshLambertMaterial({
      color: 0xcfeee8,
      emissive: 0x4a9b96,
      emissiveIntensity: 0.7,
    }),
  );
  g.add(m);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0x9ad9d2,
      transparent: true,
      opacity: 0.18,
    }),
  );
  g.add(halo);
  return g;
}

export function buildExit(): THREE.Group {
  const g = new THREE.Group();
  const teal = mat(0x4a9b96, 0x4a9b96, 0.55);
  const cream = mat(0xe8d7c0);
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
    new THREE.MeshLambertMaterial({
      color: 0xe8fff8,
      emissive: 0x4a9b96,
      emissiveIntensity: 1.1,
    }),
  );
  core.position.y = 1.4;
  core.name = "core";
  g.add(core);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01), teal));
  return g;
}

export function buildLantern(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 2.1, 8),
    mat(0x5c4a3a),
  );
  pole.position.y = 1.05;
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshLambertMaterial({
      color: 0xffe1b0,
      emissive: 0xffc07a,
      emissiveIntensity: 1.2,
    }),
  );
  lamp.position.y = 2.15;
  g.add(lamp);
  return g;
}
