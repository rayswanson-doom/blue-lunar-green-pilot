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
    fog: 0x152028,
    fogNear: 10,
    fogFar: 40,
    hemiSky: 0x7ec8e0,
    hemiGround: 0x243040,
    sun: 0x9ee0f2,
    sunInt: 0.85,
    fill: 0xe08a5a,
    bg: 0x101820,
    wallA: 0x2a3a4a,
    wallB: 0x324656,
    wallC: 0x223038,
    cap: 0x4ab8c8,
    floorA: 0x1c2834,
    floorB: 0x243038,
    ground: 0x121a22,
    accent: 0x3ec3d6,
    lantern: 0x5ce1f2,
    sky: "/game/sky-cyberpunk.jpg",
  },
  {
    id: "battlefield",
    label: "Battlefield",
    hint: "Mud, brick, and smoke at dusk",
    fog: 0x6b6356,
    fogNear: 10,
    fogFar: 38,
    hemiSky: 0xe0c49a,
    hemiGround: 0x4a463c,
    sun: 0xf0c48a,
    sunInt: 0.85,
    fill: 0x8a9094,
    bg: 0x5c564c,
    wallA: 0x8a6e55,
    wallB: 0x7a5f48,
    wallC: 0x6e5644,
    cap: 0x4d453c,
    floorA: 0x6b5a45,
    floorB: 0x5e4e3c,
    ground: 0x4a4034,
    accent: 0xb57a3a,
    lantern: 0xe0a05a,
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
    fog: 0x8aa67a,
    fogNear: 10,
    fogFar: 36,
    hemiSky: 0xd8e8c8,
    hemiGround: 0x3a4a30,
    sun: 0xf0e6b8,
    sunInt: 1.05,
    fill: 0x7a9a68,
    bg: 0x8aa67a,
    wallA: 0x5c4632,
    wallB: 0x4e3c2c,
    wallC: 0x6a523c,
    cap: 0x3d6b3a,
    floorA: 0x4a5c38,
    floorB: 0x3e4e30,
    ground: 0x2f3a24,
    accent: 0x6db36a,
    lantern: 0xe8d48a,
    sky: "/game/sky-forest.jpg",
  },
];

