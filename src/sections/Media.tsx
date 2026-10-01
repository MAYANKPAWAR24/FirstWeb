import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Music2, Play, Video } from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import Overlay from '@/components/Overlay';
import { VideoPlayer } from '@/components/VideoEmbed';
import { isDirectAudioUrl, isImageUrl, resolveVideoSource } from '@/lib/media';
import { sounds } from '@/lib/sound';
import { formatDate } from '@/lib/utils';
import type { MediaItem } from '@/lib/types';

interface MediaSectionProps {
  items: MediaItem[];
  searchTarget?: string | null;
}

type FilterType = 'all' | MediaItem['type'];

const FILTERS: { id: FilterType; label: string; icon: typeof ImageIcon }[] = [
  { id: 'all', label: 'All', icon: ImageIcon },
  { id: 'photo', label: 'Photos', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'music', label: 'Music', icon: Music2 },
];

/** Decides the glyph once, so the card and the lightbox cannot disagree. */
function affordance(item: MediaItem) {
  const source = resolveVideoSource(item.url);
  if (source.kind === 'external' && isDirectAudioUrl(item.url)) return 'audio' as const;
  if (source.kind === 'external' && isImageUrl(item.url)) return 'image' as const;
  if (source.kind === 'embed' || source.kind === 'file') return 'play' as const;
  return 'link' as const;
}

export default function Media({ items, searchTarget }: MediaSectionProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (searchTarget) setFilter('all');
  }, [searchTarget]);

  const visible = useMemo(() => {
    return items
      .filter((item) => item.visible !== false)
      .filter((item) => filter === 'all' || item.type === filter)
      .sort((a, b) => Number(b.featured === true) - Number(a.featured === true)
        || b.date.localeCompare(a.date));
  }, [items, filter]);

  useEffect(() => {
    if (!searchTarget) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-media-${searchTarget}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, visible.length]);

  return (
    <Section
      id="media"
      eyebrow="Gallery"
      title="Media"
      lede="Photography, video and audio — a visual record of the work behind the words."
      aside={(
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter media by type">
          {FILTERS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => { sounds.click(); setFilter(option.id); }}
                onMouseEnter={() => sounds.hover()}
                className="filter-pill"
              >
                <Icon size={13} aria-hidden="true" className="mr-1 inline align-[-2px]" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    >
      {visible.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No media yet' : 'Nothing in this category'}
          body={items.length === 0
            ? 'Photos, videos and audio added here appear in a gallery with a full-screen viewer.'
            : 'Pick a different category, or add media from Admin → Media.'}
        />
      ) : (
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <MediaCard key={item.id} item={item} onOpen={() => { sounds.open(); setLightbox(item); }} />
          ))}
        </RevealGroup>
      )}

      {lightbox && (
        <MediaLightbox
          item={lightbox}
          onClose={() => { sounds.close(); setLightbox(null); }}
          onNext={() => {
            const index = visible.findIndex((entry) => entry.id === lightbox.id);
            const next = visible[(index + 1) % visible.length];
            if (next) { sounds.click(); setLightbox(next); }
          }}
          onPrevious={() => {
            const index = visible.findIndex((entry) => entry.id === lightbox.id);
            const previous = visible[(index - 1 + visible.length) % visible.length];
            if (previous) { sounds.click(); setLightbox(previous); }
          }}
        />
      )}
    </Section>
  );
}

/**
 * A media card.
 *
 * This used to be a `<div onClick>`, which left every photo and video
 * unreachable by keyboard and invisible as an interactive element to assistive
 * tech while still looking clickable. It is now a real `<button>`.
 *
 * Music is the exception: an `<audio controls>` element cannot legally be
 * nested inside a `<button>`, so audio cards render the player as the primary
 * control and offer a separate, explicitly labelled link out.
 */
function MediaCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const mode = affordance(item);
  const isAudio = mode === 'audio';
  const glyph = mode === 'play' ? <Play size={18} aria-hidden="true" className="translate-x-px" />
    : mode === 'link' ? <ExternalLink size={17} aria-hidden="true" /> : null;

  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-[var(--dur-drawer)] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-[var(--faint)]" aria-hidden="true">
            <ImageIcon size={26} />
          </span>
        )}
        <div className="on-media-shade pointer-events-none absolute inset-0" aria-hidden="true" />

        <span className="on-media absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium capitalize backdrop-blur-md">
          {item.type}
        </span>
        {item.featured && (
          <span className="on-media absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
            Featured
          </span>
        )}

        {glyph && (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-[var(--dur-hover)] group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md">
              {glyph}
            </span>
          </span>
        )}

        <span className="on-media absolute inset-x-3 bottom-2.5 text-xs font-medium drop-shadow">
          {item.title}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <h3 className="truncate text-[13px] font-semibold text-[var(--ink)]">{item.title}</h3>
        <span className="shrink-0 text-[11px] text-[var(--faint)]">{formatDate(item.date)}</span>
      </div>
    </>
  );

  return (
    <div id={`search-target-media-${item.id}`} data-reveal-item>
      <TiltCard lit maxTilt={2} className="h-full overflow-hidden">
        {isAudio ? (
          <div className="flex h-full flex-col">
            <div className="group relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">{body}</div>
            <div className="mt-auto px-3.5 pb-3.5">
              <label className="sr-only" htmlFor={`audio-${item.id}`}>Play {item.title}</label>
              <audio id={`audio-${item.id}`} controls preload="none" src={item.url} className="w-full" />
            </div>
          </div>
        ) : (
          // A <button> may only contain phrasing content, so the card is a
          // container and the real control sits in the title row. Its ::after
          // overlay makes the whole card clickable without nesting blocks
          // inside a button, which is invalid HTML.
          <div className="card card-interactive card-sheen group relative flex h-full w-full flex-col overflow-hidden">
            {body}
            {/* The control has to be a real, visible element: an `sr-only`
                button is clipped to 1px, so the card looks clickable and does
                nothing. `card-action` stretches its ::after over the whole card
                while the text itself stays hidden. */}
            <button
              type="button"
              onClick={onOpen}
              onMouseEnter={() => sounds.hover()}
              className="card-action absolute inset-0 z-10 h-full w-full cursor-pointer rounded-card"
            >
              <span className="sr-only">Open {item.title}</span>
            </button>
          </div>
        )}
      </TiltCard>
    </div>
  );
}

function MediaLightbox({
  item,
  onClose,
  onNext,
  onPrevious,
}: {
  item: MediaItem;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const source = resolveVideoSource(item.url);

  // Arrow-key browsing, advertised by the hint below the media.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') onNext();
      else if (event.key === 'ArrowLeft') onPrevious();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onPrevious]);

  return (
    <Overlay open onClose={onClose} labelledBy="lightbox-title" variant="sheet" panelClassName="sm:max-w-4xl">
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-3.5 pr-14">
        <div className="min-w-0">
          <h2 id="lightbox-title" className="truncate font-display text-base font-bold tracking-tight text-[var(--ink)]">
            {item.title}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {item.type}{item.category && ` · ${item.category}`} · {formatDate(item.date)}
          </p>
        </div>
      </div>

      <div className="scroll-y flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[var(--surface-2)] p-4 sm:p-6">
        {item.type === 'photo' || source.kind === 'external' ? (
          isImageUrl(item.url) || item.type === 'photo' ? (
            <img
              src={item.url || item.thumbnail}
              alt={item.title}
              className="max-h-[70dvh] w-auto max-w-full rounded-card object-contain shadow-[0_18px_50px_-24px_rgba(12,12,17,0.5)]"
            />
          ) : (
            <VideoPlayer url={item.url} title={item.title} />
          )
        ) : (
          <VideoPlayer url={item.url} title={item.title} />
        )}

        <div className="flex w-full max-w-md items-center justify-between gap-2 pt-1">
          <button type="button" onClick={onPrevious} onMouseEnter={() => sounds.hover()} className="btn btn-ghost h-9 min-h-0 px-3 text-xs">
            Previous
          </button>
          <span className="text-[11px] text-[var(--faint)]">Use ← → to browse</span>
          <button type="button" onClick={onNext} onMouseEnter={() => sounds.hover()} className="btn btn-ghost h-9 min-h-0 px-3 text-xs">
            Next
          </button>
        </div>
      </div>
    </Overlay>
  );
}
