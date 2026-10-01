import { uid } from './utils';
import type { GlobalScore, MiniGameKind } from './types';

/**
 * Player names and high scores.
 *
 * TWO STORES, TWO JOBS
 * ====================
 *  local   this device only. Always works, never touches the network.
 *  global  one shared board in a SEPARATE JSONBin bin, read by every visitor.
 *
 * The shared board lives in its own bin rather than the content record on
 * purpose. A score is written every time anyone finishes a round; if those
 * writes shared a record with the admin's content, a visitor playing a game
 * could silently overwrite an edit that had not synced yet. Unrelated records
 * means unrelated failure modes.
 *
 * Both are still kept. The local board is the offline fallback, and a player
 * who has not enabled sharing still sees their own history.
 */

const NAME_KEY = 'portfolio_player_name_v1';
const SCORE_KEY_PREFIX = 'portfolio_scores_v1_';
/** One board per game, capped. Ten is the hard ceiling regardless of admin. */
export const MAX_ENTRIES = 10;
const MAX_NAME_LENGTH = 16;

export interface ScoreEntry {
  name: string;
  score: number;
  /** ISO date. Stored so the board can show recency without a second field. */
  date: string;
  /** False for entries an admin has pinned as official. */
  local: boolean;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private browsing or storage disabled: scores are simply unavailable.
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips control characters and HTML, then clamps the length.
 *
 * Names are rendered into the leaderboard as text, but they are visitor-supplied
 * and persisted, so they are sanitised on the way in rather than trusted on the
 * way out. Emoji are left alone — they survive the strip.
 */
/** C0, DEL/C1, zero-width and the bidi override ranges. */
function isStrippedCodePoint(code: number): boolean {
  if (code <= 0x1f) return true;
  if (code >= 0x7f && code <= 0x9f) return true;
  if (code >= 0x200b && code <= 0x200f) return true;
  if (code >= 0x202a && code <= 0x202e) return true;
  if (code >= 0x2066 && code <= 0x2069) return true;
  return code === 0xfeff;
}

const HTML_UNSAFE = new Set(['<', '>', '&', '"', "'", '`']);

/**
 * Names are visitor-supplied and persisted, so they are cleaned on the way in
 * rather than trusted on the way out.
 *
 * Done with char codes rather than a regex so the intent is explicit and
 * reviewable — and so the bidi override range is provably handled. Bidi
 * characters can visually reorder a row, making one name render as another.
 * Emoji and non-Latin scripts are left intact.
 */
export function sanitizePlayerName(raw: string): string {
  let out = '';
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    if (isStrippedCodePoint(code)) continue;
    if (HTML_UNSAFE.has(character)) continue;
    out += character;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function isValidPlayerName(raw: string): boolean {
  const clean = sanitizePlayerName(raw);
  return clean.length >= 2 && clean.length <= MAX_NAME_LENGTH;
}

export function loadPlayerName(): string {
  return sanitizePlayerName(safeGet(NAME_KEY) ?? '');
}

export function savePlayerName(name: string): string {
  const clean = sanitizePlayerName(name);
  if (clean) safeSet(NAME_KEY, clean);
  return clean;
}

export function clearPlayerName() {
  try { localStorage.removeItem(NAME_KEY); } catch { /* ignore */ }
}

function scoreKey(kind: MiniGameKind) {
  return `${SCORE_KEY_PREFIX}${kind}`;
}

/** Reads a stored board, discarding anything malformed. */
export function readScores(kind: MiniGameKind): ScoreEntry[] {
  const raw = safeGet(scoreKey(kind));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        name: sanitizePlayerName(typeof entry.name === 'string' ? entry.name : ''),
        score: Number.isFinite(Number(entry.score)) ? Math.trunc(Number(entry.score)) : 0,
        date: typeof entry.date === 'string' ? entry.date : new Date().toISOString(),
        local: true,
      }))
      .filter((entry) => entry.name.length >= 2)
      .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeScores(kind: MiniGameKind, entries: ScoreEntry[]): boolean {
  const capped = entries
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, MAX_ENTRIES);
  return safeSet(scoreKey(kind), JSON.stringify(capped));
}

/**
 * Records a score. Returns the 1-based rank it landed at within the cap, or 0
 * when it was not recorded.
 *
 * Scores below 1 are refused. A zero is not a result worth recording — a drawn
 * Tic-Tac-Toe round would otherwise occupy a board row forever and push out a
 * real score at the bottom.
 */
