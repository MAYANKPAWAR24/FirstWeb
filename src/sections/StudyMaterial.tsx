import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Presentation, Sheet, Archive, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import { formatDate } from '@/lib/utils';
import type { StudyMaterial } from '@/lib/types';

interface StudyMaterialProps {
  materials: StudyMaterial[];
  searchTarget?: string | null;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  DOC: FileText,
  PPT: Presentation,
  XLS: Sheet,
  ZIP: Archive,
  IMG: ImageIcon,
};

export default function StudyMaterialSection({ materials, searchTarget }: StudyMaterialProps) {
  const [tag, setTag] = useState('all');

  const visible = useMemo(
    () => materials.filter((item) => item.visible !== false),
    [materials],
  );

  const tags = useMemo(
    () => [...new Set(visible.flatMap((item) => item.tags).filter(Boolean))],
    [visible],
  );

  const displayed = tag === 'all' ? visible : visible.filter((item) => item.tags.includes(tag));

  // Materials without a URL are drafts. They are listed but the download is
  // disabled with an explanation, rather than rendering a link to nowhere.
  const downloadable = displayed.filter((item) => item.url.trim());

  useEffect(() => {
    if (searchTarget) setTag('all');
  }, [searchTarget]);

  useEffect(() => {
    if (!searchTarget) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`search-target-study-${searchTarget}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchTarget, displayed.length]);

  return (
    <Section
      id="study"
      eyebrow="Notes & Resources"
      title="Study Material"
      lede="Reference sheets, workshop notes and guides — free to download."
      aside={tags.length > 1 ? (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter resources by tag">
          <button
            type="button"
            aria-pressed={tag === 'all'}
            onClick={() => { sounds.click(); setTag('all'); }}
            className="filter-pill"
          >
            All
          </button>
          {tags.map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={tag === entry}
              onClick={() => { sounds.click(); setTag(entry); }}
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
          title="No resources published yet"
          body="Guides, cheatsheets and notes added here appear as a downloadable library."
        />
      ) : displayed.length === 0 ? (
        <EmptyState title="Nothing with that tag" body="Pick a different tag to see the rest of the library." />
      ) : (
        <>
          {downloadable.length < displayed.length && (
            <Reveal className="mb-5">
              <p className="rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted)]">
                {displayed.length - downloadable.length} of these {displayed.length === 1 ? 'entry is' : 'entries are'} still
                drafts without a file attached. The download is disabled until a URL is added in Admin → Study Material.
              </p>
            </Reveal>
          )}

          <RevealGroup className="grid gap-4 sm:grid-cols-2">
            {displayed.map((item) => {
              const Icon = FILE_ICONS[item.fileType.toUpperCase()] ?? FileIcon;
              const hasFile = Boolean(item.url.trim());
              return (
                <div key={item.id} id={`search-target-study-${item.id}`} data-reveal-item>
                  <TiltCard lit maxTilt={1.5} className="h-full">
                    {hasFile ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => sounds.hover()}
                        className="card card-interactive card-sheen flex h-full flex-col rounded-panel p-5"
                      >
                        <StudyBody item={item} Icon={Icon} />
                        <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)]">
                          <Download size={13} aria-hidden="true" /> Download {item.fileType}
                        </span>
                      </a>
                    ) : (
                      <div className="card card-sheen flex h-full flex-col rounded-panel p-5 opacity-70">
                        <StudyBody item={item} Icon={Icon} />
                        <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--faint)]">
                          <Download size={13} aria-hidden="true" /> No file attached yet
                        </span>
                      </div>
                    )}
                  </TiltCard>
                </div>
              );
            })}
          </RevealGroup>
        </>
      )}
    </Section>
  );
}

function StudyBody({ item, Icon }: { item: StudyMaterial; Icon: typeof FileText }) {
  return (
    <>
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)]"
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-snug tracking-tight text-[var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--faint)]">
            {item.fileType}{item.fileSize && ` · ${item.fileSize}`} · {formatDate(item.date)}
          </p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-[var(--muted)]">{item.description}</p>
      {item.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((entry) => <li key={entry}><span className="tag">{entry}</span></li>)}
        </ul>
      )}
    </>
  );
}
