import { useCallback, useEffect, useRef, useState } from 'react';
import { Gauge, RotateCcw, Trophy } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Phase = 'idle' | 'wait' | 'go' | 'result' | 'done';

const ROUNDS = 5;
const BEST_KEY = 'portfolio_reaction_best_ms';
const MIN_WAIT = 1200;
const MAX_WAIT = 3200;
const RESULT_HOLD = 1100;

function readBest(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    // Storage can throw outright in private mode or with cookies blocked.
    return null;
  }
}

function writeBest(value: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
  } catch {
    // A run that cannot be remembered is still a run.
  }
}

export default function ReactionTap({ onScore }: GameProps) {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [average, setAverage] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [hint, setHint] = useState('');

  const phaseRef = useRef<Phase>('idle');
  const goAtRef = useRef(0);
  const runRef = useRef<number[]>([]);
  const bestRef = useRef<number | null>(null);
  const scored = useRef(false);
  const waitTimer = useRef<number>();
  const holdTimer = useRef<number>();

  useEffect(() => {
    const stored = readBest();
    bestRef.current = stored;
    setBest(stored);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(waitTimer.current);
    window.clearTimeout(holdTimer.current);
  }, []);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const beginRound = useCallback(() => {
    window.clearTimeout(waitTimer.current);
    // Randomised so the delay itself cannot be learned and anticipated.
    waitTimer.current = window.setTimeout(() => {
      goAtRef.current = performance.now();
      setPhase('go');
      sounds.open();
    }, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
    setPhase('wait');
  }, [setPhase]);

  const advance = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    const recorded = runRef.current;
    if (recorded.length < ROUNDS) {
      beginRound();
      return;
    }
    const mean = Math.round(recorded.reduce((total, value) => total + value, 0) / recorded.length);
    setAverage(mean);
    setPhase('done');
    sounds.success();
    if (!scored.current) {
      scored.current = true;
      onScore?.(Math.max(0, Math.round(1000 - mean)));
    }
  }, [beginRound, onScore, setPhase]);

  const record = useCallback(() => {
    const ms = Math.round(performance.now() - goAtRef.current);
    runRef.current = [...runRef.current, ms];
    setTimes(runRef.current);
    setLast(ms);
    if (bestRef.current === null || ms < bestRef.current) {
      bestRef.current = ms;
      writeBest(ms);
      setBest(ms);
    }
    sounds.success();
    setPhase('result');
    holdTimer.current = window.setTimeout(advance, RESULT_HOLD);
  }, [advance, setPhase]);

  const onTap = useCallback(() => {
    const current = phaseRef.current;
    if (current === 'done') return;
    if (current === 'go') {
      record();
      return;
    }
    if (current === 'result') {
      advance();
      return;
    }
    if (current === 'wait') {
      window.clearTimeout(waitTimer.current);
      sounds.error();
      setHint('Too soon. Tap when the panel turns green.');
      setPhase('idle');
      return;
    }
    sounds.click();
    setHint('');
    beginRound();
  }, [advance, beginRound, record, setPhase]);

  const newRun = useCallback(() => {
    window.clearTimeout(waitTimer.current);
    window.clearTimeout(holdTimer.current);
    runRef.current = [];
    scored.current = false;
    setTimes([]);
    setLast(null);
    setAverage(null);
    setHint('');
    sounds.toggle();
    setPhase('idle');
  }, [setPhase]);

  const tone = phase === 'go'
    ? 'border-[var(--jade)] bg-[var(--jade)] text-white'
    : phase === 'result'
      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
      : 'border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--ink)]';

  const headline = phase === 'go'
    ? 'TAP!'
    : phase === 'result'
      ? `${last} ms`
      : phase === 'done'
        ? `${average} ms average`
        : phase === 'wait'
          ? 'Wait…'
          : hint || 'Tap to start';

  const subline = phase === 'go'
    ? 'now'
    : phase === 'result'
      ? 'Tap to continue'
      : phase === 'done'
        ? 'Five rounds complete'
        : phase === 'wait'
          ? 'hands off'
          : 'Do not tap until the panel turns green';

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">Reaction Tap</h3>
        {best !== null && (
          <span className="chip chip-iris">
            <Trophy size={12} aria-hidden="true" />
            Best <span className="font-mono font-semibold">{best} ms</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Gauge size={14} className="flex-none text-[var(--faint)]" aria-hidden="true" />
        <div className="progress-track flex-1">
          <div className="progress-fill transition-all duration-300" style={{ width: `${(times.length / ROUNDS) * 100}%` }} />
        </div>
        <span className="text-xs text-[var(--faint)]">{times.length}/{ROUNDS}</span>
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-center text-xs text-[var(--muted)]">
        {phase === 'done'
          ? `Run average ${average} ms. Best in this run ${Math.min(...times)} ms.`
          : phase === 'wait'
            ? 'Round in flight. Tapping now voids it.'
            : phase === 'result'
              ? `Round ${times.length} of ${ROUNDS}: ${last} ms`
              : hint || `Five rounds. Faster average, higher score.`}
      </p>

      <button
        type="button"
        onClick={onTap}
        aria-label={phase === 'go' ? 'Tap now to record your reaction time' : `${headline}. ${subline}`}
        className={`mt-3 flex min-h-[9rem] w-full flex-col items-center justify-center gap-1 rounded-panel border-2 text-center transition-colors duration-200 ${tone} ${phase === 'wait' ? 'animate-pulse' : ''}`}
      >
        <span className="font-display text-3xl font-bold tracking-tight">{headline}</span>
        <span className="text-xs font-medium uppercase tracking-widest opacity-90">{subline}</span>
      </button>

      {times.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {times.map((value, index) => (
            <li key={`${index}-${value}`} className="tag">{value} ms</li>
          ))}
        </ul>
      )}

      {phase === 'done' && (
        <button type="button" onClick={newRun} className="btn btn-primary mt-4 w-full">
          <RotateCcw size={15} aria-hidden="true" />
          New run
        </button>
      )}
    </div>
  );
}
