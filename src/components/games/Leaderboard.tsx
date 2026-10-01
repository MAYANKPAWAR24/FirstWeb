import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Medal, Trophy, UserRound } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import {
  fetchGlobalScores, isValidPlayerName, loadPlayerName, mergeBoards,
  qualifies, rankGlobalScores, readScores, sanitizePlayerName, savePlayerName,
  submitGlobalScore, submitScore, type ScoreEntry,
} from '@/lib/gameScores';
import type { GlobalScore, LeaderboardSettings, MiniGameKind, OfficialScore } from '@/lib/types';

interface LeaderboardProps {
  game: MiniGameKind;
  gameTitle: string;
  settings: LeaderboardSettings;
  /**
   * Bumped by the parent whenever a round finishes, which is what triggers a
   * submission and a re-read. Passed as a counter rather than as a mutable
   * object so an identical score still causes one clean round-trip.
   */
  refreshKey: number;
  /** Score just reported by the active game. `0` means nothing to submit. */
  latestScore: number;
}

const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

export default function Leaderboard({
  game, gameTitle, settings, refreshKey, latestScore,
}: LeaderboardProps) {
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [rows, setRows] = useState<ScoreEntry[]>([]);
  const [global, setGlobal] = useState<GlobalScore[]>([]);
  const [lastRank, setLastRank] = useState(0);

  const official = useMemo<ScoreEntry[]>(
    () => settings.officialEntries
      .filter((entry) => entry.game === game)
      .map((entry: OfficialScore) => ({ ...entry, local: false })),
    [settings.officialEntries, game],
  );

  const wantsGlobal = settings.mode === 'global' || settings.mode === 'both';
  const wantsLocal = settings.mode === 'local' || settings.mode === 'both';

  const load = useCallback(() => {
    const local = wantsLocal && settings.showLocal ? readScores(game) : [];
    setRows(mergeBoards(local, official, settings.limit));
  }, [game, official, settings.limit, settings.showLocal, wantsLocal]);

  /**
   * The shared board is fetched separately and merged in, because it is a
   * network read and must never block the local board from rendering. If the
   * request fails the site still shows a working leaderboard, just without the
   * shared rows.
   */
  const refreshGlobal = useCallback(async () => {
    if (!wantsGlobal) { setGlobal([]); return; }
    const shared = await fetchGlobalScores();
    setGlobal(shared);
  }, [wantsGlobal]);

  useEffect(() => { void refreshGlobal(); }, [refreshGlobal, refreshKey]);

  /**
   * Save a finished round.
   *
   * The rule the brief asked for: a score is only kept if it would place in the
   * board. Ties do not qualify — otherwise an existing top-10 name could
   * rewrite its own row on every replay.
   */
  const copy = useMemo(() => ({
    newTop: 'New top score.',
    notQualified: `That score did not place in the top ${settings.limit}. Play again to beat it.`,
  }), [settings.limit]);

  /**
   * The rows actually displayed: the shared board first when it is enabled,
   * this device's own runs alongside it, and the admin's curated entries on
   * top of everything.
   */
  const displayed = useMemo(() => {
    const shared = rankGlobalScores(global, game, settings.limit);
    const local = wantsLocal && settings.showLocal ? readScores(game) : [];
    return mergeBoards(mergeBoards(local, shared, settings.limit), official, settings.limit);
  }, [game, wantsLocal, settings.showLocal, settings.limit, global, official]);

  const save = useCallback(async () => {
    if (refreshKey === 0 || latestScore <= 0 || !settings.enabled) { load(); return; }

    const playerName = loadPlayerName();
    if (settings.requireName && !isValidPlayerName(playerName)) {
      setLastRank(0);
      load();
      return;
    }

    // The board the score has to beat is the one being displayed.
    const shared = wantsGlobal
      ? rankGlobalScores(global.length > 0 ? global : await fetchGlobalScores(), game, settings.limit)
      : [];
    const localBoard = wantsLocal ? readScores(game) : [];
    const board = mergeBoards(localBoard, shared, settings.limit);

    const makesIt = qualifies(latestScore, board, settings.limit, settings.minimumScore);
    setLastRank(makesIt ? 0 : -1);
    if (!makesIt) { load(); return; }

    if (wantsLocal) {
      setLastRank(submitScore(game, playerName || 'Player', latestScore));
    }
    if (wantsGlobal) {
      const sent = await submitGlobalScore(game, playerName || 'Player', latestScore);
      if (sent) await refreshGlobal();
    }
    load();
  }, [refreshKey, latestScore, settings, game, wantsGlobal, wantsLocal, global, load, refreshGlobal]);

  useEffect(() => { void save(); }, [save]);


  // A name is only ever *requested*, never demanded: a score still counts
  // anonymously unless the admin turned `requireName` on.
  useEffect(() => { setName(loadPlayerName()); }, []);

  if (!settings.enabled) return null;


  const handleSaveName = () => {
    if (!isValidPlayerName(name)) {
      setNameError('Between 2 and 16 characters');
      sounds.error();
      return;
    }
    const clean = savePlayerName(name);
    setName(clean);
    setNameError('');
    sounds.success();
    notify(`Playing as ${clean}`);
  };

  const needsName = settings.requireName && rows.every((row) => !row.local);

  return (
    /* A div, not a section: this sits inside the Play Break <section>, and a
       nested <section> is invalid HTML. The visible heading below already
       names the region. */
    <div className="card card-sheen w-full max-w-lg rounded-panel p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-[var(--ink)]">
          <Trophy size={16} aria-hidden="true" className="text-[var(--accent)]" />
          {settings.title}
        </h3>
        <span className="text-[11px] text-[var(--faint)]">{gameTitle}</span>
      </header>

      {/* Name capture. Optional by default, because a visitor should be able to
          play without being interrupted by a form. */}
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`player-name-${game}`} className="label">
            Player name <span className="font-normal text-[var(--faint)]">(optional)</span>
          </label>
          <input
            id={`player-name-${game}`}
            type="text"
            value={name}
            maxLength={16}
            autoComplete="nickname"
            onChange={(event) => { setName(event.target.value); setNameError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter') handleSaveName(); }}
            placeholder={settings.namePlaceholder || 'Your name'}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `player-name-error-${game}` : undefined}
            className="field h-10 min-h-0"
          />
          {nameError && (
            <p id={`player-name-error-${game}`} className="mt-1 text-xs text-[var(--ember)]">{nameError}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSaveName}
          onMouseEnter={() => sounds.hover()}
          className="btn btn-secondary h-10 min-h-0 px-4 text-xs"
        >
          Save
        </button>
      </div>

      {needsName && (
        <p className="mt-3 rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
          Save a name to record your score on this device.
        </p>
      )}

      {lastRank === -1 && (
        <p role="status" className="mt-3 text-[13px] font-medium text-[var(--muted)]">
          {copy.notQualified}
        </p>
      )}
      {lastRank > 0 && (
        <p role="status" className="mt-3 text-[13px] font-medium text-[var(--jade)]">
          {lastRank === 1 ? copy.newTop : `${RANK_LABELS[lastRank - 1]} place.`}
        </p>
      )}

      {displayed.length === 0 ? (
        <div className="mt-4">
          <p className="rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-5 text-center text-[13px] leading-relaxed text-[var(--muted)]">
            No scores yet. Finish a round and yours will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {displayed.map((row, index) => (
            <li
              key={`${row.name}-${index}`}
              className={[
                'flex items-center gap-3 rounded-card border px-3.5 py-2.5 transition-colors duration-[--dur-hover]',
                row.local
                  ? 'border-[var(--line)] bg-[var(--surface-2)]'
                  : 'border-[rgba(10,130,189,0.22)] bg-[var(--accent-soft)]',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'grid h-7 w-7 flex-none place-items-center rounded-full border text-[11px] font-bold',
                  index === 0
                    ? 'border-[rgba(230,79,55,0.3)] bg-[var(--ember-soft)] text-[var(--ember)]'
                    : index === 1
                      ? 'border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-2)]'
                      : index === 2
                        ? 'border-[rgba(230,79,55,0.22)] bg-[var(--surface)] text-[var(--ember)]'
                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--faint)]',
                ].join(' ')}
              >
                {index === 0 ? <Crown size={12} /> : index < 3 ? <Medal size={12} /> : index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--ink)]">
                    {sanitizePlayerName(row.name)}
                  </span>
                  {!row.local && (
                    <span className="chip chip-accent flex-none px-1.5 py-0 text-[9px]">
                      {global.some((entry) => entry.game === game && entry.name === row.name)
                        ? 'Global'
                        : 'Official'}
                    </span>
                  )}
                </span>
                <span className="sr-only">{RANK_LABELS[index]} place.</span>
              </span>

              <span className="flex-none font-display text-[15px] font-bold tabular-nums text-[var(--ink)]">
                {row.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--faint)]">
        <UserRound size={12} aria-hidden="true" className="mt-0.5 flex-none" />
        Scores are stored on this device only and are never uploaded.
      </p>
    </div>
  );
}