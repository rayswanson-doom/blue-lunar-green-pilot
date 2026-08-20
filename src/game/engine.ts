import * as THREE from "three";
import { createAudio } from "./audio";
import { MAX_HEARTS, MUSES, museById, writeBest, type MuseId } from "./content";
import { buildExit, buildLantern, buildMuse, buildPlayer, buildStar } from "./figures";
import {
  CELL,
  COLS,
  PLAYER_R,
  ROWS,
  WALL_H,
  cellCenter,
  generateMaze,
  makeWallHash,
  resolveCircle,
  worldToCell,
  type MazeData,
  type WallBox,
} from "./maze";

export type Phase = "title" | "playing" | "paused" | "encounter" | "win" | "lose";

export type PromptKind = null | "charm" | "exit";

export type HudState = {
  phase: Phase;
  time: number;
  stars: number;
  starTotal: number;
  hearts: number;
  explored: number;
  cellTotal: number;
  prompt: PromptKind;
  museId: MuseId | null;
  charmed: number;
  hint: boolean;
  seed: number;
};

export type GameEvent =
  | { type: "hud"; state: HudState }
  | { type: "muse"; id: MuseId }
  | { type: "result"; ok: boolean; hearts: number }
  | { type: "win"; time: number; stars: number; charmed: number }
  | { type: "lose" };

export type GameHandle = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: (seed?: number) => void;
  dismissMuse: () => void;
  answer: (optionId: string) => { ok: boolean; hearts: number };
  setKey: (code: string, down: boolean) => void;
  setMoveAxis: (x: number, y: number) => void;
  applyLook: (dx: number, dy: number) => void;
  interact: () => void;
  getState: () => HudState;
  dispose: () => void;
};

type StarEnt = { mesh: THREE.Group; x: number; z: number; taken: boolean };
type MuseEnt = {
  id: MuseId;
  mesh: THREE.Group;
  x: number;
  z: number;
  charmed: boolean;
  box: WallBox;
};

const STEP = 1 / 60;
const SENS = 0.00215;

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function cellKey(c: number, r: number) {
  return r * COLS + c;
}

