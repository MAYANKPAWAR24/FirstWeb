import { useEffect } from 'react';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import { formatDate } from '@/lib/utils';
import type { StudyMaterial } from '@/lib/types';

interface StudyProps {
  materials: StudyMaterial[];
  searchTarget?: string | null;
}

const FILE_ICONS: Record<string, string> = {
  PDF: '📄',
  DOC: '📝',
  PPT: '📊',
  XLS: '📈',
  ZIP: '🗜',
  IMG: '🖼',
};

const FILE_COLORS: Record<string, string> = {
  PDF: 'from-rose-500/20 to-rose-600/10 border-rose-400/20 text-rose-300',
  DOC: 'from-cyan-500/20 to-blue-600/10 border-cyan-400/20 text-cyan-300',
  PPT: 'from-amber-500/20 to-orange-600/10 border-amber-400/20 text-amber-300',
  XLS: 'from-emerald-500/20 to-green-600/10 border-emerald-400/20 text-emerald-300',
  ZIP: 'from-violet-500/20 to-purple-600/10 border-violet-400/20 text-violet-300',
  IMG: 'from-pink-500/20 to-rose-600/10 border-pink-400/20 text-pink-300',
};

export default function StudyMaterialSection({ materials, searchTarget }: StudyProps) {
  const { notify } = useToast();

  useEffect(() => {
    if (!searchTarget) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-study-${searchTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget]);

  const visibleMaterials = materials.filter((material) => material.visible !== false);

  const handleDownload = (sm: StudyMaterial) => {
    sounds.click();
    if (sm.url && sm.url !== '#') {
      window.open(sm.url, '_blank');
    } else {
      notify('Demo resource — link will be available soon', 'info');
    }
  };

  return (
    <section id="study" className="relative py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Learn & Grow</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Study Material</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">Resources, guides, and notes I've created — free to download and share.</p>
        </div>

        {/* Grid */}
        {visibleMaterials.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">No study materials available yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {visibleMaterials.map((sm, i) => (
              <div
                key={sm.id}
                id={`search-target-study-${sm.id}`}
                className="reveal"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="glass-card rounded-2xl p-6 flex items-start gap-5 h-full group hover:border-cyan-400/30 transition-all">
                  {/* File icon */}
                  <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center text-2xl ${FILE_COLORS[sm.fileType] || FILE_COLORS.PDF}`}>
                    {FILE_ICONS[sm.fileType] || '📄'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-white/90 mb-1 leading-tight">{sm.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed mb-3 line-clamp-2">{sm.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {sm.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Meta + download */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{sm.fileType} · {sm.fileSize}</span>
                        <span>·</span>
                        <span>{formatDate(sm.date)}</span>
                      </div>
                      <button
                        onClick={() => handleDownload(sm)}
                        onMouseEnter={() => sounds.hover()}
                        className="btn-premium px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
                      >
                        ↓ Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
