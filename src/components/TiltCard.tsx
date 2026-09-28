import { useEffect, useRef, type ReactNode } from 'react';
import { sounds } from '@/lib/sound';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
  onClick?: () => void;
}

const RESTING_TRANSFORM = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';

/** 3D tilt effect card that responds to mouse position. */
export default function TiltCard({ children, className = '', intensity = 12, glow = false, onClick }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  // Tilt is pointer-only and pointless when motion is reduced.
  useEffect(() => {
    enabled.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !enabled.current) return;
    const pointer = e;
    // Coalesce to one write per frame; getBoundingClientRect is read once and
    // the transform write happens off the event burst.
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const target = ref.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = pointer.clientX - rect.left - rect.width / 2;
      const y = pointer.clientY - rect.top - rect.height / 2;
      const rx = (y / (rect.height / 2)) * -intensity;
      const ry = (x / (rect.width / 2)) * intensity;
      target.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    });
  };

  const handleEnter = () => {
    sounds.hover();
  };

  const handleLeave = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    const el = ref.current;
    if (el) el.style.transform = RESTING_TRANSFORM;
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${glow ? 'glow-border' : ''} ${className}`}
      // A clickable div is invisible to the custom cursor's tag selector and
      // to the keyboard, so both are made explicit here.
      data-cursor={onClick ? 'link' : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
