import { sounds } from '@/lib/sound';
import { formatDate } from '@/lib/utils';
import type { Achievement } from '@/lib/types';

interface AchievementsProps {
  achievements: Achievement[];
}

const NODE_COLORS = ['timeline-node', 'timeline-node-purple', 'timeline-node-rose'];
const ICON_COLORS: Record<string, string> = {
  Writing: 'text-cyan-300',
  Publishing: 'text-violet-300',
  Speaking: 'text-amber-300',
  Technology: 'text-emerald-300',
  Photography: 'text-rose-300',
};

const ACHIEVEMENT_ICONS: Record<string, string> = {
  Award: '🏆',
  BookOpen: '📖',
  Mic: '🎤',
  Trophy: '⭐',
  Camera: '📷',
};

export default function Achievements({ achievements }: AchievementsProps) {
  const sorted = [...achievements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section id="achievements" className="relative py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Milestones</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Achievements</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">A timeline of moments worth remembering.</p>
        </div>

        {/* Timeline */}
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">No achievements yet.</div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/30 via-violet-400/20 to-rose-400/10 sm:-translate-x-1/2" />

            <div className="space-y-12">
              {sorted.map((item, i) => {
                const isLeft = i % 2 === 0;
                const colorIdx = i % 3;
                return (
                  <div
                    key={item.id}
                    className={`reveal relative flex items-start gap-6 sm:gap-0 ${isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    {/* Node */}
                    <div className="absolute left-4 sm:left-1/2 top-6 -translate-x-1/2 z-10">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 ${NODE_COLORS[colorIdx]}`} />
                    </div>

                    {/* Spacer for desktop alternating layout */}
                    <div className="hidden sm:block sm:w-1/2" />

                    {/* Card */}
                    <div className={`flex-1 sm:w-1/2 pl-12 sm:pl-0 ${isLeft ? 'sm:pr-12' : 'sm:pl-12'}`}>
                      <div
                        className="glass-card rounded-2xl p-6 group cursor-default"
                        onMouseEnter={() => sounds.hover()}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-2xl ${ICON_COLORS[item.category] || 'text-cyan-300'}`}>
                            {ACHIEVEMENT_ICONS[item.icon] || '🏆'}
                          </span>
                          <div>
                            <span className="text-xs text-white/40 font-medium">{formatDate(item.date)}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-display font-bold text-white/90 mb-2 leading-tight">{item.title}</h3>
                        <p className="text-sm text-white/50 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
