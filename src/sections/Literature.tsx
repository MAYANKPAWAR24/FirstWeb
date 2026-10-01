import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Copy, Quote, Search, Share2 } from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import Overlay from '@/components/Overlay';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import { useResponsiveItemLimit } from '@/hooks/useResponsiveItemLimit';
import { copyToClipboard, formatDate } from '@/lib/utils';
import type { Poem } from '@/lib/types';

interface LiteratureProps {
  poems: Poem[];
  searchTarget?: string | null;
}

type FilterType = 'all' | Poem['type'];

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'poem', label: 'Poems' },
  { id: 'novel', label: 'Novels' },
  { id: 'article', label: 'Articles' },
];

const TYPE_GLYPH: Record<Poem['type'], string> = {
  poem: '✦',
  novel: '❖',
  article: '▤',
};

/** Words per minute for prose vs verse. Poems read slower on average. */
function readingTime(content: string, type: Poem['type']) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return '';
  const minutes = words / (type === 'poem' ? 140 : 220);
  return minutes < 1 ? 'Under a minute' : `${Math.max(1, Math.round(minutes))} min read`;
}

function excerptOf(poem: Poem) {
  const firstBlock = poem.content.split('\n').find((line) => line.trim().length > 24);
  return firstBlock ? firstBlock.slice(0, 150).trim() : poem.excerpt;
}

export default function Literature({ poems, searchTarget }: LiteratureProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Poem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const itemLimit = useResponsiveItemLimit();

  useEffect(() => {
    if (!searchTarget) return;
    setFilter('all');
    setSearch('');
    setShowAll(true);
  }, [searchTarget]);

  const visiblePoems = useMemo(() => poems.filter((p) => p.visible !== false), [poems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visiblePoems
      .filter((poem) => filter === 'all' || poem.type === filter)
      .filter((poem) => {
        if (!query) return true;
        return [poem.title, poem.excerpt, poem.category, poem.author]
          .some((field) => field.toLowerCase().includes(query));
      })
      // Pinned works first, then newest. Both are stable so the grid does not
      // reshuffle when a date is edited.
      .sort((a, b) => Number(b.featured === true) - Number(a.featured === true)
        || b.date.localeCompare(a.date));
  }, [visiblePoems, filter, search]);

  useEffect(() => {
    if (!searchTarget || !showAll) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-literature-${searchTarget}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, showAll, filtered.length]);

  const displayed = filtered.slice(0, showAll ? filtered.length : itemLimit);
  const hasOverflow = filtered.length > itemLimit;

  return (
    <Section
      id="literature"
      eyebrow="Words & Worlds"
      title="Literature"
      lede="Poems, novels and long-form pieces. Open any of them for a distraction-free reading view."
      aside={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter writing by type">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => { sounds.click(); setFilter(option.id); setShowAll(false); }}
                onMouseEnter={() => sounds.hover()}
                className="filter-pill"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <label htmlFor="literature-search" className="sr-only">Search writing</label>
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
            />
            <input
              id="literature-search"
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setShowAll(false); }}
              placeholder="Search titles…"
              className="field h-9 w-full py-1.5 pl-8 pr-3 text-[13px] sm:w-52"
            />
          </div>
        </div>
      )}
    >
      {displayed.length === 0 ? (
        <EmptyState
          title={visiblePoems.length === 0 ? 'No writing published yet' : 'Nothing matches that search'}
          body={visiblePoems.length === 0
            ? 'Published poems, novels and articles appear here. Add one from Admin → Literature.'
            : 'Try a different title, category or author, or clear the type filter.'}
        />
      ) : (
        <>
          <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map((poem) => (
              <div key={poem.id} id={`search-target-literature-${poem.id}`} data-reveal-item>
                <TiltCard lit maxTilt={2} className="h-full">
                  {/* The card is a container, not a button: a <button> may only
                      hold phrasing content, and this one holds headings and
                      paragraphs. The real control lives in the <h3> and its
                      ::after overlay makes the whole card clickable. */}
                  <div className="card card-interactive card-sheen group flex h-full w-full flex-col overflow-hidden rounded-card">
                    <div className={`relative h-36 shrink-0 overflow-hidden bg-gradient-to-br ${poem.coverGradient}`}>
                      <div
                        className="absolute inset-0 opacity-25 transition-transform duration-[var(--dur-drawer)] ease-[var(--ease-out-expo)] group-hover:scale-110"
                        aria-hidden="true"
                      >
                        <Quote size={72} className="absolute -bottom-2 -right-2 text-white" />
                      </div>
                      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                        <span className="on-media rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                          {poem.type === 'poem' ? 'Poem' : poem.type === 'article' ? 'Article' : 'Novel'}
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {poem.featured && (
                            <span className="on-media rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                              Featured
                            </span>
                          )}
                          {poem.category && (
                            <span className="on-media rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                              {poem.category}
                            </span>
                          )}
                        </span>
                      </div>
                      <span
                        className="on-media pointer-events-none absolute bottom-2 right-3 font-display text-4xl font-bold opacity-40"
                        aria-hidden="true"
                      >
                        {TYPE_GLYPH[poem.type]}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                        <button
                          type="button"
                          onClick={() => { sounds.open(); setSelected(poem); }}
                          onMouseEnter={() => sounds.hover()}
                          className="card-action"
                        >
                          {poem.title}
                          <span className="sr-only"> — read in full</span>
                        </button>
                      </h3>
                      <p className="mt-1.5 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-[var(--muted)]">
                        {excerptOf(poem)}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3.5">
                        <span className="text-[11px] text-[var(--faint)]">
                          {formatDate(poem.date)}
                          {readingTime(poem.content, poem.type) && (
                            <> · {readingTime(poem.content, poem.type)}</>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)]">
                          Read
                          <ArrowUpRight
                            size={13}
                            aria-hidden="true"
                            className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </div>
            ))}
          </RevealGroup>

          {hasOverflow && (
            <div className="mt-9 flex justify-center">
              <button
                type="button"
                onClick={() => { sounds.click(); setShowAll((current) => !current); }}
                className="btn btn-secondary"
              >
                {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <ReadingModal
          poem={selected}
          related={visiblePoems.filter((item) => item.id !== selected.id).slice(0, 3)}
          onClose={() => { sounds.close(); setSelected(null); }}
          onOpenRelated={(next) => { sounds.click(); setSelected(next); }}
        />
      )}
    </Section>
  );
}

