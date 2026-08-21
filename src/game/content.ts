import { THEME_COMBAT, WEAPON_FEEL, type FireStyle } from "./config";

export const APP_NAME = "Glimmer Maze";
export const MAX_HEARTS = 3;
export const BOT_NAMES = ["Ash", "Vex", "Rook", "Nyx"] as const;
export const BOT_COLORS = [0xb85c4a, 0x6a7d52, 0xc48a3a, 0x4f6f80] as const;

export type SizeId = "small" | "medium" | "large";
export type ThemeId = "victorian" | "cyberpunk" | "battlefield" | "hell" | "forest";
export type WeaponKind = "sword" | "gun";

export type SizeDef = {
  id: SizeId;
  label: string;
  hint: string;
  cols: number;
  rows: number;
  diamonds: number;
};

export const SIZES: SizeDef[] = [
  { id: "small", label: "Small", hint: "11×11 — a tight sprint", cols: 11, rows: 11, diamonds: 6 },
  { id: "medium", label: "Medium", hint: "17×17 — the standard hunt", cols: 17, rows: 17, diamonds: 10 },
  { id: "large", label: "Large", hint: "23×23 — a long campaign", cols: 23, rows: 23, diamonds: 16 },
];

export function sizeById(id: string | undefined): SizeDef {
  return SIZES.find((s) => s.id === id) ?? SIZES[1]!;
}

export type ThemeDef = {
  id: ThemeId;
  label: string;
  hint: string;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  sunInt: number;
  fill: number;
  bg: number;
  wallA: number;
  wallB: number;
  wallC: number;
  cap: number;
  floorA: number;
  floorB: number;
  ground: number;
  accent: number;
  lantern: number;
  sky: string;
};

export const THEMES: ThemeDef[] = [
  {
    id: "victorian",
    label: "Old Victorian",
    hint: "Gaslight plaster and warm stone",
    fog: 0xc9b49a,
    fogNear: 12,
    fogFar: 42,
    hemiSky: 0xffe6d2,
    hemiGround: 0x6a8f86,
    sun: 0xfff3e4,
    sunInt: 1.2,
    fill: 0x9ec5c1,
    bg: 0xc9b49a,
    wallA: 0xe8d8c0,
    wallB: 0xdeccb0,
    wallC: 0xd4c2a6,
    cap: 0xb08968,
    floorA: 0xd8c8ab,
    floorB: 0xccba98,
    ground: 0xc4b18f,
    accent: 0x4a9b96,
    lantern: 0xffc07a,
    sky: "/game/sky-victorian.jpg",
  },
  {
    id: "cyberpunk",
    label: "Futuristic Cyberpunk",
    hint: "Wet metal, teal neon, night rain",
    fog: 0x4a6a7c,
    fogNear: 18,
    fogFar: 58,
    hemiSky: 0xc8f0ff,
    hemiGround: 0x4a6878,
    sun: 0xd8f6ff,
    sunInt: 1.45,
    fill: 0xffb08a,
    bg: 0x3a5464,
    wallA: 0x5a7388,
    wallB: 0x678092,
    wallC: 0x4e6a7c,
    cap: 0x6ad4e4,
    floorA: 0x4a6274,
    floorB: 0x567084,
    ground: 0x3a5060,
    accent: 0x5ce1f2,
    lantern: 0x8af0ff,
    sky: "/game/sky-cyberpunk.jpg",
  },
  {
    id: "battlefield",
    label: "Battlefield",
    hint: "Mud, brick, and smoke at dusk",
    fog: 0xc4b498,
    fogNear: 16,
    fogFar: 52,
    hemiSky: 0xffe8c4,
    hemiGround: 0x8a7a60,
    sun: 0xffd8a0,
    sunInt: 1.4,
    fill: 0xc8d0d4,
    bg: 0xb8a888,
    wallA: 0xb89270,
    wallB: 0xa88264,
    wallC: 0xc09a78,
    cap: 0x6a5c4c,
    floorA: 0x9a8064,
    floorB: 0x8c7458,
    ground: 0x7a6850,
    accent: 0xd4924a,
    lantern: 0xffc070,
    sky: "/game/sky-battlefield.jpg",
  },
  {
    id: "hell",
    label: "Hell",
    hint: "Basalt halls and ember light",
    fog: 0xc47850,
    fogNear: 16,
    fogFar: 54,
    hemiSky: 0xffd2a8,
    hemiGround: 0x5a2a1c,
    sun: 0xffb070,
    sunInt: 1.55,
    fill: 0xff8a50,
    bg: 0x4a2418,
    wallA: 0x9a5c48,
    wallB: 0x8a5344,
    wallC: 0xaa6a52,
    cap: 0xc45a32,
    floorA: 0x6e4030,
    floorB: 0x5a3428,
    ground: 0x3a2018,
    accent: 0xff7a40,
    lantern: 0xff8a3a,
    sky: "/game/sky-hell.jpg",
  },
  {
    id: "forest",
    label: "Forest",
    hint: "Moss, timber, and green mist",
    fog: 0xc4d8a8,
    fogNear: 16,
    fogFar: 52,
    hemiSky: 0xf4ffe0,
    hemiGround: 0x6a8a50,
    sun: 0xfff6c8,
    sunInt: 1.45,
    fill: 0xa8c888,
    bg: 0xb8c898,
    wallA: 0x8a6a48,
    wallB: 0x7c5e40,
    wallC: 0x9a7a54,
    cap: 0x5a9a48,
    floorA: 0x6e9250,
    floorB: 0x628448,
    ground: 0x54743c,
    accent: 0x7ec86a,
    lantern: 0xffe8a0,
    sky: "/game/sky-forest.jpg",
  },
];

