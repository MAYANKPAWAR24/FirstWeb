import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Target } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Phase = 'idle' | 'running' | 'done';
type Verdict = 'perfect' | 'early' | 'late';

interface Tally { hits: number; streak: number; best: number; attempts: number }
interface RoundSpec { start: number; duration: number; band: number; animate: boolean }
interface Run { phase: Phase; deadline: number; round: RoundSpec | null }

/** One run is 30 seconds of rings, whatever the player does. */
const RUN_MS = 30_000;
/** The scale a strike must land on. Judgement and the drawn mark share this number, so the target cannot drift from the test. */
const STRIKE = 0.72;
const BAND_START = 0.11;
const BAND_FLOOR = 0.06;
const BAND_DECAY = 0.0028;
const DURATION_START = 1_500;
const DURATION_FLOOR = 700;
const DURATION_DECAY = 46;
/** The ring leaves from here rather than zero, so it is always on screen. */
const RING_MIN = 0.16;
const HOLD_MS = 380;
const ZERO: Tally = { hits: 0, streak: 0, best: 0, attempts: 0 };

/** A verdict lands as a word, a border shape and a border colour at once. Written out in full: a colour assembled from a variable is invisible to Tailwind's scanner. */
const TONES: Record<Verdict, string> = {
  perfect: 'border-solid border-[var(--jade)]',
  early: 'border-dashed border-[var(--accent)]',
  late: 'border-dotted border-[var(--ember)]',
};

function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    && document.documentElement.dataset.motion !== 'off';
}

/** Ring scale as a composited transform: promoted, and parents nothing. */
function scaled(value: number): string {
  return `translate3d(0,0,0) scale(${value.toFixed(4)})`;
}

