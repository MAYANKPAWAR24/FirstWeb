import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Timer } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Difficulty = 'easy' | 'hard';

const SIZES: Record<Difficulty, { pairs: number; label: string }> = {
  easy: { pairs: 8, label: '4 × 4' },
  hard: { pairs: 10, label: '4 × 5' },
};

/** Glyph *and* hue, so the board still reads without colour perception. */
const FACES = [
  { glyph: '🌊', name: 'wave', tone: 'text-accent-700 bg-accent-50 border-accent-200' },
  { glyph: '🌙', name: 'moon', tone: 'text-iris-700 bg-iris-50 border-iris-200' },
  { glyph: '⚡', name: 'bolt', tone: 'text-ember-700 bg-ember-50 border-ember-200' },
  { glyph: '🍀', name: 'clover', tone: 'text-[var(--jade)] bg-[#eef7f3] border-[#c3e2d6]' },
  { glyph: '⭐', name: 'star', tone: 'text-graphite-700 bg-frost-100 border-[var(--line-strong)]' },
  { glyph: '🐝', name: 'bee', tone: 'text-accent-900 bg-accent-100 border-accent-300' },
  { glyph: '🎯', name: 'target', tone: 'text-iris-900 bg-iris-100 border-iris-300' },
  { glyph: '🔥', name: 'flame', tone: 'text-ember-900 bg-ember-100 border-ember-300' },
  { glyph: '🧩', name: 'puzzle', tone: 'text-graphite-600 bg-frost-200 border-[var(--line-strong)]' },
  { glyph: '🎸', name: 'guitar', tone: 'text-[var(--muted)] bg-[var(--surface-2)] border-[var(--line-strong)]' },
] as const;

function buildDeck(pairs: number): number[] {
  const cards = Array.from({ length: pairs }, (_, pair) => pair).flatMap((face) => [face, face]);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Perfect play is one flip per pair; every extra flip and every second costs. */
function finalScore(pairs: number, moves: number, seconds: number): number {
  return Math.max(0, 400 + pairs * 150 - Math.max(0, moves - pairs) * 30 - seconds * 4);
}

export default function MemoryMatch({ onScore }: GameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [deck, setDeck] = useState<number[]>(() => buildDeck(SIZES.easy.pairs));
  const [open, setOpen] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const flipTimer = useRef<number>();
  const announced = useRef(false);
  const pairs = SIZES[difficulty].pairs;

  useEffect(() => {
    if (won) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [won]);

  useEffect(() => () => window.clearTimeout(flipTimer.current), []);

  useEffect(() => {
    if (won || announced.current || solved.length !== deck.length) return;
    announced.current = true;
    setWon(true);
    sounds.success();
    onScore?.(finalScore(pairs, moves, seconds));
  }, [won, solved.length, deck.length, pairs, moves, seconds, onScore]);

  const newGame = useCallback((next?: Difficulty) => {
    const level = next ?? difficulty;
    if (next) setDifficulty(next);
    window.clearTimeout(flipTimer.current);
    setDeck(buildDeck(SIZES[level].pairs));
    setOpen([]);
    setSolved([]);
    setLocked(false);
    setMoves(0);
    setSeconds(0);
    setWon(false);
    announced.current = false;
    sounds.toggle();
  }, [difficulty]);

  const flip = useCallback((index: number) => {
    if (locked || won || solved.includes(index) || open.includes(index)) return;
    sounds.click();
    const pair = [...open, index];
    setOpen(pair);
    if (pair.length < 2) return;

    setLocked(true);
    setMoves((value) => value + 1);

    const [a, b] = pair;
    if (deck[a] === deck[b]) {
      sounds.success();
      setSolved((current) => [...current, a, b]);
      setOpen([]);
      setLocked(false);
      return;
    }

    sounds.error();
    flipTimer.current = window.setTimeout(() => {
      setOpen([]);
      setLocked(false);
    }, 700);
  }, [deck, locked, open, solved, won]);

  const progress = deck.length > 0 ? (solved.length / deck.length) * 100 : 0;

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">Memory Match</h3>
        <span className="tag">
          <Timer size={12} aria-hidden="true" />
          {seconds}s
        </span>
      </div>

      <p role="status" aria-live="polite" className="mt-1.5 text-xs text-[var(--muted)]">
        {won
          ? `Cleared in ${moves} moves and ${seconds} seconds.`
          : `${solved.length / 2} of ${pairs} pairs found · ${moves} moves`}
      </p>

      <div className="progress-track mt-3">
        <div className="progress-fill transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto mt-4 grid w-full max-w-[18rem] grid-cols-4 gap-2" role="group" aria-label="Memory card grid">
        {deck.map((face, index) => {
          const isSolved = solved.includes(index);
          const isUp = isSolved || open.includes(index);
          const card = FACES[face];
          return (
            <button
              key={index}
              type="button"
              onClick={() => flip(index)}
              onMouseEnter={() => sounds.hover()}
              disabled={locked || isSolved}
              aria-pressed={isUp}
              aria-label={`Card ${index + 1}: ${isUp ? card.name : 'face down'}`}
              className="relative block aspect-square w-full p-0 [perspective:900px]"
            >
              <span
                className={`absolute inset-0 [transform-style:preserve-3d] transition-transform duration-300 ease-out-expo ${
                  isUp ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center rounded-card border border-[var(--line-strong)] bg-[var(--surface-2)] text-lg text-[var(--faint)] [-webkit-backface-visibility:hidden] [backface-visibility:hidden]"
                >
                  ?
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 grid place-items-center rounded-card border text-xl [transform:rotateY(180deg)] [-webkit-backface-visibility:hidden] [backface-visibility:hidden] sm:text-2xl ${
                    isSolved
                      ? `${card.tone} ring-1 ring-[var(--accent)]`
                      : `${card.tone}`
                  }`}
                >
                  {card.glyph}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="Difficulty">
          {(Object.keys(SIZES) as Difficulty[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => newGame(key)}
              aria-pressed={difficulty === key}
              className="filter-pill min-h-[44px]"
            >
              {SIZES[key].label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => newGame()} className="btn btn-secondary">
          <RotateCcw size={15} aria-hidden="true" />
          New game
        </button>
      </div>

      {won && (
        <p className="mt-3 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3 text-xs leading-relaxed text-[var(--muted)]">
          Board cleared with {moves} moves — {moves - pairs} more than the theoretical minimum.
        </p>
      )}
    </div>
  );
}
