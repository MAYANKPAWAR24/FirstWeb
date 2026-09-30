import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Keyboard, RotateCcw, X } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Category = 'Literature' | 'Nature' | 'Technology' | 'Focus';
type Phase = 'playing' | 'won' | 'lost';

interface WordEntry {
  word: string;
  category: Category;
}

/**
 * Curated inline so the game has no fetch, no asset and no failure mode.
 * Every entry is 4-9 letters and drawn from the four themes the rest of the
 * site is written about: literature, nature, technology, focus.
 */
const WORDS: readonly WordEntry[] = [
  { word: 'PROSE', category: 'Literature' }, { word: 'POETRY', category: 'Literature' },
  { word: 'METAPHOR', category: 'Literature' }, { word: 'FOOTNOTE', category: 'Literature' },
  { word: 'FABLE', category: 'Literature' }, { word: 'CHAPTER', category: 'Literature' },
  { word: 'PARAGRAPH', category: 'Literature' }, { word: 'VELLUM', category: 'Literature' },
  { word: 'SCRIBE', category: 'Literature' }, { word: 'CRITIQUE', category: 'Literature' },
  { word: 'DIALOGUE', category: 'Literature' }, { word: 'NOVEL', category: 'Literature' },
  { word: 'ESSAY', category: 'Literature' },

  { word: 'THUNDER', category: 'Nature' }, { word: 'MEADOW', category: 'Nature' },
  { word: 'GLACIER', category: 'Nature' }, { word: 'WILLOW', category: 'Nature' },
  { word: 'CRYSTAL', category: 'Nature' }, { word: 'HARVEST', category: 'Nature' },
  { word: 'PEBBLE', category: 'Nature' }, { word: 'ORCHARD', category: 'Nature' },
  { word: 'LANTERN', category: 'Nature' }, { word: 'FEATHER', category: 'Nature' },
  { word: 'CANOPY', category: 'Nature' }, { word: 'POLLEN', category: 'Nature' },
  { word: 'SUMMIT', category: 'Nature' },

  { word: 'CIRCUIT', category: 'Technology' }, { word: 'PACKET', category: 'Technology' },
  { word: 'BUFFER', category: 'Technology' }, { word: 'KERNEL', category: 'Technology' },
  { word: 'CACHE', category: 'Technology' }, { word: 'SERVER', category: 'Technology' },
  { word: 'BINARY', category: 'Technology' }, { word: 'RENDER', category: 'Technology' },
  { word: 'VECTOR', category: 'Technology' }, { word: 'SIGNAL', category: 'Technology' },
  { word: 'TOKEN', category: 'Technology' }, { word: 'SYNTAX', category: 'Technology' },
  { word: 'CIPHER', category: 'Technology' },

  { word: 'SILENCE', category: 'Focus' }, { word: 'STILLNESS', category: 'Focus' },
  { word: 'ROUTINE', category: 'Focus' }, { word: 'INTENT', category: 'Focus' },
  { word: 'PATIENCE', category: 'Focus' }, { word: 'CLARITY', category: 'Focus' },
  { word: 'MOMENTUM', category: 'Focus' }, { word: 'PRESENCE', category: 'Focus' },
  { word: 'PRACTICE', category: 'Focus' }, { word: 'MIDNIGHT', category: 'Focus' },
  { word: 'QUIET', category: 'Focus' }, { word: 'MOMENT', category: 'Focus' },
  { word: 'LEDGER', category: 'Focus' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_MISSES = 6;

const CATEGORY_CHIP: Record<Category, string> = {
  Literature: 'chip chip-iris',
  Nature: 'chip',
  Technology: 'chip chip-accent',
  Focus: 'chip chip-ember',
};

function pickWord(): WordEntry {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export default function WordForge({ onScore }: GameProps) {
  const [entry, setEntry] = useState<WordEntry>(pickWord);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('playing');
  const [tally, setTally] = useState({ won: 0, lost: 0 });
  const [last, setLast] = useState<{ letter: string; hit: boolean } | null>(null);
  // A round can only ever be paid out once, whatever StrictMode does with
  // effects or how many listeners end up attached.
  const scored = useRef(false);

  const misses = useMemo(
    () => guessed.filter((letter) => !entry.word.includes(letter)),
    [guessed, entry.word],
  );
  const hits = useMemo(
    () => new Set(guessed.filter((letter) => entry.word.includes(letter))),
    [guessed, entry.word],
  );
  const lives = MAX_MISSES - misses.length;
  const revealed = entry.word.split('').filter((ch) => hits.has(ch)).length;

  const guess = useCallback((letter: string) => {
    if (phase !== 'playing' || scored.current || guessed.includes(letter)) return;
    const hit = entry.word.includes(letter);
    const next = [...guessed, letter];
    const left = MAX_MISSES - next.filter((l) => !entry.word.includes(l)).length;

    setGuessed(next);
    setLast({ letter, hit });
    if (hit) sounds.click();
    else sounds.error();

    if (entry.word.split('').every((ch) => next.includes(ch))) {
      scored.current = true;
      setPhase('won');
      setTally((t) => ({ ...t, won: t.won + 1 }));
      sounds.success();
      onScore?.(1000 + left * 150);
    } else if (left <= 0) {
      scored.current = true;
      setPhase('lost');
      setTally((t) => ({ ...t, lost: t.lost + 1 }));
      onScore?.(left * 20);
    }
  }, [entry.word, guessed, onScore, phase]);

  // Physical letters, with no focus call anywhere: moving focus after a keypress
  // is what strips the `:focus-visible` ring off the button the player pressed.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const letter = event.key.toUpperCase();
      if (letter.length !== 1 || letter < 'A' || letter > 'Z') return;
      guess(letter);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess]);

  const newRound = useCallback(() => {
    scored.current = false;
    setEntry(pickWord());
    setGuessed([]);
    setLast(null);
    setPhase('playing');
    sounds.toggle();
  }, []);

  const status = phase === 'won'
    ? `Solved in ${guessed.length} guesses with ${lives} to spare.`
    : phase === 'lost'
      ? `Out of guesses. The word was ${entry.word}.`
      : last
        ? `${last.letter} is ${last.hit ? 'in' : 'not in'} the word. ${lives} of ${MAX_MISSES} lives left.`
        : `${MAX_MISSES} lives. ${revealed} of ${entry.word.length} letters revealed.`;

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">WordForge</h3>
        <span className={CATEGORY_CHIP[entry.category]}>{entry.category}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        <span>Won <span className="font-mono font-semibold text-[var(--ink-2)]">{tally.won}</span></span>
        <span>Lost <span className="font-mono font-semibold text-[var(--ink-2)]">{tally.lost}</span></span>
        <span className="tag">{entry.word.length} letters</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div
          role="progressbar"
          aria-label="Lives remaining"
          aria-valuemin={0}
          aria-valuemax={MAX_MISSES}
          aria-valuenow={lives}
          className="progress-track flex-1"
        >
          <div className="progress-fill transition-all duration-300" style={{ width: `${(lives / MAX_MISSES) * 100}%` }} />
        </div>
        <span className="tag whitespace-nowrap">Lives {lives}/{MAX_MISSES}</span>
      </div>

      {/* Blanks stay blank until the round resolves — the answer must never be
          readable off the board mid-game. */}
      <div className="mt-4 flex flex-wrap items-end justify-center gap-1" aria-hidden="true">
        {entry.word.split('').map((ch, index) => {
          const shown = hits.has(ch) || phase !== 'playing';
          return (
            <span
              key={`${ch}-${index}`}
              className={`grid h-11 w-7 place-items-center rounded-card border font-display text-lg font-bold uppercase ${
                shown
                  ? 'border-[rgba(10,130,189,0.45)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--faint)]'
              }`}
            >
              {shown ? ch : '_'}
            </span>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-center text-xs leading-relaxed text-[var(--ink-2)]">
        {status}
      </p>

      <ul className="mt-3 flex min-h-[1.75rem] flex-wrap items-center justify-center gap-1.5">
        {misses.length === 0
          ? <li className="tag">No misses yet</li>
          : misses.map((letter) => (
            <li key={letter} className="tag gap-1">
              <X size={10} aria-hidden="true" />
              <span className="line-through">{letter}</span>
            </li>
          ))}
      </ul>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Keyboard size={12} aria-hidden="true" className="text-[var(--faint)]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">
            Letter keys or the grid
          </span>
        </div>
        <div role="group" aria-label="Letter keyboard" className="grid grid-cols-7 gap-1.5">
          {ALPHABET.split('').map((letter) => {
            const isHit = hits.has(letter);
            const isMiss = misses.includes(letter);
            const used = isHit || isMiss;
            return (
              <button
                key={letter}
                type="button"
                disabled={used}
                onClick={() => guess(letter)}
                onMouseEnter={() => { if (!used) sounds.hover(); }}
                aria-pressed={used}
                aria-label={isHit
                  ? `${letter}, already guessed, in the word`
                  : isMiss
                    ? `${letter}, already guessed, not in the word`
                    : `Guess ${letter}`}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-card border text-[11px] font-bold transition-colors duration-[--dur-hover] ${
                  isHit
                    ? 'border-[rgba(10,130,189,0.5)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : isMiss
                      ? 'border-[rgba(230,79,55,0.4)] bg-[var(--ember-soft)] text-[var(--ember)] line-through opacity-70'
                      : 'cursor-pointer border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:border-[rgba(10,130,189,0.4)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                <span>{letter}</span>
                {isHit && <Check size={9} aria-hidden="true" />}
                {isMiss && <X size={9} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={newRound}
        onMouseEnter={() => sounds.hover()}
        className={`btn mt-4 w-full ${phase === 'playing' ? 'btn-secondary' : 'btn-primary'}`}
      >
        <RotateCcw size={15} aria-hidden="true" />
        New word
      </button>
    </div>
  );
}
