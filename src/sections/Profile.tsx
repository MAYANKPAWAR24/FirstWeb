import { MapPin, Mail, Sparkles } from 'lucide-react';
import Section from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import type { Profile, SkillGroups } from '@/lib/types';
import { EmptyState } from '@/components/Section';

interface ProfileSectionProps {
  profile: Profile;
  skillGroups: SkillGroups;
  email: string;
}

const GROUP_META: { id: keyof SkillGroups; label: string; accent: boolean }[] = [
  { id: 'creative', label: 'Creative', accent: true },
  { id: 'technical', label: 'Technical', accent: false },
  { id: 'workflow', label: 'Workflow & Tools', accent: false },
  { id: 'communication', label: 'Communication', accent: false },
];

export default function ProfileSection({ profile, skillGroups, email }: ProfileSectionProps) {
  const grouped = GROUP_META
    .map((group) => ({ ...group, items: skillGroups[group.id] }))
    .filter((group) => group.items.length > 0);

  // Only offer the ungrouped skills when every group ended up empty, so the
  // section never shows the same list twice in two different shapes.
  const fallbackSkills = grouped.length === 0 ? profile.skills : [];

  const contactBits = [
    profile.location && { icon: MapPin, text: profile.location },
    email && { icon: Mail, text: email, href: `mailto:${email}` },
  ].filter(Boolean) as { icon: typeof MapPin; text: string; href?: string }[];

  return (
    <Section
      id="profile"
      eyebrow="About"
      title={profile.name}
      lede="A little context on who is behind the writing and the code."
    >
      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <Reveal from="left" className="lg:col-span-2">
          <TiltCard lit maxTilt={2.5} className="overflow-hidden rounded-panel">
            {profile.photo ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <img
                  src={profile.photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={480}
                  height={600}
                  className="h-full w-full object-cover"
                />
                <div className="on-media-shade pointer-events-none absolute inset-0" />
                <div className="on-media absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-lg font-bold tracking-tight">{profile.name}</p>
                  <p className="mt-0.5 text-xs text-white/70">{profile.title}</p>
                </div>
              </div>
            ) : (
              <div className="grid aspect-[4/5] w-full place-items-center bg-[var(--surface-2)]">
                <Sparkles size={28} className="text-[var(--faint)]" aria-hidden="true" />
                <p className="px-6 text-center text-xs text-[var(--faint)]">Add a portrait in Admin → Profile.</p>
              </div>
            )}
          </TiltCard>

          {contactBits.length > 0 && (
            <ul className="mt-4 space-y-2">
              {contactBits.map((bit) => {
                const Icon = bit.icon;
                const content = (
                  <>
                    <Icon size={14} aria-hidden="true" className="flex-none text-[var(--faint)]" />
                    <span className="truncate">{bit.text}</span>
                  </>
                );
                return (
                  <li key={bit.text}>
                    {bit.href ? (
                      <a
                        href={bit.href}
                        className="flex items-center gap-2.5 rounded-card border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--ink-2)] transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.3)] hover:text-[var(--accent)]"
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="flex items-center gap-2.5 rounded-card border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--ink-2)]">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>

        <div className="space-y-5 lg:col-span-3">
          <Reveal from="right">
            <div className="card card-sheen rounded-panel p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">Background</h3>
              <div className="literary-body mt-3 text-[15px]">
                {profile.bio.split('\n').filter(Boolean).map((line, index) => (
                  <p key={index} className={index === 0 ? 'drop-cap' : undefined}>{line}</p>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal from="right" delay={60}>
            <div className="card card-sheen rounded-panel p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">Skills & Expertise</h3>
              {grouped.length > 0 ? (
                <RevealGroup className="mt-4 space-y-5">
                  {grouped.map((group) => (
                    <div key={group.id} data-reveal-item>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">
                        {group.label}
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {group.items.map((skill) => (
                          <li key={skill}>
                            <span className={group.accent ? 'chip chip-accent' : 'chip'}>
                              {skill}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </RevealGroup>
              ) : fallbackSkills.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {fallbackSkills.map((skill) => (
                    <li key={skill}><span className="chip">{skill}</span></li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="No skills listed yet"
                    body="Add skills in Admin → Profile. Grouping them into Creative, Technical and Workflow makes this section much easier to scan."
                  />
                </div>
              )}
            </div>
          </Reveal>

        </div>
      </div>
    </Section>
  );
}
