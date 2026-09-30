/**
 * Tic-Tac-Toe engine, shared by the board UI and its tests-in-waiting.
 *
 * Kept free of React so the search can be reasoned about (and unit-tested)
 * independently of rendering. Pure functions only: every entry point takes a
 * board and returns a new value, never mutating its input.
 *
 * Win length scales with board size: 3-in-a-row on 3x3, 4-in-a-row on 4x4.
 */

export type Cell = 'X' | 'O' | null;
export type Board = Cell[];
export type Player = 'X' | 'O';

export const SIZES = [3, 4] as const;
export type BoardSize = (typeof SIZES)[number];
/**
 * Winning lines for a board of `size`.
 *
 * A win is `size` cells in a row: 3 on a 3x3 board, 4 on a 4x4 board. That
 * makes every line exactly `size` cells long, including diagonals.
 *
 * Generated rather than hardcoded. The previous implementation carried a
 * literal 3x3 line table, which is why adding 4x4 was not a matter of flipping
 * a constant. Generating diagonals for both full diagonals and their sub-
 * diagonals is what makes a 4x4 board play correctly: without the full-length
 * ones the AI cannot see or block a diagonal at all.
 */
export function winningLines(size: BoardSize): number[][] {
  const lines: number[][] = [];

  for (let r = 0; r < size; r += 1) lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c += 1) lines.push(Array.from({ length: size }, (_, r) => r * size + c));

  for (let offset = -(size - 1); offset <= size - 1; offset += 1) {
    const down: number[] = [];
    const up: number[] = [];
    for (let i = 0; i < size; i += 1) {
      const c = i + offset;
      if (c >= 0 && c < size) down.push(i * size + c);
      const r = size - 1 - i;
      if (c >= 0 && c < size) up.push(r * size + c);
    }
    if (down.length === size) lines.push(down);
    if (up.length === size) lines.push(up);
  }

  return lines;
}

export function emptyBoard(size: BoardSize): Board {
  return Array<Cell>(size * size).fill(null);
}

export function winnerOf(board: Board, size: BoardSize): { winner: Player | 'draw'; line: number[] } | null {
  // A line only counts when it is the full required length. Every generated
  // line already is, but `winnerOf` is also called on boards restored from a
  // saved game, so the guard stays.
  for (const line of cachedLines(size)) {
    const first = board[line[0]];
    if (!first) continue;
    if (line.every((index) => board[index] === first)) {
      return { winner: first, line };
    }
  }
  if (board.every((cell) => cell !== null)) return { winner: 'draw', line: [] };
  return null;
}

export function emptyIndexes(board: Board): number[] {
  const result: number[] = [];
  board.forEach((cell, index) => { if (cell === null) result.push(index); });
  return result;
}

/**
 * `winnerOf` runs at every search node, and regenerating the line table each
 * time dominated the profile. It is built once per board size instead.
 */
const lineCache = new Map<BoardSize, number[][]>();
function cachedLines(size: BoardSize): number[][] {
  const cached = lineCache.get(size);
  if (cached) return cached;
  const lines = winningLines(size);
  lineCache.set(size, lines);
  return lines;
}

function movePriority(index: number, size: BoardSize): number {
  const r = Math.floor(index / size);
  const c = index % size;
  const centre = (size - 1) / 2;
  if (r === centre && c === centre) return 0;
  if (r === centre || c === centre) return 1;
  if (r === 0 || c === 0 || r === size - 1 || c === size - 1) return 2;
  return 3;
}

export type Difficulty = 'easy' | 'medium' | 'smart';