export function themeById(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export type AccessoryId =
  | "crown"
  | "ribbon"
  | "spectacles"
  | "boots"
  | "umbrella"
  | "watch"
  | "raincoat"
  | "fan"
  | "gloves"
  | "teacup";

export type MuseId = "luma" | "ruby" | "pearl" | "cinder";

export type MuseDef = {
  id: MuseId;
  name: string;
  title: string;
  greeting: string;
  success: string;
  fail: string;
  hint: string;
  correct: AccessoryId;
  options: { id: AccessoryId; label: string }[];
  portrait: string;
  video: string;
  suit: number;
  accent: number;
  hair: number;
  skin: number;
  reward: WeaponKind;
};

export const MUSES: MuseDef[] = [
  {
    id: "luma",
    name: "Princess Luma Vale",
    title: "Lantern keeper",
    greeting: "Hold up, hunter. I'm Luma. Name the piece that finishes my look, and I'll arm you.",
    success: "Oh, you saw it! Take this. Don't drop it in the dark.",
    fail: "Mmm, not that one. A spark just winked out.",
    hint: "Look up — something small and sun-shaped sits in her hair.",
    correct: "crown",
    options: [
      { id: "crown", label: "Sunburst crown" },
      { id: "umbrella", label: "Cloud umbrella" },
      { id: "gloves", label: "Garden gloves" },
    ],
    portrait: "/game/luma.jpg",
    video: "/game/luma.mp4",
    suit: 0xe8d7c0,
    accent: 0x6db3a8,
    hair: 0xe8c15a,
    skin: 0xf0c4a8,
    reward: "sword",
  },
  {
    id: "ruby",
    name: "Princess Ruby Finch",
    title: "Corridor spark",
    greeting: "Ruby Finch. I don't step aside for just anyone. What's my flourish?",
    success: "Ha. Cute eyes. Here's a gun. Don't miss like you almost did.",
    fail: "Nope. That guess cost you a spark, darling.",
    hint: "A wide crimson bow is tied through her copper hair.",
    correct: "ribbon",
    options: [
      { id: "watch", label: "Pocket watch" },
      { id: "ribbon", label: "Crimson ribbon" },
      { id: "teacup", label: "Travel teacup" },
    ],
    portrait: "/game/ruby.jpg",
    video: "/game/ruby.mp4",
    suit: 0xd4785a,
    accent: 0xf2e2cf,
    hair: 0xb8432a,
    skin: 0xebb59a,
    reward: "gun",
  },
  {
    id: "pearl",
    name: "Princess Pearl Quinn",
    title: "Quiet halls",
    greeting: "Pearl Quinn. I see the maze better with one special piece. Which?",
    success: "Correct. Clarity suits you. Don't squint.",
    fail: "A reasonable guess. Not mine. Careful.",
    hint: "Round frames rest on her nose — pale as a pearl.",
    correct: "spectacles",
    options: [
      { id: "raincoat", label: "Sky raincoat" },
      { id: "fan", label: "Paper fan" },
      { id: "spectacles", label: "Pearl spectacles" },
    ],
    portrait: "/game/pearl.jpg",
    video: "/game/pearl.mp4",
    suit: 0x7eb4d4,
    accent: 0xf7f4ee,
    hair: 0xddd6c8,
    skin: 0xf3d0b8,
    reward: "sword",
  },
  {
    id: "cinder",
    name: "Princess Cinder Hart",
    title: "Trail stomper",
    greeting: "Cinder Hart. I stomp these halls. What's my lucky pair?",
    success: "Yes! Those boots. Race you — try to keep up.",
    fail: "Wrong pair. That stumble cost a spark.",
    hint: "Her boots are huge — and painted with little stars.",
    correct: "boots",
    options: [
      { id: "boots", label: "Star boots" },
      { id: "fan", label: "Paper fan" },
      { id: "watch", label: "Pocket watch" },
    ],
    portrait: "/game/cinder.jpg",
    video: "/game/cinder.mp4",
    suit: 0x3f6b4e,
    accent: 0xd4a24a,
    hair: 0x8a3a22,
    skin: 0xe2b394,
    reward: "gun",
  },
];

export function musePortrait(id: MuseId, theme: ThemeId) {
  return `/game/princess/${id}-${theme}.jpg`;
}

export function museById(id: string): MuseDef | undefined {
  return MUSES.find((m) => m.id === id);
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
  museId: MuseId;
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

const MUSE_EDGE: Record<MuseId, { sword: string; gun: string }> = {
  luma: { sword: "Lantern", gun: "Beacon" },
  ruby: { sword: "Ribbon", gun: "Spark" },
  pearl: { sword: "Quiet", gun: "Pearl" },
  cinder: { sword: "Trail", gun: "Stomp" },
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
  museId: MuseId = "luma",
): Weapon {
  const tier = weaponTier(diamonds);
  const stats = kind === "sword" ? SWORD[tier] : GUN[tier];
  const steel = THEME_STEEL[themeId];
  const muse = MUSE_EDGE[museId];
  const feel = WEAPON_FEEL[museId];
  const tm = THEME_COMBAT[themeId];
  const grade = tier === 3 ? "prism" : tier === 2 ? "fine" : "rough";
  const noun = kind === "sword" ? steel.sword : steel.gun;
  const title = kind === "sword" ? muse.sword : muse.gun;
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
    museId,
    themeId,
    style: feel.style,
    pellets: feel.pellets,
    spread: feel.spread,
    width: feel.width,
    pierce: feel.pierce,
    recoil: feel.recoil,
  };
}

export function musePalette(def: MuseDef, theme: ThemeId) {
  const hair = def.id === "luma" ? 0xb8894a : def.id === "ruby" ? 0xb8432a : def.id === "pearl" ? 0x1a1410 : 0xc4a05a;
  const skin = def.id === "pearl" ? 0xc48a6a : def.id === "ruby" ? 0xe0a888 : 0xe8c4a8;
  const suits: Record<ThemeId, number> = {
    victorian: def.suit,
    cyberpunk: def.id === "luma" ? 0x1a3a48 : def.id === "ruby" ? 0x6a2030 : def.id === "pearl" ? 0xd8e4ea : 0x3a4a32,
    battlefield: def.id === "luma" ? 0xc4b08a : def.id === "ruby" ? 0x8a4a38 : def.id === "pearl" ? 0xc8c0b0 : 0x5a6a48,
    hell: def.id === "luma" ? 0x4a2018 : def.id === "ruby" ? 0x6a1818 : def.id === "pearl" ? 0xd8d0c4 : 0x3a2418,
    forest: def.id === "luma" ? 0x4a6a3a : def.id === "ruby" ? 0x8a3a28 : def.id === "pearl" ? 0x8aa090 : 0x3d6b3a,
  };
  return { hair, skin, suit: suits[theme], accent: def.accent };
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
