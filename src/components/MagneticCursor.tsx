import { useEffect, useRef, useCallback } from 'react';

/** Magnetic glowing cursor with trailing ring. Hidden on touch devices. */
export default function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const hoveringRef = useRef(false);

  const setHover = useCallback((hovering: boolean) => {
    if (hoveringRef.current === hovering) return;
    hoveringRef.current = hovering;
    document.body.classList.toggle('cursor-hover', hovering);
  }, []);

  const animate = useCallback(() => {
    const dx = pendingRef.current.x - ringPosRef.current.x;
    const dy = pendingRef.current.y - ringPosRef.current.y;
    // Stop the rAF loop once the ring has converged on the pointer.
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      rafRef.current = 0;
      return;
    }
    ringPosRef.current.x += dx * 0.2;
    ringPosRef.current.y += dy * 0.2;
    const ring = ringRef.current;
    if (ring) {
      ring.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0) translate(-50%, -50%)`;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const kick = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    // Only for real pointing devices, and never when motion is reduced.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    pendingRef.current = { x: centerX, y: centerY };
    ringPosRef.current = { x: centerX, y: centerY };

    const onMove = (e: MouseEvent) => {
      pendingRef.current.x = e.clientX;
      pendingRef.current.y = e.clientY;
      const dot = dotRef.current;
      if (dot) {
        dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      kick();
    };

    const onDown = () => setHover(true);
    const onUp = () => setHover(false);

    // Delegate hover checks only to interactive controls, not every card.
    const interactiveSelector = 'a, button, input, textarea, select, [data-cursor-hover]';
    const onOver = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(interactiveSelector)) setHover(true);
    };
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget instanceof Element && e.relatedTarget.closest(interactiveSelector)) return;
      if (e.target instanceof Element && e.target.closest(interactiveSelector)) setHover(false);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    // The ring only needs animating while the pointer is actually moving.
    kick();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.classList.remove('cursor-hover');
    };
  }, [kick, setHover]);

  return (
    <>
      <div ref={dotRef} className="cursor-dot hidden md:block gpu-layer" />
      <div ref={ringRef} className="cursor-ring hidden md:block gpu-layer" />
    </>
  );
}
