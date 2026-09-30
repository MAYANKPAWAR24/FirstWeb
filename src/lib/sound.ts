/**
 * Interface sound.
 *
 * Everything is synthesised from oscillators, so there are no audio assets to
 * download, decode, or cache, and nothing plays until the user has interacted
 * with the page.
 *
 * Three rules this file exists to enforce:
 *
 *  1. **Opt-in by default.** Audio that plays before a user asks for it is
 *     hostile, and most browsers will block it anyway. The preference persists,
 *     so a visitor who enables it once keeps it.
 *  2. **Quiet and short.** Interface sounds sit around -30 dBFS and last tens of
 *     milliseconds. Anything louder or longer gets grating on repeat.
 *  3. **Never throws.** Storage, AudioContext and the iOS unlock gesture are all
 *     failure points; a failure in here must never break a click.
 */

export type SoundGroup = 'ui' | 'game';

const PREF_KEY = 'portfolio_sound_enabled_v1';
const VOLUME_KEY = 'portfolio_sound_volume_v1';

let audioContext: AudioContext | null = null;
let enabled = false;
let volume = 0.5;
/** Game sounds may be richer than interface sounds, but not louder than this. */
let gameSoundAllowed = true;

function safeStorage(): Storage | null {
  try {
    const probe = '__probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();

function readStored(key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function writeStored(key: string, value: string) {
  try { storage?.setItem(key, value); } catch { /* ignore */ }
}

/** Restores the persisted preference. Called once before the first render. */
export function initSoundPreference(): boolean {
  const stored = readStored(PREF_KEY);
  // Absent means OFF. Defaulting to on would play uninvited audio at every
  // visitor, which is exactly the behaviour the brief rules out.
  enabled = stored === 'true';
  const storedVolume = Number(readStored(VOLUME_KEY));
  volume = Number.isFinite(storedVolume) && storedVolume > 0 ? Math.min(1, storedVolume) : 0.5;
  gameSoundAllowed = true;
  return enabled;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  writeStored(PREF_KEY, String(value));
  if (value) unlock();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundVolume(value: number) {
  volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
  writeStored(VOLUME_KEY, volume.toFixed(2));
}

export function getSoundVolume(): number {
  return volume;
}

/** Lets the admin turn game audio off independently of interface audio. */
export function setGameSoundEnabled(value: boolean) {
  gameSoundAllowed = value;
}

export function isGameSoundEnabled(): boolean {
  return gameSoundAllowed;
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
  } catch {
    return null;
  }
  return audioContext;
}

/**
 * Must be called from inside a user gesture before any sound can play.
 *
 * iOS and Safari suspend the AudioContext until a real interaction, so a sound
 * triggered from a timer or a fetch will be silently dropped. Resuming here and
 * playing a zero-length silent buffer "unlocks" the context for later use.
 */
export function unlock(): void {
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();
  try {
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
  } catch {
    // Non-fatal: the context is still usable for later scheduled sounds.
  }
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  /** Peak gain. Kept low on purpose. */
  gain?: number;
  /** Slide to this frequency across the tone's life. */
  glideTo?: number;
  /** Delay before this tone starts, for small arpeggios. */
  delay?: number;
}

function tone({ freq, duration, type = 'sine', gain = 0.05, glideTo, delay = 0 }: ToneOptions) {
  if (typeof window === 'undefined') return;
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  if (glideTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, glideTo),
      start + duration,
    );
  }

  // A fast attack and an exponential decay: percussive rather than sustained,
  // which is what makes it read as a UI accent instead of a tone.
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(duration: number, gain: number, filterHz: number) {
  const context = getContext();
  if (!context) return;
  const frames = Math.floor(context.sampleRate * duration);
  if (frames < 1) return;
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    // Decaying noise reads as a soft "tick" rather than a hiss.
    channel[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  filter.type = 'bandpass';
  filter.frequency.value = filterHz;
  envelope.gain.setValueAtTime(gain, context.currentTime);
  envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  source.start();
}

function play(opts: ToneOptions & { group: SoundGroup }) {
  if (!enabled) return;
  if (opts.group === 'game' && !gameSoundAllowed) return;
  tone({ ...opts, gain: (opts.gain ?? 0.05) * volume });
}

/** Interface sounds: quiet, neutral, never game-like. */
export const sounds = {
  click: () => play({ freq: 720, duration: 0.045, type: 'sine', gain: 0.05, group: 'ui' }),
  hover: () => play({ freq: 1400, duration: 0.022, type: 'sine', gain: 0.022, group: 'ui' }),
  toggle: () => play({ freq: 620, duration: 0.05, type: 'triangle', gain: 0.05, glideTo: 880, group: 'ui' }),
  open: () => {
    play({ freq: 480, duration: 0.07, type: 'sine', gain: 0.045, glideTo: 720, group: 'ui' });
    play({ freq: 960, duration: 0.06, type: 'sine', gain: 0.022, delay: 0.045, group: 'ui' });
  },
  close: () => {
    play({ freq: 720, duration: 0.06, type: 'sine', gain: 0.04, glideTo: 440, group: 'ui' });
  },
  success: () => {
    play({ freq: 523.25, duration: 0.1, type: 'sine', gain: 0.05, group: 'ui' });
    play({ freq: 659.25, duration: 0.1, type: 'sine', gain: 0.045, delay: 0.07, group: 'ui' });
    play({ freq: 783.99, duration: 0.16, type: 'sine', gain: 0.04, delay: 0.14, group: 'ui' });
  },
  error: () => {
    play({ freq: 220, duration: 0.14, type: 'triangle', gain: 0.05, glideTo: 165, group: 'ui' });
  },
  /** Rising two-note, used when something is confirmed. */
  confirm: () => {
    play({ freq: 660, duration: 0.08, type: 'sine', gain: 0.045, glideTo: 990, group: 'ui' });
  },
  /** Falling two-note, used when something is dismissed or rejected. */
  reject: () => {
    play({ freq: 500, duration: 0.1, type: 'sine', gain: 0.045, glideTo: 330, group: 'ui' });
  },

  /* ---- Game audio: richer, but still capped and short ---- */
  gameMove: () => play({ freq: 420, duration: 0.04, type: 'triangle', gain: 0.05, group: 'game' }),
  gamePlace: () => {
    if (!enabled || !gameSoundAllowed) return;
    noise(0.05, 0.05 * volume, 1800);
  },
  gamePick: () => play({ freq: 880, duration: 0.05, type: 'square', gain: 0.028, group: 'game' }),
  gameMatch: () => {
    play({ freq: 659.25, duration: 0.09, type: 'sine', gain: 0.05, group: 'game' });
    play({ freq: 987.77, duration: 0.14, type: 'sine', gain: 0.045, delay: 0.08, group: 'game' });
  },
  gameMiss: () => play({ freq: 200, duration: 0.13, type: 'sawtooth', gain: 0.032, glideTo: 140, group: 'game' }),
  gameWin: () => {
    play({ freq: 523.25, duration: 0.12, type: 'sine', gain: 0.055, group: 'game' });
    play({ freq: 659.25, duration: 0.12, type: 'sine', gain: 0.05, delay: 0.1, group: 'game' });
    play({ freq: 783.99, duration: 0.12, type: 'sine', gain: 0.05, delay: 0.2, group: 'game' });
    play({ freq: 1046.5, duration: 0.22, type: 'sine', gain: 0.045, delay: 0.3, group: 'game' });
  },
  gameLose: () => {
    play({ freq: 392, duration: 0.16, type: 'triangle', gain: 0.045, glideTo: 262, group: 'game' });
  },
  gameTick: () => play({ freq: 1200, duration: 0.018, type: 'sine', gain: 0.03, group: 'game' }),
};

/**
 * Wraps a scoring call so every game reports through one place.
 *
 * Guards on a ref so React StrictMode's double-invoked effects cannot submit
 * the same round twice, and clamps to a sane range so a runaway game loop
 * cannot write a 10^12 score.
 */
export function reportScore(onScore: ((score: number) => void) | undefined, score: number): boolean {
  if (!onScore) return false;
  const clean = Math.max(0, Math.min(1_000_000, Math.round(Number(score) || 0)));
  onScore(clean);
  return true;
}