import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Camera, Mic, Star, Trophy } from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import { RevealGroup } from '@/components/Reveal';
import { sounds } from '@/lib/sound';
import { formatDate } from '@/lib/utils';
import type { Achievement } from '@/lib/types';

interface AchievementsProps {
  items: Achievement[];
  searchTarget?: string | null;
}

/** Icon and accent are chosen by category so a new entry needs no styling. */
const CATEGORY_META: Record<string, { icon: typeof Award; accent: string }> = {
  Writing: { icon: BookOpen, accent: 'var(--accent)' },
  Publishing: { icon: BookOpen, accent: 'var(--iris)' },
  Speaking: { icon: Mic, accent: 'var(--ember)' },
  Technology: { icon: Trophy, accent: 'var(--jade)' },
  Photography: { icon: Camera, accent: 'var(--iris)' },
  Education: { icon: Award, accent: 'var(--accent)' },
};

const FALLBACK = { icon: Award, accent: 'var(--accent)' };

export default function AchievementsSection({ items, searchTarget }: AchievementsProps) {
  const [category, setCategory] = useState('all');

  const visible = useMemo(() => {
    return items
      .filter((item) => item.visible !== false)
      .sort((a, b) => Number(b.featured === true) - Number(a.featured === true)
        || b.date.localeCompare(a.date));
  }, [items]);

  const categories = useMemo(
    () => [...new Set(visible.map((item) => item.category).filter(Boolean))],
    [visible],
  );

  const displayed = category === 'all' ? visible : visible.filter((item) => item.category === category);

  // A search hit deep-links to the specific achievement, not just the section.
  useEffect(() => {
    if (!searchTarget) return;
    setCategory('all');
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-achievement-${searchTarget}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, visible.length]);

  return (
    <Section
      id="achievements"
      eyebrow="Milestones"
      title="Achievements"
      lede="Writing, building and speaking — the moments worth marking."
      aside={categories.length > 1 ? (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter achievements by category">
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => { sounds.click(); setCategory('all'); }}
            className="filter-pill"
          >
            All
          </button>
          {categories.map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={category === entry}
              onClick={() => { sounds.click(); setCategory(entry); }}
              className="filter-pill"
            >
              {entry}
            </button>
          ))}
        </div>
      ) : undefined}
    >
      {visible.length === 0 ? (
        <EmptyState
          title="No achievements yet"
          body="Awards, publications, talks and wins appear here as a timeline. Add them from Admin → Achievements."
        />
      ) : displayed.length === 0 ? (
        <EmptyState title="Nothing in this category" body="Pick a different category to see the rest of the timeline." />
      ) : (
        <RevealGroup className="relative">
          {/* The rail. Drawn once behind the whole list rather than per item,
              so filtering never leaves a disconnected stub behind. */}
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-[rgba(10,130,189,0.35)] via-[rgba(97,70,223,0.2)] to-transparent sm:left-[19px]"
          />
          <ol className="space-y-4">
            {displayed.map((item) => {
              const meta = CATEGORY_META[item.category] ?? FALLBACK;
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  id={`search-target-achievement-${item.id}`}
                  data-reveal-item
                  className="relative pl-11 sm:pl-14"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-6 grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] shadow-[0_2px_8px_-4px_rgba(12,12,17,0.28)] sm:h-10 sm:w-10"
                  >
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <article className="card card-sheen rounded-panel p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip" style={{ color: meta.accent, borderColor: 'var(--line)' }}>
                        {item.category || 'Milestone'}
                      </span>
                      {item.featured && (
                        <span className="chip chip-accent">
                          <Star size={10} aria-hidden="true" /> Featured
                        </span>
                      )}
                      <time dateTime={item.date} className="ml-auto text-[11px] text-[var(--faint)]">
                        {formatDate(item.date)}
                      </time>
                    </div>
                    <h3 className="mt-3 font-display text-[16px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted)]">{item.description}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        </RevealGroup>
      )}
    </Section>
  );
}
