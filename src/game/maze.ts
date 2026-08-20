import { MUSES, type MuseId, type SizeDef } from "./content";

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
export type EdgeDir = 0 | 1 | 2 | 3;

export type MazeData = {
  seed: number;
  cols: number;
  rows: number;
  nOpen: Uint8Array;
  wOpen: Uint8Array;
  walls: WallBox[];
  start: CellRef;
  exit: CellRef;
  startYaw: number;
  muses: { id: MuseId; c: number; r: number }[];
  diamonds: CellRef[];
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

export function worldToCell(x: number, z: number, cols: number, rows: number): CellRef {
  return {
    c: Math.max(0, Math.min(cols - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(rows - 1, Math.floor(z / CELL))),
  };
}

export function facingDir(yaw: number): EdgeDir {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  if (Math.abs(fx) > Math.abs(fz)) return fx > 0 ? 1 : 3;
  return fz > 0 ? 2 : 0;
}

export function generateMaze(seed: number, size: SizeDef): MazeData {
  const rnd = mulberry32(seed);
  const cols = size.cols;
  const rows = size.rows;
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

  function k(c: number, r: number) {
    return r * cols + c;
  }

  function carve(startC: number, startR: number) {
    const stack: [number, number][] = [[startC, startR]];
    visited[k(startC, startR)] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const c = top[0];
      const r = top[1];
      const order = shuffle([...dirs]);
      let carved = false;
      for (const d of order) {
        const nc = c + d.dc;
        const nr = r + d.dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (visited[k(nc, nr)]) continue;
        if (d.dr === -1) nOpen[k(c, r)] = 1;
        else if (d.dr === 1) nOpen[k(nc, nr)] = 1;
        else if (d.dc === -1) wOpen[k(c, r)] = 1;
        else wOpen[k(nc, nr)] = 1;
        visited[k(nc, nr)] = 1;
        stack.push([nc, nr]);
        carved = true;
        break;
      }
      if (!carved) stack.pop();
    }
  }

  function neighborsLocal(c: number, r: number) {
    const out: CellRef[] = [];
    if (r > 0 && nOpen[k(c, r)]) out.push({ c, r: r - 1 });
    if (r + 1 < rows && nOpen[k(c, r + 1)]) out.push({ c, r: r + 1 });
    if (c > 0 && wOpen[k(c, r)]) out.push({ c: c - 1, r });
    if (c + 1 < cols && wOpen[k(c + 1, r)]) out.push({ c: c + 1, r });
    return out;
  }

  function openings(c: number, r: number) {
    let n = 0;
    if (r > 0 && nOpen[k(c, r)]) n++;
    if (r + 1 < rows && nOpen[k(c, r + 1)]) n++;
    if (c > 0 && wOpen[k(c, r)]) n++;
    if (c + 1 < cols && wOpen[k(c + 1, r)]) n++;
    return n;
  }

  carve(0, 0);

  const start: CellRef = { c: 0, r: 0 };
  const startN = neighborsLocal(start.c, start.r)[0];
  let startYaw = Math.PI;
  if (startN) {
    const dx = startN.c - start.c;
    const dz = startN.r - start.r;
    startYaw = Math.atan2(-dx, -dz);
  }
  const dist = new Int16Array(cols * rows).fill(-1);
  const parent = new Int16Array(cols * rows).fill(-1);
  const q: number[] = [k(start.c, start.r)];
  dist[q[0]!] = 0;
  let qi = 0;
  let farthest = q[0]!;

  while (qi < q.length) {
    const cur = q[qi++]!;
    const c = cur % cols;
    const r = (cur / cols) | 0;
    if (dist[cur]! >= dist[farthest]!) farthest = cur;
    for (const n of neighborsLocal(c, r)) {
      const nk = k(n.c, n.r);
      if (dist[nk] !== -1) continue;
      dist[nk] = dist[cur]! + 1;
      parent[nk] = cur;
      q.push(nk);
    }
  }

  const exit: CellRef = { c: farthest % cols, r: (farthest / cols) | 0 };
  const path: CellRef[] = [];
  for (let p = farthest; p !== -1; p = parent[p]!) {
    path.push({ c: p % cols, r: (p / cols) | 0 });
  }
  path.reverse();

  const inner = path.slice(2, Math.max(3, path.length - 2));
  const museCells: { id: MuseId; c: number; r: number }[] = [];
  const used = new Set<number>([k(start.c, start.r), k(exit.c, exit.r)]);
  const takeAlong = [0.22, 0.44, 0.66, 0.84];
  for (let i = 0; i < 4; i++) {
    const idx = Math.min(inner.length - 1, Math.floor((takeAlong[i] ?? 0.5) * inner.length));
    let cell = inner[Math.max(0, idx)];
    if (!cell) continue;
    let kk = k(cell.c, cell.r);
    if (used.has(kk)) {
      const next = inner.find((x) => !used.has(k(x.c, x.r)));
      if (!next) continue;
      cell = next;
      kk = k(cell.c, cell.r);
    }
    used.add(kk);
    museCells.push({ id: MUSES[i]!.id, c: cell.c, r: cell.r });
  }

  const dead: CellRef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kk = k(c, r);
      if (used.has(kk)) continue;
      if (openings(c, r) === 1) dead.push({ c, r });
    }
  }
  shuffle(dead);

  const pool: CellRef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!used.has(k(c, r))) pool.push({ c, r });
    }
  }
  shuffle(pool);
  const diamonds = pool.slice(0, size.diamonds);
  for (const d of diamonds) used.add(k(d.c, d.r));

  const lanterns: { x: number; z: number }[] = [];
  for (let i = 3; i < path.length - 2; i += 3) {
    const p = path[i]!;
    const { x, z } = cellCenter(p.c, p.r);
    lanterns.push({ x, z });
    if (lanterns.length >= 10) break;
  }

  const maze: MazeData = {
    seed,
    cols,
    rows,
    nOpen,
    wOpen,
    walls: [],
    start,
    exit,
    startYaw,
    muses: museCells,
    diamonds,
    lanterns,
  };
  rebuildWalls(maze);
  return maze;
}

