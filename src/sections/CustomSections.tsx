import { Suspense, lazy, type ReactNode } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { MediaPreview } from '@/components/VideoEmbed';
import { sounds } from '@/lib/sound';
import { normalizeUrl } from '@/lib/media';
import type { CustomSection } from '@/lib/types';

// Games are only needed when a `game` section is visible, so they stay out of
// the first-paint bundle.
const TicTacToe = lazy(() => import('@/components/games/TicTacToe'));
const Snake = lazy(() => import('@/components/games/Snake'));

function GameSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="h-64 w-full animate-pulse rounded-3xl border border-white/70 bg-white/70" />
      <p className="text-xs text-slate-500">Loading the arena…</p>
    </div>
  );
}

/** Renders every public (unhidden) custom section, in the admin's order. */
export default function CustomSections({ sections }: { sections: CustomSection[] }) {
  const visible = sections.filter((section) => section.isVisible !== false);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((section) => (
        <section
          key={section.id}
          id={`custom-${section.id}`}
          className="section-shell px-4 sm:px-6"
          aria-label={section.title}
        >
          <div className="mx-auto max-w-4xl">
            <div className="glass-card reveal rounded-3xl p-5 sm:p-8">
              <header className="mb-6 text-center">
                {section.category && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700/70">
                    {section.category}
                  </p>
                )}
                <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{section.title}</h2>
                <div className="heading-line mx-auto mt-4" />
              </header>

              <SectionBody section={section} />

              {section.linkLabel.trim() && section.mediaUrl.trim() && (
                <div className="mt-6 flex justify-center">
                  <a
                    href={normalizeUrl(section.mediaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => sounds.hover()}
                    className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-800"
                  >
                    {section.linkLabel.trim()}
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function SectionBody({ section }: { section: CustomSection }) {
  switch (section.type) {
    case 'media':
      return <MediaPreview url={section.mediaUrl} title={section.title} />;
    case 'game':
      return (
        <div className="flex justify-center">
          <Suspense fallback={<GameSkeleton />}>
            {section.game === 'snake' ? <Snake /> : <TicTacToe />}
          </Suspense>
        </div>
      );
    case 'widget':
      return <WidgetBody section={section} />;
    default:
      return <RichText content={section.content} />;
  }
}

interface WidgetItem {
  label?: unknown;
  value?: unknown;
  description?: unknown;
}

/**
 * `widget` sections accept an optional JSON payload for a feature/stat grid:
 *   [{ "label": "Projects", "value": "27", "description": "shipped" }, …]
 * Anything that is not valid JSON falls back to plain text, so the editor can
 * never break the public page.
 */
function WidgetBody({ section }: { section: CustomSection }) {
  const items = parseWidgetItems(section.content);

  if (items.length === 0) {
    return <RichText content={section.content} />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 text-center">
          {typeof item.value === 'string' && item.value && (
            <p className="font-display text-3xl font-bold text-cyan-700">{item.value}</p>
          )}
          {typeof item.label === 'string' && item.label && (
            <p className="mt-1 text-sm font-semibold text-slate-800">{item.label}</p>
          )}
          {typeof item.description === 'string' && item.description && (
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function parseWidgetItems(content: string): WidgetItem[] {
  if (!content.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is WidgetItem => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .slice(0, 12);
  } catch {
    return [];
  }
}

type Block =
  | { kind: 'h2' | 'h3' | 'quote' | 'code'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('```')) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        body.push(lines[index]);
        index += 1;
      }
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('> ')) {
      blocks.push({ kind: 'quote', text: trimmed.slice(2) });
    } else if (/^[-*•]\s+/.test(trimmed)) {
      const last = blocks[blocks.length - 1];
      const item = trimmed.replace(/^[-*•]\s+/, '');
      if (last?.kind === 'ul') last.items.push(item);
      else blocks.push({ kind: 'ul', items: [item] });
    } else {
      const last = blocks[blocks.length - 1];
      // A plain line directly after a paragraph continues it.
      if (last?.kind === 'p') last.text += `\n${line}`;
      else blocks.push({ kind: 'p', text: line });
    }
  }

  return blocks;
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-800">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * A deliberately tiny, escape-safe markdown subset: `##`/`###` headings,
 * `-` bullets, `>` quotes, ``` code fences, **bold**, *italic* and `code`.
 * React escapes every string, so no custom-section content can inject HTML.
 */
function RichText({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        This section has no content yet. Add some from the admin panel.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-slate-600">
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        if (block.kind === 'h2') {
          return <h3 key={key} className="font-display text-xl font-bold text-slate-900">{renderInline(block.text)}</h3>;
        }
        if (block.kind === 'h3') {
          return <h4 key={key} className="text-base font-semibold text-slate-800">{renderInline(block.text)}</h4>;
        }
        if (block.kind === 'quote') {
          return (
            <blockquote key={key} className="border-l-2 border-cyan-400/60 pl-4 italic text-slate-500">
              {renderInline(block.text)}
            </blockquote>
          );
        }
        if (block.kind === 'code') {
          return (
            <pre key={key} className="ios-scroll overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={key} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="flex gap-2">
                  <Sparkles size={16} className="mt-1 shrink-0 text-cyan-600" aria-hidden="true" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
