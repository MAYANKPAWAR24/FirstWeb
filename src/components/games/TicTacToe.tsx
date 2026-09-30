import { useCallback, useMemo, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { sounds } from '@/lib/sound';
import {
  chooseMove, emptyBoard, emptyIndexes, winnerOf, winningLines,
  type Board, type BoardSize, type Difficulty, type Player,
} from './engine';
import type { GameProps } from './registry';

const SIZE_OPTIONS: BoardSize[] = [3, 4];
const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Plays well but slips now and then' },
  { id: 'medium', label: 'Medium', hint: 'Blocks and forks, rarely the best move' },
  { id: 'smart', label: 'Smart', hint: 'Unbeatable on 3×3' },
];

type Status = 'playing' | 'won' | 'lost' | 'draw';

export default function TicTacToe({ onScore }: GameProps) {
  const [size, setSize] = useState<BoardSize>(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [board, setBoard] = useState<Board>(() => emptyBoard(3));
  const [status, setStatus] = useState<Status>('playing');
  const [score, setScore] = useState({ you: 0, ai: 0, draws: 0 });

  const lines = useMemo(() => winningLines(size), [size]);
  const interactive = status === 'playing';

  const reset = useCallback((nextSize: BoardSize = size) => {
    setBoard(emptyBoard(nextSize));
    setStatus('playing');
    sounds.toggle();
  }, [size]);

  const changeSize = (next: BoardSize) => {
    if (next === size) return;
    sounds.click();
    setSize(next);
    setBoard(emptyBoard(next));
    setStatus('playing');
  };

  const applyResult = (next: Board): Status => {
    const outcome = winnerOf(next, size);
    if (!outcome) return 'playing';
    if (outcome.winner === 'draw') {
      setScore((current) => ({ ...current, draws: current.draws + 1 }));
      onScore?.(score.draws + 1);
      return 'draw';
    }
    if (outcome.winner === 'X') {
      setScore((current) => ({ ...current, you: current.you + 1 }));
      onScore?.(score.you + 1);
      return 'won';
    }
    setScore((current) => ({ ...current, ai: current.ai + 1 }));
    return 'lost';
  };

  const play = (index: number) => {
    if (!interactive || board[index]) return;
    sounds.click();

    const afterHuman = [...board];
    afterHuman[index] = 'X';
    setBoard(afterHuman);

    // Resolve immediately: if the human just won, the AI must not place a
    // pointless stone (the previous implementation always did).
    const humanOutcome = winnerOf(afterHuman, size);
    if (humanOutcome) {
      setStatus(applyResult(afterHuman));
      return;
    }

    const move = chooseMove(afterHuman, size, difficulty);
    if (move === null) {
      setStatus(applyResult(afterHuman));
      return;
    }

    const afterAi = [...afterHuman];
    afterAi[move] = 'O';
    setBoard(afterAi);
    setStatus(applyResult(afterAi));
  };

  const winningCells = useMemo(() => {
    const outcome = winnerOf(board, size);
    return outcome && outcome.winner !== 'draw' ? new Set(outcome.line) : new Set<number>();
  }, [board, size]);

  const statusText = status === 'won' ? 'You took it.'
    : status === 'lost' ? 'The machine wins this round.'
      : status === 'draw' ? 'Drawn.'
        : `${emptyIndexes(board).length} move${emptyIndexes(board).length === 1 ? '' : 's'} left`;

  return (
    <div className="card card-sheen w-full max-w-lg rounded-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">Tic-Tac-Toe</h3>
          <p className="text-xs text-[var(--muted)]">You are X. {DIFFICULTIES.find((d) => d.id === difficulty)?.hint}.</p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          onMouseEnter={() => sounds.hover()}
          className="btn btn-ghost h-9 min-h-0 px-3 text-xs"
        >
          <RotateCcw size={13} aria-hidden="true" /> New round
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {([
          ['You', score.you, 'var(--accent)'],
          ['Draws', score.draws, 'var(--muted)'],
          ['Machine', score.ai, 'var(--iris)'],
        ] as const).map(([label, value, colour]) => (
          <div key={label} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">{label}</dt>
            <dd className="font-display text-lg font-bold" style={{ color: colour }}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1" role="group" aria-label="Board size">
          {SIZE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={size === option}
              onClick={() => changeSize(option)}
              className="filter-pill"
            >
              {option}×{option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={difficulty === option.id}
              onClick={() => { sounds.click(); setDifficulty(option.id); }}
              className="filter-pill"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* `role="grid"` requires row/gridcell structure. The previous markup
          declared the role and then put bare buttons inside it, which is
          invalid and left screen readers with no way to locate a cell. */}
      <div
        role="grid"
        aria-label={`${size} by ${size} Tic-Tac-Toe board`}
        className="mx-auto mt-5 w-full max-w-[19rem]"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: 6 }}
      >
        {board.map((cell, index) => {
          const row = Math.floor(index / size) + 1;
          const column = (index % size) + 1;
          const isWinner = winningCells.has(index);
          return (
            <button
              key={index}
              role="gridcell"
              type="button"
              onClick={() => play(index)}
              onMouseEnter={() => sounds.hover()}
              aria-label={`Row ${row}, column ${column}${cell ? `: ${cell}` : ', empty'}`}
              // `aria-disabled` rather than `disabled`: a filled cell must stay
              // in the tab order, or its label becomes unreachable once played.
              aria-disabled={!interactive || cell !== null}
              className={[
                'grid aspect-square place-items-center rounded-card border text-2xl font-bold transition-all duration-[--dur-hover]',
                isWinner
                  ? 'border-[rgba(10,130,189,0.55)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]'
                  : cell === 'O'
                    ? 'border-[rgba(97,70,223,0.3)] bg-[rgba(97,70,223,0.06)] text-[var(--iris)]'
                    : cell === 'X'
                      ? 'border-[rgba(10,130,189,0.3)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[rgba(10,130,189,0.4)] hover:bg-[var(--accent-soft)]',
                (!interactive || cell) ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] font-medium text-[var(--ink-2)]">
        {status !== 'playing' && <Trophy size={14} aria-hidden="true" className="text-[var(--accent)]" />}
        {statusText}
      </p>

      <p className="sr-only">
        {lines.length} winning lines are available on this board.
      </p>
    </div>
  );
}

export type { Player };