export function rebuildWalls(maze: MazeData) {
  const { cols, rows, nOpen, wOpen } = maze;
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
  const k = (c: number, r: number) => r * cols + c;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * CELL;
      const z0 = r * CELL;
      if (r === 0 || !nOpen[k(c, r)]) push(x0 + CELL / 2, z0, CELL + WALL_T, WALL_T);
      if (c === 0 || !wOpen[k(c, r)]) push(x0, z0 + CELL / 2, WALL_T, CELL + WALL_T);
    }
  }
  for (let c = 0; c < cols; c++) push(c * CELL + CELL / 2, rows * CELL, CELL + WALL_T, WALL_T);
  for (let r = 0; r < rows; r++) push(cols * CELL, r * CELL + CELL / 2, WALL_T, CELL + WALL_T);
  maze.walls = walls;
}

export function neighborsOf(maze: MazeData, c: number, r: number): CellRef[] {
  const { cols, rows, nOpen, wOpen } = maze;
  const k = (cc: number, rr: number) => rr * cols + cc;
  const out: CellRef[] = [];
  if (r > 0 && nOpen[k(c, r)]) out.push({ c, r: r - 1 });
  if (r + 1 < rows && nOpen[k(c, r + 1)]) out.push({ c, r: r + 1 });
  if (c > 0 && wOpen[k(c, r)]) out.push({ c: c - 1, r });
  if (c + 1 < cols && wOpen[k(c + 1, r)]) out.push({ c: c + 1, r });
  return out;
}

export function isOpen(maze: MazeData, c: number, r: number, dir: EdgeDir): boolean {
  const { cols, rows, nOpen, wOpen } = maze;
  const k = (cc: number, rr: number) => rr * cols + cc;
  if (dir === 0) return r > 0 && nOpen[k(c, r)] === 1;
  if (dir === 2) return r + 1 < rows && nOpen[k(c, r + 1)] === 1;
  if (dir === 3) return c > 0 && wOpen[k(c, r)] === 1;
  return c + 1 < cols && wOpen[k(c + 1, r)] === 1;
}

