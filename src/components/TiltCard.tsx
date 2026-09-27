import { useRef, type ReactNode } from 'react';
import { sounds } from '@/lib/sound';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
  onClick?: () => void;
}

/** 3D tilt effect card that responds to mouse position. */
export default function TiltCard({ children, className = '', intensity = 12, glow = false, onClick }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -intensity;
    const ry = ((x - cx) / cx) * intensity;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
  };

  const handleEnter = () => {
    sounds.hover();
  };

  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${glow ? 'glow-border' : ''} ${className}`}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
