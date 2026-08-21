import * as THREE from "three";
import { createAudio } from "./audio";
import {
  BOT_COLORS,
  BOT_NAMES,
  MAX_HEARTS,
  makeWeapon,
  shrineById,
  sizeById,
  themeById,
  writeBest,
  type ShrineId,
  type SizeId,
  type ThemeId,
  type Weapon,
} from "./content";
import { CONFIG } from "./config";
import { pickBotTarget, steerBot, type Hunter } from "./ai";
import {
  buildDiamond,
  buildExit,
  buildHunter,
  buildLantern,
  buildShrine,
  buildViewHands,
  buildViewWeapon,
} from "./figures";
import { dressMaze, buildThemeKit } from "./props";
import { makeThemeEnv } from "./env";
import { CSM } from "three/addons/csm/CSM.js";
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
import { createPostStack } from "./fx";
import { createParticleField, type ParticleField } from "./particles";
import { codeToEcho, makeEchoPattern, shrineIndex, type EchoStep } from "./shrine";

export type Phase = "title" | "playing" | "paused" | "echo" | "win" | "lose";
export type PromptKind = null | "shrine" | "exit" | "wall";

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
  shrineId: ShrineId | null;
  solved: number;
  shrineTotal: number;
  echoPattern: EchoStep[];
  echoInput: EchoStep[];
  echoPlaying: boolean;
  echoFlash: EchoStep | null;
  echoBeat: number;
  echoStatus: "listen" | "repeat" | "fail" | null;
  shrineName: string;
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
  | { type: "echo"; id: ShrineId }
  | { type: "result"; ok: boolean; hearts: number; weaponName: string }
  | { type: "win"; time: number; diamonds: number; solved: number }
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
  toMenu: () => void;
  dismissEcho: () => void;
  echoStep: (step: EchoStep) => { ok: boolean; done: boolean };
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
type ShrineEnt = {
  id: ShrineId;
  mesh: THREE.Group;
  x: number;
  z: number;
  solved: boolean;
  mutations: number;
  pattern: EchoStep[];
  quadrant: number;
  box: WallBox;
};

