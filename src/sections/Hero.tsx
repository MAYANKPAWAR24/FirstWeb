import { useState } from 'react';
import { sounds } from '@/lib/sound';
import type { Profile, SectionId } from '@/lib/types';
import HeroAtmosphere from '@/components/HeroAtmosphere';

interface HeroProps {
  profile: Profile;
  visitorCount: number;
  onNavigate: (id: SectionId) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export default function Hero({ profile, visitorCount, onNavigate }: HeroProps) {
  const [greeting] = useState(getGreeting);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 pt-24 pb-16 gpu-accelerated">
      <div className="hero-depth hero-depth-back gpu-layer" data-parallax="0.12" aria-hidden="true">
        <span>MEGISTO</span>
      </div>
      <div className="hero-depth hero-depth-front gpu-layer" data-parallax="0.24" aria-hidden="true" />
      <HeroAtmosphere />
      <div className="max-w-5xl mx-auto text-center relative z-10 gpu-layer">
        {/* Greeting badge */}
        <div data-hero-enter className="hero-enter inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
          <span className="text-sm text-white/70 font-medium">{greeting} — welcome to my corner of the internet</span>
        </div>

        {/* Name */}
        <h1 data-hero-enter className="hero-enter font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4">
          <span className="gradient-text">{profile.name}</span>
        </h1>

        {/* Title */}
        <p data-hero-enter className="hero-enter text-lg sm:text-xl text-white/50 font-medium mb-6">
          {profile.title}
        </p>

        {/* Typewriter tagline */}
        <div data-hero-enter className="hero-enter min-h-8 sm:min-h-10 mb-12">
          <p className="text-base sm:text-lg text-cyan-300/80 font-display font-medium">
            {profile.tagline}
          </p>
        </div>

        {/* Stats */}
        <div data-hero-enter className="hero-enter grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          {profile.highlights.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl px-4 py-5">
              <div className="text-3xl font-display font-bold gradient-text-cyan">{stat.value}</div>
              <div className="text-xs text-white/50 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div data-hero-enter className="hero-enter flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => { sounds.click(); onNavigate('literature'); }}
            onMouseEnter={() => sounds.hover()}
            className="btn-premium px-8 py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide"
          >
            Explore My Work
          </button>
          <button
            onClick={() => { sounds.click(); onNavigate('extra'); }}
            onMouseEnter={() => sounds.hover()}
            className="px-8 py-3.5 rounded-2xl font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/20 text-sm tracking-wide transition-all"
          >
            Get in Touch
          </button>
        </div>

        {/* Visitor counter */}
        <div data-hero-enter className="hero-enter mt-16 inline-flex items-center gap-3 text-xs text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>{visitorCount.toLocaleString()} visitors have been here</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-cyan-400" />
        </div>
      </div>
    </section>
  );
}
