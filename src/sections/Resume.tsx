import { useMemo } from 'react';
import {
  Award, BookOpen, Briefcase, Download, Globe, GraduationCap, Sparkles,
} from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import { formatDate, isSafeHttpUrl } from '@/lib/utils';
import type {
  Achievement, Certificate, EducationEntry, ExperienceEntry, ExperienceType,
  LanguageEntry, LanguageProficiency, PortfolioBlock, ResumeBlock, ResumeSettings,
} from '@/lib/types';

interface ResumeProps {
  settings: ResumeSettings;
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  languages: LanguageEntry[];
  skills: PortfolioBlock[];
  certificates: Certificate[];
  achievements: Achievement[];
}

const EXPERIENCE_LABEL: Record<ExperienceType, string> = {
  'full-time': 'Full time',
  'part-time': 'Part time',
  internship: 'Internship',
  freelance: 'Freelance',
  contract: 'Contract',
  volunteer: 'Volunteer',
};

/** Ordered weakest to strongest so a bar always reads left-to-right. */
const PROFICIENCY_LEVELS: { id: LanguageProficiency; label: string; filled: number }[] = [
  { id: 'basic', label: 'Basic', filled: 1 },
  { id: 'intermediate', label: 'Intermediate', filled: 2 },
  { id: 'advanced', label: 'Advanced', filled: 3 },
  { id: 'fluent', label: 'Fluent', filled: 4 },
  { id: 'native', label: 'Native', filled: 5 },
];

const BLOCK_ICON = {
  education: GraduationCap,
  experience: Briefcase,
  language: Globe,
  skills: Sparkles,
  certification: Award,
  award: BookOpen,
  text: Sparkles,
} as const;

