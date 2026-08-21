import { mulberry32 } from "./maze";
import type { ShrineId } from "./content";

export type EchoStep = "w" | "a" | "s" | "d" | "f";

export const ECHO_STEPS: EchoStep[] = ["w", "a", "s", "d", "f"];

export const ECHO_LABEL: Record<EchoStep, string> = {
  w: "W",
  a: "A",
  s: "S",
  d: "D",
  f: "Fire",
};

export function codeToEcho(code: string): EchoStep | null {
  if (code === "KeyW" || code === "ArrowUp") return "w";
  if (code === "KeyA" || code === "ArrowLeft") return "a";
  if (code === "KeyS" || code === "ArrowDown") return "s";
  if (code === "KeyD" || code === "ArrowRight") return "d";
  if (code === "Space" || code === "KeyE" || code === "KeyF") return "f";
  return null;
}

export function makeEchoPattern(seed: number, shrineIndex: number, mutations: number): EchoStep[] {
  const rnd = mulberry32((seed + (shrineIndex + 1) * 9973 + mutations * 131) >>> 0);
  const len = Math.min(7, 3 + shrineIndex + mutations);
  const out: EchoStep[] = [];
  for (let i = 0; i < len; i++) {
    out.push(ECHO_STEPS[Math.floor(rnd() * ECHO_STEPS.length)]!);
  }
  return out;
}

export function shrineIndex(id: ShrineId): number {
  return id === "luma" ? 0 : id === "ruby" ? 1 : id === "pearl" ? 2 : 3;
}
