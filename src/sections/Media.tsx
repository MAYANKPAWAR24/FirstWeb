import { useEffect, useState, useMemo } from 'react';
import { ExternalLink, Music2, Play } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { lockPageScroll } from '@/lib/utils';
import { useResponsiveItemLimit } from '@/hooks/useResponsiveItemLimit';
import { isDirectVideoUrl, isEmbeddableVideoUrl } from '@/lib/media';
import { VideoPlayer } from '@/components/VideoEmbed';
import type { MediaItem } from '@/lib/types';

interface MediaProps {
  items: MediaItem[];
  searchTarget?: string | null;
}

type MediaFilter = 'all' | 'photo' | 'video' | 'music';

export default function Media({ items, searchTarget }: MediaProps) {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const itemLimit = useResponsiveItemLimit();

  useEffect(() => {
    if (!searchTarget) return;
    setFilter('all');
    setShowAll(true);
  }, [searchTarget]);

  const filtered = useMemo(() => {
    return items.filter((m) => m.visible !== false && (filter === 'all' || m.type === filter));
  }, [items, filter]);

  useEffect(() => {
    if (!searchTarget || !showAll) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-media-${searchTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, showAll, filtered.length]);

  const displayed = filtered.slice(0, showAll ? filtered.length : itemLimit);
  const hasOverflow = filtered.length > itemLimit;

  return (
    <section id="media" className="section-shell px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 reveal gpu-layer">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Visual Stories</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Media</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">Photos, videos, and original music.</p>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-center gap-2 mb-10 reveal">
          {(['all', 'photo', 'video', 'music'] as MediaFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { sounds.click(); setFilter(f); setShowAll(false); }}
              onMouseEnter={() => sounds.hover()}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all capitalize
                ${filter === f ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white/80'}
              `}
            >
              {f === 'all' ? 'All' : f === 'photo' ? 'Photos' : f === 'video' ? 'Videos' : 'Music'}
            </button>
          ))}
        </div>

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">No media found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((item, i) => (
              <div
                key={item.id}
                id={`search-target-media-${item.id}`}
                className={`reveal group ${item.type === 'music' ? '' : 'cursor-pointer'}`}
                data-cursor={item.type === 'music' ? 'hidden' : 'link'}
                style={{ transitionDelay: `${i * 50}ms` }}
                onClick={() => {
                  if (item.type !== 'music') {
                    sounds.open();
                    setLightbox(item);
                  }
                }}
                onMouseEnter={() => sounds.hover()}
              >
                <div className="glass-card rounded-2xl overflow-hidden relative">
                  <div className="relative aspect-video overflow-hidden">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                        // External thumbnails can 404 or be blocked; fall back to
                        // the type glyph instead of showing a broken image.
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          event.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${item.thumbnail ? 'hidden ' : ''}absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-900 text-cyan-300`}>
                      <Music2 size={42} strokeWidth={1.3} aria-hidden="true" />
                    </div>
                    <div className="media-image-shade absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Type badge */}
                    <div className="absolute top-3 left-3">
                      <span className="media-type-badge px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs font-medium text-white">
                        {item.type === 'photo' ? 'Photo' : item.type === 'video' ? 'Video' : 'Music'}
                      </span>
                    </div>

                    {/* Play overlay for videos */}
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full glass-strong flex items-center justify-center group-hover:scale-110 transition-transform pulse-glow">
                          {isEmbeddableVideoUrl(item.url) || isDirectVideoUrl(item.url) ? (
                            <Play size={20} className="translate-x-px" fill="currentColor" aria-hidden="true" />
                          ) : (
                            <ExternalLink size={20} aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="media-image-caption absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h3 className="font-display font-bold text-sm text-white mb-1">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  {item.type === 'music' && (
                    <div className="p-4">
                      <audio controls preload="none" src={item.url} className="w-full" aria-label={`Play ${item.title}`}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}
                </div>
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

      {/* Lightbox */}
      {lightbox && (
        <MediaLightbox item={lightbox} onClose={() => { sounds.close(); setLightbox(null); }} />
      )}
    </section>
  );
}

function MediaLightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  useEffect(() => lockPageScroll(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end sm:items-start sm:justify-center justify-center sm:px-4 sm:pt-24 sm:pb-6 animate-fade-in gpu-accelerated"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md gpu-layer" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        className="ios-scroll relative w-full max-h-[100dvh] sm:max-h-[82dvh] overflow-y-auto animate-scale-in gpu-layer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong overflow-hidden rounded-t-3xl sm:rounded-3xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/70 flex items-center justify-between gap-3 sticky top-0 z-10">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-slate-900 truncate">{item.title}</h3>
              <p className="text-xs text-slate-500 capitalize">{item.type} · {item.category}</p>
            </div>
            <button
              onClick={onClose}
              onMouseEnter={() => sounds.hover()}
              className="shrink-0 w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
              title="Close (ESC)"
              aria-label="Close viewer"
            >
              ✕
            </button>
          </div>
          <div className="p-3 sm:p-4">
            {item.type === 'photo' ? (
              <img src={item.url} alt={item.title} className="w-full rounded-2xl" />
            ) : item.type === 'video' ? (
              <VideoPlayer url={item.url} title={item.title} />
            ) : (
              <audio controls autoPlay src={item.url} className="w-full">
                Your browser does not support audio playback.
              </audio>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
