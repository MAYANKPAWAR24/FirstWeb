import { useEffect, useRef } from 'react';

/**
 * Page scroll progress.
 *
 * `aria-hidden`: a continuously updating percentage is noise for a screen
 * reader, and the value is already conveyed by the browser's own scroll
 * position. Exposing it as a live region would produce constant chatter.
 *
 * Written with a transform inside one rAF loop, so scrolling never triggers
 * layout.
 */
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left scale-x-0 bg-gradient-to-r from-[var(--accent)] via-[var(--iris)] to-[var(--ember)]"
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