export function submitScore(kind: MiniGameKind, name: string, score: number): number {
  const clean = sanitizePlayerName(name);
  const cleanScore = Number.isFinite(score) ? Math.trunc(score) : 0;
  if (clean.length < 2 || cleanScore < 1) return 0;

  const entries = readScores(kind);
  const entry: ScoreEntry = {
    name: clean,
    score: cleanScore,
    date: new Date().toISOString(),
    local: true,
  };

  // One entry per name per board, keeping that player's best. Without this a
  // player could pad the board by replaying, and it makes the board confusing
  // to read.
  const withoutPlayer = entries.filter((existing) => existing.name !== clean);
  const combined = [...withoutPlayer, entry].sort(
    (a, b) => b.score - a.score || a.date.localeCompare(b.date),
  );

  if (writeScores(kind, combined)) {
    const rank = combined.findIndex((row) => row.name === clean && row.date === entry.date) + 1;
    return rank > 0 && rank <= MAX_ENTRIES ? rank : 0;
  }
  return 0;
}

export function clearScores(kind: MiniGameKind) {
  try { localStorage.removeItem(scoreKey(kind)); } catch { /* ignore */ }
}

export function clearAllScores(kinds: MiniGameKind[]) {
  kinds.forEach(clearScores);
}

/**
 * Merges the visitor's local board with the admin's curated board.
 *
 * Official entries sort above local ones at the same score, because a curated
 * entry is a deliberate choice by the site owner whereas a local one is whatever
 * a device happened to record. Duplicated names keep the official entry.
 */
export function mergeBoards(
  local: ScoreEntry[],
  official: ScoreEntry[],
  limit: number,
): ScoreEntry[] {
  const seen = new Set<string>();
  const merged: ScoreEntry[] = [];
  for (const entry of [...official, ...local]) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged
    .sort((a, b) => (Number(b.local === false) - Number(a.local === false)) || b.score - a.score
      || a.date.localeCompare(b.date))
    .slice(0, Math.max(1, Math.min(limit, MAX_ENTRIES)));
}

/* ------------------------------------------------------------------ *
 * The shared board
 * ------------------------------------------------------------------ */

const GLOBAL_FETCH_TIMEOUT_MS = 6000;

/** Raw shared entries, newest first. Empty when unavailable. */
export async function fetchGlobalScores(signal?: AbortSignal): Promise<GlobalScore[]> {
  if (typeof fetch !== 'function') return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GLOBAL_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scores' }),
      signal: signal ?? controller.signal,
    });
    if (!response.ok) return [];
    const result = await response.json() as { scores?: unknown };
    if (!Array.isArray(result.scores)) return [];
    return result.scores
      .filter((entry): entry is GlobalScore => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        id: String(entry.id ?? ''),
        game: entry.game as MiniGameKind,
        name: sanitizePlayerName(String(entry.name ?? '')),
        score: Number.isFinite(Number(entry.score)) ? Math.trunc(Number(entry.score)) : 0,
        date: typeof entry.date === 'string' ? entry.date : '',
      }))
      .filter((entry) => entry.name.length >= 2 && entry.score > 0);
  } catch {
    // Offline, rate-limited or misconfigured. The local board still renders,
    // so this is a degraded result rather than an error state.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends a score to the shared board.
 *
 * Only called when the score actually qualifies, so a run that would not place
 * never touches the network.
 */
export async function submitGlobalScore(
  game: MiniGameKind,
  name: string,
  score: number,
): Promise<boolean> {
  const cleanName = sanitizePlayerName(name);
  const cleanScore = Math.trunc(Number(score) || 0);
  if (cleanName.length < 2 || cleanScore < 1) return false;
  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'score', id: uid(), game, name: cleanName, score: cleanScore }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Reduces the shared list to one player's best score per name.
 *
 * Without this, one determined player could fill all ten rows by replaying the
 * same game, and the board would stop being a leaderboard.
 */
export function rankGlobalScores(
  scores: GlobalScore[],
  game: MiniGameKind,
  limit: number,
): ScoreEntry[] {
  const best = new Map<string, ScoreEntry>();
  scores
    .filter((entry) => entry.game === game)
    .forEach((entry) => {
      const key = entry.name.toLowerCase();
      const existing = best.get(key);
      if (existing) {
        if (entry.score > existing.score) {
          best.set(key, { ...entry, local: false });
        }
        return;
      }
      best.set(key, { name: entry.name, score: entry.score, date: entry.date, local: false });
    });
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, Math.max(1, Math.min(limit, MAX_ENTRIES)))
    .map((entry) => ({ ...entry, local: false }));
}

/** The score that would put an entry in last place, or 0 for an empty board. */
export function cutoffScore(entries: ScoreEntry[], limit: number): number {
  if (entries.length < limit) return 0;
  return entries[Math.min(entries.length, limit) - 1]?.score ?? 0;
}

/** Does this score make the board? Strictly greater than the 10th place. */
export function qualifies(score: number, entries: ScoreEntry[], limit: number, minimumScore: number): boolean {
  if (score < minimumScore) return false;
  const cutoff = cutoffScore(entries, limit);
  // A board that is not full yet always accepts; once full, ties do not count,
  // which is what stops an existing top-10 name from churning its own row.
  if (cutoff === 0) return true;
  return score > cutoff;
}
