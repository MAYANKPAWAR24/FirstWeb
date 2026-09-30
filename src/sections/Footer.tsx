import { ArrowUp } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { sounds } from '@/lib/sound';
import type { FooterSettings, Profile, SocialLink } from '@/lib/types';

interface FooterProps {
  settings: FooterSettings;
  profile: Profile;
  socials: SocialLink[];
  onOpenAdmin: () => void;
}

export default function Footer({ settings, profile, socials, onOpenAdmin }: FooterProps) {
  const year = new Date().getFullYear();
  const visibleSocials = socials.filter((social) => social.visible !== false && social.url);
  const columns = settings.columns.filter((column) => column.links.length > 0);

  const scrollToTop = () => {
    sounds.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative mt-10 border-t border-[var(--line)] bg-[var(--surface)]/60">
      <div className="ambient-only pointer-events-none absolute inset-x-0 -top-24 h-24" aria-hidden="true">
        <div
          className="mx-auto h-full w-full max-w-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(10,130,189,0.16), transparent)' }}
        />
      </div>

      <div className="shell py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <Reveal from="left">
            <div className="flex items-center gap-3">
              <span className="monogram" aria-hidden="true">
                {profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <div>
                <p className="font-display text-[15px] font-bold tracking-tight text-[var(--ink)]">{profile.name}</p>
                <p className="text-xs text-[var(--muted)]">{profile.title}</p>
              </div>
            </div>
            {settings.note && (
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">{settings.note}</p>
            )}
          </Reveal>

          {/* Real anchors, not buttons. This is the site's primary internal
              link surface for crawlers, which previously had none. */}
          <div className="grid gap-8 sm:grid-cols-2">
            {columns.map((column, index) => (
              <Reveal key={column.id} from="right" delay={index * 60}>
                <nav aria-labelledby={`footer-${column.id}`}>
                  <h2 id={`footer-${column.id}`} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">
                    {column.heading || 'Links'}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {column.links.map((link) => (
                      <li key={link.id}>
                        {link.section ? (
                          <a
                            href={`#${link.section}`}
                            onMouseEnter={() => sounds.hover()}
                            className="text-[13px] text-[var(--muted)] transition-colors duration-[--dur-hover] hover:text-[var(--accent)]"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseEnter={() => sounds.hover()}
                            className="text-[13px] text-[var(--muted)] transition-colors duration-[--dur-hover] hover:text-[var(--accent)]"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </Reveal>
            ))}
          </div>
        </div>

        {visibleSocials.length > 0 && (
          <Reveal className="mt-10">
            <ul className="flex flex-wrap gap-1.5">
              {visibleSocials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => sounds.hover()}
                    className="chip transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.35)] hover:text-[var(--accent)]"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <div className="mt-10 flex flex-col-reverse items-start gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--faint)]">
            {settings.copyright.replace(String(year), String(year)) || `© ${year} ${profile.name}`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-[11px] text-[var(--faint)] transition-colors duration-[--dur-hover] hover:text-[var(--ink-2)]"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              onMouseEnter={() => sounds.hover()}
              className="btn-icon h-9 w-9 min-h-0"
              title="Back to top"
            >
              <ArrowUp size={15} aria-hidden="true" />
              <span className="sr-only">Back to top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
