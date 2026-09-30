import { useRef, type ReactNode } from 'react';
import { cls } from '@/lib/utils';
interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Adds the pointer-follow highlight. */
  lit?: boolean;
  /**
   * Degrees of 3D tilt. 0 disables it entirely, which is what every touch
   * device and reduced-motion user gets.
   */
  maxTilt?: number;
}

/**
 * Depth on hover: a small 3D tilt plus a pointer-follow highlight.
 *
 * Two hard rules, both learned the hard way in this repo:
 *
 *  1. `pointermove` is throttled through one rAF per card and never calls
 *     `preventDefault`, so it can never swallow a click.
 *  2. The transform is written to a CSS custom property consumed by a nested
 *     element, never to the card itself. Putting `transform` on the card would
 *     make it the containing block for every `position: fixed` descendant,
 *     which is the bug documented at `App.tsx` and `index.css`.
 *
 * Tilt is disabled entirely on coarse pointers and reduced motion.
 */
export default function TiltCard({
  children,
  className = '',
  lit = false,
  maxTilt = 3.5,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    maxTilt > 0
    && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    && document.documentElement.dataset.motion !== 'off';

  const handleMove = (event: React.PointerEvent) => {
    if (!enabled()) return;
    const card = cardRef.current;
    if (!card) return;
    const point = event;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const rect = card.getBoundingClientRect();
      const px = (point.clientX - rect.left) / rect.width;
      const py = (point.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      card.style.setProperty('--tilt-x', `${(0.5 - py) * maxTilt}deg`);
      card.style.setProperty('--tilt-y', `${(px - 0.5) * maxTilt}deg`);
    });
  };

  const reset = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cls('card-tilt', lit && 'card-lit', className)}
    >
      {children}
    </div>
  );
}
