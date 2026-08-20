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
    fog: 0x0b1218,
    fogNear: 8,
    fogFar: 34,
    hemiSky: 0x4aa7c8,
    hemiGround: 0x1a2430,
    sun: 0x7fd0e8,
    sunInt: 0.55,
    fill: 0xe07a4a,
    bg: 0x070b10,
    wallA: 0x1c2733,
    wallB: 0x243140,
    wallC: 0x162028,
    cap: 0x3a8fa3,
    floorA: 0x151c24,
    floorB: 0x1b242e,
    ground: 0x0e141a,
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
    fog: 0x2a0e0a,
    fogNear: 7,
    fogFar: 30,
    hemiSky: 0xff6a3a,
    hemiGround: 0x1a0806,
    sun: 0xff7a40,
    sunInt: 0.9,
    fill: 0x6a2018,
    bg: 0x140806,
    wallA: 0x3a1c16,
    wallB: 0x2e1612,
    wallC: 0x24110e,
    cap: 0x6a2418,
    floorA: 0x2a1410,
    floorB: 0x1e0e0c,
    ground: 0x120808,
    accent: 0xe25a32,
    lantern: 0xff5a28,
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
    greeting:
      "Hold up, hunter. I'm Luma. Name the piece that finishes my look, and I'll arm you.",
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
};

const SWORD: Record<1 | 2 | 3, Weapon> = {
  1: { kind: "sword", tier: 1, name: "Rust shiv", damage: 1, range: 1.85, cooldown: 0.55 },
  2: { kind: "sword", tier: 2, name: "Steel saber", damage: 1, range: 2.15, cooldown: 0.4 },
  3: { kind: "sword", tier: 3, name: "Diamond edge", damage: 2, range: 2.4, cooldown: 0.32 },
};
const GUN: Record<1 | 2 | 3, Weapon> = {
  1: { kind: "gun", tier: 1, name: "Peashooter", damage: 1, range: 16, cooldown: 0.48 },
  2: { kind: "gun", tier: 2, name: "Corridor pistol", damage: 1, range: 22, cooldown: 0.32 },
  3: { kind: "gun", tier: 3, name: "Prism rifle", damage: 2, range: 28, cooldown: 0.22 },
};

export function weaponTier(diamonds: number): 1 | 2 | 3 {
  if (diamonds >= 6) return 3;
  if (diamonds >= 3) return 2;
  return 1;
}

export function makeWeapon(kind: WeaponKind, diamonds: number): Weapon {
  const tier = weaponTier(diamonds);
  return kind === "sword" ? SWORD[tier] : GUN[tier];
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

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function makeRoomCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
