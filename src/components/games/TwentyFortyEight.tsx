import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Direction = 'left' | 'right' | 'up' | 'down';
type Status = 'playing' | 'won' | 'over';
type Tile = { id: number; row: number; col: number; value: number; pop: boolean };
type Snapshot = { board: Tile[]; score: number };
type Cell = Tile | null;

const SIZE = 4;
const TARGET = 2048;
const HISTORY_LIMIT = 24;
const SWIPE = 24;

const KEY_MAP: Record<string, Direction> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down',
};

const CONTROLS: { direction: Direction; label: string; spot: string; Icon: typeof ChevronUp }[] = [
  { direction: 'up', label: 'Move up', spot: 'col-start-2 row-start-1', Icon: ChevronUp },
  { direction: 'left', label: 'Move left', spot: 'col-start-1 row-start-2', Icon: ChevronLeft },
  { direction: 'down', label: 'Move down', spot: 'col-start-2 row-start-2', Icon: ChevronDown },
  { direction: 'right', label: 'Move right', spot: 'col-start-3 row-start-2', Icon: ChevronRight },
];

function tone(value: number): string {
  if (value >= TARGET) return 'border-[var(--ink)] bg-[var(--ink)] text-white';
  if (value >= 1024) return 'border-iris-700 bg-iris-600 text-white';
  if (value >= 256) return 'border-ember-600 bg-ember-500 text-white';
  if (value >= 64) return 'border-accent-600 bg-accent-500 text-white';
  if (value >= 16) return 'border-accent-300 bg-accent-200 text-accent-900';
  return 'border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-2)]';
}

const textSize = (value: number) =>
  (value >= 1024 ? 'text-xs' : value >= 128 ? 'text-sm' : 'text-lg sm:text-xl');

const blankGrid = (): Cell[][] =>
  Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));

function gridOf(tiles: Tile[]): Cell[][] {
  const grid = blankGrid();
  for (const tile of tiles) grid[tile.row][tile.col] = tile;
  return grid;
}

/** Cells in movement order, so collapsing only ever walks a lane forwards. */
function lanes(direction: Direction): [number, number][][] {
  const horizontal = direction === 'left' || direction === 'right';
  return Array.from({ length: SIZE }, (_, line) => {
    const cells = Array.from({ length: SIZE }, (_, offset): [number, number] =>
      (horizontal ? [line, offset] : [offset, line]) as [number, number]);
    return direction === 'right' || direction === 'down' ? cells.reverse() : cells;
  });
}

function slide(board: Tile[], direction: Direction) {
  const before = gridOf(board);
  const grid = blankGrid();
  let gained = 0;

  for (const lane of lanes(direction)) {
    const packed = lane
      .map(([row, col]) => before[row][col])
      .filter((tile): tile is Tile => tile !== null);
    const merged: Cell[] = [];
    for (let index = 0; index < packed.length; index += 1) {
      const tile = packed[index];
      const nextTile = packed[index + 1];
      if (nextTile && nextTile.value === tile.value) {
        merged.push({ ...tile, value: tile.value * 2, pop: true });
        gained += tile.value * 2;
        index += 1;
      } else {
        merged.push(tile);
      }
    }
    lane.forEach(([row, col], index) => {
      const tile = merged[index];
      if (tile) grid[row][col] = { ...tile, row, col };
    });
  }

  const tiles = grid.flat().filter((tile): tile is Tile => tile !== null);
  const moved = tiles.length !== board.length || tiles.some((tile) => {
    const previous = board.find((candidate) => candidate.id === tile.id);
    return !previous || previous.row !== tile.row || previous.col !== tile.col || previous.value !== tile.value;
  });
  return { tiles, gained, moved };
}

function spawn(tiles: Tile[], takeId: () => number): Tile[] {
  const taken = new Set(tiles.map((tile) => tile.row * SIZE + tile.col));
  const open = Array.from({ length: SIZE * SIZE }, (_, cell) => cell).filter((cell) => !taken.has(cell));
  if (open.length === 0) return tiles;
  const cell = open[Math.floor(Math.random() * open.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  return [...tiles, { id: takeId(), row: Math.floor(cell / SIZE), col: cell % SIZE, value, pop: true }];
}

const freshBoard = (takeId: () => number) => spawn(spawn([], takeId), takeId);

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < SIZE * SIZE) return true;
  const grid = gridOf(tiles);
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = grid[row][col];
      if (!tile) return true;
      if (col + 1 < SIZE && grid[row][col + 1]?.value === tile.value) return true;
      if (row + 1 < SIZE && grid[row + 1][col]?.value === tile.value) return true;
    }
  }
  return false;
}

