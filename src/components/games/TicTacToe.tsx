import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';

type Cell = 'X' | 'O' | null;
type Status = 'playing' | 'won' | 'draw';

const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(board: Cell[]): { winner: Exclude<Cell, null>; line: number[] } | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Exclude<Cell, null>, line: [a, b, c] };
    }
  }
  return null;
}

const EMPTY_BOARD: Cell[] = Array(9).fill(null);

/**
 * Tic-Tac-Toe. You are X, "Muse" is O. No dependencies, no assets — the whole
 * game is three arrays and a line table.
 */
export default function TicTacToe() {
  const { notify } = useToast();
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD);
  const [status, setStatus] = useState<Status>('playing');
  const [highlight, setHighlight] = useState<number[]>([]);
  const [scores, setScores] = useState({ you: 0, muse: 0, draws: 0 });
  const announcedRef = useRef<Status>('playing');

  const play = useCallback((index: number) => {
    if (status !== 'playing' || board[index]) return;
    sounds.click();
    const next: Cell[] = [...board];
    next[index] = 'X';
    setBoard(next);

    const opponent: Cell[] = [...next];
    // Perfect play would be a cold demo; a small bias keeps it beatable and
    // makes visitors feel clever instead of punished.
    const open = opponent.map((cell, i) => (cell ? -1 : i)).filter((i) => i >= 0);
    if (open.length > 0) {
      opponent[open[Math.floor(Math.random() * open.length)]] = 'O';
    }

    const result = winnerOf(opponent);
    const finished = Boolean(result) || opponent.every(Boolean);
    setBoard(opponent);
    setHighlight(result ? result.line : []);
    setStatus(result ? 'won' : finished ? 'draw' : 'playing');
    if (result) setScores((current) => (result.winner === 'X'
      ? { ...current, you: current.you + 1 }
      : { ...current, muse: current.muse + 1 }));
    if (finished && !result) setScores((current) => ({ ...current, draws: current.draws + 1 }));
  }, [board, status]);

  useEffect(() => {
    if (status === 'playing' || announcedRef.current === status) return;
    announcedRef.current = status;
    if (status === 'won') {
      sounds.success();
      notify(winnerOf(board)?.winner === 'X' ? 'You won. Screenshot it.' : 'Muse wins this round. Vengeance next?');
    } else {
      notify('Draw. Nobody blinked.', 'info');
    }
  }, [status, board, notify]);

  const reset = useCallback(() => {
    setBoard(EMPTY_BOARD);
    setHighlight([]);
    setStatus('playing');
    announcedRef.current = 'playing';
    sounds.toggle();
  }, []);

  const message = useMemo(() => {
    if (status === 'draw') return 'Draw. Even Muse is speechless.';
    if (status === 'won') return winnerOf(board)?.winner === 'X' ? 'You win. Do write that down.' : 'Muse takes it. Again?';
    return 'Your move.';
  }, [status, board]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_10px_30px_rgba(29,29,31,0.08)] sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-600">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">X</span>
            You
            <span className="font-mono text-slate-400">{scores.you}</span>
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">{message}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-slate-400">{scores.muse}</span>
            Muse
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-700">O</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2" role="grid" aria-label="Tic tac toe board">
          {board.map((cell, index) => (
            <button
              key={index}
              type="button"
              onClick={() => play(index)}
              disabled={status !== 'playing' || Boolean(cell)}
              aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}${cell ? `: ${cell}` : ': empty'}`}
              className={`flex aspect-square items-center justify-center rounded-2xl border text-4xl font-display font-bold transition-all duration-200 sm:text-5xl
                ${cell === 'X' ? 'border-cyan-200 bg-cyan-50/70 text-cyan-700' : ''}
                ${cell === 'O' ? 'border-violet-200 bg-violet-50/70 text-violet-700' : ''}
                ${!cell && status === 'playing' ? 'border-slate-200 bg-slate-50/70 text-slate-300 hover:border-cyan-300 hover:bg-cyan-50/40' : ''}
                ${!cell && status !== 'playing' ? 'border-slate-200 bg-slate-50/50' : ''}
                ${highlight.includes(index) ? 'ring-2 ring-cyan-400/70' : ''}
                disabled:cursor-default
              `}
            >
              {cell ?? ''}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={reset}
          className="btn-premium mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-slate-700"
        >
          New round
        </button>
      </div>
      <p className="max-w-sm text-center text-xs text-slate-500">
        Draws: <span className="font-mono">{scores.draws}</span> · Built with <span className="font-mono">['X','O'].flat()</span>
      </p>
    </div>
  );
}