const STEP = 1 / 60;
const SENS = CONFIG.move.look;
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
  renderer.shadowMap.enabled = CONFIG.fx.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 90);
  const hemi = new THREE.HemisphereLight(0xffe6d2, 0x6a8f86, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e4, 1.15);
  sun.position.set(10, 22, 9);
  sun.castShadow = false;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0x9ec5c1, 0.32);
  fill.position.set(-9, 8, -12);
  scene.add(fill);

  const csm = new CSM({
    camera,
    parent: scene,
    cascades: 2,
    maxFar: 40,
    mode: "practical",
    shadowMapSize: 1024,
    lightDirection: new THREE.Vector3(-0.52, -1, -0.38).normalize(),
    lightIntensity: 1.05,
    lightNear: 0.5,
    lightFar: 64,
    lightMargin: 8,
    shadowBias: -0.00025,
  });

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
    opacity: 0.14,
    depthWrite: false,
  });
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
  ghost.visible = false;
  scene.add(ghost);

  const viewRoot = new THREE.Group();
  camera.add(viewRoot);
  scene.add(camera);
  viewRoot.add(buildViewHands());

  const post = createPostStack(renderer, scene, camera);

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
  let shrineId: ShrineId | null = null;
  let showHint = false;
  let awayShrine: ShrineId | null = null;
  let echoPattern: EchoStep[] = [];
  let echoInput: EchoStep[] = [];
  let echoPlaying = false;
  let echoFlash: EchoStep | null = null;
  let echoStatus: "listen" | "repeat" | "fail" | null = null;
  let echoAcc = 0;
  let echoLastI = -1;
  let camShake = 0;
  let recoil = 0;
  let swing = 0;
  let hitFlash = 0;
  let disposed = false;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let maze!: MazeData;
  let hash!: ReturnType<typeof makeWallHash>;
  let gems: Gem[] = [];
  let shrines: ShrineEnt[] = [];
  let hunters: Hunter[] = [];
  let hunterMesh = new Map<string, THREE.Group>();
  let exitPos = { x: 0, z: 0 };
  let portalOpen = false;
  let localId = "local";
  let net: NetHooks | null = null;
  let netAcc = 0;
  let wallMesh: THREE.InstancedMesh | null = null;
  let capMesh: THREE.InstancedMesh | null = null;
  let trimMesh: THREE.InstancedMesh | null = null;
  let viewWeapon: THREE.Group | null = null;
  let skyMesh: THREE.Mesh | null = null;
  let particles: ParticleField | null = null;
  let envMap: THREE.Texture | null = null;
  let trimKit: THREE.Group | null = null;
  let puddle: THREE.Mesh | null = null;
  let cubeCam: THREE.CubeCamera | null = null;
  const lampGlows: THREE.Mesh[] = [];
  let puddleTick = 0;
  const explored = new Set<number>();
  const tmpColor = new THREE.Color();
  const dummy = new THREE.Object3D();
  const lanternLights: THREE.Light[] = [];
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
      shrineId,
      solved: shrines.filter((s) => s.solved).length,
      shrineTotal: shrines.length,
      echoPattern,
      echoInput,
      echoPlaying,
      echoFlash,
      echoBeat: echoStatus === "listen" ? echoLastI : echoStatus === "repeat" ? echoInput.length : -1,
      echoStatus,
      shrineName: shrineId ? shrineById(shrineId)?.name ?? "" : "",
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
    post.setSize(w, h);
    csm.updateFrustums();
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
    const dark = theme.id === "cyberpunk" || theme.id === "forest" || theme.id === "battlefield";
    hemi.intensity = dark ? 1.45 : 1.15;
    sun.color.set(theme.sun);
    sun.intensity = theme.sunInt;
    fill.color.set(theme.fill);
    fill.intensity = dark ? 0.72 : 0.4;
    renderer.toneMappingExposure = theme.id === "hell" ? 1.32 : dark ? 1.28 : 1.12;
    playerLight.color.set(theme.lantern);
    playerLight.intensity = dark ? 2.8 : theme.id === "hell" ? 2.4 : 1.8;
    playerLight.distance = dark ? 16 : 12;
    playerLight.decay = 1.1;
    exitLight.color.set(theme.accent);
    sun.intensity = theme.sunInt * 0.28;
    for (const l of csm.lights) {
      l.color.set(theme.sun);
      l.intensity = theme.sunInt * 0.85;
    }
    csm.lightDirection.set(-0.52, -1, -0.38).normalize();
    post.setBloom(
      theme.id === "cyberpunk" ? 0.48 : theme.id === "hell" ? 0.42 : 0.24,
    );
  }

  function bindCsm(root: THREE.Object3D) {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        if (mat.defines && "USE_CSM" in mat.defines) continue;
        csm.setupMaterial(mat);
      }
    });
  }

  function clearWorld() {
    for (const l of lanternLights) {
      scene.remove(l);
      if (l instanceof THREE.SpotLight) scene.remove(l.target);
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
    if (particles) {
      world.remove(particles.mesh);
      particles.dispose();
      particles = null;
    }
    if (trimKit) {
      world.remove(trimKit);
      disposeObject(trimKit);
      trimKit = null;
    }
    if (cubeCam) {
      cubeCam.renderTarget.dispose();
      scene.remove(cubeCam);
      cubeCam = null;
    }
    puddle = null;
    lampGlows.length = 0;
    if (envMap) {
      envMap.dispose();
      envMap = null;
      scene.environment = null;
    }
    for (const m of themeMats) m.dispose();
    themeMats = [];
    if (tex) {
      tex.wallTex.dispose();
      tex.floorTex.dispose();
      tex.capTex.dispose();
      tex.wallNormal.dispose();
      tex.floorNormal.dispose();
      tex.wallRough.dispose();
      tex.floorRough.dispose();
    }
    tex = null;
    wallMesh = null;
    capMesh = null;
    trimMesh = null;
    gems = [];
    shrines = [];
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
    if (trimMesh) {
      world.remove(trimMesh);
      trimMesh.geometry.dispose();
    }
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      map: tex?.wallTex,
      normalMap: tex?.wallNormal,
      roughnessMap: tex?.wallRough,
      roughness: theme.id === "cyberpunk" ? 0.5 : 0.82,
      metalness: theme.id === "cyberpunk" ? 0.22 : 0.06,
      color: 0xffffff,
      emissive: theme.id === "cyberpunk" ? 0x143038 : 0x000000,
      emissiveIntensity: theme.id === "cyberpunk" ? 0.22 : 0,
      envMapIntensity: 0.85,
    });
    if (wallMat.normalScale) wallMat.normalScale.set(0.85, 0.85);
    themeMats.push(wallMat);
    wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, maze.walls.length);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
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
    const capMat = new THREE.MeshPhysicalMaterial({
      map: tex?.capTex,
      color: theme.cap,
      roughness: 0.45,
      metalness: theme.id === "cyberpunk" ? 0.45 : 0.18,
      clearcoat: 0.28,
      clearcoatRoughness: 0.35,
    });
    themeMats.push(capMat);
    capMesh = new THREE.InstancedMesh(capGeo, capMat, maze.walls.length);
    capMesh.castShadow = true;
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, WALL_H + 0.06, w.cz);
      dummy.scale.set(w.sx + 0.08, 0.12, w.sz + 0.08);
      dummy.updateMatrix();
      capMesh!.setMatrixAt(i, dummy.matrix);
    });
    capMesh.instanceMatrix.needsUpdate = true;
    world.add(capMesh);

    const trimGeo = new THREE.BoxGeometry(1, 1, 1);
    const trimMat = new THREE.MeshPhysicalMaterial({
      color: theme.cap,
      roughness: 0.4,
      metalness: 0.22,
      clearcoat: 0.2,
    });
    themeMats.push(trimMat);
    trimMesh = new THREE.InstancedMesh(trimGeo, trimMat, maze.walls.length);
    trimMesh.castShadow = true;
    maze.walls.forEach((w, i) => {
      dummy.position.set(w.cx, 0.1, w.cz);
      dummy.scale.set(w.sx + 0.1, 0.2, w.sz + 0.1);
      dummy.updateMatrix();
      trimMesh!.setMatrixAt(i, dummy.matrix);
    });
    trimMesh.instanceMatrix.needsUpdate = true;
    world.add(trimMesh);
    if (trimKit) {
      world.remove(trimKit);
      disposeObject(trimKit);
    }
    trimKit = buildThemeKit(maze, theme);
    world.add(trimKit);
    bindCsm(wallMesh);
    bindCsm(capMesh);
    bindCsm(trimMesh);
    bindCsm(trimKit);
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
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    scene.add(mesh);
    hunterMesh.set(h.id, mesh);
    bindCsm(mesh);
  }

  function buildWorld(seed: number) {
    clearWorld();
    theme = themeById(settings.themeId);
    size = sizeById(settings.sizeId);
    applyThemeLights();
    envMap = makeThemeEnv(theme, renderer);
    scene.environment = envMap;
    scene.environmentIntensity = theme.id === "cyberpunk" ? 1.05 : 0.72;
    tex = makeThemeTextures(theme);
    maze = generateMaze(seed, size);
    hash = makeWallHash(maze.walls);
    const mx = (maze.cols * CELL) / 2;
    const mz = (maze.rows * CELL) / 2;
    const span = Math.max(maze.cols, maze.rows) * CELL * 0.55;
    sun.position.set(mx + 14, 26, mz + 10);
    sun.target.position.set(mx, 0, mz);
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.updateProjectionMatrix();
    portalOpen = false;
    prompt = null;
    shrineId = null;
    showHint = false;
    awayShrine = null;
    echoPattern = [];
    echoInput = [];
    echoPlaying = false;
    echoFlash = null;
    echoStatus = null;
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
    ground.receiveShadow = true;
    world.add(ground);

    const floorGeo = new THREE.BoxGeometry(1, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: tex.floorTex,
      normalMap: tex.floorNormal,
      roughnessMap: tex.floorRough,
      roughness: theme.id === "cyberpunk" ? 0.22 : 0.82,
      metalness: theme.id === "cyberpunk" ? 0.55 : 0.04,
      envMapIntensity: theme.id === "cyberpunk" ? 1.25 : 0.45,
      emissive: theme.id === "cyberpunk" ? theme.accent : 0x000000,
      emissiveIntensity: theme.id === "cyberpunk" ? 0.08 : 0,
    });
    if (floorMat.normalScale) floorMat.normalScale.set(0.7, 0.7);
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
    floors.receiveShadow = true;
    world.add(floors);
    bindCsm(floors);
    bindCsm(ground);

    if (theme.id === "cyberpunk") {
      const cubeTarget = new THREE.WebGLCubeRenderTarget(96);
      cubeCam = new THREE.CubeCamera(0.2, 32, cubeTarget);
      scene.add(cubeCam);
      const puddleMat = new THREE.MeshPhysicalMaterial({
        color: 0x1c303c,
        metalness: 0.9,
        roughness: 0.14,
        envMap: cubeTarget.texture,
        envMapIntensity: 1.4,
        transparent: true,
        opacity: 0.38,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      themeMats.push(puddleMat);
      puddle = new THREE.Mesh(
        new THREE.PlaneGeometry(maze.cols * CELL, maze.rows * CELL),
        puddleMat,
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((maze.cols * CELL) / 2, 0.045, (maze.rows * CELL) / 2);
      puddle.name = "puddle";
      world.add(puddle);
    }

    rebuildWallMeshes();

    for (const s of maze.diamonds) {
      const { x, z } = cellCenter(s.c, s.r);
      const mesh = buildDiamond();
      mesh.position.set(x, 0.85, z);
      world.add(mesh);
      gems.push({ mesh, x, z, taken: false });
    }

    for (const m of maze.shrines) {
      const def = shrineById(m.id)!;
      const { x, z } = cellCenter(m.c, m.r);
      const mesh = buildShrine(def, theme.id);
      mesh.position.set(x, 0, z);
      world.add(mesh);
      const rad = 0.7;
      const qi = shrineIndex(m.id);
      shrines.push({
        id: m.id,
        mesh,
        x,
        z,
        solved: false,
        mutations: 0,
        pattern: makeEchoPattern(maze.seed, qi, 0),
        quadrant: qi,
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
    exit.visible = false;
    world.add(exit);
    exitLight.position.set(ex.x, 1.6, ex.z);
    exitLight.intensity = 0;

    maze.lanterns.forEach((p, i) => {
      const lamp = buildLantern(theme.lantern);
      lamp.position.set(p.x + 0.9, 0, p.z + 0.9);
      world.add(lamp);
      const glow = lamp.getObjectByName("lampGlow") as THREE.Mesh | undefined;
      if (glow) lampGlows.push(glow);
      if (i < (theme.id === "cyberpunk" || theme.id === "forest" || theme.id === "battlefield" ? 14 : 8)) {
        const light = new THREE.PointLight(
          theme.lantern,
          theme.id === "hell" ? 2.1 : 1.85,
          11,
          1.25,
        );
        light.position.set(p.x + 0.9, 2.15, p.z + 0.9);
        scene.add(light);
        lanternLights.push(light);
      }
      if (i < 3) {
        const spot = new THREE.SpotLight(theme.lantern, 1.6, 14, 0.7, 0.45, 1.2);
        spot.position.set(p.x + 0.9, 2.2, p.z + 0.9);
        spot.target.position.set(p.x + 0.9, 0, p.z + 0.9);
        spot.castShadow = true;
        spot.shadow.mapSize.set(256, 256);
        spot.shadow.bias = -0.001;
        scene.add(spot);
        scene.add(spot.target);
        lanternLights.push(spot);
      }
    });
    dressMaze(world, maze, theme, lanternLights);
    for (const l of lanternLights) {
      if (!l.parent) scene.add(l);
    }
    particles = createParticleField(theme, maze.cols, maze.rows);
    if (particles) world.add(particles.mesh);
    bindCsm(world);

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

    const botCount = Math.max(0, Math.min(4, settings.aiCount | 0));
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
    return shrines.filter((s) => !s.solved).map((s) => s.box);
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
    const allShrines = shrines.every((s) => s.solved);
    const open = allGems && allShrines && shrines.length > 0;
    if (open === portalOpen) return;
    portalOpen = open;
    const exit = world.getObjectByName("exit");
    if (exit) exit.visible = open;
    exitLight.intensity = open ? 2.2 : 0;
  }

  function moveHunter(h: Hunter, wishX: number, wishZ: number, dt: number, maxSpeed: number) {
    const accel = CONFIG.move.accel;
    const damp = CONFIG.move.damp;
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
      hitFlash = 1;
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
    const w = h.weapon;
    h.cooldown = w.cooldown;
    if (h.kind === "local") {
      recoil = w.recoil;
      swing = 1;
      muzzleLight.intensity = w.kind === "gun" ? 4.2 : 1.2;
      audio.fireWeapon(w);
      const muzzle = viewWeapon?.getObjectByName("muzzle") as THREE.Mesh | undefined;
      if (muzzle && muzzle.material && "opacity" in muzzle.material) {
        (muzzle.material as THREE.MeshBasicMaterial).opacity = 1;
      }
    }
    const pellets = Math.max(1, w.pellets);
    const hits = new Set<string>();
    for (let i = 0; i < pellets; i++) {
      const mid = (pellets - 1) / 2;
      const ang = (i - mid) * w.spread;
      const yaw = h.yaw + ang;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      let pierced = 0;
      const ordered = hunters
        .filter((o) => o.id !== h.id && !o.dead)
        .map((o) => {
          const dx = o.x - h.x;
          const dz = o.z - h.z;
          const along = dx * fx + dz * fz;
          const px = h.x + fx * along;
          const pz = h.z + fz * along;
          const lat = Math.hypot(o.x - px, o.z - pz);
          return { o, along, lat };
        })
        .filter((s) => s.along > 0.2 && s.along < w.range && s.lat < w.width)
        .sort((a, b) => a.along - b.along);
      for (const s of ordered) {
        if (hits.has(s.o.id)) continue;
        if (!lineOpen(maze, h.x, h.z, s.o.x, s.o.z)) continue;
        hits.add(s.o.id);
        damage(s.o, w.damage, h);
        pierced += 1;
        if (pierced > w.pierce) break;
      }
    }
  }

  function revealQuadrant(index: number) {
    const midC = Math.ceil(maze.cols / 2);
    const midR = Math.ceil(maze.rows / 2);
    const c0 = index % 2 === 0 ? 0 : midC;
    const c1 = index % 2 === 0 ? midC : maze.cols;
    const r0 = index < 2 ? 0 : midR;
    const r1 = index < 2 ? midR : maze.rows;
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) explored.add(r * maze.cols + c);
    }
  }

  function mutateNearbyWall(s: ShrineEnt) {
    const cell = worldToCell(s.x, s.z, maze.cols, maze.rows);
    const dirs: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = dirs[i]!;
      dirs[i] = dirs[j]!;
      dirs[j] = t;
    }
    for (const dir of dirs) {
      if (!canToggleEdge(maze, cell.c, cell.r, dir)) continue;
      if (toggleEdge(maze, cell.c, cell.r, dir)) {
        rebuildWallMeshes();
        audio.wall();
        return;
      }
    }
  }

  function flashPad(mesh: THREE.Group, step: EchoStep | null) {
    for (const id of ["w", "a", "s", "d", "f"] as EchoStep[]) {
      const pad = mesh.getObjectByName(`pad-${id}`) as THREE.Mesh | undefined;
      if (!pad || !pad.material) continue;
      const mat = pad.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = step === id ? 2.4 : 0.35;
    }
  }

  function completeShrine(s: ShrineEnt, h: Hunter, localSolve: boolean) {
    if (s.solved) return;
    s.solved = true;
    const def = shrineById(s.id)!;
    h.weapon = makeWeapon(def.reward, h.diamonds, theme.id, def.id);
    if (localSolve) {
      setViewWeapon(h.weapon);
      revealQuadrant(s.quadrant);
      audio.success();
    }
    refreshPortal();
    pushHud();
  }

  function trySolveShrine(h: Hunter) {
    for (const s of shrines) {
      if (s.solved) continue;
      if (Math.hypot(s.x - h.x, s.z - h.z) > 1.3) continue;
      completeShrine(s, h, false);
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
      moveHunter(me, fx * az + rx * ax, fz * az + rz * ax, dt, CONFIG.move.walk);
      const speed = Math.hypot(me.vx, me.vz);
      if (speed > 0.55) {
        bob += dt * speed * CONFIG.move.bob;
        if (bob - lastStep > CONFIG.move.stepEvery) {
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
          shrines,
          portalOpen,
          exitPos,
        );
        steerBot(h, maze, tgt.x, tgt.z, dt, 6.4);
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
        trySolveShrine(h);
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
          ghost.scale.set(e.sx * 1.04, WALL_H * 1.02, e.sz * 1.04);
          ghostMat.color.set(open ? theme.accent : 0xd4735a);
          ghostMat.opacity = 0.11 + Math.sin(time * 3.2) * 0.03;
        }
      }
      let nearest: ShrineEnt | null = null;
      let nearestD = 2.1;
      for (const m of shrines) {
        if (m.solved) continue;
        const d = Math.hypot(m.x - me.x, m.z - me.z);
        if (d < nearestD) {
          nearestD = d;
          nearest = m;
        }
      }
      if (nearest && nearestD < CONFIG.combat.interact) {
        prompt = "shrine";
        if (awayShrine !== nearest.id && nearestD < CONFIG.combat.shrineOpen) openEcho(nearest.id);
      } else {
        awayShrine = null;
      }
    }

    time += dt;
    if (muzzleLight.intensity > 0) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 18);
    recoil = Math.max(0, recoil - dt * 2.4);
  }

  function openEcho(id: ShrineId) {
    if (phase !== "playing") return;
    const ent = shrines.find((s) => s.id === id && !s.solved);
    if (!ent) return;
    phase = "echo";
    shrineId = id;
    echoPattern = ent.pattern;
    echoInput = [];
    echoPlaying = true;
    echoFlash = null;
    echoStatus = "listen";
    echoAcc = 0;
    echoLastI = -1;
    prompt = "shrine";
    document.exitPointerLock?.();
    emit({ type: "echo", id });
    pushHud();
  }

  function tickEcho(dt: number) {
    if (phase !== "echo" || !shrineId) return;
    const ent = shrines.find((s) => s.id === shrineId);
    if (!ent) return;
    if (echoStatus === "listen") {
      echoAcc += dt;
      const lead = 0.28;
      const gap = 0.52;
      const hold = 0.34;
      if (echoAcc < lead) {
        flashPad(ent.mesh, null);
        return;
      }
      const i = Math.floor((echoAcc - lead) / gap);
      const sub = echoAcc - lead - i * gap;
      if (i >= 0 && i < echoPattern.length) {
        if (sub < hold) {
          if (i !== echoLastI) {
            echoLastI = i;
            echoFlash = echoPattern[i] ?? null;
            if (echoFlash) audio.echo(echoFlash, theme.id);
            pushHud();
          }
          flashPad(ent.mesh, echoFlash);
        } else if (echoFlash) {
          echoFlash = null;
          flashPad(ent.mesh, null);
          pushHud();
        }
        return;
      }
      const tail = lead + echoPattern.length * gap + 0.22;
      if (echoAcc < tail) {
        if (echoFlash) {
          echoFlash = null;
          flashPad(ent.mesh, null);
          pushHud();
        }
        return;
      }
      echoPlaying = false;
      echoFlash = null;
      echoStatus = "repeat";
      echoInput = [];
      flashPad(ent.mesh, null);
      pushHud();
    } else {
      flashPad(ent.mesh, echoFlash);
    }
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
      solved: shrines.filter((s) => s.solved).length,
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
    const idleX = Math.sin(bob * 1.15) * 0.012;
    const idleY = Math.cos(bob * 2.3) * 0.01;
    viewRoot.position.set(0.02 + idleX, -0.02 - recoil + idleY, -recoil);
    viewRoot.rotation.z = idleX * 1.35;
    viewRoot.rotation.x = idleY * 0.8;
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
    for (const m of shrines) {
      if (m.solved) {
        m.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 2.4));
        if (m.mesh.scale.x < 0.05) m.mesh.visible = false;
        continue;
      }
      const glow = m.mesh.getObjectByName("glow");
      if (glow) glow.rotation.z = t;
      const core = m.mesh.getObjectByName("core") as THREE.Mesh | undefined;
      if (core && core.material && "emissiveIntensity" in core.material) {
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + Math.sin(t * 3 + m.x) * 0.35;
      }
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
      if (core) {
        core.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
        const cm = (core as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (cm && "emissiveIntensity" in cm) cm.emissiveIntensity = 1.15 + Math.sin(t * 4.2) * 0.55;
      }
    }
    for (const lamp of lampGlows) {
      const mat = lamp.material as THREE.MeshStandardMaterial;
      if (mat && "emissiveIntensity" in mat) {
        mat.emissiveIntensity = 1.25 + Math.sin(t * 3.4 + lamp.position.x) * 0.55;
      }
    }
    if (exitLight.intensity > 0) {
      exitLight.intensity = 2.0 + Math.sin(t * 3.1) * 0.55;
    }
    const muzzle = viewWeapon?.getObjectByName("muzzle") as THREE.Mesh | undefined;
    if (muzzle && muzzle.material && "opacity" in muzzle.material) {
      const mat = muzzle.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 8);
      muzzle.scale.setScalar(1 + mat.opacity * 2.4);
    }
    const anim = viewWeapon?.getObjectByName("anim");
    if (anim) {
      if (local().weapon?.kind === "sword") {
        const a = Math.sin(swing * Math.PI);
        anim.rotation.z = -a * 1.55;
        anim.rotation.x = a * 0.55;
        anim.position.y = a * 0.08;
      } else {
        anim.rotation.x = swing * 0.35;
        anim.position.z = swing * 0.12;
      }
    }
    swing = Math.max(0, swing - dt * 3.4);
    if (particles && hunters[0]) {
      const me = local();
      particles.update(dt, me.x, me.z);
    }
    hitFlash = Math.max(0, hitFlash - dt * 2.6);
    post.setHit(hitFlash);
  }

  function drawMinimap() {
    const w = mini.width;
    const h = mini.height;
    const ctx = miniCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(16,18,20,0.9)";
    ctx.beginPath();
    const rr = 20;
    ctx.moveTo(rr, 0);
    ctx.arcTo(w, 0, w, h, rr);
    ctx.arcTo(w, h, 0, h, rr);
    ctx.arcTo(0, h, 0, 0, rr);
    ctx.arcTo(0, 0, w, 0, rr);
    ctx.closePath();
    ctx.fill();
    if (!maze) return;
    const pad = 12;
    const inner = Math.min(w, h) - pad * 2;
    const sx = inner / (maze.cols * CELL);
    const sz = inner / (maze.rows * CELL);
    const mapX = (x: number) => pad + x * sx;
    const mapZ = (z: number) => pad + z * sz;
    const me = local();
    const cellW = CELL * sx;
    const cellH = CELL * sz;

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let r0 = 0; r0 < maze.rows; r0++) {
      for (let c0 = 0; c0 < maze.cols; c0++) {
        ctx.fillRect(mapX(c0 * CELL), mapZ(r0 * CELL), cellW - 0.4, cellH - 0.4);
      }
    }

    const floorA =
      theme.id === "cyberpunk"
        ? "#4d7388"
        : theme.id === "forest"
          ? "#6f9158"
          : theme.id === "battlefield"
            ? "#9a8064"
            : "#c4b49a";
    const floorB =
      theme.id === "cyberpunk"
        ? "#3e6274"
        : theme.id === "forest"
          ? "#61824c"
          : theme.id === "battlefield"
            ? "#8a7258"
            : "#b6a68c";
    for (let r0 = 0; r0 < maze.rows; r0++) {
      for (let c0 = 0; c0 < maze.cols; c0++) {
        if (!explored.has(r0 * maze.cols + c0)) continue;
        ctx.fillStyle = (c0 + r0) % 2 === 0 ? floorA : floorB;
        ctx.fillRect(mapX(c0 * CELL), mapZ(r0 * CELL), cellW + 0.4, cellH + 0.4);
      }
    }

    ctx.strokeStyle = "#1a1612";
    ctx.lineWidth = Math.max(2.2, cellW * 0.18);
    ctx.lineCap = "square";
    ctx.beginPath();
    for (const wall of maze.walls) {
      const c0 = worldToCell(wall.cx, wall.cz, maze.cols, maze.rows);
      const near =
        explored.has(c0.r * maze.cols + c0.c) ||
        explored.has(c0.r * maze.cols + Math.max(0, c0.c - 1)) ||
        explored.has(Math.max(0, c0.r - 1) * maze.cols + c0.c);
      if (!near) continue;
      ctx.moveTo(mapX(wall.minX), mapZ(wall.minZ));
      ctx.lineTo(mapX(wall.minX + wall.sx), mapZ(wall.minZ + wall.sz));
    }
    ctx.stroke();

    for (const s of gems) {
      if (s.taken) continue;
      const c = worldToCell(s.x, s.z, maze.cols, maze.rows);
      if (!explored.has(c.r * maze.cols + c.c)) continue;
      const gx = mapX(s.x);
      const gz = mapZ(s.z);
      ctx.fillStyle = "rgba(126,207,255,0.35)";
      ctx.beginPath();
      ctx.arc(gx, gz, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b8f0ff";
      ctx.beginPath();
      ctx.arc(gx, gz, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const m of shrines) {
      if (m.solved) continue;
      const c = worldToCell(m.x, m.z, maze.cols, maze.rows);
      if (!explored.has(c.r * maze.cols + c.c)) continue;
      ctx.fillStyle = "#7fdad2";
      ctx.beginPath();
      ctx.arc(mapX(m.x), mapZ(m.z), 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f4efe6";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (portalOpen) {
      ctx.fillStyle = "#7fdad2";
      ctx.strokeStyle = "#f4efe6";
      ctx.lineWidth = 1.4;
      const ex = mapX(exitPos.x);
      const ez = mapZ(exitPos.z);
      ctx.fillRect(ex - 4, ez - 4, 8, 8);
      ctx.strokeRect(ex - 4, ez - 4, 8, 8);
    }
    for (const hunter of hunters) {
      if (hunter.kind === "local" || hunter.dead) continue;
      ctx.fillStyle = "#c45c4a";
      ctx.beginPath();
      ctx.arc(mapX(hunter.x), mapZ(hunter.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(mapX(me.x), mapZ(me.z));
    ctx.rotate(-yaw);
    ctx.fillStyle = "rgba(90, 210, 200, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -24);
    ctx.lineTo(9, -24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f7f3ea";
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a9b96";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(4.2, -2.5);
    ctx.lineTo(-4.2, -2.5);
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
      shrines: shrines.map((s) => ({ id: s.id, solved: s.solved, mutations: s.mutations })),
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
    shrines: { id: ShrineId; solved: boolean; mutations: number }[];
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
    for (const m of s.shrines) {
      const ent = shrines.find((x) => x.id === m.id);
      if (!ent) continue;
      ent.solved = m.solved;
      ent.mutations = m.mutations;
      ent.pattern = makeEchoPattern(maze.seed, shrineIndex(ent.id), ent.mutations);
      if (ent.solved) {
        ent.mesh.visible = false;
        if (shrineId === ent.id) {
          shrineId = null;
          echoStatus = null;
          echoFlash = null;
          echoPlaying = false;
          awayShrine = ent.id;
          if (phase === "echo") phase = "playing";
        }
      }
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
    } else if (phase === "echo") {
      ghost.visible = false;
      tickEcho(dt);
      animateEntities(now, dt);
      playCam(dt);
    } else if (phase === "title") {
      ghost.visible = false;
      animateEntities(now, dt);
      titleCam(now);
    } else {
      ghost.visible = false;
      animateEntities(now, dt);
      playCam(dt);
    }
    csm.update();
    if (cubeCam && puddle && hunters[0] && (phase === "playing" || phase === "title")) {
      puddleTick += 1;
      if (puddleTick % 4 === 0) {
        if (phase === "playing") {
          const me = local();
          cubeCam.position.set(me.x, 0.32, me.z);
        } else {
          cubeCam.position.copy(camera.position);
        }
        puddle.visible = false;
        cubeCam.update(renderer, scene);
        puddle.visible = true;
      }
    }
    post.render();
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
    toMenu() {
      document.exitPointerLock?.();
      prompt = null;
      shrineId = null;
      showHint = false;
      awayShrine = null;
      echoStatus = null;
      wallMode = null;
      buildWorld(settings.seed ?? ((maze?.seed ?? Date.now()) % 1_000_000_007));
      phase = "title";
      pushHud();
    },
    dismissEcho() {
      if (phase !== "echo" || !shrineId) return;
      const ent = shrines.find((s) => s.id === shrineId);
      if (ent) flashPad(ent.mesh, null);
      awayShrine = shrineId;
      shrineId = null;
      echoStatus = null;
      echoFlash = null;
      echoPlaying = false;
      phase = "playing";
      pushHud();
    },
    echoStep(step: EchoStep) {
      const me = local();
      if (phase !== "echo" || echoStatus !== "repeat" || !shrineId) return { ok: false, done: false };
      const ent = shrines.find((s) => s.id === shrineId);
      if (!ent || ent.solved) return { ok: false, done: false };
      const expected = echoPattern[echoInput.length];
      echoFlash = step;
      flashPad(ent.mesh, step);
      audio.echo(step, theme.id);
      if (step !== expected) {
        ent.mutations += 1;
        ent.pattern = makeEchoPattern(maze.seed, shrineIndex(ent.id), ent.mutations);
        echoPattern = ent.pattern;
        echoInput = [];
        echoStatus = "fail";
        echoPlaying = true;
        audio.fail();
        camShake = 0.16;
        mutateNearbyWall(ent);
        window.setTimeout(() => {
          if (phase !== "echo" || shrineId !== ent.id) return;
          echoStatus = "listen";
          echoAcc = 0;
          echoLastI = -1;
          echoFlash = null;
          echoPlaying = true;
          pushHud();
        }, 560);
        emit({ type: "result", ok: false, hearts: me.hp, weaponName: me.weapon?.name ?? "Unarmed" });
        pushHud();
        return { ok: false, done: false };
      }
      echoInput = [...echoInput, step];
      if (echoInput.length >= echoPattern.length) {
        completeShrine(ent, me, true);
        awayShrine = ent.id;
        shrineId = null;
        echoStatus = null;
        echoFlash = null;
        phase = "playing";
        emit({ type: "result", ok: true, hearts: me.hp, weaponName: me.weapon?.name ?? "Armed" });
        net?.send({ t: "shrine", id: ent.id, diamonds: me.diamonds });
        pushHud();
        return { ok: true, done: true };
      }
      pushHud();
      return { ok: true, done: false };
    },
    setKey(code, down) {
      if (down && phase === "echo") {
        const step = codeToEcho(code);
        if (step) {
          handle.echoStep(step);
          return;
        }
      }
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
      if (prompt === "shrine") {
        const m = shrines.find((e) => !e.solved && Math.hypot(e.x - local().x, e.z - local().z) < 2);
        if (m) openEcho(m.id);
      }
      if (prompt === "wall") handle.toggleWall();
    },
    shoot() {
      if (phase === "echo") {
        handle.echoStep("f");
        return;
      }
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
          shrines: { id: ShrineId; solved: boolean; mutations: number }[];
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
      if (msg.t === "shrine") {
        const id = String(msg.id) as ShrineId;
        const h = hunters.find((x) => x.id === from);
        const ent = shrines.find((s) => s.id === id);
        if (h && ent) completeShrine(ent, h, false);
        if (ent?.solved && shrineId === ent.id) {
          flashPad(ent.mesh, null);
          shrineId = null;
          echoStatus = null;
          echoFlash = null;
          echoPlaying = false;
          awayShrine = ent.id;
          if (phase === "echo") phase = "playing";
          pushHud();
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
      post.dispose();
      csm.dispose();
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
      getPhase: () => phase,
      getShrines: () => shrines.map((s) => ({ id: s.id, x: s.x, z: s.z, solved: s.solved })),
      warp: (x: number, z: number) => {
        const me = local();
        me.x = x;
        me.z = z;
      },
      getEcho: () => ({
        phase,
        status: echoStatus,
        pattern: [...echoPattern],
        input: [...echoInput],
        weapon: local().weapon?.name ?? null,
        solved: shrines.filter((s) => s.solved).length,
        hearts: local().hp,
      }),
      echoStep: (step: EchoStep) => handle.echoStep(step),
      qaEcho: (id: ShrineId, mode: "solve" | "miss") => {
        const ent = shrines.find((s) => s.id === id && !s.solved) ?? shrines.find((s) => !s.solved);
        if (!ent) return { ok: false };
        const me = local();
        me.x = ent.x + 1.15;
        me.z = ent.z;
        if (phase !== "echo" || shrineId !== ent.id) openEcho(ent.id);
        echoStatus = "repeat";
        echoPlaying = false;
        echoFlash = null;
        echoInput = [];
        if (mode === "miss") {
          const wrong = (echoPattern[0] === "w" ? "a" : "w") as EchoStep;
          const res = handle.echoStep(wrong);
          return {
            ...res,
            hearts: me.hp,
            status: echoStatus,
            solved: shrines.filter((s) => s.solved).length,
            mutations: ent.mutations,
          };
        }
        let last = { ok: false, done: false };
        for (const step of [...echoPattern]) last = handle.echoStep(step);
        return {
          ...last,
          hearts: me.hp,
          weapon: me.weapon?.name ?? null,
          solved: shrines.filter((s) => s.solved).length,
          explored: explored.size,
          portal: portalOpen,
          phase,
        };
      },
    };
  }

  return handle;
}
