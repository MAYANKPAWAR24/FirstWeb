import { useEffect, useRef } from 'react';

/** Magnetic glowing cursor with trailing ring. Hidden on touch devices. */
export default function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = `${mouseX}px`;
        dotRef.current.style.top = `${mouseY}px`;
      }
    };

    const onDown = () => {
      document.body.classList.add('cursor-hover');
    };
    const onUp = () => {
      document.body.classList.remove('cursor-hover');
    };

    const onEnterInteractive = () => document.body.classList.add('cursor-hover');
    const onLeaveInteractive = () => document.body.classList.remove('cursor-hover');

    const animate = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.left = `${ringX}px`;
        ringRef.current.style.top = `${ringY}px`;
      }
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    const interactiveSelector = 'a, button, .tilt-card, .glass-card, input, textarea, select, [data-cursor-hover]';
    const els = document.querySelectorAll(interactiveSelector);
    els.forEach((el) => {
      el.addEventListener('mouseenter', onEnterInteractive);
      el.addEventListener('mouseleave', onLeaveInteractive);
    });

    // Re-scan periodically for dynamically added elements
    const observer = new MutationObserver(() => {
      const newEls = document.querySelectorAll(interactiveSelector);
      newEls.forEach((el) => {
        el.removeEventListener('mouseenter', onEnterInteractive);
        el.removeEventListener('mouseleave', onLeaveInteractive);
        el.addEventListener('mouseenter', onEnterInteractive);
        el.addEventListener('mouseleave', onLeaveInteractive);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      els.forEach((el) => {
        el.removeEventListener('mouseenter', onEnterInteractive);
        el.removeEventListener('mouseleave', onLeaveInteractive);
      });
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot hidden md:block" />
      <div ref={ringRef} className="cursor-ring hidden md:block" />
    </>
  );
}