export default function Resume({
  settings, education, experiences, languages, skills, certificates, achievements,
}: ResumeProps) {
  /**
   * Blocks that are visible AND have something to show. Filtering on content
   * as well as visibility matters: an admin who adds a Certificates block
   * before adding any certificates would otherwise get a bare heading with
   * nothing under it, which reads as a bug on the site.
   */
  const blocks = useMemo(
    () => settings.blocks
      .filter((block) => block.visible !== false)
      .filter((block) => blockHasContent(block, { education, experiences, languages, skills, certificates, achievements }))
      .slice()
      .sort((a, b) => a.order - b.order),
    [settings.blocks, education, experiences, languages, skills, certificates, achievements],
  );

  // A download button that downloads nothing is worse than no button, so it
  // only appears when there is a real file behind it.
  const canDownload = settings.showDownload
    && settings.downloadUrl.trim() !== ''
    && isSafeHttpUrl(settings.downloadUrl.trim());

  const hasContent = blocks.some((block) => blockHasContent(block, {
    education, experiences, languages, skills, certificates, achievements,
  }));

  if (!hasContent) {
    return (
      <Section id="resume" eyebrow={settings.eyebrow} title={settings.title} lede={settings.intro}>
        <EmptyState
          title="Nothing in the resume yet"
          body="Add education, experience or languages in Admin → Resume. Each part can be reordered, renamed and hidden independently."
        />
      </Section>
    );
  }

  return (
    <Section
      id="resume"
      eyebrow={settings.eyebrow}
      title={settings.title}
      lede={settings.intro}
      aside={canDownload ? (
        <a
          href={settings.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => sounds.hover()}
          className="btn btn-secondary h-9 min-h-0 px-3.5 text-xs"
        >
          <Download size={14} aria-hidden="true" />
          {settings.downloadLabel}
        </a>
      ) : undefined}
    >
      <div className="space-y-10">
        {blocks.map((block) => {
          const Icon = BLOCK_ICON[block.kind];
          return (
            <div key={block.id} className="scroll-mt-28">
              <Reveal className="mb-4 flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)]"
                >
                  <Icon size={17} />
                </span>
                <h3
                  id={`${block.id}-heading`}
                  className="font-display text-lg font-bold tracking-tight text-[var(--ink)]"
                >
                  {block.title}
                </h3>
              </Reveal>

              <ResumeBlockBody
                block={block}
                education={education}
                experiences={experiences}
                languages={languages}
                skills={skills}
                certificates={certificates}
                achievements={achievements}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

type ContentArgs = {
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  languages: LanguageEntry[];
  skills: PortfolioBlock[];
  certificates: Certificate[];
  achievements: Achievement[];
};

function blockHasContent(block: ResumeBlock, args: ContentArgs): boolean {
  switch (block.kind) {
    case 'education': return args.education.some((entry) => entry.visible !== false);
    case 'experience': return args.experiences.some((entry) => entry.visible !== false);
    case 'language': return args.languages.some((entry) => entry.visible !== false);
    case 'skills': return args.skills.some((blockItem) => blockItem.visible !== false && blockItem.tags.length > 0);
    case 'certification': return args.certificates.some((entry) => entry.visible !== false);
    case 'award': return args.achievements.some((entry) => entry.visible !== false);
    case 'text': return block.content.trim() !== '';
    default: return false;
  }
}

function ResumeBlockBody({ block, ...args }: { block: ResumeBlock } & ContentArgs) {
  switch (block.kind) {
    case 'education':
      return <EducationList entries={args.education} />;
    case 'experience':
      return <ExperienceList entries={args.experiences} />;
    case 'language':
      return <LanguageList entries={args.languages} />;
    case 'skills':
      return <SkillsList entries={args.skills} />;
    case 'certification':
      return <SimpleList
        entries={args.certificates.filter((entry) => entry.visible !== false)}
        title={(entry) => entry.title}
        meta={(entry) => [entry.issuer, formatDate(entry.issuedDate)].filter(Boolean).join(' · ')}
      />;
    case 'award':
      return <SimpleList
        entries={args.achievements.filter((entry) => entry.visible !== false)}
        title={(entry) => entry.title}
        meta={(entry) => [entry.category, formatDate(entry.date)].filter(Boolean).join(' · ')}
        body={(entry) => entry.description}
      />;
    case 'text':
      return (
        <Reveal>
          <div className="card card-sheen rounded-panel p-6">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--ink-2)]">
              {block.content}
            </p>
          </div>
        </Reveal>
      );
    default:
      return null;
  }
}

function EducationList({ entries }: { entries: EducationEntry[] }) {
  const visible = entries.filter((entry) => entry.visible !== false)
    .slice().sort((a, b) => a.order - b.order);
  if (visible.length === 0) return null;

  return (
    <RevealGroup className="grid gap-4 lg:grid-cols-2">
      {visible.map((entry) => (
        <div key={entry.id} data-reveal-item>
          <TiltCard lit maxTilt={1.5} className="h-full">
            <div className="card card-sheen flex h-full flex-col rounded-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-display text-[15.5px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                    {entry.institution}
                  </h4>
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--ink-2)]">
                    {[entry.field, entry.level].filter(Boolean).join(' · ') || entry.board}
                  </p>
                </div>
                {entry.score && (
                  <div className="shrink-0 rounded-card border border-[rgba(10,130,189,0.22)] bg-[var(--accent-soft)] px-3 py-1.5 text-center">
                    <p className="font-display text-[15px] font-bold tabular-nums text-[var(--accent)]">
                      {entry.score}
                    </p>
                    {entry.scoreLabel && (
                      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        {entry.scoreLabel}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
                {entry.period && <span>{entry.period}</span>}
                {entry.board && <span>{entry.board}</span>}
                {entry.location && <span>{entry.location}</span>}
              </div>

              {entry.notes && (
                <p className="mt-3 border-t border-[var(--line)] pt-3 text-[13px] leading-relaxed text-[var(--muted)]">
                  {entry.notes}
                </p>
              )}
            </div>
          </TiltCard>
        </div>
      ))}
    </RevealGroup>
  );
}

function ExperienceList({ entries }: { entries: ExperienceEntry[] }) {
  const visible = entries.filter((entry) => entry.visible !== false)
    .slice().sort((a, b) => a.order - b.order);
  if (visible.length === 0) return null;

  return (
    <RevealGroup className="space-y-3">
      {visible.map((entry) => (
        <div key={entry.id} data-reveal-item>
          <article className="card card-sheen rounded-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-display text-[15.5px] font-bold tracking-tight text-[var(--ink)]">
                  {entry.role}
                </h4>
                {entry.organisation && (
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--ink-2)]">{entry.organisation}</p>
                )}
              </div>
              <span className="chip chip-accent flex-none">{EXPERIENCE_LABEL[entry.type]}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
              {entry.period && <span>{entry.period}</span>}
              {entry.location && <span>{entry.location}</span>}
            </div>

            {entry.summary && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--muted)]">{entry.summary}</p>
            )}

            {entry.highlights.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {entry.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                    <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 flex-none rounded-full bg-[var(--accent)]" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ))}
    </RevealGroup>
  );
}

function LanguageList({ entries }: { entries: LanguageEntry[] }) {
  const visible = entries.filter((entry) => entry.visible !== false)
    .slice().sort((a, b) => a.order - b.order);
  if (visible.length === 0) return null;

  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((entry) => {
        const level = PROFICIENCY_LEVELS.find((item) => item.id === entry.proficiency)
          ?? PROFICIENCY_LEVELS[1];
        return (
          <div
            key={entry.id}
            data-reveal-item
            className="rounded-card border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              {/* Rendered verbatim. The Devanagari, Tamil and Arabic names must
                  appear in their own script, so nothing here transforms text. */}
              <span
                className="truncate text-[14px] font-semibold text-[var(--ink)]"
                lang={entry.name}
              >
                {entry.name}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-[var(--muted)]">
                {level.label}
              </span>
            </div>

            {/* Five pips plus a written label: level is never carried by colour
                or position alone. */}
            <div className="mt-2 flex items-center gap-1.5" role="img" aria-label={`${level.label} proficiency`}>
              {PROFICIENCY_LEVELS.map((step) => (
                <span
                  key={step.id}
                  aria-hidden="true"
                  className={[
                    'h-1.5 flex-1 rounded-full transition-colors duration-[var(--dur-hover)]',
                    step.filled <= level.filled ? 'bg-[var(--accent)]' : 'bg-[rgba(16,18,25,0.09)]',
                  ].join(' ')}
                />
              ))}
            </div>

            {entry.note && (
              <p className="mt-1.5 truncate text-[11.5px] text-[var(--faint)]">{entry.note}</p>
            )}
          </div>
        );
      })}
    </RevealGroup>
  );
}

function SkillsList({ entries }: { entries: PortfolioBlock[] }) {
  const groups = entries
    .filter((entry) => entry.visible !== false && entry.tags.length > 0)
    .slice()
    .sort((a, b) => a.order - b.order);
  if (groups.length === 0) return null;

  return (
    <RevealGroup className="grid gap-4 sm:grid-cols-2">
      {groups.map((entry) => (
        <div key={entry.id} data-reveal-item className="rounded-card border border-[var(--line)] bg-[var(--surface)] p-5">
          <h4 className="font-display text-[13.5px] font-bold tracking-tight text-[var(--ink)]">{entry.title}</h4>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => <li key={tag}><span className="tag">{tag}</span></li>)}
          </ul>
        </div>
      ))}
    </RevealGroup>
  );
}

function SimpleList<T>({
  entries, title, meta, body,
}: {
  entries: T[];
  title: (entry: T) => string;
  meta: (entry: T) => string;
  body?: (entry: T) => string;
}) {
  if (entries.length === 0) return null;
  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2">
      {entries.map((entry, index) => (
        <div
          key={index}
          data-reveal-item
          className="rounded-card border border-[var(--line)] bg-[var(--surface)] p-4"
        >
          <h4 className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{title(entry)}</h4>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{meta(entry)}</p>
          {body && <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{body(entry)}</p>}
        </div>
      ))}
    </RevealGroup>
  );
}