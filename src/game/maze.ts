import { MUSES, STAR_COUNT, type MuseId } from "./content";

export const COLS = 17;
export const ROWS = 17;
export const CELL = 3.7;
export const WALL_T = 0.42;
export const WALL_H = 3.05;
export const PLAYER_R = 0.36;

export type WallBox = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
  sx: number;
  sz: number;
};

export type CellRef = { c: number; r: number };

export type MazeData = {
  seed: number;
  cols: number;
  rows: number;
  walls: WallBox[];
  start: CellRef;
  exit: CellRef;
  startYaw: number;
  muses: { id: MuseId; c: number; r: number }[];
  stars: CellRef[];
  lanterns: { x: number; z: number }[];
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellCenter(c: number, r: number) {
  return { x: (c + 0.5) * CELL, z: (r + 0.5) * CELL };
}

export function worldToCell(x: number, z: number): CellRef {
  return {
    c: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(ROWS - 1, Math.floor(z / CELL))),
  };
}

function key(c: number, r: number) {
  return r * COLS + c;
}

export function generateMaze(seed: number): MazeData {
  const rnd = mulberry32(seed);
  const cols = COLS;
  const rows = ROWS;
  const visited = new Uint8Array(cols * rows);
  const nOpen = new Uint8Array(cols * rows);
  const wOpen = new Uint8Array(cols * rows);

  const dirs = [
    { dc: 0, dr: -1 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
  ];

  function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = t;
    }
    return arr;
  }

  function carve(c: number, r: number) {
    visited[key(c, r)] = 1;
    const order = shuffle([...dirs]);
    for (const d of order) {
      const nc = c + d.dc;
      const nr = r + d.dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (visited[key(nc, nr)]) continue;
      if (d.dr === -1) nOpen[key(c, r)] = 1;
      else if (d.dr === 1) nOpen[key(nc, nr)] = 1;
      else if (d.dc === -1) wOpen[key(c, r)] = 1;
      else wOpen[key(nc, nr)] = 1;
      carve(nc, nr);
    }
  }

  function neighborsOf(c: number, r: number) {
    const out: CellRef[] = [];
    if (r > 0 && nOpen[key(c, r)]) out.push({ c, r: r - 1 });
    if (r + 1 < rows && nOpen[key(c, r + 1)]) out.push({ c, r: r + 1 });
    if (c > 0 && wOpen[key(c, r)]) out.push({ c: c - 1, r });
    if (c + 1 < cols && wOpen[key(c + 1, r)]) out.push({ c: c + 1, r });
    return out;
  }

  function openings(c: number, r: number) {
    let n = 0;
    if (r > 0 && nOpen[key(c, r)]) n++;
    if (r + 1 < rows && nOpen[key(c, r + 1)]) n++;
    if (c > 0 && wOpen[key(c, r)]) n++;
    if (c + 1 < cols && wOpen[key(c + 1, r)]) n++;
    return n;
  }

  carve(0, 0);

  const walls: WallBox[] = [];
  const push = (cx: number, cz: number, sx: number, sz: number) => {
    const hw = sx / 2;
    const hd = sz / 2;
    walls.push({
      cx,
      cz,
      sx,
      sz,
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz - hd,
      maxZ: cz + hd,
    });
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * CELL;
      const z0 = r * CELL;
      if (r === 0 || !nOpen[key(c, r)]) {
        push(x0 + CELL / 2, z0, CELL + WALL_T, WALL_T);
      }
      if (c === 0 || !wOpen[key(c, r)]) {
        push(x0, z0 + CELL / 2, WALL_T, CELL + WALL_T);
      }
    }
  }
  for (let c = 0; c < cols; c++) {
    push(c * CELL + CELL / 2, rows * CELL, CELL + WALL_T, WALL_T);
  }
  for (let r = 0; r < rows; r++) {
    push(cols * CELL, r * CELL + CELL / 2, WALL_T, CELL + WALL_T);
  }

  const start: CellRef = { c: 0, r: 0 };
  const startN = neighborsOf(start.c, start.r)[0];
  let startYaw = Math.PI;
  if (startN) {
    const dx = startN.c - start.c;
    const dz = startN.r - start.r;
    startYaw = Math.atan2(-dx, -dz);
  }
  const dist = new Int16Array(cols * rows).fill(-1);
  const parent = new Int16Array(cols * rows).fill(-1);
  const q: number[] = [key(start.c, start.r)];
  dist[q[0]!] = 0;
  let qi = 0;
  let farthest = q[0]!;

  while (qi < q.length) {
    const cur = q[qi++]!;
    const c = cur % cols;
    const r = (cur / cols) | 0;
    if (dist[cur]! >= dist[farthest]!) farthest = cur;
    for (const n of neighborsOf(c, r)) {
      const nk = key(n.c, n.r);
      if (dist[nk] !== -1) continue;
      dist[nk] = dist[cur]! + 1;
      parent[nk] = cur;
      q.push(nk);
    }
  }

  const exit: CellRef = { c: farthest % cols, r: (farthest / cols) | 0 };
  const path: CellRef[] = [];
  for (let k = farthest; k !== -1; k = parent[k]!) {
    path.push({ c: k % cols, r: (k / cols) | 0 });
  }
  path.reverse();

  const inner = path.slice(2, Math.max(3, path.length - 2));
  const museCells: { id: MuseId; c: number; r: number }[] = [];
  const used = new Set<number>([key(start.c, start.r), key(exit.c, exit.r)]);
  const takeAlong = [0.28, 0.52, 0.76];
  for (let i = 0; i < 3; i++) {
    const idx = Math.min(inner.length - 1, Math.floor(takeAlong[i]! * inner.length));
    const cell = inner[Math.max(0, idx)];
    if (!cell) continue;
    const k = key(cell.c, cell.r);
    if (used.has(k)) continue;
    used.add(k);
    museCells.push({ id: MUSES[i]!.id, c: cell.c, r: cell.r });
  }

  const dead: CellRef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = key(c, r);
      if (used.has(k)) continue;
      if (openings(c, r) === 1) dead.push({ c, r });
    }
  }
  shuffle(dead);
  const lastMuse = dead[0] ?? inner[Math.floor(inner.length / 2)];
  if (lastMuse && museCells.length < 4) {
    used.add(key(lastMuse.c, lastMuse.r));
    museCells.push({ id: MUSES[3]!.id, c: lastMuse.c, r: lastMuse.r });
  }

  const pool: CellRef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!used.has(key(c, r))) pool.push({ c, r });
    }
  }
  shuffle(pool);
  const stars = pool.slice(0, STAR_COUNT);

  const lanterns: { x: number; z: number }[] = [];
  for (let i = 3; i < path.length - 2; i += 4) {
    const p = path[i]!;
    const { x, z } = cellCenter(p.c, p.r);
    lanterns.push({ x, z });
    if (lanterns.length >= 7) break;
  }

  return { seed, cols, rows, walls, start, exit, startYaw, muses: museCells, stars, lanterns };
}

