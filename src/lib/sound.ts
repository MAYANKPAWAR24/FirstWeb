let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

let enabled = true;

export function setSoundEnabled(val: boolean) {
  enabled = val;
}

export function isSoundEnabled() {
  return enabled;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number) {
  if (!enabled) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export const sounds = {
  click: () => tone(880, 0.05, 'sine', 0.04),
  hover: () => tone(1200, 0.03, 'sine', 0.02),
  open: () => {
    tone(523, 0.08, 'sine', 0.03);
    setTimeout(() => tone(784, 0.08, 'sine', 0.03), 50);
  },
  close: () => {
    tone(784, 0.06, 'sine', 0.03);
    setTimeout(() => tone(523, 0.06, 'sine', 0.03), 40);
  },
  success: () => {
    tone(523, 0.1, 'sine', 0.04);
    setTimeout(() => tone(659, 0.1, 'sine', 0.04), 80);
    setTimeout(() => tone(784, 0.15, 'sine', 0.04), 160);
  },
  error: () => tone(200, 0.2, 'sawtooth', 0.03),
  toggle: () => tone(660, 0.04, 'triangle', 0.03),
};
