import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Swords } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Throw = 'rock' | 'paper' | 'scissors';
type Outcome = 'win' | 'lose' | 'draw';

const THROWS: { id: Throw; label: string; glyph: string; beats: Throw }[] = [
  { id: 'rock', label: 'Rock', glyph: '✊', beats: 'scissors' },
  { id: 'paper', label: 'Paper', glyph: '✋', beats: 'rock' },
  { id: 'scissors', label: 'Scissors', glyph: '✌️', beats: 'paper' },
];

const WIN_TARGET = 5;

function beats(a: Throw, b: Throw): Outcome {
  if (a === b) return 'draw';
  return THROWS.find((entry) => entry.id === a)?.beats === b ? 'win' : 'lose';
}

/**
 * Weighted against repeating the previous throw — roughly 55% of the time the
 * rival switches. Pure random reads as a slot machine; a purely reactive rival
 * reads as a cheat. This lands in between and stays beatable.
 */
function rivalPick(previous: Throw | null): Throw {
  if (previous && Math.random() < 0.55) {
    const others = THROWS.filter((entry) => entry.id !== previous);
    return others[Math.floor(Math.random() * others.length)].id;
  }
  return THROWS[Math.floor(Math.random() * THROWS.length)].id;
}

function pips(count: number, total: number, tone: string) {
  return Array.from({ length: total }, (_, index) => (
    <span
      key={index}
      aria-hidden="true"
      className={`h-1.5 w-1.5 rounded-full border ${index < count ? tone : 'border-[var(--line-strong)] bg-transparent'}`}
    />
  ));
}

export default function RockPaperScissors({ onScore }: GameProps) {
  const [you, setYou] = useState(0);
  const [rival, setRival] = useState(0);
  const [choice, setChoice] = useState<Throw | null>(null);
  const [reply, setReply] = useState<Throw | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [round, setRound] = useState(0);
  const [over, setOver] = useState(false);
  const lastRival = useRef<Throw | null>(null);
  const announced = useRef(false);
  const overRef = useRef(false);
  const youRef = useRef(0);
  const rivalRef = useRef(0);

  useEffect(() => {
    if (!over || announced.current) return;
    announced.current = true;
    if (you > rival) sounds.success();
    else sounds.error();
    onScore?.(Math.max(0, (you - rival) * 100));
  }, [over, you, rival, onScore]);

  const play = useCallback((pick: Throw) => {
    if (overRef.current) return;
    sounds.click();
    const opponent = rivalPick(lastRival.current);
    lastRival.current = opponent;
    const result = beats(pick, opponent);

    const nextYou = youRef.current + (result === 'win' ? 1 : 0);
    const nextRival = rivalRef.current + (result === 'lose' ? 1 : 0);
    youRef.current = nextYou;
    rivalRef.current = nextRival;

    setChoice(pick);
    setReply(opponent);
    setOutcome(result);
    setRound((value) => value + 1);
    setYou(nextYou);
    setRival(nextRival);

    if (result === 'win') sounds.success();
    else if (result === 'lose') sounds.error();

    if (nextYou >= WIN_TARGET || nextRival >= WIN_TARGET) {
      overRef.current = true;
      setOver(true);
    }
  }, []);

  const reset = useCallback(() => {
    youRef.current = 0;
    rivalRef.current = 0;
    overRef.current = false;
    setYou(0);
    setRival(0);
    setChoice(null);
    setReply(null);
    setOutcome(null);
    setRound(0);
    setOver(false);
    lastRival.current = null;
    announced.current = false;
    sounds.toggle();
  }, []);

  const yourThrow = THROWS.find((entry) => entry.id === choice);
  const rivalThrow = THROWS.find((entry) => entry.id === reply);
  const roundVerdict = outcome === 'win'
    ? 'You take the round.'
    : outcome === 'lose'
      ? 'Rival takes the round.'
      : outcome === 'draw'
        ? 'Dead heat.'
        : null;
  const verdict = [roundVerdict, over ? `Match ${you}–${rival} to ${you > rival ? 'you' : 'the rival'}.` : null]
    .filter(Boolean)
    .join(' ') || `Round ${round + 1}. Pick a shape.`;

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">First to five</h3>
        <span className="chip">Round {round + 1}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3">
          <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
            You <span className="font-display text-base text-[var(--accent)]">{you}</span>
          </p>
          <div className="mt-2 flex h-1.5 gap-1" aria-hidden="true">
            {pips(you, WIN_TARGET, 'border-[var(--accent)] bg-[var(--accent)]')}
          </div>
          <p className="mt-3 flex h-14 items-center justify-center text-4xl" aria-hidden="true">
            {yourThrow ? <span key={`y-${round}`} className="animate-scale-in">{yourThrow.glyph}</span> : <span className="text-[var(--faint)]">—</span>}
          </p>
        </div>

        <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3">
          <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
            <span className="font-display text-base text-[var(--iris)]">{rival}</span> Rival
          </p>
          <div className="mt-2 flex h-1.5 gap-1" aria-hidden="true">
            {pips(rival, WIN_TARGET, 'border-[var(--iris)] bg-[var(--iris)]')}
          </div>
          <p className="mt-3 flex h-14 items-center justify-center text-4xl" aria-hidden="true">
            {rivalThrow ? <span key={`r-${round}`} className="animate-scale-in">{rivalThrow.glyph}</span> : <span className="text-[var(--faint)]">—</span>}
          </p>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-center text-xs font-medium text-[var(--muted)]">
        {verdict}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Choose rock, paper or scissors">
        {THROWS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => play(entry.id)}
            onMouseEnter={() => sounds.hover()}
            disabled={over}
            aria-pressed={choice === entry.id && !over}
            className="btn btn-secondary flex-col gap-0.5 py-3 disabled:opacity-60"
          >
            <span className="text-2xl" aria-hidden="true">{entry.glyph}</span>
            {entry.label}
          </button>
        ))}
      </div>

      {over && (
        <button type="button" onClick={reset} className="btn btn-primary mt-3 w-full">
          {you > rival ? <Swords size={15} aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
          Rematch
        </button>
      )}
    </div>
  );
}
