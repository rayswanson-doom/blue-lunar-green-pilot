import { CONFIG, THEME_SOUND } from "./config";
import type { ThemeId, Weapon } from "./content";
import type { EchoStep } from "./shrine";

export type GameAudio = {
  resume: () => void;
  pickup: () => void;
  thud: () => void;
  success: () => void;
  fail: () => void;
  step: () => void;
  win: () => void;
  shoot: () => void;
  slash: () => void;
  fireWeapon: (w: Weapon) => void;
  hit: () => void;
  wall: () => void;
  echo: (step: EchoStep, themeId: ThemeId) => void;
};

export function createAudio(): GameAudio {
  let ctx: AudioContext | null = null;

  const get = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  };

  const resume = () => {
    const c = get();
    if (c.state === "suspended") void c.resume();
  };

  const master = () => {
    const c = get();
    const g = c.createGain();
    g.gain.value = CONFIG.audio.master;
    g.connect(c.destination);
    return g;
  };

  const tone = (
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.06,
    slide?: number,
  ) => {
    const c = get();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master());
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  const noise = (dur: number, gain = 0.04, crunch = 0) => {
    const c = get();
    const n = c.createBuffer(1, Math.max(1, (c.sampleRate * dur) | 0), c.sampleRate);
    const data = n.getChannelData(0);
    let hold = 0;
    let acc = 0;
    const step = crunch > 0.2 ? Math.floor(8 + crunch * 24) : 1;
    for (let i = 0; i < data.length; i++) {
      if (i % step === 0) hold = Math.random() * 2 - 1;
      acc = acc * 0.7 + hold * 0.3;
      data[i] = acc;
    }
    const src = c.createBufferSource();
    src.buffer = n;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800 - crunch * 900;
    src.connect(filter);
    filter.connect(g);
    g.connect(master());
    src.start();
  };

  const fireWeapon = (w: Weapon) => {
    const th = THEME_SOUND[w.themeId];
    const c = get();
    const t = c.currentTime;
    const out = master();
    const filter = c.createBiquadFilter();
    filter.type = w.kind === "gun" ? "lowpass" : "highpass";
    filter.frequency.value = (w.kind === "gun" ? 1400 : 900) * th.bright;
    if (th.delay > 0.05) {
      const d = c.createDelay();
      d.delayTime.value = th.delay;
      const fb = c.createGain();
      fb.gain.value = 0.18;
      filter.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(out);
    }
    filter.connect(out);

    if (w.style === "cleave") {
      noise(0.1, 0.045 * th.noise, th.crunch);
      tone(220 * th.color, 0.12, "sawtooth", 0.05, 80);
      tone(440 * th.bright, 0.08, "triangle", 0.03, 180);
    } else if (w.style === "thrust") {
      tone(880 * th.bright, 0.06, "triangle", 0.045, 420);
      tone(1320 * th.color, 0.09, "sine", 0.03, 700);
    } else if (w.style === "burst") {
      noise(0.05, 0.05 * th.noise, th.crunch);
      tone(520 * th.color, 0.05, "square", 0.03, 140);
      window.setTimeout(() => {
        noise(0.04, 0.04 * th.noise, th.crunch);
        tone(480 * th.color, 0.04, "square", 0.025, 120);
      }, 55);
      window.setTimeout(() => {
        noise(0.04, 0.035 * th.noise, th.crunch);
        tone(500 * th.color, 0.04, "square", 0.02, 110);
      }, 110);
    } else {
      noise(0.14, 0.07 * th.noise, th.crunch);
      tone(160 * th.color, 0.12, "sawtooth", 0.05, 60);
      tone(90, 0.16, "sine", 0.04, 40);
    }

    if (w.themeId === "hell") tone(70, 0.18, "sine", 0.04, 40);
    if (w.themeId === "cyberpunk") tone(1800 * th.bright, 0.04, "square", 0.015, 600);
    if (w.themeId === "victorian") tone(660, 0.08, "triangle", 0.02);
    if (w.themeId === "forest") tone(310, 0.1, "triangle", 0.025, 200);
    void t;
  };

  return {
    resume,
    pickup: () => {
      tone(740, 0.09, "triangle", 0.05);
      tone(1180, 0.16, "sine", 0.04, 1560);
    },
    thud: () => tone(90, 0.08, "sine", 0.07, 50),
    success: () => {
      tone(523, 0.12, "triangle", 0.05);
      tone(784, 0.18, "sine", 0.045);
      tone(1046, 0.28, "sine", 0.04);
    },
    fail: () => tone(220, 0.16, "sawtooth", 0.03, 110),
    step: () => tone(140 + Math.random() * 20, 0.04, "sine", 0.025),
    win: () => {
      tone(523, 0.18, "triangle", 0.05);
      tone(659, 0.22, "sine", 0.045);
      tone(784, 0.3, "sine", 0.05);
      tone(1046, 0.45, "triangle", 0.04);
    },
    shoot: () => {
      noise(0.08, 0.06);
      tone(420, 0.07, "square", 0.03, 90);
    },
    slash: () => {
      noise(0.06, 0.035);
      tone(280, 0.08, "sawtooth", 0.03, 120);
    },
    fireWeapon,
    hit: () => tone(140, 0.1, "square", 0.05, 60),
    wall: () => {
      noise(0.1, 0.04);
      tone(110, 0.12, "sine", 0.04, 50);
    },
    echo: (step: EchoStep, themeId: ThemeId) => {
      const th = THEME_SOUND[themeId];
      const freq = step === "w" ? 392 : step === "a" ? 330 : step === "s" ? 262 : step === "d" ? 440 : 523;
      if (themeId === "cyberpunk") {
        tone(freq * th.color, 0.07, "square", 0.05, freq * 0.55);
        tone(freq * 2.4, 0.04, "square", 0.018);
      } else if (themeId === "battlefield") {
        noise(0.08, 0.05 * th.noise, th.crunch);
        tone(freq * 0.45 * th.color, 0.12, "sine", 0.045, 55);
      } else if (themeId === "forest") {
        tone(freq * 1.55, 0.09, "sine", 0.035, freq * 2.15);
        tone(freq * 2.2, 0.06, "sine", 0.018, freq * 1.7);
      } else if (themeId === "hell") {
        noise(0.07, 0.04 * th.noise, th.crunch);
        tone(freq * 0.55 * th.color, 0.16, "sawtooth", 0.045, 70);
      } else {
        tone(freq * th.color, step === "f" ? 0.16 : 0.12, "triangle", 0.05);
        tone(freq * 2, 0.08, "sine", 0.016);
      }
    },
  };
}
