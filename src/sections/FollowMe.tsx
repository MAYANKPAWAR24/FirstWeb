import {
  ArrowUpRight, AtSign, Facebook, Github, Globe, Instagram, Linkedin,
  Send, Twitter, Youtube, type LucideIcon,
} from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import type { Profile, SocialLink } from '@/lib/types';

/**
 * Follow Me — the social grid.
 *
 * Restored as a first-class section after being folded into Contact and the
 * footer during the Phase 3 restructure. The links were never lost, but a
 * dedicated section is a better home for them: it is the one thing a visitor
 * who is not a recruiter most often wants, and it keeps the social row from
 * competing with the contact form for attention.
 *
 * Behaviour:
 *  - Hides itself when every platform is switched off, so it never renders an
 *    empty shell.
 *  - Uses the shared `Section` shell, so its heading level and type scale stay
 *    consistent with every other section.
 *  - Respects the same visibility toggle as the rest of the site.
 */

/**
 * lucide-react ships no Threads or Telegram glyph. Rather than letting both
 * fall back to one generic icon — which is what the previous version did, and
 * which made two different platforms look identical — they get the closest
 * real match: Threads' mark is an @, Telegram's is a paper plane.
 */
const ICONS: Record<string, LucideIcon> = {
  Instagram, Facebook, Linkedin, Twitter, Youtube, Github,
  Threads: AtSign,
  Telegram: Send,
};

/** Neutral fallback for a platform with no known glyph. */
const FALLBACK_ICON = Globe;

/** A short line per platform, so a card says something rather than just naming itself. */
const BLURB: Record<string, string> = {
  Instagram: 'Photography and visual work',
  Facebook: 'Longer-form posts',
  Linkedin: 'Professional profile',
  Threads: 'Short-form writing',
  Twitter: 'Notes and updates',
  Youtube: 'Readings and behind the scenes',
  Github: 'Code and experiments',
  Telegram: 'Quick messages',
};

/** Platforms where a bare username is the whole URL. */
function resolveHref(social: SocialLink): string {
  const url = social.url.trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, '')}`;
}

export default function FollowMeSection({ profile }: { profile: Profile }) {
  const links = profile.socials
    .filter((social) => social.visible !== false && social.url.trim())
    .map((social) => ({ ...social, href: resolveHref(social) }))
    .filter((social) => social.href !== '');

  // Same rule as Certificates and Games: an empty section is worse than none.
  if (links.length === 0) return null;

  const name = profile.name.split(/\s+/).filter(Boolean);

  return (
    <Section
      id="follow"
      eyebrow="Elsewhere"
      title="Follow Me"
      lede={`Find ${profile.name} on these platforms.`}
    >
      <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {links.map((social) => {
          const Icon = ICONS[social.icon] ?? FALLBACK_ICON;
          return (
            <div key={social.id} data-reveal-item>
              <TiltCard lit maxTilt={2.5} className="h-full">
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => sounds.hover()}
                  className="card card-interactive card-sheen group flex h-full flex-col items-start gap-3 rounded-panel p-5"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)] transition-colors duration-[var(--dur-hover)] group-hover:border-[rgba(10,130,189,0.28)] group-hover:bg-[var(--accent-soft)]"
                  >
                    <Icon size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    {/* A real heading, so the section keeps its h2 -> h3
                        hierarchy rather than jumping from h2 straight to body
                        text. */}
                    <span className="flex items-center gap-1.5 font-display text-[15px] font-bold tracking-tight text-[var(--ink)]">
                      {social.label}
                      <ArrowUpRight
                        size={13}
                        aria-hidden="true"
                        className="shrink-0 text-[var(--faint)] transition-transform duration-[var(--dur-hover)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                      />
                    </span>
                    {(BLURB[social.label] ?? BLURB[social.icon]) && (
                      <span className="mt-1 block text-[12.5px] leading-snug text-[var(--muted)]">
                        {BLURB[social.label] ?? BLURB[social.icon]}
                      </span>
                    )}
                  </span>

                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </TiltCard>
            </div>
          );
        })}
      </RevealGroup>

      <Reveal className="mt-6">
        <p className="text-center text-[13px] text-[var(--muted)]">
          Platforms are managed in <strong>Admin → Site</strong>. Switch one off there and it disappears from
          here, the contact section and the footer.
        </p>
      </Reveal>

      {name.length === 0 && <EmptyState title="Profile incomplete" body="Set a name in Admin → Profile." />}
    </Section>
  );
}