import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Custom cursor.
 *
 * Architecture rules this file must never break:
 *  - No `useState` anywhere. Coordinates live in plain refs mutated inside a
 *    requestAnimationFrame loop and are written straight to `style.transform`.
 *    A React re-render per pointer event would cap the cursor far below 120Hz.
 *  - The layer is portalled to <body> so it can never inherit a containing
 *    block from a transformed ancestor (any `transform`/`filter`/`will-change`
 *    on an app wrapper silently turns `position: fixed` into document-relative
 *    positioning, which makes the cursor scroll away and vanish).
 *  - The wrapper is inert: `pointer-events: none !important` + `user-select:
 *    none`, so clicks, taps, hovers and text selection always reach the real
 *    UI underneath. Nothing here calls preventDefault or stopPropagation.
 */

/** Elements that grow the cursor on hover. */
const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], summary, label[for]';
/** Ring trail strength. Higher = snappier. */
const RING_LERP = 0.25;
/** Class that suppresses the native cursor; only present while this layer is live. */
const ACTIVE_CLASS = 'custom-cursor-active';

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  // Per-element override: data-cursor="link" forces the hover state,
  // data-cursor="hidden" opts a subtree out (e.g. static display cards).
  const override = target.closest('[data-cursor]');
  if (override) {
    const mode = override.getAttribute('data-cursor');
    if (mode === 'hidden') return false;
    if (mode === 'link') return true;
  }
  return target.closest(INTERACTIVE) !== null;
}

function clamp(value: number, max: number) {
  return value < 0 ? 0 : value > max ? max : value;
}

function supportedDevice() {
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function CustomCursor() {
  // The one and only piece of React state in this file. It is a mount gate,
  // not coordinate state: it flips at most twice per session and never during
  // a frame. All pointer tracking below is pure DOM + refs.
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Touch devices must not mount this layer at all, and a mouse plugged into
  // a tablet has to bring it back without a reload.
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMounted(supportedDevice());
    sync();
    finePointer.addEventListener('change', sync);
    reducedMotion.addEventListener('change', sync);
    return () => {
      finePointer.removeEventListener('change', sync);
      reducedMotion.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const wrap = wrapRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!wrap || !dot || !ring) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const supported = () => finePointer.matches && !reducedMotion.matches;

    // Belt and braces: even an inline style or a later stylesheet rule cannot
    // make this layer swallow a click.
    for (const el of [wrap, dot, ring]) {
      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('user-select', 'none', 'important');
      el.style.setProperty('-webkit-user-select', 'none', 'important');
    }

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: target.x, y: target.y };

    let raf = 0;
    let lastFrame = 0;
    let running = false;
    let live = false;
    let hovering = false;
    let dotX = Number.NaN;
    let dotY = Number.NaN;
    let ringX = Number.NaN;
    let ringY = Number.NaN;

    const paintDot = (x: number, y: number) => {
      if (x === dotX && y === dotY) return;
      dotX = x;
      dotY = y;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    const paintRing = (x: number, y: number) => {
      if (x === ringX && y === ringY) return;
      ringX = x;
      ringY = y;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    // CSS gives `.is-live` a `transition: none`, so showing is instant while
    // losing the pointer still fades out gracefully.
    const setLive = (next: boolean) => {
      if (next === live) return;
      live = next;
      wrap.classList.toggle('is-live', next);
    };

    const setHover = (next: boolean) => {
      if (next === hovering) return;
      hovering = next;
      wrap.classList.toggle('is-hover', next);
    };

    // The ring interpolates; the dot is written straight from the pointer event
    // so its tip stays pixel-exact under the cursor with zero perceived lag.
    const frame = (now: number) => {
      if (!running) return;
      // Frame-rate independent LERP: identical feel at 60Hz and 120Hz.
      const step = lastFrame ? Math.min((now - lastFrame) / 16.6667, 5) : 1;
      lastFrame = now;
      const ease = 1 - Math.pow(1 - RING_LERP, step);

      ringPos.x += (target.x - ringPos.x) * ease;
      ringPos.y += (target.y - ringPos.y) * ease;

      paintRing(ringPos.x, ringPos.y);
      raf = requestAnimationFrame(frame);
    };

    // The loop only runs while the pointer is in the window: zero idle cost.
    const start = () => {
      if (running) return;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e: MouseEvent) => {
      // Keep the layer inside the viewport even for out-of-bounds coordinates.
      target.x = clamp(e.clientX, window.innerWidth);
      target.y = clamp(e.clientY, window.innerHeight);
      paintDot(target.x, target.y);
      setLive(true);
      start();
      setHover(isInteractive(e.target));
    };

    const onOver = (e: MouseEvent) => setHover(isInteractive(e.target));
    const onOut = (e: MouseEvent) => setHover(isInteractive(e.relatedTarget));

    // Leaving the document: relatedTarget is null only when the pointer truly
    // exits the window, not when it moves between elements.
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget !== null) return;
      setHover(false);
      setLive(false);
      stop();
    };

    const onBlur = () => {
      setHover(false);
      setLive(false);
      stop();
    };

    // Anything that proves the pointer is back in the window brings the
    // cursor straight back, so no path can strand it invisible.
    const revive = () => {
      if (!supported()) return;
      setLive(true);
      start();
    };

    const onResize = () => {
      target.x = clamp(target.x, window.innerWidth);
      target.y = clamp(target.y, window.innerHeight);
      paintDot(target.x, target.y);
      paintRing(target.x, target.y);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') revive();
    };

    const activate = () => {
      document.documentElement.classList.add(ACTIVE_CLASS);
      setLive(true);
      start();
    };

    const deactivate = () => {
      document.documentElement.classList.remove(ACTIVE_CLASS);
      setLive(false);
      setHover(false);
      stop();
    };

    // Plugging in a mouse, or flipping reduced-motion, swaps implementations
    // live without a re-render.
    const onCapabilityChange = () => {
      if (supported()) activate();
      else deactivate();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onMove, { passive: true });
    window.addEventListener('wheel', revive, { passive: true });
    window.addEventListener('scroll', revive, { passive: true, capture: true });
    window.addEventListener('focus', revive, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('blur', onBlur);
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    finePointer.addEventListener('change', onCapabilityChange);
    reducedMotion.addEventListener('change', onCapabilityChange);

    if (supported()) activate();
    else deactivate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onMove);
      window.removeEventListener('wheel', revive);
      window.removeEventListener('scroll', revive, true);
      window.removeEventListener('focus', revive);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      finePointer.removeEventListener('change', onCapabilityChange);
      reducedMotion.removeEventListener('change', onCapabilityChange);
      stop();
      deactivate();
    };
  }, [mounted]);

  if (typeof document === 'undefined' || !mounted) return null;

  return createPortal(
    <div ref={wrapRef} className="cc-root" aria-hidden="true">
      <div ref={dotRef} className="cc-dot" style={{ willChange: 'transform' }} />
      <div ref={ringRef} className="cc-ring" style={{ willChange: 'transform' }} />
    </div>,
    document.body,
  );
}