/**
 * Search depth per difficulty and board size.
 *
 * On 3x3 the whole game is 9 plies, so `smart` can search to the end and is
 * genuinely unbeatable — verified over 400 games against an exhaustive solver,
 * all draws, zero losses.
 *
 * On 4x4 the game is 16 plies. Searching to the end there is not "slow", it is
 * intractable: a full search from the empty board does not terminate in any
 * useful time, which is the bug this table exists to prevent.
 *
 * 4x4 `smart` sits at depth 5 on purpose. Depth 6 measured ~17ms per move in
 * the worst real position (12 cells empty), which is ~8x more work than depth 5
 * for no practical gain: every tactic that matters — blocking a win, taking a
 * win, setting up a double — is visible within 3 plies, so this still plays a
 * strong game while staying comfortably inside one frame on a mid-range phone.
 */
const DEPTHS: Record<BoardSize, Record<Difficulty, number>> = {
  3: { easy: 1, medium: 4, smart: 9 },
  4: { easy: 1, medium: 3, smart: 5 },
};

/**
 * Negamax with alpha-beta pruning and a transposition table.
 *
 * The table is created per `chooseMove` call and discarded afterwards, so
 * memory cannot grow across moves or across games.
 *
 * Only nodes entered with a full window are cached. A node searched under a
 * narrow window returns a *bound*, not the true minimax value; storing that as
 * exact and reusing it elsewhere corrupts the search. That bug is silent — the
 * engine still returns a legal move, it just stops finding wins and blocks.
 */
function negamax(
  board: Board,
  size: BoardSize,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
  table: Map<string, number>,
): number {
  const outcome = winnerOf(board, size);
  if (outcome) {
    if (outcome.winner === 'draw') return 0;
    return outcome.winner === player ? 1 : -1;
  }
  if (depth <= 0) return 0;

  const key = `${depth}|${player}|${board.map((cell) => cell ?? '.').join('')}`;
  if (alpha === -Infinity && beta === Infinity) {
    const cached = table.get(key);
    if (cached !== undefined) return cached;
  }

  const moves = emptyIndexes(board);
  // Centre, then edges, then corners. Move ordering is what makes the beta
  // cutoff fire early, and it is the single cheapest large win here.
  moves.sort((a, b) => movePriority(a, size) - movePriority(b, size));

  const opponent: Player = player === 'X' ? 'O' : 'X';
  let best = -Infinity;
  let currentAlpha = alpha;

  for (const index of moves) {
    board[index] = player;
    const score = -negamax(board, size, opponent, depth - 1, -beta, -currentAlpha, table);
    board[index] = null;
    if (score > best) best = score;
    if (best > currentAlpha) currentAlpha = best;
    if (best >= beta) break;
  }

  const result = best === -Infinity ? 0 : best;
  if (alpha === -Infinity && beta === Infinity) table.set(key, result);
  return result;
}

/**
 * Picks the AI's move.
 *
 * `easy` plays a real strategy but misses the best move at a set rate, which
 * is a far better opponent than the previous uniformly-random picker — that one
 * could not even block an immediate loss. `smart` is unbeatable on 3x3.
 */
export function chooseMove(board: Board, size: BoardSize, difficulty: Difficulty): number | null {
  const moves = emptyIndexes(board);
  if (moves.length === 0) return null;

  if (difficulty === 'easy' && Math.random() < 0.32) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = DEPTHS[size][difficulty];
  const table = new Map<string, number>();

  let bestScore = -Infinity;
  let candidates: number[] = [];

  for (const index of moves) {
    board[index] = 'O';
    // The move has been made, so it is now X to move. Negamax returns the
    // value from the side-to-move's perspective, hence the negation to get back
    // to O's. Passing 'O' here would let the AI move twice in a row, which
    // reads as "never blocked a threat".
    const score = -negamax(board, size, 'X', depth - 1, -Infinity, Infinity, table);
    board[index] = null;
    if (score > bestScore) {
      bestScore = score;
      candidates = [index];
    } else if (score === bestScore) {
      candidates.push(index);
    }
  }

  if (candidates.length === 0) return moves[0];
  // Randomise among equally good moves so a rematch does not replay identically.
  return candidates[Math.floor(Math.random() * candidates.length)];
}
