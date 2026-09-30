import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Section from '@/components/Section';
import Reveal from '@/components/Reveal';
import Leaderboard from '@/components/games/Leaderboard';
import { sounds, reportScore } from '@/lib/sound';
import {
  GAME_REGISTRY, lazyGame, resolveGame,
  type GameDefinition,
} from '@/components/games/registry';
import type { GameSettings, LeaderboardSettings, MiniGameKind } from '@/lib/types';

interface GamesSectionProps {
  settings: GameSettings;
  leaderboard: LeaderboardSettings;
}

interface RoundResult {
  game: MiniGameKind;
  score: number;
  /** Monotonic so two identical scores still trigger a fresh board read. */
  nonce: number;
}

export default function GamesSection({ settings, leaderboard }: GamesSectionProps) {
  const [active, setActive] = useState<{ kind: MiniGameKind; key: number } | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const games = useMemo(() => {
    const hidden = new Set(settings.hidden);
    const ordered = [
      ...settings.order.filter((kind) => !hidden.has(kind)),
      // Anything the registry knows about but the saved order omits still shows,
      // so adding a game in a later release never requires a data migration.
      ...(Object.keys(GAME_REGISTRY) as MiniGameKind[]).filter(
        (kind) => !hidden.has(kind) && !settings.order.includes(kind),
      ),
    ];
    return ordered.map(resolveGame);
  }, [settings.hidden, settings.order]);

  const featured = resolveGame(settings.featured);

  // Warm the chunk shortly before the section scrolls into view. `lazy()`
  // already splits the bundle, but without this the request fires the moment
  // the section mounts, which on a slow connection delays the whole page.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      games.forEach((game) => { void lazyGame(game.id); });
      observer.disconnect();
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, [games]);

  // The game reports a score without knowing which game it is; the section
  // stamps whichever one is currently open onto the result.
  const activeRef = useRef(active);
  activeRef.current = active;

  const handleScored = useCallback((score: number) => {
    const game = activeRef.current?.kind;
    if (!game) return;
    setResult((current) => ({ game, score, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

  if (!settings.enabled || games.length === 0) return null;

  const current = active?.kind ?? featured.id;
  const currentGame = resolveGame(current);
  const otherGames = games.filter((game) => game.id !== current);

  return (
    <Section
      id="games"
      eyebrow="Play Break"
      title="Interactive Corner"
      lede="A short set of small games, built to be picked up in a minute. Nothing to install, nothing uploaded."
    >
      <Reveal className="mb-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a game">
          {games.map((game) => {
            const Icon = game.icon;
            const selected = active?.kind === game.id;
            return (
              <button
                key={game.id}
                type="button"
                aria-pressed={selected}
                onClick={() => { sounds.click(); setActive({ kind: game.id, key: Date.now() }); }}
                onMouseEnter={() => sounds.hover()}
                className={selected ? 'btn btn-primary h-9 min-h-0 px-3.5 text-xs' : 'btn btn-secondary h-9 min-h-0 px-3.5 text-xs'}
              >
                <Icon size={13} aria-hidden="true" />
                {game.title}
              </button>
            );
          })}
        </div>
      </Reveal>

      <div ref={sectionRef} className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Reveal from="left">
            <div className="flex items-center gap-3 rounded-panel border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 flex-none place-items-center rounded-card bg-[var(--accent-soft)] text-[var(--accent)]"
              >
                {(() => { const Icon = currentGame.icon; return <Icon size={17} />; })()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
                  {currentGame.title}
                </p>
                <p className="text-xs leading-snug text-[var(--muted)]">{currentGame.blurb}</p>
              </div>
              {active && (
                <button
                  type="button"
                  onClick={() => { sounds.click(); setActive(null); }}
                  className="btn btn-ghost ml-auto h-8 min-h-0 shrink-0 px-3 text-xs"
                >
                  Close
                </button>
              )}
            </div>
          </Reveal>

          <div className="mt-4">
            {active ? (
              <Suspense key={active.key} fallback={<GameSkeleton definition={currentGame} />}>
                <ActiveGame kind={active.kind} onScore={handleScored} />
              </Suspense>
            ) : (
              <GameSkeleton definition={featured} idle />
            )}
          </div>

          {leaderboard.enabled && (
            <Reveal className="mt-4">
              <Leaderboard
                game={current}
                gameTitle={currentGame.title}
                settings={leaderboard}
                refreshKey={result?.game === current ? result.nonce : 0}
                latestScore={result?.game === current ? result.score : 0}
              />
            </Reveal>
          )}
        </div>

        <Reveal from="right">
          <ul className="space-y-2">
            {otherGames.map((game) => (
              <li key={game.id}>
                <GameCard game={game} onPlay={() => { sounds.click(); setActive({ kind: game.id, key: Date.now() }); }} />
              </li>
            ))}
            {games.length === 1 && (
              <li>
                <p className="rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
                  More games can be enabled from Admin → Games.
                </p>
              </li>
            )}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

function GameCard({ game, onPlay }: { game: GameDefinition; onPlay: () => void }) {
  const Icon = game.icon;
  return (
    <button
      type="button"
      onClick={onPlay}
      onMouseEnter={() => sounds.hover()}
      className="card card-interactive card-sheen flex w-full items-center gap-3 rounded-panel p-4 text-left"
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)]"
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold tracking-tight text-[var(--ink)]">{game.title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--muted)]">{game.blurb}</span>
      </span>
      <span className="tag flex-none">{game.tag}</span>
    </button>
  );
}

/**
 * Skeleton sized from the registry's declared board height, so the lazy chunk
 * resolving does not shift the layout.
 */
function GameSkeleton({ definition, idle }: { definition: GameDefinition; idle?: boolean }) {
  return (
    <div className={`card card-sheen grid w-full place-items-center rounded-panel p-6 ${definition.heightClass}`}>
      {idle ? (
        <div className="max-w-sm text-center">
          <p className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
            Pick a game to play
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
            Each one is a small, self-contained challenge. They load on demand and
            never run in the background.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading {definition.title}</span>
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      )}
    </div>
  );
}

function ActiveGame({ kind, onScore }: { kind: MiniGameKind; onScore: (score: number) => void }) {
  const Game = lazyGame(kind);
  // `reportScore` clamps and rounds once, centrally, so no game has to.
  const handle = useCallback((score: number) => reportScore(onScore, score), [onScore]);
  return (
    <div className="flex justify-center">
      <Game onScore={handle} />
    </div>
  );
}