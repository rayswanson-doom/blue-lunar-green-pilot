export const APP_NAME = "Glimmer Maze";
export const MAX_HEARTS = 3;
export const STAR_COUNT = 12;

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
};

export const MUSES: MuseDef[] = [
  {
    id: "luma",
    name: "Luma Vale",
    title: "Lantern keeper",
    greeting:
      "Hold up, wanderer. I am Luma Vale, keeper of the east lanterns. Charm me by naming the piece that finishes my look.",
    success: "Sharp eyes. The east wing is yours — try not to get dizzy.",
    fail: "Not that one. A spark fades when the guess is cold.",
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
  },
  {
    id: "ruby",
    name: "Ruby Finch",
    title: "Corridor spark",
    greeting:
      "Ruby Finch. I do not step aside for just anyone. What is my signature flourish?",
    success: "Ha — you do have taste. Go on, then.",
    fail: "Missed it. That guess cost you a spark.",
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
  },
  {
    id: "pearl",
    name: "Pearl Quinn",
    title: "Quiet halls",
    greeting:
      "Pearl Quinn, keeper of the quiet turns. I see the maze more clearly with one special piece. Which?",
    success: "Correct. Clarity suits you. The path opens.",
    fail: "A reasonable guess, but not mine. Careful with your sparks.",
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
  },
  {
    id: "cinder",
    name: "Cinder Hart",
    title: "Trail stomper",
    greeting:
      "Cinder Hart. I stomp these corridors in style. What is my lucky pair?",
    success: "Yes! Those are the ones. Race you to the portal.",
    fail: "Nope. Wrong pair. That stumble cost a spark.",
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
  },
];

export function museById(id: string): MuseDef | undefined {
  return MUSES.find((m) => m.id === id);
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
