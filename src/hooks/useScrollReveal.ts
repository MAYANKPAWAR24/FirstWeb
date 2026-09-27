import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollReveal() {
  const contextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const context = gsap.context(() => {});
    contextRef.current = context;
    const animatedReveals = new WeakSet<HTMLElement>();
    const animatedIntros = new WeakSet<HTMLElement>();
    const animatedParallax = new WeakSet<HTMLElement>();
    let scanFrame = 0;

    const scan = (refreshLayout = false) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let hasNewTriggers = false;

      document.querySelectorAll<HTMLElement>('.reveal').forEach((element) => {
        if (animatedReveals.has(element)) return;
        animatedReveals.add(element);
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
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
        });
      });

      document.querySelectorAll<HTMLElement>('[data-hero-enter]').forEach((element) => {
        if (animatedIntros.has(element)) return;
        animatedIntros.add(element);
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

      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((element) => {
        if (animatedParallax.has(element)) return;
        const section = element.parentElement;
        if (!section) return;
        animatedParallax.add(element);
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

      if (hasNewTriggers || refreshLayout) ScrollTrigger.refresh();
    };

    const scheduleScan = () => {
      cancelAnimationFrame(scanFrame);
      scanFrame = requestAnimationFrame(() => scan(true));
    };

    scan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(scanFrame);
      contextRef.current?.revert();
      contextRef.current = null;
    };
  }, []);
}