import type { ReactNode } from 'react';
import Reveal from '@/components/Reveal';
import { cls } from '@/lib/utils';

interface SectionProps {
  id: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: string;
  lede?: string;
  children: ReactNode;
  /** Rendered to the right of the header on wide screens (filters, search). */
  aside?: ReactNode;
  className?: string;
  /** `h2` everywhere; `h1` is reserved for the hero. */
  headingLevel?: 'h2' | 'h3';
}

/**
 * The one section shell.
 *
 * Before this existed, seven files each inlined the same eyebrow / h2 /
 * gradient-rule / lede block, and they had drifted: `CustomSections` rendered
 * its h2 two steps smaller than every other section, and `Achievements` used
 * `h2` while sitting as a peer of `Extra`'s `h3` blocks. Centralising it means
 * heading level and type scale can no longer diverge.
 *
 * The `<section>` takes its accessible name from the visible heading via
 * `aria-labelledby`, so the heading is the region's name rather than an
 * `aria-label` that contradicts it.
 */
export default function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  aside,
  className,
  headingLevel: Heading = 'h2',
}: SectionProps) {
  const headingId = `${id}-heading`;
  const hasHeader = Boolean(eyebrow || title || lede || aside);

  return (
    <section
      id={id}
      aria-labelledby={hasHeader ? headingId : undefined}
      className={cls('section-shell', className)}
    >
      <div className="shell">
        {hasHeader && (
          <Reveal className="mb-9 flex flex-col gap-5 sm:mb-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
              <Heading id={headingId} className="section-title">
                {title}
              </Heading>
              {lede && <p className="section-lede">{lede}</p>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

/** The luminous rule that separates one section from the next. */
export function SectionRule() {
  return (
    <div className="shell" aria-hidden="true">
      <div className="section-rule">
        <span className="section-rule-dot" />
      </div>
    </div>
  );
}

/** Standard empty state. Never a bare "Nothing here." */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-body">{body}</p>
      {action}
    </div>
  );
}
