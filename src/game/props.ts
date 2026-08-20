import * as THREE from "three";
import type { ThemeDef } from "./content";
import { CELL, type MazeData } from "./maze";

function std(color: number, opts: { em?: number; emCol?: number; metal?: number; rough?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.7,
    metalness: opts.metal ?? 0.08,
    emissive: opts.emCol ?? 0x000000,
    emissiveIntensity: opts.em ?? 0,
  });
}

export function dressMaze(world: THREE.Group, maze: MazeData, theme: ThemeDef, extraLights: THREE.PointLight[]) {
  const dummy = new THREE.Object3D();
  const count = Math.min(28, maze.lanterns.length + 8);

  if (theme.id === "forest") {
    const trunk = new THREE.CylinderGeometry(0.18, 0.28, 3.4, 8);
    const leaf = new THREE.SphereGeometry(0.9, 8, 6);
    const bark = std(0x4a3424, { rough: 0.95 });
    const moss = std(0x3d6b3a, { em: 0.08, emCol: 0x2a5a28 });
    const trees = new THREE.InstancedMesh(trunk, bark, count);
    const tops = new THREE.InstancedMesh(leaf, moss, count);
    maze.lanterns.forEach((p, i) => {
      if (i >= count) return;
      dummy.position.set(p.x + 1.2, 1.7, p.z - 1.1);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 3.3;
      dummy.scale.set(1.1, 0.7, 1.1);
      dummy.updateMatrix();
      tops.setMatrixAt(i, dummy.matrix);
    });
    trees.instanceMatrix.needsUpdate = true;
    tops.instanceMatrix.needsUpdate = true;
    world.add(trees);
    world.add(tops);
  }

  if (theme.id === "hell") {
    const crack = new THREE.PlaneGeometry(1.4, 0.22);
    const lava = new THREE.MeshStandardMaterial({
      color: 0xff6a28,
      emissive: 0xff3a10,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });
    const n = Math.min(18, maze.diamonds.length + 6);
    const cracks = new THREE.InstancedMesh(crack, lava, n);
    maze.diamonds.slice(0, n).forEach((d, i) => {
      dummy.position.set((d.c + 0.5) * CELL, 0.03, (d.r + 0.5) * CELL + 0.4);
      dummy.rotation.set(-Math.PI / 2, 0, i * 0.7);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cracks.setMatrixAt(i, dummy.matrix);
    });
    cracks.instanceMatrix.needsUpdate = true;
    world.add(cracks);
    maze.lanterns.slice(0, 8).forEach((p) => {
      const light = new THREE.PointLight(0xff6a28, 1.8, 9, 1.3);
      light.position.set(p.x, 1.2, p.z);
      extraLights.push(light);
    });
  }

  if (theme.id === "cyberpunk") {
    const bar = new THREE.BoxGeometry(1.6, 0.06, 0.06);
    const neon = new THREE.MeshStandardMaterial({
      color: 0x5ce1f2,
      emissive: 0x3ec3d6,
      emissiveIntensity: 1.6,
    });
    const n = Math.min(16, maze.lanterns.length);
    const bars = new THREE.InstancedMesh(bar, neon, n);
    maze.lanterns.slice(0, n).forEach((p, i) => {
      dummy.position.set(p.x, 2.4, p.z);
      dummy.rotation.set(0, i * 0.9, 0);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    });
    bars.instanceMatrix.needsUpdate = true;
    world.add(bars);
  }

  if (theme.id === "battlefield") {
    const crateGeo = new THREE.BoxGeometry(0.55, 0.4, 0.4);
    const bag = std(0x6a5a40, { rough: 0.9 });
    const n = Math.min(14, maze.lanterns.length);
    const crates = new THREE.InstancedMesh(crateGeo, bag, n);
    maze.lanterns.slice(0, n).forEach((p, i) => {
      dummy.position.set(p.x - 0.8, 0.22, p.z + 0.7);
      dummy.rotation.set(0, i, 0);
      dummy.updateMatrix();
      crates.setMatrixAt(i, dummy.matrix);
    });
    crates.instanceMatrix.needsUpdate = true;
    world.add(crates);
  }

  if (theme.id === "victorian") {
    const rug = new THREE.PlaneGeometry(1.6, 0.9);
    const cloth = std(0x6a3a32, { rough: 0.8 });
    const n = Math.min(10, maze.lanterns.length);
    const rugs = new THREE.InstancedMesh(rug, cloth, n);
    maze.lanterns.slice(0, n).forEach((p, i) => {
      dummy.position.set(p.x, 0.02, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, i * 0.4);
      dummy.updateMatrix();
      rugs.setMatrixAt(i, dummy.matrix);
    });
    rugs.instanceMatrix.needsUpdate = true;
    world.add(rugs);
  }
}
