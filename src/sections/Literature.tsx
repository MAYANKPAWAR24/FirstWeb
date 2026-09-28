import { useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import { useResponsiveItemLimit } from '@/hooks/useResponsiveItemLimit';
import { copyToClipboard, formatDate, lockPageScroll } from '@/lib/utils';
import type { Poem } from '@/lib/types';

interface LiteratureProps {
  poems: Poem[];
  searchTarget?: string | null;
}

type FilterType = 'all' | 'poem' | 'novel' | 'article';

function animateLiteratureDeck(activeItem: HTMLDivElement, activeIndex: number | null) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = Array.from(activeItem.parentElement?.children ?? []).filter(
    (item): item is HTMLDivElement => item instanceof HTMLDivElement && item.classList.contains('literature-deck-item')
  );

  items.forEach((item, index) => {
    const surface = item.querySelector<HTMLElement>('.literature-deck-surface');
    if (!surface) return;
    const isActive = index === activeIndex;
    const direction = activeIndex === null ? 0 : Math.sign(index - activeIndex);
    item.style.zIndex = isActive ? '2' : '1';
    gsap.to(surface, {
      y: isActive ? -9 : activeIndex === null ? 0 : 3,
      rotateZ: isActive ? 0 : direction * 1.4,
      scale: isActive ? 1.018 : activeIndex === null ? 1 : 0.994,
      duration: 0.42,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  });
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

  const filtered = useMemo(() => {
    return poems.filter((p) => {
      const matchType = filter === 'all' || p.type === filter;
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return p.visible !== false && matchType && matchSearch;
    });
  }, [poems, filter, search]);

  useEffect(() => {
    if (!searchTarget || !showAll) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-literature-${searchTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, showAll, filtered.length]);

  const displayed = filtered.slice(0, showAll ? filtered.length : itemLimit);
  const hasOverflow = filtered.length > itemLimit;

  return (
    <section id="literature" className="section-shell px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 reveal gpu-layer">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Words & Worlds</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Literature</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">A collection of poems and novels, each a doorway into a different feeling.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 reveal">
          <div className="flex items-center gap-2">
            {(['all', 'poem', 'novel', 'article'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => { sounds.click(); setFilter(f); setShowAll(false); }}
                onMouseEnter={() => sounds.hover()}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all capitalize
                  ${filter === f ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white/80'}
                `}
              >
                  {f === 'all' ? 'All' : f === 'poem' ? 'Poems' : f === 'novel' ? 'Novels' : 'Articles'}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
              placeholder="Search writings..."
              className="premium-input rounded-xl px-4 py-2 text-sm w-full sm:w-64"
            />
          </div>
        </div>

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">No works found. Try a different search.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((poem, i) => (
              <div
                key={poem.id}
                id={`search-target-literature-${poem.id}`}
                className="reveal literature-deck-item"
                style={{ transitionDelay: `${i * 60}ms` }}
                onMouseEnter={(event) => animateLiteratureDeck(event.currentTarget, i)}
                onMouseLeave={(event) => animateLiteratureDeck(event.currentTarget, null)}
              >
                <TiltCard className="h-full rounded-3xl" glow onClick={() => { sounds.open(); setSelected(poem); }}>
                  <div className="glass-card literature-deck-surface rounded-3xl overflow-hidden h-full flex flex-col cursor-pointer">
                    {/* Cover */}
                    <div className={`h-40 bg-gradient-to-br ${poem.coverGradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl opacity-30 font-display font-bold">
                          {poem.type === 'poem' ? '✦' : poem.type === 'article' ? '▤' : '❖'}
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="literature-cover-badge px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-medium text-white/90">
                          {poem.type === 'poem' ? 'Poem' : poem.type === 'article' ? 'Article' : 'Novel'}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="literature-cover-badge px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-medium text-white/90">
                          {poem.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="literature-copy text-lg font-bold mb-2 text-white/90">{poem.title}</h3>
                      <p className="literature-copy text-sm text-white/50 flex-1 line-clamp-3">{poem.excerpt}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-xs text-white/40">{formatDate(poem.date)}</span>
                        <span className="text-xs text-cyan-400/70 font-medium">Read →</span>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </div>
            ))}
          </div>
        )}
        {hasOverflow && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => { sounds.click(); setShowAll((current) => !current); }}
              className="btn-premium rounded-xl px-7 py-3 text-xs font-semibold tracking-[0.16em] text-slate-800"
            >
              {showAll ? 'SHOW LESS' : 'SEE ALL'}
            </button>
          </div>
        )}
      </div>

      {/* Reading Modal */}
      {selected && <ReadingModal poem={selected} onClose={() => { sounds.close(); setSelected(null); }} />}
    </section>
  );
}

function ReadingModal({ poem, onClose }: { poem: Poem; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const { notify } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const unlockScroll = lockPageScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [onClose]);

  const handleScroll = (e: React.UIEvent) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? (el.scrollTop / max) * 100 : 0);
  };

  const handleCopy = async () => {
    sounds.click();
    await copyToClipboard(`${poem.title}\n\n${poem.content}`);
    notify('Copied to clipboard');
  };

  const handleShare = async () => {
    sounds.click();
    const shareData = {
      title: poem.title,
      text: poem.excerpt,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await copyToClipboard(`${poem.title} — ${window.location.href}`);
      notify('Share link copied');
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 animate-fade-in gpu-accelerated" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md gpu-layer" />

      {/* Reading progress within modal */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 z-10">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className="relative w-full max-w-2xl max-h-[88vh] glass-strong rounded-3xl overflow-hidden animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-br ${poem.coverGradient} text-white`}>
              {poem.type === 'poem' ? 'Poem' : poem.type === 'article' ? 'Article' : 'Novel'}
            </span>
            <span className="text-xs text-white/40">{poem.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              onMouseEnter={() => sounds.hover()}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-cyan-300 transition-colors text-sm"
              title="Copy"
            >
              ⧉
            </button>
            <button
              onClick={handleShare}
              onMouseEnter={() => sounds.hover()}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-cyan-300 transition-colors text-sm"
              title="Share"
            >
              ↗
            </button>
            <button
              onClick={onClose}
              onMouseEnter={() => sounds.hover()}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-rose-300 transition-colors"
              title="Close (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cover banner */}
        <div className={`h-28 bg-gradient-to-br ${poem.coverGradient} relative`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-6">
              <h3 className="literature-copy text-2xl font-bold text-white">{poem.title}</h3>
              <p className="text-sm text-white/70">by {poem.author} · {formatDate(poem.date)}</p>
            </div>
        </div>

        {/* Content */}
        <div
          onScroll={handleScroll}
          className="ios-scroll flex-1 overflow-y-auto px-5 py-6 text-left sm:px-8 sm:py-8"
        >
          <div className="literature-copy text-[15px] sm:text-base text-white/75 whitespace-pre-wrap">
            {poem.content}
          </div>
        </div>

      </div>
    </div>
  );
}
