import { useEffect, useRef } from 'react';

export default function PerformanceCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const ringRefPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const hoveringRef = useRef(false);
  const initializedRef = useRef(false);

  const animate = useCallback(() => {
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const rx = ringRefPos.current.x;
    const ry = ringRefPos.current.y;

    const dx = mx - rx;
    const dy = my - ry;

    ringRefPos.current.x += dx * 0.18;
    ringRefPos.current.y += dy * 0.18;

    const ring = ringRef.current;
    if (ring) {
      ring.style.transform = `translate3d(${ringRefPos.current.x}px, ${ringRefPos.current.y}px, 0) translate(-50%, -50%)`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reducedMotion) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (dot) dot.style.opacity = '1';
    if (ring) ring.style.opacity = '1';

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      if (dot) {
        dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
        dot.style.opacity = '1';
      }
      if (!initializedRef.current && ring) {
        initializedRef.current = true;
        ring.style.opacity = '1';
      }
    };

    const interactiveSelector = 'a, button, [role="button"], input, textarea, select, [tabindex="0"]';
    const onOver = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(interactiveSelector)) {
        hoveringRef.current = true;
        document.body.classList.add('cursor-hover');
      }
    };
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget instanceof Element && e.relatedTarget.closest(interactiveSelector)) return;
      if (e.target instanceof Element && e.target.closest(interactiveSelector)) {
        hoveringRef.current = false;
        document.body.classList.remove('cursor-hover');
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });

    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.classList.remove('cursor-hover');
    };
  }, [animate]);

  return (
    <>
      <div ref={dotRef} className="perf-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="perf-cursor-ring" aria-hidden="true" />
    </>
  );
}