function ReadingModal({
  poem,
  related,
  onClose,
  onOpenRelated,
}: {
  poem: Poem;
  related: Poem[];
  onClose: () => void;
  onOpenRelated: (poem: Poem) => void;
}) {
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { notify } = useToast();

  // Every reopen starts at the top rather than inheriting the previous scroll.
  useEffect(() => {
    setProgress(0);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [poem.id]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const max = element.scrollHeight - element.clientHeight;
    setProgress(max > 0 ? Math.min(100, (element.scrollTop / max) * 100) : 0);
  };

  const handleCopy = async () => {
    sounds.click();
    try {
      await copyToClipboard(`${poem.title}\n\n${poem.content}`);
      sounds.success();
      notify('Text copied to clipboard');
    } catch {
      sounds.error();
      notify('Could not copy — select the text manually', 'error');
    }
  };

  const handleShare = async () => {
    sounds.click();
    const url = `${window.location.origin}${window.location.pathname}#literature`;
    if (navigator.share) {
      try {
        await navigator.share({ title: poem.title, text: poem.excerpt, url });
        return;
      } catch {
        // User dismissed the share sheet; fall through to copying.
      }
    }
    try {
      await copyToClipboard(`${poem.title} — ${url}`);
      notify('Share link copied');
    } catch {
      notify('Could not copy the share link', 'error');
    }
  };

  return (
    <Overlay
      open
      onClose={onClose}
      labelledBy="reader-title"
      variant="sheet"
      panelClassName="sm:max-w-2xl"
      showClose
    >
      <div className="relative z-10 shrink-0 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 pr-14 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className={`shrink-0 rounded-full bg-gradient-to-br ${poem.coverGradient} px-2.5 py-1 text-[11px] font-medium text-white`}>
            {poem.type === 'poem' ? 'Poem' : poem.type === 'article' ? 'Article' : 'Novel'}
          </span>
          <span className="truncate text-xs text-[var(--muted)]">{poem.category}</span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              onMouseEnter={() => sounds.hover()}
              className="btn-icon h-8 w-8 min-h-0 border-transparent bg-transparent"
              title="Copy text"
            >
              <Copy size={15} aria-hidden="true" />
              <span className="sr-only">Copy text to clipboard</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              onMouseEnter={() => sounds.hover()}
              className="btn-icon h-8 w-8 min-h-0 border-transparent bg-transparent"
              title="Share"
            >
              <Share2 size={15} aria-hidden="true" />
              <span className="sr-only">Share this work</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`relative z-10 shrink-0 bg-gradient-to-br ${poem.coverGradient} px-5 py-5 sm:px-7 sm:py-6`}>
        <h2 id="reader-title" className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          {poem.title}
        </h2>
        <p className="mt-1 text-xs text-white/80">
          by {poem.author} · {formatDate(poem.date)}
          {readingTime(poem.content, poem.type) && <> · {readingTime(poem.content, poem.type)}</>}
        </p>
      </div>

      <div className="h-1 shrink-0 bg-[rgba(16,18,25,0.07)]">
        <div
          role="progressbar"
          aria-label="Reading progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="progress-fill"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      <div
        ref={bodyRef}
        onScroll={handleScroll}
        className="scroll-y min-h-0 flex-1 px-5 py-7 text-left sm:px-8 sm:py-9"
      >
        <div className="literary-body whitespace-pre-wrap">{poem.content}</div>

        {related.length > 0 && (
          <div className="mt-10 border-t border-[var(--line)] pt-6">
            <p className="eyebrow mb-3">Keep reading</p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenRelated(item)}
                    className="flex h-full w-full flex-col rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3.5 text-left transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.32)]"
                  >
                    <span className="line-clamp-2 text-[13px] font-semibold text-[var(--ink)]">{item.title}</span>
                    <span className="mt-1 text-[11px] text-[var(--faint)]">{item.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Overlay>
  );
}
