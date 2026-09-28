import { AtSign, Facebook, Github, Instagram, Linkedin, Send, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { SocialLink } from '@/lib/types';

interface FollowMeProps {
  socials: SocialLink[];
}

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  Instagram,
  Facebook,
  LinkedIn: Linkedin,
  Linkedin,
  Threads: AtSign,
  Twitter,
  'Twitter / X': Twitter,
  X: Twitter,
  Youtube,
  Github,
  Telegram: Send,
};

export default function FollowMe({ socials }: FollowMeProps) {
  const visibleSocials = socials.filter(
    (social) => social.visible !== false && /^https?:\/\//i.test(social.url.trim())
  );

  return (
    <section id="follow" className="section-shell px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 reveal gpu-layer">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Around the web</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Follow Me</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">Find MAYANK PAWAR on these platforms.</p>
        </div>

        {visibleSocials.length === 0 ? (
          <p className="reveal gpu-layer py-8 text-center text-sm text-white/50">Social links will appear here soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {visibleSocials.map((social) => {
              const Icon = SOCIAL_ICONS[social.icon] ?? AtSign;
              return (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => sounds.hover()}
                  onClick={() => sounds.click()}
                  aria-label={`Follow MAYANK PAWAR on ${social.label}`}
                  className="reveal gpu-layer glass-card group flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center transition-transform hover:-translate-y-1"
                >
                  <Icon size={23} strokeWidth={1.7} aria-hidden="true" />
                  <span className="text-xs font-medium">{social.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}