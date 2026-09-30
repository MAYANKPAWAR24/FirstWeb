import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Brain, Calculator, Feather, Gamepad2, Gauge, Grid3x3, Swords, Zap } from 'lucide-react';
import type { MiniGameKind } from '@/lib/types';

/**
 * The single source of truth for every mini-game.
 *
 * Before this existed, game identity was hardcoded in four separate places:
 * `MINI_GAME_KINDS` in types, the admin `<select>`, a display ternary in the
 * admin list, and the component switch in `CustomSections`. Adding a game meant
 * four coordinated edits and any mismatch silently fell back to Tic-Tac-Toe.
 *
 * Everything now derives from this record: the admin manager, the Play Break
 * section, and the Section Builder's game preview.
 *
 * Note the id format differs per game (`twenty-forty-eight`, `word-forge`) while
 * the old identifiers (`tic-tac-toe`, `snake`) are kept byte-for-byte. Those two
 * are stored in existing records and must never change or saved custom sections
 * would stop rendering.
 */

export interface GameProps {
  /** Called when the player finishes a round, for score reporting. */
  onScore?: (score: number) => void;
}

export interface GameDefinition {
  id: MiniGameKind;
  title: string;
  blurb: string;
  /** Short label used on the card. */
  tag: string;
  icon: typeof Gamepad2;
  tags: string[];
  /** Approximate playing surface, used to size the loading skeleton so the
   *  lazy chunk does not resolve into a ~140px layout shift. */
  heightClass: string;
  load: () => Promise<{ default: ComponentType<GameProps> }>;
}

export const GAME_REGISTRY: Record<MiniGameKind, GameDefinition> = {
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    blurb: 'Out-think the machine across a 3×3 or 4×4 board.',
    tag: 'Classic',
    icon: Grid3x3,
    tags: ['Strategy', 'Quick'],
    heightClass: 'h-[22rem]',
    load: () => import('./TicTacToe'),
  },
  memory: {
    id: 'memory',
    title: 'Memory Match',
    blurb: 'Find every pair before the clock runs out.',
    tag: 'Recall',
    icon: Brain,
    tags: ['Recall', 'Relaxing'],
    heightClass: 'h-[26rem]',
    load: () => import('./MemoryMatch'),
  },
  'twenty-forty-eight': {
    id: 'twenty-forty-eight',
    title: '2048',
    blurb: 'Slide and merge the tiles up to 2048.',
    tag: 'Puzzle',
    icon: Gamepad2,
    tags: ['Puzzle', 'Addictive'],
    heightClass: 'h-[30rem]',
    load: () => import('./TwentyFortyEight'),
  },
  snake: {
    id: 'snake',
    title: 'Snake',
    blurb: 'Classic arcade loop with three difficulty tiers.',
    tag: 'Arcade',
    icon: Zap,
    tags: ['Arcade', 'Reflex'],
    heightClass: 'h-[26rem]',
    load: () => import('./Snake'),
  },
  'rock-paper-scissors': {
    id: 'rock-paper-scissors',
    title: 'Rock Paper Scissors',
    blurb: 'First to five against a pattern-reading opponent.',
    tag: 'Duel',
    icon: Swords,
    tags: ['Duel', 'Quick'],
    heightClass: 'h-[20rem]',
    load: () => import('./RockPaperScissors'),
  },
  reaction: {
    id: 'reaction',
    title: 'Reaction Tap',
    blurb: 'Wait for green, then tap as fast as you can.',
    tag: 'Reflex',
    icon: Gauge,
    tags: ['Reflex', 'Solo'],
    heightClass: 'h-[18rem]',
    load: () => import('./ReactionTap'),
  },
  'word-forge': {
    id: 'word-forge',
    title: 'Word Forge',
    blurb: 'Guess the hidden word before the six guesses run out.',
    tag: 'Word',
    icon: Feather,
    tags: ['Vocabulary', 'Solo'],
    heightClass: 'h-[26rem]',
    load: () => import('./WordForge'),
  },
  'math-sprint': {
    id: 'math-sprint',
    title: 'Math Sprint',
    blurb: 'Thirty seconds. As many correct answers as you can.',
    tag: 'Speed',
    icon: Calculator,
    tags: ['Numbers', 'Timed'],
    heightClass: 'h-[24rem]',
    load: () => import('./MathSprint'),
  },
};

/** Registry order, used as the fallback when an admin saves no explicit order. */
export const DEFAULT_GAME_ORDER: MiniGameKind[] = [
  'tic-tac-toe',
  'memory',
  'twenty-forty-eight',
  'snake',
  'word-forge',
  'math-sprint',
  'rock-paper-scissors',
  'reaction',
];

/**
 * Resolves an unknown or legacy id to something renderable. A record written
 * before these games existed can still name a `game` on a custom section, and
 * an unrecognised value must not crash the public page.
 */
export function resolveGame(kind: unknown): GameDefinition {
  return typeof kind === 'string' && kind in GAME_REGISTRY
    ? GAME_REGISTRY[kind as MiniGameKind]
    : GAME_REGISTRY['tic-tac-toe'];
}

const cache = new Map<MiniGameKind, LazyExoticComponent<ComponentType<GameProps>>>();

/** Memoised `React.lazy` so repeated mounts reuse one chunk promise. */
export function lazyGame(kind: MiniGameKind): LazyExoticComponent<ComponentType<GameProps>> {
  const cached = cache.get(kind);
  if (cached) return cached;
  const definition = resolveGame(kind);
  const component = lazy(definition.load);
  cache.set(definition.id, component);
  return component;
}