export function canToggleEdge(maze: MazeData, c: number, r: number, dir: EdgeDir): boolean {
  const { cols, rows } = maze;
  if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
  if (dir === 0) return r > 0;
  if (dir === 2) return r + 1 < rows;
  if (dir === 3) return c > 0;
  return c + 1 < cols;
}

export function edgeWorld(c: number, r: number, dir: EdgeDir) {
  if (dir === 0) return { cx: (c + 0.5) * CELL, cz: r * CELL, sx: CELL + WALL_T, sz: WALL_T };
  if (dir === 2) return { cx: (c + 0.5) * CELL, cz: (r + 1) * CELL, sx: CELL + WALL_T, sz: WALL_T };
  if (dir === 3) return { cx: c * CELL, cz: (r + 0.5) * CELL, sx: WALL_T, sz: CELL + WALL_T };
  return { cx: (c + 1) * CELL, cz: (r + 0.5) * CELL, sx: WALL_T, sz: CELL + WALL_T };
}

export function toggleEdge(maze: MazeData, c: number, r: number, dir: EdgeDir): boolean {
  const { cols, rows, nOpen, wOpen } = maze;
  const k = (cc: number, rr: number) => rr * cols + cc;
  if (!canToggleEdge(maze, c, r, dir)) return false;
  if (dir === 0) nOpen[k(c, r)] = nOpen[k(c, r)] ? 0 : 1;
  else if (dir === 2) nOpen[k(c, r + 1)] = nOpen[k(c, r + 1)] ? 0 : 1;
  else if (dir === 3) wOpen[k(c, r)] = wOpen[k(c, r)] ? 0 : 1;
  else wOpen[k(c + 1, r)] = wOpen[k(c + 1, r)] ? 0 : 1;
  rebuildWalls(maze);
  return true;
}

export function findPath(maze: MazeData, from: CellRef, to: CellRef): CellRef[] {
  if (from.c === to.c && from.r === to.r) return [from];
  const { cols, rows } = maze;
  const k = (c: number, r: number) => r * cols + c;
  const parent = new Int32Array(cols * rows).fill(-1);
  const q: number[] = [k(from.c, from.r)];
  parent[q[0]!] = -2;
  let qi = 0;
  const goal = k(to.c, to.r);
  while (qi < q.length) {
    const cur = q[qi++]!;
    if (cur === goal) break;
    const c = cur % cols;
    const r = (cur / cols) | 0;
    for (const n of neighborsOf(maze, c, r)) {
      const nk = k(n.c, n.r);
      if (parent[nk] !== -1) continue;
      parent[nk] = cur;
      q.push(nk);
    }
  }
  if (parent[goal] === -1) return [];
  const path: CellRef[] = [];
  for (let p = goal; p !== -2; p = parent[p]!) {
    path.push({ c: p % cols, r: (p / cols) | 0 });
    if (parent[p] === -2) break;
  }
  path.reverse();
  return path;
}

export function lineOpen(maze: MazeData, x0: number, z0: number, x1: number, z1: number): boolean {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.01) return true;
  const steps = Math.max(4, Math.ceil(dist / 0.35));
  const { cols, rows } = maze;
  let lastC = -1;
  let lastR = -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const z = z0 + dz * t;
    const { c, r } = worldToCell(x, z, cols, rows);
    if (c === lastC && r === lastR) continue;
    if (lastC >= 0) {
      const dc = c - lastC;
      const dr = r - lastR;
      if (Math.abs(dc) + Math.abs(dr) >= 1) {
        const open = neighborsOf(maze, lastC, lastR).some((n) => n.c === c && n.r === r);
        if (!open) return false;
      }
    }
    lastC = c;
    lastR = r;
  }
  return true;
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

export function packOpen(maze: MazeData) {
  return {
    n: Array.from(maze.nOpen),
    w: Array.from(maze.wOpen),
  };
}

export function unpackOpen(maze: MazeData, n: number[], w: number[]) {
  maze.nOpen = Uint8Array.from(n);
  maze.wOpen = Uint8Array.from(w);
  rebuildWalls(maze);
}
