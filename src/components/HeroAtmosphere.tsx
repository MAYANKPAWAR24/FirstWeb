import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const PARTICLES = [
  { x: 110, y: 148, radius: 2 },
  { x: 220, y: 350, radius: 1.5 },
  { x: 355, y: 116, radius: 2.5 },
  { x: 496, y: 432, radius: 1.5 },
  { x: 640, y: 186, radius: 2 },
  { x: 774, y: 368, radius: 2.5 },
  { x: 916, y: 126, radius: 1.5 },
  { x: 1084, y: 314, radius: 2 },
  { x: 1012, y: 516, radius: 1.5 },
  { x: 308, y: 548, radius: 2 },
];

export default function HeroAtmosphere() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const section = svg?.closest('section');
    if (!svg || !section || !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      gsap.utils.toArray<SVGCircleElement>('[data-ambient-particle]', svg).forEach((particle, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        gsap.to(particle, {
          x: direction * (8 + (index % 4) * 4),
          y: -8 - (index % 3) * 5,
          duration: 4 + (index % 4),
          delay: index * 0.16,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    }, svg);

    const quickX = gsap.quickTo(svg, 'x', { duration: 1.1, ease: 'power3.out' });
    const quickY = gsap.quickTo(svg, 'y', { duration: 1.1, ease: 'power3.out' });
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      quickX((event.clientX - window.innerWidth / 2) * 0.018);
      quickY((event.clientY - window.innerHeight / 2) * 0.018);
    };
    const resetPointer = () => { quickX(0); quickY(0); };

    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', resetPointer, { passive: true });

    return () => {
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', resetPointer);
      context.revert();
      gsap.killTweensOf(svg);
    };
  }, []);

  return (
    <svg ref={svgRef} className="hero-atmosphere" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
      <path className="hero-atmosphere-trace" d="M80 510 C250 420 275 255 468 292 S735 500 880 336 1050 180 1160 220" />
      <path className="hero-atmosphere-trace hero-atmosphere-trace-soft" d="M40 190 C230 255 330 90 520 138 S790 310 940 204 1100 94 1180 132" />
      {PARTICLES.map((particle, index) => (
        <circle
          key={`${particle.x}-${particle.y}`}
          data-ambient-particle
          cx={particle.x}
          cy={particle.y}
          r={particle.radius}
          className={index % 3 === 0 ? 'hero-particle hero-particle-bright' : 'hero-particle'}
        />
      ))}
    </svg>
  );
}