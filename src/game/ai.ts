import {
  CELL,
  findPath,
  lineOpen,
  neighborsOf,
  worldToCell,
  type CellRef,
  type MazeData,
} from "./maze";
import type { Weapon } from "./content";

export type HunterKind = "local" | "bot" | "remote";

export type Hunter = {
  id: string;
  name: string;
  kind: HunterKind;
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  hp: number;
  diamonds: number;
  weapon: Weapon | null;
  color: number;
  dead: boolean;
  respawn: number;
  cooldown: number;
  think: number;
  path: CellRef[];
  fire: boolean;
};

export function pickBotTarget(
  bot: Hunter,
  maze: MazeData,
  local: Hunter,
  diamonds: { x: number; z: number; taken: boolean }[],
  shrines: { x: number; z: number; solved: boolean }[],
  portal: boolean,
  exit: { x: number; z: number },
): { x: number; z: number; mode: "hunt" | "gem" | "shrine" | "exit" | "wander" } {
  if (portal) return { x: exit.x, z: exit.z, mode: "exit" };
  const los =
    !local.dead &&
    lineOpen(maze, bot.x, bot.z, local.x, local.z) &&
    Math.hypot(local.x - bot.x, local.z - bot.z) < (bot.weapon?.range ?? 8);
  if (bot.weapon && los && bot.hp > 0) {
    return { x: local.x, z: local.z, mode: "hunt" };
  }
  let bestM = 99;
  let shrine: { x: number; z: number } | null = null;
  for (const m of shrines) {
    if (m.solved) continue;
    const d = Math.hypot(m.x - bot.x, m.z - bot.z);
    if (d < bestM) {
      bestM = d;
      shrine = m;
    }
  }
  if (shrine && bestM < 14) return { x: shrine.x, z: shrine.z, mode: "shrine" };
  let bestD = 99;
  let gem: { x: number; z: number } | null = null;
  for (const d of diamonds) {
    if (d.taken) continue;
    const dist = Math.hypot(d.x - bot.x, d.z - bot.z);
    if (dist < bestD) {
      bestD = dist;
      gem = d;
    }
  }
  if (gem) return { x: gem.x, z: gem.z, mode: "gem" };
  if (shrine) return { x: shrine.x, z: shrine.z, mode: "shrine" };
  const n = neighborsOf(maze, worldToCell(bot.x, bot.z, maze.cols, maze.rows).c, worldToCell(bot.x, bot.z, maze.cols, maze.rows).r);
  const step = n[Math.floor(Math.random() * Math.max(1, n.length))];
  if (step) return { x: (step.c + 0.5) * CELL, z: (step.r + 0.5) * CELL, mode: "wander" };
  return { x: bot.x, z: bot.z, mode: "wander" };
}

export function steerBot(bot: Hunter, maze: MazeData, tx: number, tz: number, dt: number, speed: number) {
  const here = worldToCell(bot.x, bot.z, maze.cols, maze.rows);
  const goal = worldToCell(tx, tz, maze.cols, maze.rows);
  if (!bot.path.length || bot.think <= 0) {
    bot.path = findPath(maze, here, goal);
    bot.think = 0.35 + Math.random() * 0.2;
  }
  bot.think -= dt;
  const next = bot.path[1] ?? bot.path[0];
  if (!next) {
    bot.vx = 0;
    bot.vz = 0;
    return;
  }
  const nx = (next.c + 0.5) * CELL;
  const nz = (next.r + 0.5) * CELL;
  const dx = nx - bot.x;
  const dz = nz - bot.z;
  const mag = Math.hypot(dx, dz);
  if (mag < 0.35) {
    bot.path.shift();
  }
  if (mag > 0.02) {
    bot.vx = (dx / mag) * speed;
    bot.vz = (dz / mag) * speed;
    bot.yaw = Math.atan2(-dx, -dz);
  }
}
