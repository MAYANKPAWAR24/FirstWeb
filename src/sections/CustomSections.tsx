import { Suspense } from 'react';
import { ArrowUpRight, Link as LinkIcon } from 'lucide-react';
import Section from '@/components/Section';
import Reveal from '@/components/Reveal';
import { VideoPlayer, MediaPreview } from '@/components/VideoEmbed';
import { lazyGame, resolveGame } from '@/components/games/registry';
import { sounds } from '@/lib/sound';
import type { CustomSection } from '@/lib/types';

interface CustomSectionsProps {
  sections: CustomSection[];
}

/**
 * Admin-built sections, rendered after the built-in ones in their saved order.
 *
 * Each one gets a stable `custom-<id>` anchor and is named by its own visible
 * heading. The previous version put an `aria-label` on the `<section>`, which
 * overrode the heading as the region's accessible name and left the heading
 * looking redundant to a screen reader.
 */
export default function CustomSections({ sections }: CustomSectionsProps) {
  const visible = sections.filter((section) => section.isVisible !== false);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((section) => (
        <Section
          key={section.id}
          id={`custom-${section.id}`}
          eyebrow={section.category || undefined}
          title={section.title}
        >
          <Reveal className="mx-auto max-w-3xl">
            <div className="card card-sheen rounded-panel p-6 sm:p-8">
              <SectionBody section={section} />
            </div>
          </Reveal>
        </Section>
      ))}
    </>
  );
}

function SectionBody({ section }: { section: CustomSection }) {
  switch (section.type) {
    case 'media':
      return <MediaPreview url={section.mediaUrl} title={section.title} />;

    case 'game': {
      const game = resolveGame(section.game);
      const Game = lazyGame(game.id);
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-[13px] text-[var(--muted)]">{game.blurb}</p>
          <Suspense fallback={<div className="skeleton h-64 w-full max-w-md rounded-panel" />}>
            <Game />
          </Suspense>
        </div>
      );
    }

    case 'widget':
      return <WidgetBody section={section} />;

    default:
      return <RichText section={section} />;
  }
}

/** A tiny markdown-ish subset: paragraphs, `##` and `###`, and `-` lists. */
function RichText({ section }: { section: CustomSection }) {
  const content = section.content;
  const blocks = content.split('\n').map((line) => line.trim()).filter(Boolean);

  if (blocks.length === 0) {
    return (
      <p className="text-[13.5px] text-[var(--muted)]">
        This section has no content yet. Edit it in <strong>Admin → Section Builder</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((line, index) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={index} className="pt-2 font-display text-[15px] font-semibold text-[var(--ink-2)]">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className="pt-3 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <ul key={index} className="ml-4 list-disc space-y-1 text-[14px] leading-relaxed text-[var(--muted)]">
              <li>{line.slice(2)}</li>
            </ul>
          );
        }
        return (
          <p key={index} className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">{line}</p>
        );
      })}

      {section.linkLabel.trim() && <SectionCta section={section} />}
    </div>
  );
}

function SectionCta({ section }: { section: CustomSection }) {
  if (!section.linkLabel.trim() || !section.mediaUrl.trim()) return null;
  const href = section.mediaUrl;
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onMouseEnter={() => sounds.hover()}
      className="btn btn-secondary mt-4"
    >
      <LinkIcon size={14} aria-hidden="true" />
      {section.linkLabel}
      {external && <ArrowUpRight size={13} aria-hidden="true" />}
    </a>
  );
}

function WidgetBody({ section }: { section: CustomSection }) {
  if (!section.mediaUrl.trim()) {
    return (
      <p className="text-[13.5px] text-[var(--muted)]">
        This widget has no source URL yet. Add one in <strong>Admin → Section Builder</strong>.
      </p>
    );
  }
  return <VideoPlayer url={section.mediaUrl} title={section.title} />;
}