export function makeWallHash(walls: WallBox[], cellSize = CELL) {
  const buckets = new Map<number, WallBox[]>();
  const pack = (cx: number, cz: number) => ((cx + 512) << 16) | (cz + 512);
  const insert = (w: WallBox) => {
    const c0 = Math.floor(w.minX / cellSize);
    const c1 = Math.floor(w.maxX / cellSize);
    const r0 = Math.floor(w.minZ / cellSize);
    const r1 = Math.floor(w.maxZ / cellSize);
    for (let cz = r0; cz <= r1; cz++) {
      for (let cx = c0; cx <= c1; cx++) {
        const k = pack(cx, cz);
        let arr = buckets.get(k);
        if (!arr) {
          arr = [];
          buckets.set(k, arr);
        }
        arr.push(w);
      }
    }
  };
  for (const w of walls) insert(w);

  const nearby = (x: number, z: number, rad: number) => {
    const c0 = Math.floor((x - rad) / cellSize);
    const c1 = Math.floor((x + rad) / cellSize);
    const r0 = Math.floor((z - rad) / cellSize);
    const r1 = Math.floor((z + rad) / cellSize);
    const out: WallBox[] = [];
    const seen = new Set<WallBox>();
    for (let cz = r0; cz <= r1; cz++) {
      for (let cx = c0; cx <= c1; cx++) {
        const arr = buckets.get(pack(cx, cz));
        if (!arr) continue;
        for (const w of arr) {
          if (seen.has(w)) continue;
          seen.add(w);
          out.push(w);
        }
      }
    }
    return out;
  };

  return { nearby };
}

export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  walls: WallBox[],
  extra: WallBox[],
): { x: number; z: number; hit: boolean } {
  let hit = false;
  const boxes = extra.length ? walls.concat(extra) : walls;
  for (const b of boxes) {
    const qx = Math.max(b.minX, Math.min(x, b.maxX));
    const qz = Math.max(b.minZ, Math.min(z, b.maxZ));
    let dx = x - qx;
    let dz = z - qz;
    let d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 < 1e-8) {
      const penX = Math.min(x - b.minX + radius, b.maxX + radius - x);
      const penZ = Math.min(z - b.minZ + radius, b.maxZ + radius - z);
      if (penX < penZ) {
        x = x < (b.minX + b.maxX) / 2 ? b.minX - radius : b.maxX + radius;
      } else {
        z = z < (b.minZ + b.maxZ) / 2 ? b.minZ - radius : b.maxZ + radius;
      }
      continue;
    }
    const d = Math.sqrt(d2);
    const pen = radius - d;
    x += (dx / d) * pen;
    z += (dz / d) * pen;
  }
  return { x, z, hit };
}
