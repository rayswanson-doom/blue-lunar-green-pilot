import * as THREE from "three";
import type { ThemeDef } from "./content";
import { CELL, WALL_H, type MazeData } from "./maze";

function std(color: number, opts: { em?: number; emCol?: number; metal?: number; rough?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.7,
    metalness: opts.metal ?? 0.08,
    emissive: opts.emCol ?? 0x000000,
    emissiveIntensity: opts.em ?? 0,
  });
}

function physical(color: number, opts: { em?: number; emCol?: number; metal?: number; rough?: number; coat?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.rough ?? 0.45,
    metalness: opts.metal ?? 0.2,
    emissive: opts.emCol ?? 0x000000,
    emissiveIntensity: opts.em ?? 0,
    clearcoat: opts.coat ?? 0.25,
    clearcoatRoughness: 0.4,
  });
}

export function dressMaze(world: THREE.Group, maze: MazeData, theme: ThemeDef, extraLights: THREE.Light[]) {
  const dummy = new THREE.Object3D();
  const count = Math.min(28, maze.lanterns.length + 8);

  if (theme.id === "forest") {
    const trunk = new THREE.CylinderGeometry(0.18, 0.28, 3.4, 8);
    const leaf = new THREE.SphereGeometry(0.9, 8, 6);
    const bark = std(0x4a3424, { rough: 0.95 });
    const moss = std(0x3d6b3a, { em: 0.08, emCol: 0x2a5a28 });
    const trees = new THREE.InstancedMesh(trunk, bark, count);
    const tops = new THREE.InstancedMesh(leaf, moss, count);
    trees.castShadow = true;
    tops.castShadow = true;
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
    const lava = physical(0xff6a28, { em: 1.6, emCol: 0xff3a10, rough: 0.35, metal: 0.05 });
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
    const neon = physical(0x5ce1f2, { em: 2.1, emCol: 0x3ec3d6, metal: 0.4, rough: 0.22, coat: 0.5 });
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
    crates.castShadow = true;
    crates.receiveShadow = true;
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
    const cloth = new THREE.MeshPhysicalMaterial({
      color: 0x6a3a32,
      roughness: 0.85,
      sheen: 0.4,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0xa06050),
    });
    const n = Math.min(10, maze.lanterns.length);
    const rugs = new THREE.InstancedMesh(rug, cloth, n);
    rugs.receiveShadow = true;
    maze.lanterns.slice(0, n).forEach((p, i) => {
      dummy.position.set(p.x, 0.02, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, i * 0.4);
      dummy.updateMatrix();
      rugs.setMatrixAt(i, dummy.matrix);
    });
    rugs.instanceMatrix.needsUpdate = true;
    world.add(rugs);
  }

  if (theme.id === "hell" || theme.id === "cyberpunk") {
    const shafts = Math.min(8, maze.lanterns.length);
    const cone = new THREE.ConeGeometry(0.62, 2.5, 10, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: theme.lantern,
      transparent: true,
      opacity: theme.id === "hell" ? 0.09 : 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const rays = new THREE.InstancedMesh(cone, shaftMat, shafts);
    maze.lanterns.slice(0, shafts).forEach((p, i) => {
      dummy.position.set(p.x + 0.9, 1.15, p.z + 0.9);
      dummy.rotation.set(Math.PI, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rays.setMatrixAt(i, dummy.matrix);
    });
    rays.instanceMatrix.needsUpdate = true;
    world.add(rays);
  }
}

export function buildThemeKit(maze: MazeData, theme: ThemeDef): THREE.Group {
  const g = new THREE.Group();
  g.name = "themeKit";
  const dummy = new THREE.Object3D();
  const corners: { x: number; z: number }[] = [];
  const seen = new Set<string>();
  for (const w of maze.walls) {
    const pts =
      w.sx >= w.sz
        ? [
            [w.minX, w.cz],
            [w.minX + w.sx, w.cz],
          ]
        : [
            [w.cx, w.minZ],
            [w.cx, w.minZ + w.sz],
          ];
    for (const [x, z] of pts) {
      const key = `${x!.toFixed(2)},${z!.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      corners.push({ x: x!, z: z! });
    }
  }
  const nPost = Math.min(corners.length, 80);

  if (theme.id === "victorian") {
    const post = new THREE.CylinderGeometry(0.11, 0.14, WALL_H, 8);
    const cap = new THREE.BoxGeometry(0.32, 0.1, 0.32);
    const wood = physical(theme.cap, { rough: 0.4, metal: 0.12, coat: 0.35 });
    const posts = new THREE.InstancedMesh(post, wood, nPost);
    const caps = new THREE.InstancedMesh(cap, wood, nPost);
    posts.castShadow = true;
    for (let i = 0; i < nPost; i++) {
      const p = corners[i]!;
      dummy.position.set(p.x, WALL_H / 2, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      dummy.position.y = WALL_H + 0.05;
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    g.add(posts);
    g.add(caps);
    const longs = maze.walls.filter((w) => w.sx > 2.2).slice(0, 24);
    if (longs.length) {
      const archGeo = new THREE.TorusGeometry(0.48, 0.07, 6, 12, Math.PI);
      const arches = new THREE.InstancedMesh(archGeo, wood, longs.length);
      longs.forEach((w, i) => {
        dummy.position.set(w.cx, WALL_H - 0.35, w.cz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        arches.setMatrixAt(i, dummy.matrix);
      });
      arches.instanceMatrix.needsUpdate = true;
      g.add(arches);
    }
  } else if (theme.id === "cyberpunk") {
    const pylon = new THREE.BoxGeometry(0.18, WALL_H, 0.18);
    const metal = physical(0x4a6278, { metal: 0.7, rough: 0.22, coat: 0.4, em: 0.2, emCol: theme.accent });
    const posts = new THREE.InstancedMesh(pylon, metal, nPost);
    posts.castShadow = true;
    for (let i = 0; i < nPost; i++) {
      const p = corners[i]!;
      dummy.position.set(p.x, WALL_H / 2, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    g.add(posts);
    const longs = maze.walls.slice(0, 28);
    const tube = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
    const neon = physical(theme.lantern, { em: 1.8, emCol: theme.accent, metal: 0.3, rough: 0.2 });
    const tubes = new THREE.InstancedMesh(tube, neon, longs.length);
    longs.forEach((w, i) => {
      const alongX = w.sx >= w.sz;
      dummy.position.set(w.cx, WALL_H - 0.18, w.cz);
      dummy.rotation.set(0, 0, alongX ? Math.PI / 2 : 0);
      dummy.scale.set(1, alongX ? w.sx : w.sz, 1);
      dummy.updateMatrix();
      tubes.setMatrixAt(i, dummy.matrix);
    });
    tubes.instanceMatrix.needsUpdate = true;
    g.add(tubes);
  } else if (theme.id === "forest") {
    const log = new THREE.CylinderGeometry(0.16, 0.2, WALL_H, 7);
    const bark = std(0x5a4030, { rough: 0.95 });
    const posts = new THREE.InstancedMesh(log, bark, nPost);
    posts.castShadow = true;
    for (let i = 0; i < nPost; i++) {
      const p = corners[i]!;
      dummy.position.set(p.x, WALL_H / 2, p.z);
      dummy.rotation.set(0.04, i * 0.3, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    g.add(posts);
  } else if (theme.id === "hell") {
    const spike = new THREE.ConeGeometry(0.16, 0.7, 5);
    const rock = physical(theme.cap, { rough: 0.55, metal: 0.08, em: 0.35, emCol: 0xff4a10 });
    const n = Math.min(maze.walls.length, 40);
    const spikes = new THREE.InstancedMesh(spike, rock, n);
    spikes.castShadow = true;
    maze.walls.slice(0, n).forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H + 0.28, w.cz);
      dummy.rotation.set(0, i, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      spikes.setMatrixAt(i, dummy.matrix);
    });
    spikes.instanceMatrix.needsUpdate = true;
    g.add(spikes);
  } else {
    const bag = new THREE.CylinderGeometry(0.16, 0.18, 0.28, 8);
    const cloth = std(0x6a5a40, { rough: 0.92 });
    const n = Math.min(maze.walls.length, 36);
    const bags = new THREE.InstancedMesh(bag, cloth, n);
    bags.castShadow = true;
    maze.walls.slice(0, n).forEach((w, i) => {
      dummy.position.set(w.cx, 0.16, w.cz);
      dummy.rotation.set(Math.PI / 2, i * 0.4, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bags.setMatrixAt(i, dummy.matrix);
    });
    bags.instanceMatrix.needsUpdate = true;
    g.add(bags);
  }
  return g;
}

