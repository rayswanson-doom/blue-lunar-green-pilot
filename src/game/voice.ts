import type { MuseId } from "./content";

export type VoiceLine = "greeting" | "success" | "fail" | "hint";

const LINES: Record<MuseId, Record<VoiceLine, string>> = {
  luma: {
    greeting: "Hold up, hunter. I'm Luma. Name the piece that finishes my look, and I'll arm you.",
    success: "Oh, you saw it! Take this. Don't drop it in the dark.",
    fail: "Mmm, not that one. A spark just winked out.",
    hint: "Look up. Something small and sun-shaped sits in my hair.",
  },
  ruby: {
    greeting: "Ruby Finch. I don't step aside for just anyone. What's my flourish?",
    success: "Ha. Cute eyes. Here's a gun. Don't miss like you almost did.",
    fail: "Nope. That guess cost you a spark, darling.",
    hint: "A wide crimson bow. It's not subtle.",
  },
  pearl: {
    greeting: "Pearl Quinn. I see the maze better with one special piece. Which?",
    success: "Correct. Clarity suits you. Don't squint.",
    fail: "A reasonable guess. Not mine. Careful.",
    hint: "Round frames. Pale as a pearl. On my nose.",
  },
  cinder: {
    greeting: "Cinder Hart. I stomp these halls. What's my lucky pair?",
    success: "Yes! Those boots. Race you — try to keep up.",
    fail: "Wrong pair. That stumble cost a spark.",
    hint: "Huge boots. Little stars painted on. You can't miss them.",
  },
};

const TONE: Record<MuseId, { pitch: number; rate: number }> = {
  luma: { pitch: 1.12, rate: 1.02 },
  ruby: { pitch: 1.08, rate: 1.06 },
  pearl: { pitch: 1.04, rate: 0.96 },
  cinder: { pitch: 0.98, rate: 1.04 },
};

export function princessLine(id: MuseId, kind: VoiceLine) {
  return LINES[id][kind];
}

export function speakPrincess(id: MuseId, kind: VoiceLine) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const text = LINES[id][kind];
  const tone = TONE[id];
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.pitch = tone.pitch;
  u.rate = tone.rate;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /en-US/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ??
    voices.find((v) => /en/i.test(v.lang));
  if (pick) u.voice = pick;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function hushPrincess() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
