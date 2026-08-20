/** Tune movement, combat, look, and audio in one place. */
export const CONFIG = {
  move: {
    walk: 8.6,
    sprint: 11.2,
    accel: 58,
    damp: 22,
    look: 0.00285,
    bob: 1.8,
    stepEvery: 0.42,
  },
  combat: {
    playerRadius: 0.36,
    interact: 1.9,
    autoCharm: 1.55,
  },
  audio: {
    master: 0.7,
  },
} as const;

export type FireStyle = "cleave" | "thrust" | "burst" | "spread";

export type WeaponFeel = {
  style: FireStyle;
  pellets: number;
  spread: number;
  width: number;
  pierce: number;
  recoil: number;
};

export const WEAPON_FEEL: Record<"luma" | "ruby" | "pearl" | "cinder", WeaponFeel> = {
  luma: { style: "cleave", pellets: 1, spread: 0, width: 1.05, pierce: 0, recoil: 0.18 },
  pearl: { style: "thrust", pellets: 1, spread: 0, width: 0.28, pierce: 1, recoil: 0.1 },
  ruby: { style: "burst", pellets: 3, spread: 0.07, width: 0.45, pierce: 0, recoil: 0.08 },
  cinder: { style: "spread", pellets: 5, spread: 0.22, width: 0.7, pierce: 0, recoil: 0.2 },
};

export const THEME_COMBAT: Record<
  "victorian" | "cyberpunk" | "battlefield" | "hell" | "forest",
  { cooldown: number; range: number; damage: number }
> = {
  victorian: { cooldown: 1, range: 1, damage: 1 },
  cyberpunk: { cooldown: 0.78, range: 1.05, damage: 1 },
  battlefield: { cooldown: 1.05, range: 0.95, damage: 1.2 },
  hell: { cooldown: 1.12, range: 0.9, damage: 1.35 },
  forest: { cooldown: 1, range: 1.18, damage: 1 },
};

export const THEME_SOUND: Record<
  "victorian" | "cyberpunk" | "battlefield" | "hell" | "forest",
  { color: number; noise: number; crunch: number; delay: number; bright: number }
> = {
  victorian: { color: 1.0, noise: 0.55, crunch: 0.1, delay: 0.04, bright: 1.1 },
  cyberpunk: { color: 1.35, noise: 0.8, crunch: 0.55, delay: 0.14, bright: 1.4 },
  battlefield: { color: 0.85, noise: 1.2, crunch: 0.25, delay: 0.02, bright: 0.8 },
  hell: { color: 0.65, noise: 1.0, crunch: 0.4, delay: 0.08, bright: 0.7 },
  forest: { color: 0.9, noise: 0.45, crunch: 0.05, delay: 0.06, bright: 0.95 },
};
