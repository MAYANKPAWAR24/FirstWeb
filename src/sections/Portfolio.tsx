import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Briefcase, Download, GraduationCap, Layers, Sparkles, Star, User,
} from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import type { PortfolioBlock, PortfolioSettings, SectionId } from '@/lib/types';

interface PortfolioSectionProps {
  settings: PortfolioSettings;
  blocks: PortfolioBlock[];
  onNavigate: (id: SectionId) => void;
  contactVisible: boolean;
}

/**
 * Block presentation is chosen by `kind` rather than by the admin picking a
 * template, so adding a new kind later cannot leave a card with no renderer.
 */
const KIND_META: Record<PortfolioBlock['kind'], { label: string; icon: typeof Layers }> = {
  summary: { label: 'Summary', icon: User },
  education: { label: 'Education', icon: GraduationCap },
  capability: { label: 'Capability', icon: Layers },
  'case-study': { label: 'Case Study', icon: Briefcase },
  project: { label: 'Project', icon: Sparkles },
};

export default function PortfolioSection({
  settings, blocks, onNavigate, contactVisible,
}: PortfolioSectionProps) {
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  const visible = useMemo(
    () => blocks
      .filter((block) => block.visible !== false)
      .sort((a, b) => a.order - b.order || Number(b.featured) - Number(a.featured)),
    [blocks],
  );

  const displayed = filter === 'featured' ? visible.filter((block) => block.featured) : visible;

  // Tag chips double as filters, so the section stays navigable as it grows
  // without the admin maintaining a separate taxonomy field.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach((block) => block.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [visible]);

  const featured = visible.find((block) => block.featured);
  const hasResume = Boolean(settings.resumeUrl);

  return (
    <Section
      id="portfolio"
      eyebrow={settings.eyebrow || 'Portfolio'}
      title={settings.title || 'Work & Capabilities'}
      lede={settings.intro}
      aside={(
        <div className="flex flex-wrap items-center gap-2">
          {tags.length > 0 && tags.map(([tag]) => (
            <span key={tag} className="chip">{tag}</span>
          ))}
          {hasResume && (
            <a
              href={settings.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => sounds.hover()}
              className="btn btn-secondary h-9 min-h-0 px-3.5 text-xs"
            >
              <Download size={14} aria-hidden="true" />
              {settings.resumeLabel || 'Resume'}
            </a>
          )}
        </div>
      )}
    >
      {/* Availability. Rendered only when an admin actually set a status, so
          an empty string never produces a dangling badge. */}
      {settings.availabilityStatus.trim() && (
        <Reveal className="mb-6">
          <div className="flex flex-wrap items-center gap-3 rounded-panel border border-[rgba(15,122,90,0.22)] bg-[rgba(15,122,90,0.05)] px-5 py-4">
            <span className="relative flex h-2 w-2 flex-none" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-60 motion-safe:animate-pulse-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--jade)]">{settings.availabilityStatus}</p>
              {settings.availabilityNote && (
                <p className="mt-0.5 text-[13px] text-[var(--muted)]">{settings.availabilityNote}</p>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {/* Featured block gets a wider treatment so the section has a clear
          entry point instead of an undifferentiated grid. */}
      {featured && filter === 'all' && (
        <Reveal className="mb-5">
          <TiltCard lit maxTilt={1.5}>
            <div className="card card-sheen overflow-hidden rounded-panel p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-accent">
                  <Star size={11} aria-hidden="true" /> Featured
                </span>
                <span className="chip">{KIND_META[featured.kind].label}</span>
              </div>
              <h3 className="mt-4 font-display text-title font-bold tracking-tight text-[var(--ink)]">
                {featured.title}
              </h3>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">{featured.body}</p>
              {featured.tags.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {featured.tags.map((tag) => <li key={tag}><span className="tag">{tag}</span></li>)}
                </ul>
              )}
            </div>
          </TiltCard>
        </Reveal>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Portfolio blocks are empty"
          body="Add the work you want a recruiter to see first — a case study, a capability summary, education. They can be reordered, pinned as featured, and hidden individually."
          action={(
            <p className="text-xs text-[var(--faint)]">Admin → Portfolio</p>
          )}
        />
      ) : (
        <>
          {featured && filter === 'all' && displayed.length > 1 && (
            <Reveal className="mb-6">
              <hr className="divider" />
            </Reveal>
          )}

          {visible.length > 1 && (
            <div className="mb-5 flex gap-1" role="group" aria-label="Filter portfolio blocks">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                onClick={() => { sounds.click(); setFilter('all'); }}
                className="filter-pill"
              >
                All work
              </button>
              <button
                type="button"
                aria-pressed={filter === 'featured'}
                onClick={() => { sounds.click(); setFilter('featured'); }}
                className="filter-pill"
              >
                Featured only
              </button>
            </div>
          )}

          {displayed.length === 0 ? (
            <EmptyState
              title="Nothing pinned as featured"
              body="Mark a block as featured in Admin → Portfolio to have it appear here."
            />
          ) : (
            <RevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayed
                .filter((block) => !(filter === 'all' && block.featured))
                .map((block) => {
                  const meta = KIND_META[block.kind];
                  const Icon = meta.icon;
                  const Wrapper = block.url ? 'a' : 'div';
                  return (
                    <div key={block.id} data-reveal-item>
                      <TiltCard lit maxTilt={2} className="h-full">
                        <Wrapper
                          {...(block.url
                            ? { href: block.url, target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                          onMouseEnter={() => sounds.hover()}
                          className="card card-interactive card-sheen flex h-full flex-col rounded-panel p-5"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)]">
                            <Icon size={17} aria-hidden="true" />
                          </span>
                          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">
                            {meta.label}
                          </p>
                          <h3 className="mt-1 font-display text-[15px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                            {block.title}
                          </h3>
                          <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[var(--muted)]">{block.body}</p>
                          {block.tags.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-1">
                              {block.tags.slice(0, 5).map((tag) => <li key={tag}><span className="tag">{tag}</span></li>)}
                            </ul>
                          )}
                          {block.url && (
                            <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)]">
                              View <ArrowUpRight size={12} aria-hidden="true" />
                            </span>
                          )}
                        </Wrapper>
                      </TiltCard>
                    </div>
                  );
                })}
            </RevealGroup>
          )}
        </>
      )}

      {contactVisible && (
        <Reveal className="mt-8">
          <div className="card card-sheen flex flex-col items-start gap-4 rounded-panel p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                Want the long version?
              </h3>
              <p className="mt-1 text-[13.5px] text-[var(--muted)]">
                The Contact section has a direct line, plus every social profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { sounds.click(); onNavigate('contact'); }}
              className="btn btn-primary shrink-0"
            >
              Get in Touch
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </Reveal>
      )}
    </Section>
  );
}