export function createGame(opts: {
  view: HTMLCanvasElement;
  minimap: HTMLCanvasElement;
  emit: (e: GameEvent) => void;
  seed?: number;
}): GameHandle {
  const audio = createAudio();
  const emit = opts.emit;
  const view = opts.view;
  const mini = opts.minimap;
  const miniCtx = mini.getContext("2d")!;

  const renderer = new THREE.WebGLRenderer({
    canvas: view,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2d5c2);
  scene.fog = new THREE.Fog(0xf2d5c2, 16, 48);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.12, 80);
  const hemi = new THREE.HemisphereLight(0xffe6d2, 0x6a8f86, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e4, 1.15);
  sun.position.set(10, 22, 9);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9ec5c1, 0.32);
  fill.position.set(-9, 8, -12);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);
  const playerLight = new THREE.PointLight(0xffd8b0, 2.35, 11, 1.35);
  scene.add(playerLight);
  const exitLight = new THREE.PointLight(0x7fdad2, 2.1, 9, 1.2);
  scene.add(exitLight);

  const keys = new Set<string>();
  const qaKeys = new Set<string>();
  let stickX = 0;
  let stickY = 0;
  let lookDx = 0;
  let lookDy = 0;
  let phase: Phase = "title";
  let time = 0;
  let hearts = MAX_HEARTS;
  let yaw = 0;
  let pitch = -0.18;
  let bodyYaw = 0;
  let px = 0;
  let pz = 0;
  let vx = 0;
  let vz = 0;
  let bob = 0;
  let lastStep = 0;
  let lastThud = -1;
  let prompt: PromptKind = null;
  let museId: MuseId | null = null;
  let showHint = false;
  let awayMuse: MuseId | null = null;
  let camShake = 0;
  let disposed = false;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let maze!: MazeData;
  let hash!: ReturnType<typeof makeWallHash>;
  let stars: StarEnt[] = [];
  let muses: MuseEnt[] = [];
  let exitPos = { x: 0, z: 0 };
  const explored = new Set<number>();
  const playerMesh = buildPlayer();
  scene.add(playerMesh);
  const tmpColor = new THREE.Color();
  const camDesired = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const lanternLights: THREE.PointLight[] = [];

  function hud(): HudState {
    return {
      phase,
      time,
      stars: stars.filter((s) => s.taken).length,
      starTotal: stars.length,
      hearts,
      explored: explored.size,
      cellTotal: COLS * ROWS,
      prompt,
      museId,
      charmed: muses.filter((m) => m.charmed).length,
      hint: showHint,
      seed: maze.seed,
    };
  }

  function pushHud() {
    emit({ type: "hud", state: hud() });
  }

  function size() {
    const parent = view.parentElement;
    const w = Math.max(1, parent?.clientWidth || window.innerWidth);
    const h = Math.max(1, parent?.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function disposeObject(root: THREE.Object3D) {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m?.dispose();
      }
    });
  }

  function clearWorld() {
    for (const l of lanternLights) {
      scene.remove(l);
      l.dispose();
    }
    lanternLights.length = 0;
    disposeObject(world);
    world.clear();
    stars = [];
    muses = [];
  }

  function buildWorld(seed: number) {
    clearWorld();
    maze = generateMaze(seed);
    hash = makeWallHash(maze.walls);
    const start = cellCenter(maze.start.c, maze.start.r);
    px = start.x;
    pz = start.z;
    vx = 0;
    vz = 0;
    yaw = maze.startYaw;
    bodyYaw = wrapAngle(maze.startYaw + Math.PI);
    pitch = -0.18;
    hearts = MAX_HEARTS;
    time = 0;
    prompt = null;
    museId = null;
    showHint = false;
    awayMuse = null;
    explored.clear();
    explored.add(cellKey(maze.start.c, maze.start.r));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * CELL + 24, ROWS * CELL + 24),
      new THREE.MeshLambertMaterial({ color: 0xc4b18f }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((COLS * CELL) / 2, -0.02, (ROWS * CELL) / 2);
    world.add(ground);

    const floorGeo = new THREE.BoxGeometry(1, 1, 1);
    const floorMat = new THREE.MeshLambertMaterial({ vertexColors: false });
    const floors = new THREE.InstancedMesh(floorGeo, floorMat, COLS * ROWS);
    const dummy = new THREE.Object3D();
    let fi = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        dummy.position.set((c + 0.5) * CELL, -0.08, (r + 0.5) * CELL);
        dummy.scale.set(CELL - 0.08, 0.16, CELL - 0.08);
        dummy.updateMatrix();
        floors.setMatrixAt(fi, dummy.matrix);
        const even = (c + r) % 2 === 0;
        tmpColor.set(even ? 0xd8c8ab : 0xccba98);
        floors.setColorAt(fi, tmpColor);
        fi++;
      }
    }
    floors.instanceMatrix.needsUpdate = true;
    floors.instanceColor!.needsUpdate = true;
    world.add(floors);

    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshLambertMaterial();
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, maze.walls.length);
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H / 2, w.cz);
      dummy.scale.set(w.sx, WALL_H, w.sz);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
      tmpColor.set(i % 3 === 0 ? 0xe8d8c0 : i % 3 === 1 ? 0xdeccb0 : 0xe3d3b8);
      wallMesh.setColorAt(i, tmpColor);
    });
    wallMesh.instanceMatrix.needsUpdate = true;
    wallMesh.instanceColor!.needsUpdate = true;
    world.add(wallMesh);

    const capGeo = new THREE.BoxGeometry(1, 1, 1);
    const capMat = new THREE.MeshLambertMaterial({ color: 0xb08968 });
    const caps = new THREE.InstancedMesh(capGeo, capMat, maze.walls.length);
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H + 0.06, w.cz);
      dummy.scale.set(w.sx + 0.08, 0.12, w.sz + 0.08);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    });
    caps.instanceMatrix.needsUpdate = true;
    world.add(caps);

    for (const s of maze.stars) {
      const { x, z } = cellCenter(s.c, s.r);
      const mesh = buildStar();
      mesh.position.set(x, 0.85, z);
      world.add(mesh);
      stars.push({ mesh, x, z, taken: false });
    }

    for (const m of maze.muses) {
      const def = museById(m.id)!;
      const { x, z } = cellCenter(m.c, m.r);
      const mesh = buildMuse(def);
      mesh.position.set(x, 0, z);
      world.add(mesh);
      const rad = 0.55;
      muses.push({
        id: m.id,
        mesh,
        x,
        z,
        charmed: false,
        box: {
          minX: x - rad,
          maxX: x + rad,
          minZ: z - rad,
          maxZ: z + rad,
          cx: x,
          cz: z,
          sx: rad * 2,
          sz: rad * 2,
        },
      });
    }

    const ex = cellCenter(maze.exit.c, maze.exit.r);
    exitPos = ex;
    const exit = buildExit();
    exit.position.set(ex.x, 0, ex.z);
    exit.name = "exit";
    world.add(exit);
    exitLight.position.set(ex.x, 1.6, ex.z);

    maze.lanterns.forEach((p, i) => {
      const lamp = buildLantern();
      lamp.position.set(p.x + 0.9, 0, p.z + 0.9);
      world.add(lamp);
      if (i < 6) {
        const light = new THREE.PointLight(0xffc07a, 1.15, 8, 1.5);
        light.position.set(p.x + 0.9, 2.15, p.z + 0.9);
        scene.add(light);
        lanternLights.push(light);
      }
    });

    playerMesh.position.set(px, 0, pz);
    playerLight.position.set(px, 1.55, pz);
  }

  function extraBoxes(): WallBox[] {
    return muses.filter((m) => !m.charmed).map((m) => m.box);
  }

  function markExplored() {
    const { c, r } = worldToCell(px, pz);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc;
        const rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
        if (Math.abs(dc) + Math.abs(dr) === 2) {
          const cx = (cc + 0.5) * CELL;
          const cz = (rr + 0.5) * CELL;
          if ((cx - px) * (cx - px) + (cz - pz) * (cz - pz) > CELL * CELL * 1.15) continue;
        }
        explored.add(cellKey(cc, rr));
      }
    }
  }

  function physics(dt: number) {
    const liveKeys = qaKeys.size ? qaKeys : keys;
    let ax = stickX;
    let az = stickY;
    if (liveKeys.has("KeyW") || liveKeys.has("ArrowUp")) az += 1;
    if (liveKeys.has("KeyS") || liveKeys.has("ArrowDown")) az -= 1;
    if (liveKeys.has("KeyD") || liveKeys.has("ArrowRight")) ax += 1;
    if (liveKeys.has("KeyA") || liveKeys.has("ArrowLeft")) ax -= 1;
    const mag = Math.hypot(ax, az);
    if (mag > 1) {
      ax /= mag;
      az /= mag;
    }

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const wishX = fx * az + rx * ax;
    const wishZ = fz * az + rz * ax;
    const maxSpeed = 5.35;
    const accel = 22;
    const damp = 14;
    if (mag > 0.04) {
      vx += wishX * accel * dt;
      vz += wishZ * accel * dt;
      const s = Math.hypot(vx, vz);
      if (s > maxSpeed) {
        vx *= maxSpeed / s;
        vz *= maxSpeed / s;
      }
    } else {
      const s = Math.hypot(vx, vz);
      const ns = Math.max(0, s - damp * dt);
      if (s > 1e-5) {
        vx *= ns / s;
        vz *= ns / s;
      } else {
        vx = 0;
        vz = 0;
      }
    }

    const nearby = hash.nearby(px, pz, PLAYER_R + Math.hypot(vx, vz) * dt + 0.8);
    const extra = extraBoxes();
    px += vx * dt;
    let res = resolveCircle(px, pz, PLAYER_R, nearby, extra);
    if (res.hit) {
      if (Math.abs(vx) > 2.4 && time - lastThud > 0.22) {
        camShake = Math.max(camShake, 0.07);
        audio.thud();
        lastThud = time;
      }
      vx = 0;
    }
    px = res.x;
    pz = res.z;
    pz += vz * dt;
    res = resolveCircle(px, pz, PLAYER_R, nearby, extra);
    if (res.hit) {
      if (Math.abs(vz) > 2.4 && time - lastThud > 0.22) {
        camShake = Math.max(camShake, 0.07);
        audio.thud();
        lastThud = time;
      }
      vz = 0;
    }
    px = res.x;
    pz = res.z;

    const speed = Math.hypot(vx, vz);
    if (speed > 0.55) {
      bodyYaw = wrapAngle(
        bodyYaw + wrapAngle(Math.atan2(vx, vz) - bodyYaw) * (1 - Math.exp(-14 * dt)),
      );
      bob += dt * speed * 2.4;
      if (bob - lastStep > 0.55) {
        lastStep = bob;
        audio.step();
      }
    } else {
      bob *= Math.max(0, 1 - dt * 4);
    }

    markExplored();
    time += dt;

    for (const s of stars) {
      if (s.taken) continue;
      const d2 = (s.x - px) * (s.x - px) + (s.z - pz) * (s.z - pz);
      if (d2 < 0.7 * 0.7) {
        s.taken = true;
        s.mesh.visible = false;
        audio.pickup();
        pushHud();
      }
    }

    prompt = null;
    const exd = (exitPos.x - px) * (exitPos.x - px) + (exitPos.z - pz) * (exitPos.z - pz);
    if (exd < 1.35 * 1.35) {
      prompt = "exit";
      if (exd < 0.95 * 0.95) win();
    }

    let nearest: MuseEnt | null = null;
    let nearestD = 2.1;
    for (const m of muses) {
      if (m.charmed) continue;
      const d = Math.hypot(m.x - px, m.z - pz);
      if (d < nearestD) {
        nearestD = d;
        nearest = m;
      }
    }
    if (nearest && nearestD < 1.9) {
      prompt = "charm";
      if (awayMuse === nearest.id && nearestD > 1.2) {
        /* wait until they re-enter */
      }
      if (awayMuse !== nearest.id && nearestD < 1.55) {
        openMuse(nearest.id);
      }
    } else {
      awayMuse = null;
    }
  }

  function openMuse(id: MuseId) {
    if (phase !== "playing") return;
    phase = "encounter";
    museId = id;
    showHint = false;
    prompt = "charm";
    document.exitPointerLock?.();
    emit({ type: "muse", id });
    pushHud();
  }

  function win() {
    if (phase !== "playing") return;
    phase = "win";
    document.exitPointerLock?.();
    writeBest(time);
    audio.win();
    emit({
      type: "win",
      time,
      stars: stars.filter((s) => s.taken).length,
      charmed: muses.filter((m) => m.charmed).length,
    });
    pushHud();
  }

  function lose() {
    phase = "lose";
    document.exitPointerLock?.();
    emit({ type: "lose" });
    pushHud();
  }

  function titleCam(now: number) {
    const cx = (COLS * CELL) / 2;
    const cz = (ROWS * CELL) / 2;
    const t = now * 0.00012;
    camera.position.set(cx + Math.cos(t) * 26, 20, cz + Math.sin(t) * 26);
    camera.lookAt(cx, 0.4, cz);
  }

  function playCam(dt: number) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const dist = 4.35;
    const height = 1.58 - Math.sin(pitch) * dist * 0.85;
    const back = Math.cos(pitch) * dist;
    let ox = -fx * back;
    let oy = height;
    let oz = -fz * back;
    const originX = px;
    const originY = 1.15;
    const originZ = pz;
    let pull = 1;
    for (let t = 0.7; t < 1.02; t += 0.08) {
      const qx = originX + ox * t;
      const qz = originZ + oz * t;
      const hit = resolveCircle(qx, qz, 0.16, hash.nearby(qx, qz, 0.5), []).hit;
      if (hit) {
        pull = Math.max(0.28, t - 0.12);
        break;
      }
    }
    camDesired.set(originX + ox * pull, originY + oy * pull * 0.15 + (height - 1.15), originZ + oz * pull);
    if (camShake > 0) {
      camDesired.x += (Math.random() - 0.5) * camShake;
      camDesired.z += (Math.random() - 0.5) * camShake;
      camShake *= Math.max(0, 1 - dt * 10);
    }
    const k = 1 - Math.exp(-11 * dt);
    camera.position.lerp(camDesired, k);
    lookTarget.set(px, 1.12, pz);
    camera.lookAt(lookTarget);
  }

  function animateEntities(now: number, dt: number) {
    const t = now * 0.001;
    playerMesh.position.set(px, Math.abs(Math.sin(bob * Math.PI)) * 0.05, pz);
    playerMesh.rotation.y = bodyYaw;
    playerLight.position.set(px, 1.55, pz);
    for (const s of stars) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt * 1.8;
      s.mesh.position.y = 0.82 + Math.sin(t * 2.4 + s.x) * 0.12;
    }
    for (const m of muses) {
      if (m.charmed) {
        m.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 3.2));
        if (m.mesh.scale.x < 0.05) m.mesh.visible = false;
        continue;
      }
      m.mesh.rotation.y =
        Math.sin(t * 1.1 + m.x) * 0.2 + Math.atan2(m.x - px, m.z - pz);
      const glow = m.mesh.getObjectByName("glow");
      if (glow) glow.rotation.z = t;
    }
    const exit = world.getObjectByName("exit");
    if (exit) {
      const veil = exit.getObjectByName("veil") as THREE.Mesh | undefined;
      const core = exit.getObjectByName("core");
      if (veil && veil.material && "opacity" in veil.material) {
        (veil.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(t * 2.2) * 0.1;
      }
      if (core) {
        const s = 1 + Math.sin(t * 3) * 0.12;
        core.scale.setScalar(s);
      }
    }
  }

  function drawMinimap() {
    const w = mini.width;
    const h = mini.height;
    const ctx = miniCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(20,17,14,0.72)";
    ctx.beginPath();
    const r = 18;
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fill();
    const pad = 10;
    const inner = Math.min(w, h) - pad * 2;
    const sx = inner / (COLS * CELL);
    const sz = inner / (ROWS * CELL);
    const ox = pad;
    const oz = pad;
    const mapX = (x: number) => ox + x * sx;
    const mapZ = (z: number) => oz + z * sz;

    for (let r0 = 0; r0 < ROWS; r0++) {
      for (let c0 = 0; c0 < COLS; c0++) {
        if (!explored.has(cellKey(c0, r0))) continue;
        ctx.fillStyle = (c0 + r0) % 2 === 0 ? "#d8c8ab" : "#cbb89a";
        ctx.fillRect(mapX(c0 * CELL), mapZ(r0 * CELL), CELL * sx + 0.5, CELL * sz + 0.5);
      }
    }
    ctx.fillStyle = "#6b5340";
    for (const wall of maze.walls) {
      const c0 = worldToCell(wall.cx, wall.cz);
      if (!explored.has(cellKey(c0.c, c0.r))) continue;
      ctx.fillRect(mapX(wall.minX), mapZ(wall.minZ), Math.max(1.2, wall.sx * sx), Math.max(1.2, wall.sz * sz));
    }
    for (const s of stars) {
      if (s.taken) continue;
      const c = worldToCell(s.x, s.z);
      if (!explored.has(cellKey(c.c, c.r))) continue;
      ctx.fillStyle = "#4a9b96";
      ctx.beginPath();
      ctx.arc(mapX(s.x), mapZ(s.z), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const m of muses) {
      if (m.charmed) continue;
      const c = worldToCell(m.x, m.z);
      if (!explored.has(cellKey(c.c, c.r))) continue;
      ctx.fillStyle = "#d4735a";
      ctx.beginPath();
      ctx.arc(mapX(m.x), mapZ(m.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const ex = worldToCell(exitPos.x, exitPos.z);
    if (explored.has(cellKey(ex.c, ex.r))) {
      ctx.fillStyle = "#7fdad2";
      ctx.fillRect(mapX(exitPos.x) - 3.5, mapZ(exitPos.z) - 3.5, 7, 7);
    }
    ctx.save();
    ctx.translate(mapX(px), mapZ(pz));
    ctx.rotate(yaw);
    ctx.fillStyle = "#1a1814";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.2, 5);
    ctx.lineTo(-4.2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (lookDx || lookDy) {
      yaw -= lookDx * SENS;
      pitch -= lookDy * SENS;
      pitch = Math.max(-0.85, Math.min(0.42, pitch));
      lookDx = 0;
      lookDy = 0;
    }
    if (phase === "playing") {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        physics(STEP);
        acc -= STEP;
        steps++;
      }
      animateEntities(now, dt);
      playCam(dt);
    } else if (phase === "title") {
      animateEntities(now, dt);
      titleCam(now);
    } else {
      animateEntities(now, dt);
      if (phase !== "encounter") playCam(dt);
    }
    renderer.render(scene, camera);
    drawMinimap();
    raf = requestAnimationFrame(frame);
  }

  function onResize() {
    size();
  }
  function onBlur() {
    keys.clear();
  }
  function onVis() {
    if (document.hidden) keys.clear();
  }

  size();
  const qa = typeof location !== "undefined" && /(?:\?|&)qa=1(?:&|$)/.test(location.search);
  buildWorld(opts.seed ?? (qa ? 42 : (Date.now() % 1_000_000_007)));
  window.addEventListener("resize", onResize);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(frame);
  pushHud();

  const handle: GameHandle = {
    start() {
      audio.resume();
      if (phase === "title" || phase === "win" || phase === "lose") {
        if (phase !== "title") buildWorld((maze.seed + 17) | 0);
        phase = "playing";
        time = 0;
        pushHud();
      }
    },
    pause() {
      if (phase !== "playing") return;
      phase = "paused";
      document.exitPointerLock?.();
      pushHud();
    },
    resume() {
      if (phase !== "paused") return;
      phase = "playing";
      pushHud();
    },
    restart(seed?: number) {
      audio.resume();
      buildWorld(seed ?? ((maze.seed + 31) | 0));
      phase = "playing";
      pushHud();
    },
    dismissMuse() {
      if (phase !== "encounter" || !museId) return;
      awayMuse = museId;
      museId = null;
      phase = "playing";
      pushHud();
    },
    answer(optionId: string) {
      const def = museId ? museById(museId) : undefined;
      if (!def || phase !== "encounter") return { ok: false, hearts };
      const ok = optionId === def.correct;
      if (ok) {
        const ent = muses.find((m) => m.id === def.id);
        if (ent) ent.charmed = true;
        audio.charm();
        audio.success();
        awayMuse = def.id;
        museId = null;
        showHint = false;
        phase = "playing";
        emit({ type: "result", ok: true, hearts });
        pushHud();
        return { ok: true, hearts };
      }
      hearts = Math.max(0, hearts - 1);
      showHint = true;
      audio.fail();
      camShake = 0.2;
      emit({ type: "result", ok: false, hearts });
      if (hearts <= 0) {
        lose();
      } else {
        pushHud();
      }
      return { ok: false, hearts };
    },
    setKey(code, down) {
      if (down) keys.add(code);
      else keys.delete(code);
    },
    setMoveAxis(x, y) {
      const m = Math.hypot(x, y);
      if (m < 0.12) {
        stickX = 0;
        stickY = 0;
        return;
      }
      const s = m > 1 ? 1 / m : 1;
      stickX = x * s;
      stickY = y * s;
    },
    applyLook(dx, dy) {
      if (phase !== "playing") return;
      lookDx += dx;
      lookDy += dy;
    },
    interact() {
      if (phase !== "playing") return;
      if (prompt === "exit") win();
      if (prompt === "charm") {
        const m = muses.find((e) => !e.charmed && Math.hypot(e.x - px, e.z - pz) < 2);
        if (m) openMuse(m.id);
      }
    },
    getState: hud,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      clearWorld();
      scene.remove(playerMesh);
      disposeObject(playerMesh);
      renderer.dispose();
    },
  };

  const qaMode = qa || import.meta.env.DEV;
  if (qaMode) {
    (window as unknown as { __controlsTest?: unknown }).__controlsTest = {
      getYaw: () => yaw,
      getSpeed: () => Math.hypot(vx, vz),
      getPos: () => ({ x: px, z: pz }),
      setKeys: (codes: string[]) => {
        qaKeys.clear();
        for (const c of codes) qaKeys.add(c);
      },
      setSteer: (v: number) => {
        qaKeys.clear();
        if (v > 0.2) qaKeys.add("KeyA");
        if (v < -0.2) qaKeys.add("KeyD");
      },
    };
  }

  return handle;
}
