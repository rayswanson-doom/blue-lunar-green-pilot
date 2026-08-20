export type GameAudio = {
  resume: () => void;
  pickup: () => void;
  thud: () => void;
  success: () => void;
  fail: () => void;
  step: () => void;
  win: () => void;
  charm: () => void;
  shoot: () => void;
  slash: () => void;
  hit: () => void;
  wall: () => void;
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
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  const noise = (dur: number, gain = 0.04) => {
    const c = get();
    const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = n;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(g);
    g.connect(c.destination);
    src.start();
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
    fail: () => {
      tone(220, 0.16, "sawtooth", 0.03, 110);
    },
    step: () => tone(140 + Math.random() * 20, 0.04, "sine", 0.025),
    win: () => {
      tone(523, 0.18, "triangle", 0.05);
      tone(659, 0.22, "sine", 0.045);
      tone(784, 0.3, "sine", 0.05);
      tone(1046, 0.45, "triangle", 0.04);
    },
    charm: () => {
      tone(660, 0.12, "sine", 0.04);
      tone(880, 0.2, "triangle", 0.035);
    },
    shoot: () => {
      noise(0.08, 0.06);
      tone(420, 0.07, "square", 0.03, 90);
    },
    slash: () => {
      noise(0.06, 0.035);
      tone(280, 0.08, "sawtooth", 0.03, 120);
    },
    hit: () => tone(140, 0.1, "square", 0.05, 60),
    wall: () => {
      noise(0.1, 0.04);
      tone(110, 0.12, "sine", 0.04, 50);
    },
  };
}
