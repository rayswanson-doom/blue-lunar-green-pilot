import type { MuseId } from "./content";

export type VoiceLine = "greeting" | "success" | "fail" | "hint";

const TONE: Record<MuseId, { pitch: number; rate: number; prefer: string[] }> = {
  luma: {
    pitch: 1.38,
    rate: 0.94,
    prefer: ["samantha", "karen", "google us english", "zira", "female"],
  },
  ruby: {
    pitch: 1.16,
    rate: 1.14,
    prefer: ["zira", "samantha", "google us english", "karen", "female"],
  },
  pearl: {
    pitch: 0.86,
    rate: 0.84,
    prefer: ["moira", "tessa", "google uk english female", "serena", "fiona", "victoria", "female"],
  },
  cinder: {
    pitch: 0.68,
    rate: 1.06,
    prefer: ["tessa", "moira", "veena", "google uk english female", "female"],
  },
};

const MALE = /male|david|daniel|alex|fred|tom|jorge|diego|mark|george|rishi|aaron|arthur|gordon|nicky|nathan/i;

function femaleVoices(): SpeechSynthesisVoice[] {
  const all = window.speechSynthesis.getVoices();
  const females = all.filter((v) => {
    const n = `${v.name} ${v.voiceURI}`.toLowerCase();
    if (MALE.test(n) && !/female/.test(n)) return false;
    return /female|woman|samantha|karen|zira|moira|tessa|serena|fiona|victoria|veena|hazel|susan|linda/.test(n) || v.lang.startsWith("en");
  });
  const strict = females.filter((v) => {
    const n = `${v.name} ${v.voiceURI}`.toLowerCase();
    return /female|woman|samantha|karen|zira|moira|tessa|serena|fiona|victoria|veena|hazel/.test(n);
  });
  return (strict.length ? strict : females).filter((v) => !MALE.test(v.name));
}

function pickVoice(id: MuseId): SpeechSynthesisVoice | null {
  const list = femaleVoices();
  if (!list.length) return null;
  const prefer = TONE[id].prefer;
  for (const p of prefer) {
    const hit = list.find((v) => v.name.toLowerCase().includes(p) || v.voiceURI.toLowerCase().includes(p));
    if (hit) return hit;
  }
  const idx = id === "luma" ? 0 : id === "ruby" ? 1 : id === "pearl" ? 2 : 3;
  return list[idx % list.length] ?? list[0] ?? null;
}

export function speakPrincess(id: MuseId, text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const tone = TONE[id];
  const u = new SpeechSynthesisUtterance(text);
  u.lang = id === "pearl" || id === "cinder" ? "en-GB" : "en-US";
  u.pitch = tone.pitch;
  u.rate = tone.rate;
  const voice = pickVoice(id);
  if (voice) u.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function hushPrincess() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function warmVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}
