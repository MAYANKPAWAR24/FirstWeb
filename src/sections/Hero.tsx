import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, MousePointerClick } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { HeroSettings, Profile, SectionId } from '@/lib/types';
import HeroAtmosphere from '@/components/HeroAtmosphere';
import Reveal from '@/components/Reveal';
import { cls } from '@/lib/utils';

interface HeroProps {
  profile: Profile;
  hero: HeroSettings;
  visitorCount: number;
  /** Navigation targets that currently exist, so a hidden section is not linked. */
  availableTargets: Set<SectionId>;
  onNavigate: (id: SectionId) => void;
}

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/** Initials for the nav monogram, derived rather than hardcoded. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Hero({ profile, hero, visitorCount, availableTargets, onNavigate }: HeroProps) {
  const [greeting, setGreeting] = useState('');
  const nameRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setGreeting(timeOfDay());
    // The H1 is the LCP element. Mark it revealed on mount rather than waiting
    // for an intersection callback, which can lag a frame on a slow device.
    if (nameRef.current) nameRef.current.dataset.revealed = 'true';
  }, []);

  const ctas = hero.ctas.filter((cta) => cta.label.trim() && availableTargets.has(cta.target));
  const [primary, ...rest] = ctas;

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:pt-32"
    >
      <HeroAtmosphere />

      {/* Depth layers. Both are `aria-hidden` and carry no transform, so they
          cannot interfere with the fixed nav or dialogs. */}
      <div className="ambient-only pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute left-1/2 top-[38%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.55]"
          style={{
            background: 'radial-gradient(circle, rgba(10,130,189,0.13), transparent 66%)',
          }}
        />
        <div
          className="absolute left-[62%] top-[18%] h-[26rem] w-[26rem] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle, rgba(97,70,223,0.12), transparent 68%)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-4xl text-center">
        {hero.showGreeting && (
          <Reveal
            from="bottom"
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-2 shadow-[0_1px_2px_rgba(12,12,17,0.04)] backdrop-blur-md"
          >
            <span className="relative flex h-1.5 w-1.5 flex-none" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[13px] font-medium text-[var(--muted)]">
              {greeting ? `${greeting} — welcome to my corner of the internet` : 'Welcome to my corner of the internet'}
            </span>
          </Reveal>
        )}

        {/* The single H1 on the page. */}
        <h1
          ref={nameRef}
          id="home-heading"
          data-reveal="bottom"
          data-revealed="true"
          className="font-display text-display font-extrabold text-[var(--ink)]"
        >
          <span className="gradient-ink">{profile.name}</span>
        </h1>

        <Reveal from="bottom" delay={70} className="mt-5">
          <p className="font-display text-lg font-semibold tracking-tight text-[var(--ink-2)] sm:text-xl">
            {profile.title}
          </p>
          {profile.tagline && (
            <p className="mx-auto mt-2 max-w-xl text-[15px] italic text-[var(--muted)]">{profile.tagline}</p>
          )}
        </Reveal>

        {/* The Hero's only paragraph. Carries the crawlable summary for the
            whole page, since everything below it is inside lazy or
            conditionally-rendered sections. */}
        {hero.intro && (
          <Reveal from="bottom" delay={130} className="mt-7">
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:text-base">
              {hero.intro}
            </p>
          </Reveal>
        )}

        {hero.showStats && profile.highlights.length > 0 && (
          <Reveal from="bottom" delay={190} className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {profile.highlights.map((stat) => (
              <div key={stat.label} className="card card-sheen rounded-panel px-3 py-4 sm:px-4 sm:py-5">
                <p className="font-display text-2xl font-bold tracking-tight gradient-accent sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)] sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </Reveal>
        )}

        {ctas.length > 0 && (
          <Reveal from="bottom" delay={250} className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {primary && (
              <button
                type="button"
                onClick={() => { sounds.click(); onNavigate(primary.target); }}
                onMouseEnter={() => sounds.hover()}
                className="btn btn-primary btn-hero group"
              >
                {primary.label}
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-[--dur-hover] ease-[--ease-out-quint] group-hover:translate-x-0.5"
                />
              </button>
            )}
            {rest.map((cta) => (
              <button
                key={cta.id}
                type="button"
                onClick={() => { sounds.click(); onNavigate(cta.target); }}
                onMouseEnter={() => sounds.hover()}
                className="btn btn-secondary"
              >
                {cta.label}
              </button>
            ))}
          </Reveal>
        )}

        {hero.showVisitorCount && visitorCount > 0 && (
          <Reveal from="bottom" delay={300} className="mt-12 inline-flex items-center gap-2 text-xs text-[var(--faint)]">
            <MousePointerClick size={13} aria-hidden="true" />
            <span>{visitorCount.toLocaleString()} visitors so far</span>
          </Reveal>
        )}
      </div>

      {/* Scroll cue.
          Decorative, so it is a <span> rather than a <button>: the previous
          version was a focusable control inside an aria-hidden wrapper, which
          means it did nothing for assistive tech while still looking clickable.
          The real CTAs above carry the interaction. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-7 hidden justify-center sm:flex" aria-hidden="true">
        <div
          className={cls(
            'flex h-11 w-9 flex-col items-center justify-center gap-0.5 rounded-full border',
            'border-[var(--line-strong)] pt-2',
          )}
        >
          <span className="block h-1.5 w-1 rounded-full bg-[var(--accent)] motion-safe:animate-scroll-hint" />
          <ChevronDown size={13} aria-hidden="true" className="text-[var(--faint)]" />
        </div>
      </div>
    </section>
  );
}

export { initialsOf };