export default function Pulse({ onScore }: GameProps) {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [tally, setTally] = useState<Tally>(ZERO);
  const [left, setLeft] = useState(RUN_MS);
  const [recoil, setRecoil] = useState(0);
  const [burst, setBurst] = useState<{ id: number; motion: boolean } | null>(null);

  const ringRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run>({ phase: 'idle', deadline: 0, round: null });
  const tallyRef = useRef<Tally>(ZERO);
  const barAt = useRef(0);
  const burstId = useRef(0);
  const scored = useRef(false);
  const holdTimer = useRef<number>();
  const shakeTimer = useRef<number>();

  const setPhase = useCallback((next: Phase) => {
    runRef.current.phase = next;
    setPhaseState(next);
  }, []);

  /** Difficulty is a function of the perfect count alone, so a clean run ramps
   *  and a sloppy one does not. `arm` also clears the last verdict. */
  const arm = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    const run = tallyRef.current;
    const spec: RoundSpec = {
      start: performance.now(),
      duration: Math.max(DURATION_FLOOR, DURATION_START - run.hits * DURATION_DECAY),
      band: Math.max(BAND_FLOOR, BAND_START - run.hits * BAND_DECAY),
      animate: motionAllowed(),
    };
    runRef.current.round = spec;
    // Reduced motion jumps to the end state and leans on the border shape, the
    // border colour and the judgement text to convey the phase instead.
    if (ringRef.current) ringRef.current.style.transform = scaled(spec.animate ? RING_MIN : 1);
    setVerdict(null);
    setRecoil(0);
    setBurst(null);
    sounds.gameTick();
  }, []);

  const resolve = useCallback((kind: Verdict) => {
    const round = runRef.current.round;
    if (runRef.current.phase !== 'running' || !round) return;
    runRef.current.round = null;
    const run = tallyRef.current;
    const streak = kind === 'perfect' ? run.streak + 1 : 0;
    tallyRef.current = {
      hits: run.hits + (kind === 'perfect' ? 1 : 0),
      streak,
      best: Math.max(run.best, streak),
      attempts: run.attempts + 1,
    };
    setTally(tallyRef.current);
    setVerdict(kind);
    if (kind === 'perfect') {
      sounds.gameMatch();
      burstId.current += 1;
      setBurst({ id: burstId.current, motion: round.animate });
    } else {
      sounds.gameMiss();
      // A two-step jolt rather than a keyframe: it needs no stylesheet, and a global reduced-motion rule collapses it cleanly.
      setRecoil(1);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setRecoil(2), 70);
    }
    holdTimer.current = window.setTimeout(arm, HOLD_MS);
  }, [arm]);

  const finish = useCallback(() => {
    if (runRef.current.phase !== 'running') return;
    window.clearTimeout(holdTimer.current);
    window.clearTimeout(shakeTimer.current);
    runRef.current.round = null;
    setRecoil(0);
    setBurst(null);
    setLeft(0);
    setPhase('done');
    const run = tallyRef.current;
    if (run.hits > 0) sounds.gameWin(); else sounds.gameLose();
    // Ref-guarded: StrictMode's double effects must not report one run twice.
    if (scored.current) return;
    scored.current = true;
    const accuracy = run.attempts > 0 ? run.hits / run.attempts : 0;
    onScore?.(run.hits * 100 + run.best * 40 + Math.round(accuracy * 300));
  }, [onScore, setPhase]);

  const start = useCallback(() => {
    if (runRef.current.phase === 'running') return;
    window.clearTimeout(holdTimer.current);
    window.clearTimeout(shakeTimer.current);
    tallyRef.current = ZERO;
    setTally(ZERO);
    scored.current = false;
    setLeft(RUN_MS);
    runRef.current.deadline = performance.now() + RUN_MS;
    setPhase('running');
    sounds.gameMove();
    arm();
  }, [arm, setPhase]);

  const strike = useCallback(() => {
    if (runRef.current.phase !== 'running') { start(); return; }
    const round = runRef.current.round;
    if (!round) return;
    const delta = RING_MIN + (1 - RING_MIN) * ((performance.now() - round.start) / round.duration) - STRIKE;
    resolve(Math.abs(delta) <= round.band ? 'perfect' : delta < 0 ? 'early' : 'late');
  }, [resolve, start]);

  // One loop for the whole session. Progress is read from the round's start timestamp, never accumulated, so a dropped frame or a throttled tab cannot drift the ring. `transform` is the only property written per frame.
  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      const run = runRef.current;
      if (run.phase === 'running') {
        const round = run.round;
        if (round) {
          const progress = (now - round.start) / round.duration;
          if (round.animate && ringRef.current) {
            ringRef.current.style.transform = scaled(RING_MIN + (1 - RING_MIN) * progress);
          }
          // The ring has travelled the whole track untouched: a late strike by definition, so a passive run still scores honestly.
          if (progress >= 1) resolve('late');
        }
        if (now >= run.deadline) finish();
        else if (now - barAt.current >= 100) { barAt.current = now; setLeft(run.deadline - now); }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [finish, resolve]);

  useEffect(() => () => {
    window.clearTimeout(holdTimer.current);
    window.clearTimeout(shakeTimer.current);
  }, []);

  const running = phase === 'running';
  const seconds = Math.max(0, Math.ceil(left / 1000));
  const accuracy = tally.attempts > 0 ? Math.round((tally.hits / tally.attempts) * 100) : 0;
  // Ties to the perfect count, so a hit visibly tightens the zone the next ring is judged against.
  const band = Math.max(BAND_FLOOR, BAND_START - tally.hits * BAND_DECAY);
  const word = verdict === 'perfect' ? 'Perfect!' : verdict === 'early' ? 'Too early' : 'Too late';
  const shake = recoil === 1 ? -7 : recoil === 2 ? 7 : 0;
  const centre = phase === 'done' ? 'Time' : verdict ? word : running ? 'Strike' : 'Pulse';
  const sub = verdict ? `streak ${tally.streak}` : phase === 'done' ? `${tally.hits} perfect` : running ? `${seconds}s left` : 'tap to start';
  const status = phase === 'done'
    ? `Run over. ${tally.hits} perfect of ${tally.attempts} rings, best streak ${tally.best}, ${accuracy} percent accuracy.`
    : verdict ? `${word}. ${tally.hits} perfect, streak ${tally.streak}, ${accuracy} percent accuracy.`
      : 'Ring in flight. Strike when it crosses the solid mark.';

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">Pulse</h3>
        <span className="tag gap-1.5"><Target size={12} aria-hidden="true" />30s run</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div role="progressbar" aria-label="Seconds left in this run" aria-valuemin={0} aria-valuemax={RUN_MS / 1000} aria-valuenow={seconds} className="progress-track flex-1">
          <div className="progress-fill transition-all duration-150 ease-linear" style={{ width: `${(left / RUN_MS) * 100}%` }} />
        </div>
        {/* aria-hidden: the progressbar carries the value, and a live ticking number would cut across every judgement. */}
        <span aria-hidden="true" className="tag w-12 justify-center font-mono">{seconds}s</span>
      </div>

      <dl className="mt-3 flex flex-wrap justify-center gap-1.5">
        {([['Streak', tally.streak], ['Best', tally.best], ['Accuracy', `${accuracy}%`]] as const).map(([label, value]) => (
          <div key={label} className="chip">{label} <span className="font-mono font-semibold text-[var(--ink)]">{value}</span></div>
        ))}
      </dl>

      <p role="status" aria-live="polite" className="mt-3 text-center text-xs leading-relaxed text-[var(--ink-2)]">
        {phase === 'idle' ? 'Thirty seconds of rings. Strike when the expanding ring meets the solid mark.' : status}
      </p>

      <button
        type="button"
        onClick={strike} onMouseEnter={() => sounds.hover()}
        aria-label={phase === 'idle' ? 'Start a thirty second Pulse run' : phase === 'done' ? `Run over with ${tally.hits} perfect. Press to play again.` : `Pulse target. ${verdict ? word : 'Ring in flight'}. Press to strike.`}
        className={`relative mx-auto mt-3 flex aspect-square w-full max-w-[15rem] touch-manipulation items-center justify-center overflow-hidden rounded-full border-2 transition-transform duration-100 ease-out ${verdict ? TONES[verdict] : 'border-solid border-[var(--line-strong)]'}`}
        style={{ transform: shake === 0 ? 'translate3d(0,0,0)' : `translate3d(${shake}px,0,0)`, background: 'radial-gradient(circle at 50% 42%, var(--surface) 0%, var(--surface-2) 62%, var(--page-2) 100%)' }}
      >
        {/* The perfect zone: dashed edges, solid centre line, all drawn at the scales the judgement above tests. */}
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-[var(--accent)] opacity-45" style={{ transform: scaled(STRIKE + band) }} />
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-[var(--accent)] opacity-45" style={{ transform: scaled(STRIKE - band) }} />
        <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[var(--accent)]" style={{ transform: scaled(STRIKE) }} />
        <span ref={ringRef} aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[var(--ink)]" style={{ transform: scaled(RING_MIN), willChange: 'transform' }} />
        {burst && verdict && (
          <span
            key={burst.id}
            aria-hidden="true"
            className={`absolute inset-0 rounded-full border-2 ${TONES[verdict]} ${burst.motion ? 'animate-ping' : ''}`}
            style={burst.motion ? { willChange: 'transform' } : { background: 'var(--accent-soft)' }}
          />
        )}
        <span aria-hidden="true" className="relative z-10 flex flex-col items-center gap-1 px-8 text-center">
          <span className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">{centre}</span>
          <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[var(--muted)]">{sub}</span>
        </span>
      </button>

      {phase !== 'idle' && (
        <button type="button" onClick={start} onMouseEnter={() => sounds.hover()} className="btn btn-secondary mt-4 w-full">
          <RotateCcw size={15} aria-hidden="true" />
          {phase === 'done' ? 'Play again' : 'Restart run'}
        </button>
      )}
    </div>
  );
}
