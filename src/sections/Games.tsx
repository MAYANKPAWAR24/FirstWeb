import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Section from '@/components/Section';
import Reveal from '@/components/Reveal';
import { sounds } from '@/lib/sound';
import {
  GAME_REGISTRY, lazyGame, resolveGame,
  type GameDefinition,
} from '@/components/games/registry';
import type { GameSettings, MiniGameKind } from '@/lib/types';

interface GamesSectionProps {
  settings: GameSettings;
}

type Active = { kind: MiniGameKind; key: number };

export default function GamesSection({ settings }: GamesSectionProps) {
  const [active, setActive] = useState<Active | null>(null);
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

  if (!settings.enabled || games.length === 0) return null;

  const isOpen = active?.kind === featured.id;

  return (
    <Section
      id="games"
      eyebrow="Play Break"
      title="Interactive Corner"
      lede="A short set of small games, built to be picked up in a minute. Nothing to install, nothing tracked."
    >
      {/* Featured game gets a playable panel; the rest are a collection. */}
      <Reveal className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
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

      <div ref={sectionRef} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Reveal from="left">
            <div className="flex items-center gap-3 rounded-panel border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 flex-none place-items-center rounded-card bg-[var(--accent-soft)] text-[var(--accent)]"
              >
                {(() => { const Icon = resolveGame(active?.kind ?? settings.featured).icon; return <Icon size={17} />; })()}
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
                  {resolveGame(active?.kind ?? settings.featured).title}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {resolveGame(active?.kind ?? settings.featured).blurb}
                </p>
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
              <Suspense key={active.key} fallback={<GameSkeleton definition={resolveGame(active.kind)} />}>
                <ActiveGame kind={active.kind} />
              </Suspense>
            ) : (
              <GameSkeleton definition={isOpen ? featured : featured} idle />
            )}
          </div>
        </div>

        <Reveal from="right">
          <ul className="space-y-2">
            {games.filter((game) => game.id !== (active?.kind ?? featured.id)).map((game) => (
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
 * resolving does not shift the layout by ~140px.
 */
function GameSkeleton({ definition, idle }: { definition: GameDefinition; idle?: boolean }) {
  return (
    <div className={`card card-sheen grid w-full place-items-center rounded-panel p-6 ${definition.heightClass}`}>
      {idle ? (
        <div className="max-w-sm text-center">
          <p className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
            Pick a game above
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

function ActiveGame({ kind }: { kind: MiniGameKind }) {
  const Game = lazyGame(kind);
  return (
    <div className="flex justify-center">
      <Game />
    </div>
  );
}
