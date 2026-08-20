import * as THREE from "three";
import { createAudio } from "./audio";
import {
  BOT_COLORS,
  BOT_NAMES,
  MAX_HEARTS,
  makeWeapon,
  museById,
  musePortrait,
  sizeById,
  themeById,
  writeBest,
  type MuseId,
  type SizeId,
  type ThemeId,
  type Weapon,
} from "./content";
import { pickBotTarget, steerBot, type Hunter } from "./ai";
import {
  buildDiamond,
  buildExit,
  buildHunter,
  buildLantern,
  buildMuse,
  buildPortraitMuse,
  buildViewWeapon,
} from "./figures";
import {
  CELL,
  PLAYER_R,
  WALL_H,
  canToggleEdge,
  cellCenter,
  edgeWorld,
  facingDir,
  generateMaze,
  isOpen,
  lineOpen,
  makeWallHash,
  packOpen,
  resolveCircle,
  toggleEdge,
  unpackOpen,
  worldToCell,
  type MazeData,
  type WallBox,
} from "./maze";
import { makeThemeTextures } from "./textures";

export type Phase = "title" | "playing" | "paused" | "encounter" | "win" | "lose";
export type PromptKind = null | "charm" | "exit" | "wall";

export type HuntSettings = {
  sizeId: SizeId;
  themeId: ThemeId;
  aiCount: number;
  seed?: number;
};

export type HudState = {
  phase: Phase;
  time: number;
  diamonds: number;
  diamondHeld: number;
  diamondTotal: number;
  hearts: number;
  explored: number;
  cellTotal: number;
  prompt: PromptKind;
  museId: MuseId | null;
  charmed: number;
  museTotal: number;
  hint: boolean;
  seed: number;
  weaponName: string;
  portal: boolean;
  themeId: ThemeId;
  sizeId: SizeId;
  aiCount: number;
  dead: boolean;
  wallMode: "add" | "remove" | null;
};

export type GameEvent =
  | { type: "hud"; state: HudState }
  | { type: "muse"; id: MuseId }
  | { type: "result"; ok: boolean; hearts: number; weaponName: string }
  | { type: "win"; time: number; diamonds: number; charmed: number }
  | { type: "lose" };

export type NetHooks = {
  role: "solo" | "host" | "client";
  selfId: string;
  broadcast: (data: unknown) => void;
  send: (data: unknown, to?: string) => void;
};

export type GameHandle = {
  start: () => void;
  configure: (next: HuntSettings) => void;
  pause: () => void;
  resume: () => void;
  restart: (seed?: number) => void;
  dismissMuse: () => void;
  answer: (optionId: string) => { ok: boolean; hearts: number };
  setKey: (code: string, down: boolean) => void;
  setMoveAxis: (x: number, y: number) => void;
  applyLook: (dx: number, dy: number) => void;
  interact: () => void;
  shoot: () => void;
  toggleWall: () => void;
  getState: () => HudState;
  attachNet: (net: NetHooks) => void;
  onNetMessage: (from: string, data: unknown) => void;
  syncPeer: (id: string, name: string, present: boolean) => void;
  dispose: () => void;
};

