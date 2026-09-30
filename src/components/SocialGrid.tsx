import {
  ArrowUpRight, AtSign, Camera, Facebook, Github, Globe, Instagram, Linkedin,
  Mail, MessageCircle, Music, Send, Twitter, Youtube, type LucideIcon,
} from 'lucide-react';
import { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import { describePlatform, resolveSocialUrl, type SocialCategory } from '@/lib/socialPlatforms';
import type { SocialLink } from '@/lib/types';

/**
 * The social card grid.
 *
 * Lives inside the Contact section rather than being a page section of its own.
 * A separate "Follow Me" section duplicated what Contact already said, and a
 * visitor who is not a recruiter usually wants one thing: where to follow.
 * Together they answer that without the social row competing with the contact
 * form for attention.
 *
 * Every platform in `SOCIAL_PLATFORMS` renders distinctly. Where lucide has no
 * glyph for a brand the card falls back to a neutral `Globe` and leans on its
 * label and blurb — deliberately, because the previous implementation let
 * Threads and Telegram both render as the same generic @ symbol.
 */

/** Neutral fallback. Shape and label identify the platform, not colour. */
const FALLBACK_ICON = Globe;

/** Imported by name so the icons chunk only pulls in what is actually used. */
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Instagram, Facebook, Linkedin, Twitter, Youtube, Github,
  AtSign, Send, Mail, Music, Camera, MessageCircle,
};

const CATEGORY_TINT: Record<SocialCategory, string> = {
  social: 'var(--accent)',
  professional: 'var(--iris)',
  dev: 'var(--jade)',
  media: 'var(--ember)',
  messaging: 'var(--accent)',
};

export interface SocialGridEntry {
  link: SocialLink;
  href: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  category: SocialCategory;
}

/** Resolves stored links into everything the grid and the chip row both need. */
export function resolveSocials(socials: SocialLink[]): SocialGridEntry[] {
  return socials
    .filter((link) => link.visible !== false && link.url.trim())
    .map((link) => {
      const described = describePlatform(link.id, link.label);
      const iconKey = described.icon ?? (LUCIDE_ICONS[link.icon] ? link.icon : null);
      return {
        link,
        href: resolveSocialUrl(link.id, link.url),
        label: described.label,
        blurb: described.blurb,
        icon: (iconKey ? LUCIDE_ICONS[iconKey] : undefined) ?? FALLBACK_ICON,
        category: described.category,
      };
    })
    .filter((entry) => entry.href !== '');
}

export default function SocialGrid({ entries }: { entries: SocialGridEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <div key={entry.link.id} data-reveal-item>
            <TiltCard lit maxTilt={2.5} className="h-full">
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => sounds.hover()}
                className="card card-interactive card-sheen group flex h-full flex-col items-start gap-3 rounded-panel p-4 sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] transition-colors duration-[var(--dur-hover)] group-hover:border-[rgba(10,130,189,0.28)]"
                  style={{ color: CATEGORY_TINT[entry.category] }}
                >
                  <Icon size={19} />
                </span>

                <span className="min-w-0 flex-1">
                  {/* A heading role rather than an <h3>: the grid is not its own
                      section, so it must not add a level to the document
                      outline. */}
                  <span
                    role="heading"
                    aria-level={3}
                    className="flex items-center gap-1.5 font-display text-[14px] font-bold tracking-tight text-[var(--ink)]"
                  >
                    <span className="truncate">{entry.label}</span>
                    <ArrowUpRight
                      size={12}
                      aria-hidden="true"
                      className="shrink-0 text-[var(--faint)] transition-transform duration-[var(--dur-hover)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                    />
                  </span>
                  {entry.blurb && (
                    <span className="mt-1 block text-[12px] leading-snug text-[var(--muted)]">{entry.blurb}</span>
                  )}
                </span>

                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </TiltCard>
          </div>
        );
      })}
    </RevealGroup>
  );
}

export { FALLBACK_ICON };