export function themeById(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export type ShrineId = "luma" | "ruby" | "pearl" | "cinder";

export type ShrineDef = {
  id: ShrineId;
  name: string;
  title: string;
  reward: WeaponKind;
  accent: number;
  hint: string;
};

export const SHRINES: ShrineDef[] = [
  {
    id: "luma",
    name: "Gale Shrine",
    title: "North echo",
    reward: "sword",
    accent: 0x6db3a8,
    hint: "Wind first — high notes, then the strike.",
  },
  {
    id: "ruby",
    name: "Spark Shrine",
    title: "East echo",
    reward: "gun",
    accent: 0xd4785a,
    hint: "Short, hot bursts. Don't rush the last beat.",
  },
  {
    id: "pearl",
    name: "Tide Shrine",
    title: "South echo",
    reward: "sword",
    accent: 0x7eb4d4,
    hint: "A slow count. Leave space between pulses.",
  },
  {
    id: "cinder",
    name: "Root Shrine",
    title: "West echo",
    reward: "gun",
    accent: 0x3f6b4e,
    hint: "Low drums. Stamp the fire on the last beat.",
  },
];

export function shrineById(id: string): ShrineDef | undefined {
  return SHRINES.find((s) => s.id === id);
}

export type Weapon = {
  kind: WeaponKind;
  tier: 1 | 2 | 3;
  name: string;
  damage: number;
  range: number;
  cooldown: number;
  blade: number;
  glow: number;
  grip: number;
  shrineId: ShrineId;
  themeId: ThemeId;
  style: FireStyle;
  pellets: number;
  spread: number;
  width: number;
  pierce: number;
  recoil: number;
};

const SWORD: Record<1 | 2 | 3, { damage: number; range: number; cooldown: number }> = {
  1: { damage: 1, range: 2.1, cooldown: 0.42 },
  2: { damage: 1, range: 2.4, cooldown: 0.32 },
  3: { damage: 2, range: 2.7, cooldown: 0.24 },
};
const GUN: Record<1 | 2 | 3, { damage: number; range: number; cooldown: number }> = {
  1: { damage: 1, range: 14, cooldown: 0.4 },
  2: { damage: 1, range: 20, cooldown: 0.28 },
  3: { damage: 2, range: 26, cooldown: 0.2 },
};

const THEME_STEEL: Record<ThemeId, { blade: number; glow: number; grip: number; sword: string; gun: string }> = {
  victorian: { blade: 0xd4c4a0, glow: 0xffc07a, grip: 0x5a3a28, sword: "gaslight", gun: "parlor" },
  cyberpunk: { blade: 0x7ee8f2, glow: 0x3ec3d6, grip: 0x12181e, sword: "plasma", gun: "pulse" },
  battlefield: { blade: 0xb8b0a0, glow: 0xe0a05a, grip: 0x3a3428, sword: "trench", gun: "service" },
  hell: { blade: 0xff6a32, glow: 0xff3a12, grip: 0x1a0c08, sword: "ember", gun: "inferno" },
  forest: { blade: 0xc4b070, glow: 0x6db36a, grip: 0x3a2a18, sword: "livingwood", gun: "flint" },
};

const SHRINE_EDGE: Record<ShrineId, { sword: string; gun: string }> = {
  luma: { sword: "Gale", gun: "Beacon" },
  ruby: { sword: "Spark", gun: "Burst" },
  pearl: { sword: "Tide", gun: "Pearl" },
  cinder: { sword: "Root", gun: "Stomp" },
};

export function weaponTier(diamonds: number): 1 | 2 | 3 {
  if (diamonds >= 6) return 3;
  if (diamonds >= 3) return 2;
  return 1;
}

export function makeWeapon(
  kind: WeaponKind,
  diamonds: number,
  themeId: ThemeId = "victorian",
  shrineId: ShrineId = "luma",
): Weapon {
  const tier = weaponTier(diamonds);
  const stats = kind === "sword" ? SWORD[tier] : GUN[tier];
  const steel = THEME_STEEL[themeId];
  const edge = SHRINE_EDGE[shrineId];
  const feel = WEAPON_FEEL[shrineId];
  const tm = THEME_COMBAT[themeId];
  const grade = tier === 3 ? "prism" : tier === 2 ? "fine" : "rough";
  const noun = kind === "sword" ? steel.sword : steel.gun;
  const title = kind === "sword" ? edge.sword : edge.gun;
  return {
    kind,
    tier,
    name: `${title} ${noun} (${grade})`,
    damage: Math.max(1, Math.round(stats.damage * tm.damage)),
    range: stats.range * tm.range * (feel.style === "spread" ? 0.55 : feel.style === "thrust" ? 1.15 : 1),
    cooldown:
      stats.cooldown * tm.cooldown * (feel.style === "burst" ? 1.15 : feel.style === "cleave" ? 1.2 : 0.9),
    blade: steel.blade,
    glow: steel.glow,
    grip: steel.grip,
    shrineId,
    themeId,
    style: feel.style,
    pellets: feel.pellets,
    spread: feel.spread,
    width: feel.width,
    pierce: feel.pierce,
    recoil: feel.recoil,
  };
}

export const BEST_KEY = "glimmer-maze-best";

export function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeBest(seconds: number) {
  try {
    const prev = readBest();
    if (prev == null || seconds < prev) localStorage.setItem(BEST_KEY, String(seconds));
  } catch {
    /* ignore */
  }
}

export function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
