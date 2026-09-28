import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ROOT = document.documentElement;

/** Undo the hidden state and stop depending on ScrollTrigger. */
function revealEverything() {
  ROOT.classList.remove('reveal-ready');
  ROOT.classList.add('no-motion');
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  gsap.set('.reveal, .hero-enter', { clearProps: 'all' });
}

export function useScrollReveal() {
  const contextRef = useRef<gsap.Context | null>(null);
  const animatedRef = useRef<WeakSet<HTMLElement>>(new WeakSet());
  const scanFrameRef = useRef<number>(0);
  const observerRef = useRef<MutationObserver | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const failsafeTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touchDevice = window.matchMedia('(hover: none)').matches;

    // Reduced motion: show everything immediately and register no triggers.
    if (reducedMotion) {
      ROOT.classList.remove('reveal-ready');
      ROOT.classList.add('no-motion');
      document.querySelectorAll<HTMLElement>('.reveal, .hero-enter').forEach((element) => {
        element.style.opacity = '1';
      });
      return;
    }
    // Only now is it safe to hide content: we are certain the reveal
    // machinery below is running and will make it visible again.
    ROOT.classList.remove('no-motion');
    ROOT.classList.add('reveal-ready');

    // Belt and braces: if ScrollTrigger registered no triggers at all, the
    // reveal machinery is not working — show everything rather than a blank page.
    failsafeTimerRef.current = window.setTimeout(() => {
      if (ScrollTrigger.getAll().length === 0) revealEverything();
    }, 3000);

    try {
      const context = gsap.context(() => {});
      contextRef.current = context;

      const scan = () => {
        let hasNewTriggers = false;

        // Single pass over added nodes only — no repeated document-wide queries.
        document.querySelectorAll<HTMLElement>('.reveal').forEach((element) => {
          if (animatedRef.current.has(element)) return;
          animatedRef.current.add(element);
          hasNewTriggers = true;

          const siblings = Array.from(element.parentElement?.children ?? []).filter(
            (sibling): sibling is HTMLElement => sibling instanceof HTMLElement && sibling.classList.contains('reveal')
          );
          const siblingIndex = siblings.indexOf(element);

          context.add(() => {
            gsap.fromTo(element, {
              autoAlpha: 0,
              y: 42,
              scale: 0.985,
            }, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              ease: 'power3.out',
              delay: Math.min(siblingIndex * 0.075, 0.3),
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                end: 'top 58%',
                scrub: touchDevice ? false : 0.8,
                invalidateOnRefresh: true,
              },
            });
          });
        });

        document.querySelectorAll<HTMLElement>('[data-hero-enter]').forEach((element) => {
          if (animatedRef.current.has(element)) return;
          animatedRef.current.add(element);
          hasNewTriggers = true;
          const siblings = Array.from(element.parentElement?.children ?? []).filter(
            (sibling): sibling is HTMLElement => sibling instanceof HTMLElement && sibling.hasAttribute('data-hero-enter')
          );

          context.add(() => {
            gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              delay: Math.min(siblings.indexOf(element) * 0.12, 0.72),
              ease: 'power3.out',
            });
          });
        });

        if (!touchDevice) document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((element) => {
          if (animatedRef.current.has(element)) return;
          const section = element.parentElement;
          if (!section) return;
          animatedRef.current.add(element);
          hasNewTriggers = true;
          const speed = Number(element.dataset.parallax) || 0.1;

          context.add(() => {
            gsap.fromTo(element, {
              y: () => -window.innerHeight * speed * 0.25,
            }, {
              y: () => window.innerHeight * speed * 0.25,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
          });
        });

        // ScrollTrigger.refresh() forces a full layout read, so throttle it.
        if (hasNewTriggers) {
          const now = performance.now();
          if (now - lastRefreshRef.current > 200) {
            lastRefreshRef.current = now;
            // Defer to next frame to batch layout reads
            requestAnimationFrame(() => ScrollTrigger.refresh());
          }
        }
      };

      const scheduleScan = () => {
        if (scanFrameRef.current) return;
        scanFrameRef.current = requestAnimationFrame(() => {
          scanFrameRef.current = 0;
          scan();
        });
      };

      scan();

      // Only react to added/removed nodes, not every attribute change, and stop
      // observing once the page has settled.
      observerRef.current = new MutationObserver((records) => {
        const structural = records.some((record) => record.addedNodes.length > 0 || record.removedNodes.length > 0);
        if (structural) scheduleScan();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => observerRef.current?.disconnect(), 8000);
      });
      observerRef.current.observe(document.body, { childList: true, subtree: true });

      return () => {
        if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
        observerRef.current?.disconnect();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
        contextRef.current?.revert();
        contextRef.current = null;
        animatedRef.current = new WeakSet();
      };
    } catch (error) {
      // GSAP/ScrollTrigger unavailable: show everything rather than a blank page.
      console.error('Scroll reveal failed to initialise', error);
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      revealEverything();
    }
  }, []);
}