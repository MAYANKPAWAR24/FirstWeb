import { useState, useMemo } from 'react';
import { sounds } from '@/lib/sound';
import type { MediaItem } from '@/lib/types';

interface MediaProps {
  items: MediaItem[];
}

type MediaFilter = 'all' | 'photo' | 'video';

export default function Media({ items }: MediaProps) {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((m) => filter === 'all' || m.type === filter);
  }, [items, filter]);

  return (
    <section id="media" className="relative py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Visual Stories</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Media</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">A gallery of moments — through lens and lens flare.</p>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-center gap-2 mb-10 reveal">
          {(['all', 'photo', 'video'] as MediaFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { sounds.click(); setFilter(f); }}
              onMouseEnter={() => sounds.hover()}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all capitalize
                ${filter === f ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white/80'}
              `}
            >
              {f === 'all' ? 'All' : f === 'photo' ? 'Photos' : 'Videos'}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">No media found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="reveal group cursor-pointer"
                style={{ transitionDelay: `${i * 50}ms` }}
                onClick={() => { sounds.open(); setLightbox(item); }}
                onMouseEnter={() => sounds.hover()}
              >
                <div className="glass-card rounded-2xl overflow-hidden relative">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="media-image-shade absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Type badge */}
                    <div className="absolute top-3 left-3">
                      <span className="media-type-badge px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs font-medium text-white">
                        {item.type === 'photo' ? '📷 Photo' : '▶ Video'}
                      </span>
                    </div>

                    {/* Play overlay for videos */}
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full glass-strong flex items-center justify-center group-hover:scale-110 transition-transform pulse-glow">
                          <span className="text-white text-lg ml-1">▶</span>
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
                </div>
              </div>
            ))}
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
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-4xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-white">{item.title}</h3>
              <p className="text-xs text-white/40">{item.category}</p>
            </div>
            <button
              onClick={onClose}
              onMouseEnter={() => sounds.hover()}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-rose-300 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            {item.type === 'photo' ? (
              <img src={item.url} alt={item.title} className="w-full rounded-2xl" />
            ) : (
              <div className="aspect-video rounded-2xl overflow-hidden">
                <iframe
                  src={item.url}
                  title={item.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
