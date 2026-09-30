import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * Section-level scroll reveal.
 *
 * One shared IntersectionObserver for the whole document. Each element fires
 * exactly once and is then unobserved. Only `opacity` and `transform` are
 * animated, so the work stays on the compositor and never triggers layout.
 *
 * This replaces a dead convention: `.reveal`, `.hero-enter`, `data-hero-enter`
 * and `data-parallax` were applied to 32 elements across 9 files with **no CSS
 * rule at all**. Rather than adding rules and silently changing 32 elements at
 * once, the attributes were removed and this is opt-in per element.
 *
 * The visual state itself lives in CSS (`[data-reveal]` / `[data-revealed]`).
 * JavaScript only decides *when* an element is revealed, so a stylesheet that
 * fails to load degrades to fully-visible content rather than a blank page.
 *
 * Bails out — marking everything visible — when:
 *  - `animationSettings.enabled` is off or intensity is `off` (`data-motion`),
 *  - the OS asks for reduced motion,
 *  - `IntersectionObserver` is unavailable.
 */

type RevealFrom = 'bottom' | 'left' | 'right' | 'none';

const REVEAL_ELEMENTS = 'section > *, [data-reveal-item], [data-reveal]';

let observer: IntersectionObserver | null = null;
const observed = new WeakSet<Element>();

function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return document.documentElement.dataset.motion !== 'off';
}

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      element.dataset.revealed = 'true';
      observer?.unobserve(element);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
  return observer;
}

function prepare(element: HTMLElement, from: RevealFrom) {
  element.dataset.reveal = from;
  if (typeof IntersectionObserver === 'undefined') {
    element.dataset.revealed = 'true';
    return;
  }
  const io = getObserver();
  if (!io) {
    element.dataset.revealed = 'true';
    return;
  }
  if (!observed.has(element)) {
    observed.add(element);
    io.observe(element);
  }
}

/** Marks a subtree visible immediately. Used for above-the-fold content. */
export function revealNow(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(REVEAL_ELEMENTS).forEach((element) => {
    element.dataset.revealed = 'true';
  });
}

interface RevealProps {
  children?: ReactNode;
  as?: ElementType;
  from?: RevealFrom;
  /** Stagger step in ms, used when siblings reveal in sequence. */
  delay?: number;
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

/** Wraps a single element (usually a section shell or a feature card). */
export default function Reveal({
  children,
  as: Tag = 'div',
  from = 'bottom',
  delay = 0,
  className = '',
  id,
  ...aria
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!motionAllowed()) {
      element.dataset.revealed = 'true';
      return;
    }
    prepare(element, from);
    if (delay > 0 && !element.dataset.revealed) {
      element.style.transitionDelay = `${delay}ms`;
    }
    return () => { element.style.transitionDelay = ''; };
  }, [from, delay]);

  return (
    <Tag ref={ref} data-reveal={from} id={id} className={className} {...aria}>
      {children}
    </Tag>
  );
}

/**
 * Staggers the direct children of a container without one hook call per card.
 *
 * Children opt in with `data-reveal-item`. The stagger index comes from DOM
 * order and is capped so a 24-card grid does not finish revealing a full second
 * after the last card scrolls into view.
 */
export function RevealGroup({
  children,
  className = '',
  step = 60,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const items = [...container.querySelectorAll<HTMLElement>('[data-reveal-item]')];

    if (!motionAllowed()) {
      items.forEach((item) => { item.dataset.revealed = 'true'; });
      return;
    }

    items.forEach((item, index) => {
      prepare(item, 'bottom');
      if (item.dataset.revealed) return;
      item.style.transitionDelay = `${Math.min(index, max) * step}ms`;
    });

    return () => items.forEach((item) => { item.style.transitionDelay = ''; });
  }, [step, max]);

  return <div ref={ref} className={className}>{children}</div>;
}