export default function TwentyFortyEight({ onScore }: GameProps) {
  const idRef = useRef(0);
  const takeId = useCallback(() => {
    idRef.current += 1;
    return idRef.current;
  }, []);
  const [board, setBoard] = useState<Tile[]>(() => freshBoard(takeId));
  const [score, setScore] = useState(0);
  const [undoDepth, setUndoDepth] = useState(0);
  const [status, setStatus] = useState<Status>('playing');

  // The ref is authoritative: a burst of key repeats has to read the board the
  // previous move already committed, never a stale render snapshot.
  const boardRef = useRef<Tile[]>(board);
  const scoreRef = useRef(0);
  const historyRef = useRef<Snapshot[]>([]);
  const statusRef = useRef<Status>('playing');
  const keepGoingRef = useRef(false);
  const announced = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (status !== 'over' || announced.current) return;
    announced.current = true;
    sounds.error();
    onScore?.(scoreRef.current);
  }, [status, onScore]);

  const move = useCallback((direction: Direction) => {
    if (statusRef.current === 'over') return;
    const result = slide(boardRef.current, direction);
    if (!result.moved) return;

    const next = spawn(result.tiles, takeId);
    const previous = boardRef.current;
    historyRef.current = [{ board: previous, score: scoreRef.current }, ...historyRef.current].slice(0, HISTORY_LIMIT);
    setUndoDepth(historyRef.current.length);
    boardRef.current = next;
    scoreRef.current += result.gained;
    setBoard(next);
    setScore(scoreRef.current);
    sounds.click();

    if (!canMove(next)) statusRef.current = 'over';
    else if (!keepGoingRef.current && next.some((tile) => tile.value >= TARGET)) statusRef.current = 'won';
    else return;
    setStatus(statusRef.current);
  }, [takeId]);

  const undo = useCallback(() => {
    const [previous, ...rest] = historyRef.current;
    if (!previous) return;
    historyRef.current = rest;
    setUndoDepth(rest.length);
    boardRef.current = previous.board;
    scoreRef.current = previous.score;
    setBoard(previous.board);
    setScore(previous.score);
    statusRef.current = 'playing';
    announced.current = false;
    setStatus('playing');
    sounds.toggle();
  }, []);

  const newGame = useCallback(() => {
    boardRef.current = freshBoard(takeId);
    scoreRef.current = 0;
    historyRef.current = [];
    statusRef.current = 'playing';
    keepGoingRef.current = false;
    announced.current = false;
    setBoard(boardRef.current);
    setScore(0);
    setUndoDepth(0);
    setStatus('playing');
    sounds.toggle();
  }, [takeId]);

  const keepGoing = useCallback(() => {
    keepGoingRef.current = true;
    statusRef.current = 'playing';
    setStatus('playing');
    sounds.open();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = KEY_MAP[key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  return (
    <div className="card card-sheen rounded-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">2048</h3>
        <span className="chip chip-accent">Score <span className="font-mono font-semibold">{score}</span></span>
      </div>

      <p role="status" aria-live="polite" className="mt-1.5 text-xs text-[var(--muted)]">
        {status === 'over' ? `No moves left. Final score ${score}.`
          : status === 'won' ? '2048 reached. Keep going or start over.'
            : 'Merge equal tiles to climb to 2048.'}
      </p>

      <div
        role="group" tabIndex={0} onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        aria-label="2048 board. Arrow keys or W A S D slide the tiles while this board has focus; swiping works too."
        className="relative mx-auto mt-3 aspect-square w-full max-w-[19rem] select-none rounded-card border border-[var(--line-strong)] bg-[var(--surface-2)] p-1.5 [touch-action:none]"
      >
        {Array.from({ length: SIZE * SIZE }, (_, cell) => (
          <div key={`cell-${cell}`} aria-hidden="true" className="absolute h-1/4 w-1/4 p-1"
            style={{ transform: `translate(${(cell % SIZE) * 100}%, ${Math.floor(cell / SIZE) * 100}%)` }}>
            <div className="h-full w-full rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
          </div>
        ))}

        {board.map((tile) => (
          <div key={tile.id} aria-hidden="true"
            className="absolute left-1.5 top-1.5 h-1/4 w-1/4 p-1 transition-transform duration-150 ease-out-expo"
            style={{ transform: `translate(${tile.col * 100}%, ${tile.row * 100}%)` }}>
            <div className={`grid h-full w-full place-items-center rounded-lg border font-display font-bold ${tone(tile.value)} ${textSize(tile.value)} ${tile.pop ? 'animate-scale-in' : ''}`}>
              {tile.value}
            </div>
          </div>
        ))}

        {status !== 'playing' && (
          <div className="glass absolute inset-0 grid place-items-center rounded-card p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              {status === 'won' ? (
                <>
                  <Trophy size={22} className="text-[var(--accent)]" aria-hidden="true" />
                  <p className="font-display text-sm font-bold text-[var(--ink)]">2048 reached.</p>
                  <button type="button" onClick={keepGoing} className="btn btn-primary">Keep going</button>
                </>
              ) : (
                <>
                  <p className="font-display text-sm font-bold text-[var(--ink)]">Board is full.</p>
                  <button type="button" onClick={newGame} className="btn btn-primary"><RotateCcw size={15} aria-hidden="true" />New game</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={undo} disabled={undoDepth === 0 || status === 'over'} className="btn btn-ghost"><Undo2 size={15} aria-hidden="true" />Undo</button>
        <button type="button" onClick={newGame} className="btn btn-secondary"><RotateCcw size={15} aria-hidden="true" />New game</button>
      </div>

      <div className="mx-auto mt-3 grid w-full max-w-[13rem] grid-cols-3 gap-2" role="group" aria-label="Slide the board">
        {CONTROLS.map(({ direction, label, spot, Icon }) => (
          <button key={direction} type="button" onClick={() => move(direction)} aria-label={label} className={`${spot} btn btn-icon min-h-[44px]`}>
            <Icon size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