type Gem = { mesh: THREE.Group; x: number; z: number; taken: boolean };
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
const EYE = 1.52;

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function createGame(opts: {
  view: HTMLCanvasElement;
  minimap: HTMLCanvasElement;
  emit: (e: GameEvent) => void;
  settings: HuntSettings;
}): GameHandle {
  const audio = createAudio();
  const emit = opts.emit;
  const view = opts.view;
  const mini = opts.minimap;
  const miniCtx = mini.getContext("2d")!;

  let settings = { ...opts.settings };
  let theme = themeById(settings.themeId);
  let size = sizeById(settings.sizeId);

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
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 90);
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
  const playerLight = new THREE.PointLight(0xffd8b0, 1.6, 10, 1.4);
  scene.add(playerLight);
  const exitLight = new THREE.PointLight(0x7fdad2, 2.1, 9, 1.2);
  scene.add(exitLight);
  const muzzleLight = new THREE.PointLight(0xffe0a0, 0, 5, 2);
  scene.add(muzzleLight);
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0x7fdad2,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
  ghost.visible = false;
  scene.add(ghost);

  const viewRoot = new THREE.Group();
  camera.add(viewRoot);
  scene.add(camera);

  const keys = new Set<string>();
  const qaKeys = new Set<string>();
  let stickX = 0;
  let stickY = 0;
  let lookDx = 0;
  let lookDy = 0;
  let phase: Phase = "title";
  let time = 0;
  let yaw = 0;
  let pitch = 0;
  let lastStep = 0;
  let bob = 0;
  let lastThud = -1;
  let prompt: PromptKind = null;
  let wallMode: "add" | "remove" | null = null;
  let museId: MuseId | null = null;
  let showHint = false;
  let awayMuse: MuseId | null = null;
  let camShake = 0;
  let recoil = 0;
  let disposed = false;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let maze!: MazeData;
  let hash!: ReturnType<typeof makeWallHash>;
  let gems: Gem[] = [];
  let muses: MuseEnt[] = [];
  let hunters: Hunter[] = [];
  let hunterMesh = new Map<string, THREE.Group>();
  let exitPos = { x: 0, z: 0 };
  let portalOpen = false;
  let localId = "local";
  let net: NetHooks | null = null;
  let netAcc = 0;
  let wallMesh: THREE.InstancedMesh | null = null;
  let capMesh: THREE.InstancedMesh | null = null;
  let viewWeapon: THREE.Group | null = null;
  let skyMesh: THREE.Mesh | null = null;
  const explored = new Set<number>();
  const tmpColor = new THREE.Color();
  const dummy = new THREE.Object3D();
  const lanternLights: THREE.PointLight[] = [];
  let tex: ReturnType<typeof makeThemeTextures> | null = null;
  let themeMats: THREE.Material[] = [];

  function local(): Hunter {
    return hunters.find((h) => h.id === localId) ?? hunters[0]!;
  }

  function hud(): HudState {
    const me = hunters[0] ? local() : null;
    return {
      phase,
      time,
      diamonds: gems.filter((s) => s.taken).length,
      diamondHeld: me?.diamonds ?? 0,
      diamondTotal: gems.length,
      hearts: me?.hp ?? 0,
      explored: explored.size,
      cellTotal: maze ? maze.cols * maze.rows : 1,
      prompt,
      museId,
      charmed: muses.filter((m) => m.charmed).length,
      museTotal: muses.length,
      hint: showHint,
      seed: maze?.seed ?? 0,
      weaponName: me?.weapon?.name ?? "Unarmed",
      portal: portalOpen,
      themeId: settings.themeId,
      sizeId: settings.sizeId,
      aiCount: settings.aiCount,
      dead: Boolean(me?.dead),
      wallMode,
    };
  }

  function pushHud() {
    emit({ type: "hud", state: hud() });
  }

  function sizeView() {
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

  function applyThemeLights() {
    scene.background = new THREE.Color(theme.bg);
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    hemi.color.set(theme.hemiSky);
    hemi.groundColor.set(theme.hemiGround);
    sun.color.set(theme.sun);
    sun.intensity = theme.sunInt;
    fill.color.set(theme.fill);
    renderer.toneMappingExposure = theme.id === "cyberpunk" || theme.id === "hell" ? 0.95 : 1.08;
    playerLight.color.set(theme.lantern);
    exitLight.color.set(theme.accent);
  }

  function clearWorld() {
    for (const l of lanternLights) {
      scene.remove(l);
      l.dispose();
    }
    lanternLights.length = 0;
    disposeObject(world);
    world.clear();
    for (const m of hunterMesh.values()) {
      scene.remove(m);
      disposeObject(m);
    }
    hunterMesh.clear();
    if (skyMesh) {
      scene.remove(skyMesh);
      disposeObject(skyMesh);
      skyMesh = null;
    }
    for (const m of themeMats) m.dispose();
    themeMats = [];
    if (tex) {
      tex.wallTex.dispose();
      tex.floorTex.dispose();
      tex.capTex.dispose();
    }
    tex = null;
    wallMesh = null;
    capMesh = null;
    gems = [];
    muses = [];
    hunters = [];
  }

  function rebuildWallMeshes() {
    if (wallMesh) {
      world.remove(wallMesh);
      wallMesh.geometry.dispose();
    }
    if (capMesh) {
      world.remove(capMesh);
      capMesh.geometry.dispose();
    }
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      map: tex?.wallTex,
      roughness: 0.82,
      metalness: theme.id === "cyberpunk" ? 0.35 : 0.06,
      color: 0xffffff,
    });
    themeMats.push(wallMat);
    wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, maze.walls.length);
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H / 2, w.cz);
      dummy.scale.set(w.sx, WALL_H, w.sz);
      dummy.updateMatrix();
      wallMesh!.setMatrixAt(i, dummy.matrix);
      tmpColor.set(i % 3 === 0 ? theme.wallA : i % 3 === 1 ? theme.wallB : theme.wallC);
      wallMesh!.setColorAt(i, tmpColor);
    });
    wallMesh.instanceMatrix.needsUpdate = true;
    if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;
    world.add(wallMesh);

    const capGeo = new THREE.BoxGeometry(1, 1, 1);
    const capMat = new THREE.MeshStandardMaterial({
      map: tex?.capTex,
      color: theme.cap,
      roughness: 0.7,
      metalness: 0.12,
    });
    themeMats.push(capMat);
    capMesh = new THREE.InstancedMesh(capGeo, capMat, maze.walls.length);
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H + 0.06, w.cz);
      dummy.scale.set(w.sx + 0.08, 0.12, w.sz + 0.08);
      dummy.updateMatrix();
      capMesh!.setMatrixAt(i, dummy.matrix);
    });
    capMesh.instanceMatrix.needsUpdate = true;
    world.add(capMesh);
    hash = makeWallHash(maze.walls);
  }

  function setViewWeapon(w: Weapon | null) {
    if (viewWeapon) {
      viewRoot.remove(viewWeapon);
      disposeObject(viewWeapon);
    }
    viewWeapon = buildViewWeapon(w);
    viewRoot.add(viewWeapon);
  }

  function spawnHunter(h: Hunter) {
    const mesh = buildHunter(h.color);
    mesh.visible = h.kind !== "local";
    scene.add(mesh);
    hunterMesh.set(h.id, mesh);
  }

  function buildWorld(seed: number) {
    clearWorld();
    theme = themeById(settings.themeId);
    size = sizeById(settings.sizeId);
    applyThemeLights();
    tex = makeThemeTextures(theme);
    maze = generateMaze(seed, size);
    hash = makeWallHash(maze.walls);
    portalOpen = false;
    prompt = null;
    museId = null;
    showHint = false;
    awayMuse = null;
    explored.clear();
    time = 0;
    yaw = maze.startYaw;
    pitch = 0;

    const loader = new THREE.TextureLoader();
    loader.load(theme.sky, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      const g = new THREE.SphereGeometry(70, 24, 16);
      g.scale(-1, 1, 1);
      const m = new THREE.Mesh(
        g,
        new THREE.MeshBasicMaterial({ map: t, depthWrite: false }),
      );
      m.position.set((maze.cols * CELL) / 2, 8, (maze.rows * CELL) / 2);
      skyMesh = m;
      scene.add(m);
    });

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(maze.cols * CELL + 24, maze.rows * CELL + 24),
      new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((maze.cols * CELL) / 2, -0.02, (maze.rows * CELL) / 2);
    world.add(ground);

    const floorGeo = new THREE.BoxGeometry(1, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: tex.floorTex,
      roughness: 0.88,
      metalness: 0.04,
    });
    themeMats.push(floorMat);
    const floors = new THREE.InstancedMesh(floorGeo, floorMat, maze.cols * maze.rows);
    let fi = 0;
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        dummy.position.set((c + 0.5) * CELL, -0.08, (r + 0.5) * CELL);
        dummy.scale.set(CELL - 0.08, 0.16, CELL - 0.08);
        dummy.updateMatrix();
        floors.setMatrixAt(fi, dummy.matrix);
        tmpColor.set((c + r) % 2 === 0 ? theme.floorA : theme.floorB);
        floors.setColorAt(fi, tmpColor);
        fi++;
      }
    }
    floors.instanceMatrix.needsUpdate = true;
    floors.instanceColor!.needsUpdate = true;
    world.add(floors);

    rebuildWallMeshes();

    for (const s of maze.diamonds) {
      const { x, z } = cellCenter(s.c, s.r);
      const mesh = buildDiamond();
      mesh.position.set(x, 0.85, z);
      world.add(mesh);
      gems.push({ mesh, x, z, taken: false });
    }

    for (const m of maze.muses) {
      const def = museById(m.id)!;
      const { x, z } = cellCenter(m.c, m.r);
      const placeholder = buildMuse(def);
      placeholder.position.set(x, 0, z);
      world.add(placeholder);
      const rad = 0.55;
      const ent: MuseEnt = {
        id: m.id,
        mesh: placeholder,
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
      };
      muses.push(ent);
      loader.load(musePortrait(def.id, theme.id), (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const card = buildPortraitMuse(tex, def.accent, def.id);
        card.position.set(x, 0, z);
        world.remove(placeholder);
        disposeObject(placeholder);
        world.add(card);
        ent.mesh = card;
      });
    }

    const ex = cellCenter(maze.exit.c, maze.exit.r);
    exitPos = ex;
    const exit = buildExit();
    exit.position.set(ex.x, 0, ex.z);
    exit.name = "exit";
    exit.visible = false;
    world.add(exit);
    exitLight.position.set(ex.x, 1.6, ex.z);
    exitLight.intensity = 0;

    maze.lanterns.forEach((p, i) => {
      const lamp = buildLantern(theme.lantern);
      lamp.position.set(p.x + 0.9, 0, p.z + 0.9);
      world.add(lamp);
      if (i < 8) {
        const light = new THREE.PointLight(theme.lantern, 1.15, 8, 1.5);
        light.position.set(p.x + 0.9, 2.15, p.z + 0.9);
        scene.add(light);
        lanternLights.push(light);
      }
    });

    const start = cellCenter(maze.start.c, maze.start.r);
    explored.add(maze.start.r * maze.cols + maze.start.c);
    localId = net?.selfId ?? "local";
    const me: Hunter = {
      id: localId,
      name: "You",
      kind: "local",
      x: start.x,
      z: start.z,
      yaw: maze.startYaw,
      vx: 0,
      vz: 0,
      hp: MAX_HEARTS,
      diamonds: 0,
      weapon: null,
      color: 0x3d8b86,
      dead: false,
      respawn: 0,
      cooldown: 0,
      think: 0,
      path: [],
      fire: false,
    };
    hunters = [me];
    spawnHunter(me);

    const botCount = Math.max(1, Math.min(4, settings.aiCount | 0));
    for (let i = 0; i < botCount; i++) {
      const cell = maze.diamonds[maze.diamonds.length - 1 - i] ?? maze.exit;
      const p = cellCenter(cell.c, cell.r);
      const bot: Hunter = {
        id: `bot-${i}`,
        name: BOT_NAMES[i] ?? `Bot ${i + 1}`,
        kind: "bot",
        x: p.x,
        z: p.z,
        yaw: 0,
        vx: 0,
        vz: 0,
        hp: MAX_HEARTS,
        diamonds: 0,
        weapon: null,
        color: BOT_COLORS[i] ?? 0x888888,
        dead: false,
        respawn: 0,
        cooldown: 0,
        think: 0,
        path: [],
        fire: false,
      };
      hunters.push(bot);
      spawnHunter(bot);
    }

    setViewWeapon(null);
    playerLight.position.set(me.x, 1.55, me.z);
  }

  function extraBoxes(): WallBox[] {
    return muses.filter((m) => !m.charmed).map((m) => m.box);
  }

  function markExplored(h: Hunter) {
    const { c, r } = worldToCell(h.x, h.z, maze.cols, maze.rows);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc;
        const rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= maze.cols || rr >= maze.rows) continue;
        explored.add(rr * maze.cols + cc);
      }
    }
  }

  function refreshPortal() {
    const allGems = gems.every((g) => g.taken);
    const allMuses = muses.every((m) => m.charmed);
    const open = allGems && allMuses && muses.length > 0;
    if (open === portalOpen) return;
    portalOpen = open;
    const exit = world.getObjectByName("exit");
    if (exit) exit.visible = open;
    exitLight.intensity = open ? 2.2 : 0;
  }

  function moveHunter(h: Hunter, wishX: number, wishZ: number, dt: number, maxSpeed: number) {
    const accel = 22;
    const damp = 14;
    const mag = Math.hypot(wishX, wishZ);
    if (mag > 0.04) {
      h.vx += wishX * accel * dt;
      h.vz += wishZ * accel * dt;
      const s = Math.hypot(h.vx, h.vz);
      if (s > maxSpeed) {
        h.vx *= maxSpeed / s;
        h.vz *= maxSpeed / s;
      }
    } else {
      const s = Math.hypot(h.vx, h.vz);
      const ns = Math.max(0, s - damp * dt);
      if (s > 1e-5) {
        h.vx *= ns / s;
        h.vz *= ns / s;
      } else {
        h.vx = 0;
        h.vz = 0;
      }
    }
    const nearby = hash.nearby(h.x, h.z, PLAYER_R + Math.hypot(h.vx, h.vz) * dt + 0.8);
    const extra = extraBoxes();
    h.x += h.vx * dt;
    let res = resolveCircle(h.x, h.z, PLAYER_R, nearby, extra);
    if (res.hit) h.vx = 0;
    h.x = res.x;
    h.z = res.z;
    h.z += h.vz * dt;
    res = resolveCircle(h.x, h.z, PLAYER_R, nearby, extra);
    if (res.hit) {
      if (h.kind === "local" && Math.abs(h.vz) > 2.4 && time - lastThud > 0.22) {
        camShake = Math.max(camShake, 0.07);
        audio.thud();
        lastThud = time;
      }
      h.vz = 0;
    }
    h.x = res.x;
    h.z = res.z;
  }

  function tryPickup(h: Hunter) {
    for (const s of gems) {
      if (s.taken) continue;
      const d2 = (s.x - h.x) * (s.x - h.x) + (s.z - h.z) * (s.z - h.z);
      if (d2 < 0.7 * 0.7) {
        s.taken = true;
        s.mesh.visible = false;
        h.diamonds += 1;
        if (h.kind === "local") audio.pickup();
        refreshPortal();
        pushHud();
      }
    }
  }

  function damage(h: Hunter, amt: number, from: Hunter | null) {
    if (h.dead) return;
    h.hp = Math.max(0, h.hp - amt);
    if (h.kind === "local") {
      camShake = 0.22;
      audio.hit();
    }
    if (h.hp <= 0) {
      h.dead = true;
      h.respawn = 3.2;
      h.vx = 0;
      h.vz = 0;
      if (from && h.diamonds > 0) {
        from.diamonds += h.diamonds;
        h.diamonds = 0;
      }
      const mesh = hunterMesh.get(h.id);
      if (mesh && h.kind !== "local") mesh.visible = false;
    }
    pushHud();
  }

  function respawn(h: Hunter) {
    const start = cellCenter(maze.start.c, maze.start.r);
    if (h.kind === "bot") {
      const cell = maze.exit;
      const p = cellCenter(cell.c, cell.r);
      h.x = p.x;
      h.z = p.z;
    } else {
      h.x = start.x;
      h.z = start.z;
    }
    h.hp = MAX_HEARTS;
    h.dead = false;
    h.respawn = 0;
    const mesh = hunterMesh.get(h.id);
    if (mesh) mesh.visible = h.kind !== "local";
    pushHud();
  }

  function fireFrom(h: Hunter) {
    if (h.dead || !h.weapon || h.cooldown > 0) return;
    h.cooldown = h.weapon.cooldown;
    const fx = -Math.sin(h.yaw);
    const fz = -Math.cos(h.yaw);
    const range = h.weapon.range;
    if (h.kind === "local") {
      recoil = h.weapon.kind === "gun" ? 0.08 : 0.12;
      muzzleLight.intensity = h.weapon.kind === "gun" ? 3.5 : 0;
      if (h.weapon.kind === "gun") audio.shoot();
      else audio.slash();
      const muzzle = viewWeapon?.getObjectByName("muzzle") as THREE.Mesh | undefined;
      if (muzzle && muzzle.material && "opacity" in muzzle.material) {
        (muzzle.material as THREE.MeshBasicMaterial).opacity = 1;
      }
    }
    let best: Hunter | null = null;
    let bestT = range;
    for (const o of hunters) {
      if (o.id === h.id || o.dead) continue;
      const dx = o.x - h.x;
      const dz = o.z - h.z;
      const along = dx * fx + dz * fz;
      if (along < 0.2 || along > range) continue;
      const px = h.x + fx * along;
      const pz = h.z + fz * along;
      const lat = Math.hypot(o.x - px, o.z - pz);
      if (lat > 0.55) continue;
      if (!lineOpen(maze, h.x, h.z, o.x, o.z)) continue;
      if (along < bestT) {
        bestT = along;
        best = o;
      }
    }
    if (best) damage(best, h.weapon.damage, h);
  }

  function tryCharmBot(h: Hunter) {
    for (const m of muses) {
      if (m.charmed) continue;
      if (Math.hypot(m.x - h.x, m.z - h.z) > 1.3) continue;
      m.charmed = true;
      const def = museById(m.id)!;
      h.weapon = makeWeapon(def.reward, h.diamonds);
      refreshPortal();
    }
  }

  function maybeBotWall(h: Hunter) {
    if (h.diamonds <= 0 || Math.random() > 0.08) return;
    const me = local();
    if (Math.hypot(me.x - h.x, me.z - h.z) > 7) return;
    const { c, r } = worldToCell(h.x, h.z, maze.cols, maze.rows);
    if (toggleEdge(maze, c, r, facingDir(h.yaw))) {
      h.diamonds -= 1;
      rebuildWallMeshes();
      audio.wall();
    }
  }

  function physics(dt: number) {
    const me = local();
    if (phase !== "playing") return;

    for (const h of hunters) {
      if (h.cooldown > 0) h.cooldown -= dt;
      if (h.dead) {
        h.respawn -= dt;
        if (h.respawn <= 0) respawn(h);
        continue;
      }
    }

    if (!me.dead && phase === "playing") {
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
      me.yaw = yaw;
      moveHunter(me, fx * az + rx * ax, fz * az + rz * ax, dt, 5.5);
      const speed = Math.hypot(me.vx, me.vz);
      if (speed > 0.55) {
        bob += dt * speed * 2.4;
        if (bob - lastStep > 0.55) {
          lastStep = bob;
          audio.step();
        }
      }
      markExplored(me);
      tryPickup(me);
    }

    if (net?.role !== "client") {
      for (const h of hunters) {
        if (h.kind !== "bot" || h.dead) continue;
        const tgt = pickBotTarget(
          h,
          maze,
          me,
          gems,
          muses,
          portalOpen,
          exitPos,
        );
        steerBot(h, maze, tgt.x, tgt.z, dt, 4.4);
        const nearby = hash.nearby(h.x, h.z, PLAYER_R + 0.9);
        const extra = extraBoxes();
        h.x += h.vx * dt;
        let res = resolveCircle(h.x, h.z, PLAYER_R, nearby, extra);
        if (res.hit) h.vx = 0;
        h.x = res.x;
        h.z = res.z;
        h.z += h.vz * dt;
        res = resolveCircle(h.x, h.z, PLAYER_R, nearby, extra);
        if (res.hit) h.vz = 0;
        h.x = res.x;
        h.z = res.z;
        tryPickup(h);
        tryCharmBot(h);
        maybeBotWall(h);
        if (h.weapon && tgt.mode === "hunt") {
          const los = lineOpen(maze, h.x, h.z, me.x, me.z);
          const d = Math.hypot(me.x - h.x, me.z - h.z);
          if (los && d < h.weapon.range) {
            h.yaw = Math.atan2(-(me.x - h.x), -(me.z - h.z));
            fireFrom(h);
          }
        }
      }
    }

    prompt = null;
    wallMode = null;
    ghost.visible = false;
    if (!me.dead) {
      const exd = (exitPos.x - me.x) ** 2 + (exitPos.z - me.z) ** 2;
      if (portalOpen && exd < 1.35 * 1.35) {
        prompt = "exit";
        if (exd < 0.95 * 0.95) win();
      }
      if (me.diamonds > 0) {
        const cell = worldToCell(me.x, me.z, maze.cols, maze.rows);
        const dir = facingDir(yaw);
        if (canToggleEdge(maze, cell.c, cell.r, dir)) {
          const open = isOpen(maze, cell.c, cell.r, dir);
          wallMode = open ? "add" : "remove";
          prompt = prompt ?? "wall";
          const e = edgeWorld(cell.c, cell.r, dir);
          ghost.visible = true;
          ghost.position.set(e.cx, WALL_H / 2, e.cz);
          ghost.scale.set(e.sx * 1.08, WALL_H * 1.04, e.sz * 1.08);
          ghostMat.color.set(open ? theme.accent : 0xd4735a);
          ghostMat.opacity = 0.32 + Math.sin(time * 6) * 0.08;
        }
      }
      let nearest: MuseEnt | null = null;
      let nearestD = 2.1;
      for (const m of muses) {
        if (m.charmed) continue;
        const d = Math.hypot(m.x - me.x, m.z - me.z);
        if (d < nearestD) {
          nearestD = d;
          nearest = m;
        }
      }
      if (nearest && nearestD < 1.9) {
        prompt = "charm";
        if (awayMuse !== nearest.id && nearestD < 1.55) openMuse(nearest.id);
      } else {
        awayMuse = null;
      }
    }

    time += dt;
    if (muzzleLight.intensity > 0) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 18);
    recoil = Math.max(0, recoil - dt * 2.4);
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
      diamonds: local().diamonds,
      charmed: muses.filter((m) => m.charmed).length,
    });
    pushHud();
  }

  function titleCam(now: number) {
    const cx = (maze.cols * CELL) / 2;
    const cz = (maze.rows * CELL) / 2;
    const t = now * 0.00012;
    camera.position.set(cx + Math.cos(t) * 26, 18, cz + Math.sin(t) * 26);
    camera.lookAt(cx, 0.4, cz);
  }

  function playCam(dt: number) {
    const me = local();
    const lookY = Math.sin(pitch);
    const flat = Math.cos(pitch);
    const fx = -Math.sin(yaw) * flat;
    const fz = -Math.cos(yaw) * flat;
    let ox = 0;
    let oy = 0;
    let oz = 0;
    if (camShake > 0) {
      ox = (Math.random() - 0.5) * camShake;
      oy = (Math.random() - 0.5) * camShake * 0.4;
      oz = (Math.random() - 0.5) * camShake;
      camShake *= Math.max(0, 1 - dt * 10);
    }
    camera.position.set(me.x + ox, EYE + oy, me.z + oz);
    camera.lookAt(me.x + fx, EYE + lookY, me.z + fz);
    viewRoot.position.set(0.02, -0.02 - recoil, -recoil);
    playerLight.position.set(me.x, 1.45, me.z);
    muzzleLight.position.copy(camera.position);
  }

  function animateEntities(now: number, dt: number) {
    const t = now * 0.001;
    for (const s of gems) {
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
      const me = local();
      m.mesh.rotation.y = Math.atan2(me.x - m.x, me.z - m.z);
      const glow = m.mesh.getObjectByName("glow");
      if (glow) glow.rotation.z = t;
    }
    for (const h of hunters) {
      const mesh = hunterMesh.get(h.id);
      if (!mesh) continue;
      mesh.visible = h.kind !== "local" && !h.dead;
      mesh.position.set(h.x, 0, h.z);
      mesh.rotation.y = h.yaw + Math.PI;
    }
    const exit = world.getObjectByName("exit");
    if (exit && portalOpen) {
      const veil = exit.getObjectByName("veil") as THREE.Mesh | undefined;
      const core = exit.getObjectByName("core");
      if (veil && veil.material && "opacity" in veil.material) {
        (veil.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(t * 2.2) * 0.1;
      }
      if (core) core.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
    }
    const muzzle = viewWeapon?.getObjectByName("muzzle") as THREE.Mesh | undefined;
    if (muzzle && muzzle.material && "opacity" in muzzle.material) {
      const mat = muzzle.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 8);
    }
  }

  function drawMinimap() {
    const w = mini.width;
    const h = mini.height;
    const ctx = miniCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(12,12,14,0.78)";
    ctx.beginPath();
    const rr = 18;
    ctx.moveTo(rr, 0);
    ctx.arcTo(w, 0, w, h, rr);
    ctx.arcTo(w, h, 0, h, rr);
    ctx.arcTo(0, h, 0, 0, rr);
    ctx.arcTo(0, 0, w, 0, rr);
    ctx.closePath();
    ctx.fill();
    if (!maze) return;
    const pad = 10;
    const inner = Math.min(w, h) - pad * 2;
    const sx = inner / (maze.cols * CELL);
    const sz = inner / (maze.rows * CELL);
    const mapX = (x: number) => pad + x * sx;
    const mapZ = (z: number) => pad + z * sz;
    const me = local();
    for (let r0 = 0; r0 < maze.rows; r0++) {
      for (let c0 = 0; c0 < maze.cols; c0++) {
        if (!explored.has(r0 * maze.cols + c0)) continue;
        ctx.fillStyle = (c0 + r0) % 2 === 0 ? "#8a8074" : "#6f675c";
        ctx.fillRect(mapX(c0 * CELL), mapZ(r0 * CELL), CELL * sx + 0.5, CELL * sz + 0.5);
      }
    }
    ctx.fillStyle = "#3a332c";
    for (const wall of maze.walls) {
      const c0 = worldToCell(wall.cx, wall.cz, maze.cols, maze.rows);
      if (!explored.has(c0.r * maze.cols + c0.c)) continue;
      ctx.fillRect(mapX(wall.minX), mapZ(wall.minZ), Math.max(1.2, wall.sx * sx), Math.max(1.2, wall.sz * sz));
    }
    for (const s of gems) {
      if (s.taken) continue;
      const c = worldToCell(s.x, s.z, maze.cols, maze.rows);
      if (!explored.has(c.r * maze.cols + c.c)) continue;
      ctx.fillStyle = "#7ecfff";
      ctx.beginPath();
      ctx.arc(mapX(s.x), mapZ(s.z), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const m of muses) {
      if (m.charmed) continue;
      const c = worldToCell(m.x, m.z, maze.cols, maze.rows);
      if (!explored.has(c.r * maze.cols + c.c)) continue;
      ctx.fillStyle = "#d4735a";
      ctx.beginPath();
      ctx.arc(mapX(m.x), mapZ(m.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (portalOpen) {
      ctx.fillStyle = "#7fdad2";
      ctx.fillRect(mapX(exitPos.x) - 3.5, mapZ(exitPos.z) - 3.5, 7, 7);
    }
    for (const h of hunters) {
      if (h.kind === "local" || h.dead) continue;
      ctx.fillStyle = "#c45c4a";
      ctx.beginPath();
      ctx.arc(mapX(h.x), mapZ(h.z), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(mapX(me.x), mapZ(me.z));
    ctx.rotate(yaw);
    ctx.fillStyle = "#f4efe6";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.2, 5);
    ctx.lineTo(-4.2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function snapshot() {
    return {
      t: "snap",
      seed: maze.seed,
      theme: settings.themeId,
      size: settings.sizeId,
      ai: settings.aiCount,
      time,
      portal: portalOpen,
      gems: gems.map((g) => g.taken),
      muses: muses.map((m) => ({ id: m.id, charmed: m.charmed })),
      walls: packOpen(maze),
      hunters: hunters.map((h) => ({
        id: h.id,
        name: h.name,
        kind: h.kind,
        x: h.x,
        z: h.z,
        yaw: h.yaw,
        hp: h.hp,
        diamonds: h.diamonds,
        dead: h.dead,
        color: h.color,
        weapon: h.weapon,
      })),
    };
  }

  function applySnap(s: {
    gems: boolean[];
    muses: { id: MuseId; charmed: boolean }[];
    walls: { n: number[]; w: number[] };
    hunters: Array<Partial<Hunter> & { id: string }>;
    portal: boolean;
    time: number;
  }) {
    s.gems.forEach((taken, i) => {
      const g = gems[i];
      if (!g) return;
      g.taken = taken;
      g.mesh.visible = !taken;
    });
    for (const m of s.muses) {
      const ent = muses.find((x) => x.id === m.id);
      if (ent) ent.charmed = m.charmed;
    }
    unpackOpen(maze, s.walls.n, s.walls.w);
    rebuildWallMeshes();
    for (const rh of s.hunters) {
      if (rh.id === localId) continue;
      let h = hunters.find((x) => x.id === rh.id);
      if (!h) {
        h = {
          id: rh.id,
          name: rh.name ?? "Hunter",
          kind: rh.kind === "bot" ? "bot" : "remote",
          x: rh.x ?? 0,
          z: rh.z ?? 0,
          yaw: rh.yaw ?? 0,
          vx: 0,
          vz: 0,
          hp: rh.hp ?? 3,
          diamonds: rh.diamonds ?? 0,
          weapon: (rh.weapon as Weapon | null) ?? null,
          color: rh.color ?? 0x888888,
          dead: Boolean(rh.dead),
          respawn: 0,
          cooldown: 0,
          think: 0,
          path: [],
          fire: false,
        };
        hunters.push(h);
        spawnHunter(h);
      } else {
        h.x = rh.x ?? h.x;
        h.z = rh.z ?? h.z;
        h.yaw = rh.yaw ?? h.yaw;
        h.hp = rh.hp ?? h.hp;
        h.diamonds = rh.diamonds ?? h.diamonds;
        h.dead = Boolean(rh.dead);
        h.weapon = (rh.weapon as Weapon | null) ?? h.weapon;
      }
    }
    portalOpen = s.portal;
    time = s.time;
    const exit = world.getObjectByName("exit");
    if (exit) exit.visible = portalOpen;
    exitLight.intensity = portalOpen ? 2.2 : 0;
  }

  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (lookDx || lookDy) {
      yaw -= lookDx * SENS;
      pitch -= lookDy * SENS;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
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
      if (net) {
        netAcc += dt;
        if (net.role === "host" && netAcc > 0.08) {
          net.broadcast(snapshot());
          netAcc = 0;
        } else if (net.role === "client" && netAcc > 0.05) {
          const me = local();
          net.broadcast({ t: "pos", id: me.id, x: me.x, z: me.z, yaw, hp: me.hp, diamonds: me.diamonds });
          netAcc = 0;
        }
      }
    } else if (phase === "title") {
      ghost.visible = false;
      animateEntities(now, dt);
      titleCam(now);
    } else {
      ghost.visible = false;
      animateEntities(now, dt);
      if (phase !== "encounter") playCam(dt);
    }
    renderer.render(scene, camera);
    drawMinimap();
    raf = requestAnimationFrame(frame);
  }

  function onResize() {
    sizeView();
  }
  function onBlur() {
    keys.clear();
  }
  function onVis() {
    if (document.hidden) keys.clear();
  }

  sizeView();
  const qa = typeof location !== "undefined" && /(?:\?|&)qa=1(?:&|$)/.test(location.search);
  buildWorld(settings.seed ?? (qa ? 42 : (Date.now() % 1_000_000_007)));
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
    configure(next) {
      settings = { ...next };
      theme = themeById(settings.themeId);
      size = sizeById(settings.sizeId);
      buildWorld(settings.seed ?? (Date.now() % 1_000_000_007));
      phase = "title";
      pushHud();
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
      const me = local();
      if (!def || phase !== "encounter") return { ok: false, hearts: me.hp };
      const ok = optionId === def.correct;
      if (ok) {
        const ent = muses.find((m) => m.id === def.id);
        if (ent) ent.charmed = true;
        me.weapon = makeWeapon(def.reward, me.diamonds);
        setViewWeapon(me.weapon);
        audio.charm();
        audio.success();
        awayMuse = def.id;
        museId = null;
        showHint = false;
        phase = "playing";
        refreshPortal();
        emit({ type: "result", ok: true, hearts: me.hp, weaponName: me.weapon.name });
        pushHud();
        net?.send({ t: "charm", id: def.id, diamonds: me.diamonds });
        return { ok: true, hearts: me.hp };
      }
      me.hp = Math.max(0, me.hp - 1);
      showHint = true;
      audio.fail();
      camShake = 0.2;
      emit({ type: "result", ok: false, hearts: me.hp, weaponName: me.weapon?.name ?? "Unarmed" });
      if (me.hp <= 0) {
        me.dead = true;
        me.respawn = 3.2;
        phase = "playing";
        museId = null;
      }
      pushHud();
      return { ok: false, hearts: me.hp };
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
        const m = muses.find((e) => !e.charmed && Math.hypot(e.x - local().x, e.z - local().z) < 2);
        if (m) openMuse(m.id);
      }
      if (prompt === "wall") handle.toggleWall();
    },
    shoot() {
      if (phase !== "playing") return;
      fireFrom(local());
      net?.send({ t: "shot", yaw, id: localId });
    },
    toggleWall() {
      if (phase !== "playing") return;
      const me = local();
      if (me.dead || me.diamonds <= 0) return;
      const { c, r } = worldToCell(me.x, me.z, maze.cols, maze.rows);
      const dir = facingDir(yaw);
      if (!toggleEdge(maze, c, r, dir)) return;
      me.diamonds -= 1;
      rebuildWallMeshes();
      audio.wall();
      pushHud();
      net?.send({ t: "wall", c, r, dir, id: localId });
    },
    getState: hud,
    attachNet(next) {
      net = next;
      localId = next.selfId;
      const me = hunters.find((h) => h.kind === "local");
      if (me) me.id = localId;
    },
    onNetMessage(from, data) {
      if (!data || typeof data !== "object") return;
      const msg = data as Record<string, unknown>;
      if (msg.t === "snap" && net?.role === "client") {
        const snap = msg as {
          seed: number;
          theme: ThemeId;
          size: SizeId;
          ai: number;
          gems: boolean[];
          muses: { id: MuseId; charmed: boolean }[];
          walls: { n: number[]; w: number[] };
          hunters: Array<Partial<Hunter> & { id: string }>;
          portal: boolean;
          time: number;
        };
        if (!maze || maze.seed !== snap.seed || settings.sizeId !== snap.size || settings.themeId !== snap.theme) {
          settings = {
            sizeId: snap.size,
            themeId: snap.theme,
            aiCount: snap.ai,
            seed: snap.seed,
          };
          buildWorld(snap.seed);
        }
        applySnap(snap);
        if (phase === "title") phase = "playing";
        pushHud();
        return;
      }
      if (msg.t === "pos") {
        const h = hunters.find((x) => x.id === from || x.id === msg.id);
        if (h && h.kind !== "local") {
          h.x = Number(msg.x);
          h.z = Number(msg.z);
          h.yaw = Number(msg.yaw);
        }
      }
      if (msg.t === "shot" && net?.role === "host") {
        const h = hunters.find((x) => x.id === from);
        if (h) {
          h.yaw = Number(msg.yaw);
          fireFrom(h);
        }
      }
      if (msg.t === "wall" && net?.role === "host") {
        const h = hunters.find((x) => x.id === from);
        if (h && h.diamonds > 0) {
          if (toggleEdge(maze, Number(msg.c), Number(msg.r), Number(msg.dir) as 0 | 1 | 2 | 3)) {
            h.diamonds -= 1;
            rebuildWallMeshes();
          }
        }
      }
    },
    syncPeer(id, name, present) {
      if (id === localId) return;
      if (!present) {
        hunters = hunters.filter((h) => h.id !== id);
        const mesh = hunterMesh.get(id);
        if (mesh) {
          scene.remove(mesh);
          disposeObject(mesh);
          hunterMesh.delete(id);
        }
        return;
      }
      if (hunters.some((h) => h.id === id)) return;
      const start = cellCenter(maze.start.c, maze.start.r);
      const h: Hunter = {
        id,
        name,
        kind: "remote",
        x: start.x,
        z: start.z,
        yaw: 0,
        vx: 0,
        vz: 0,
        hp: MAX_HEARTS,
        diamonds: 0,
        weapon: null,
        color: 0x6a7d8a,
        dead: false,
        respawn: 0,
        cooldown: 0,
        think: 0,
        path: [],
        fire: false,
      };
      hunters.push(h);
      spawnHunter(h);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      clearWorld();
      renderer.dispose();
    },
  };

  const qaMode = qa || import.meta.env.DEV;
  if (qaMode) {
    (window as unknown as { __controlsTest?: unknown }).__controlsTest = {
      getYaw: () => yaw,
      getSpeed: () => {
        const me = local();
        return Math.hypot(me.vx, me.vz);
      },
      getPos: () => {
        const me = local();
        return { x: me.x, z: me.z };
      },
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
