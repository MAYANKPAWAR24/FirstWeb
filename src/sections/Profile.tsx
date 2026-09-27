import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import type { Profile } from '@/lib/types';

interface ProfileSectionProps {
  profile: Profile;
}

export default function ProfileSection({ profile }: ProfileSectionProps) {
  return (
    <section id="profile" className="relative py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Who I Am</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Profile</h2>
          <div className="heading-line mx-auto" />
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Photo card */}
          <div className="lg:col-span-2 reveal">
            <TiltCard className="rounded-3xl" glow>
              <div className="glass-card rounded-3xl overflow-hidden p-6">
                <div className="relative rounded-2xl overflow-hidden mb-6 group">
                  <img
                    src={profile.photo}
                    alt={profile.name}
                    className="w-full h-80 object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="profile-photo-shade absolute inset-0" />
                  <div className="profile-photo-caption absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold text-lg text-white">{profile.name}</div>
                      <div className="text-xs text-white/60">{profile.location}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-sm">
                      📍
                    </div>
                  </div>
                </div>

                {/* Quick info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-cyan-400">✉</span>
                    <span className="text-white/60">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-violet-400">◎</span>
                    <span className="text-white/60">{profile.location}</span>
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Bio + skills */}
          <div className="lg:col-span-3 space-y-8">
            <div className="glass-card rounded-3xl p-8 reveal">
              <h3 className="font-display text-xl font-bold mb-4 text-white/90">About Me</h3>
              <p className="text-white/60 leading-relaxed text-[15px]">
                {profile.bio}
              </p>
            </div>

            {/* Skills */}
            <div className="glass-card rounded-3xl p-8 reveal">
              <h3 className="font-display text-xl font-bold mb-5 text-white/90">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2.5">
                {profile.skills.map((skill, i) => (
                  <span
                    key={skill}
                    onMouseEnter={() => sounds.hover()}
                    className="skill-pill px-4 py-2 rounded-full text-sm font-medium cursor-default"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="glass-card rounded-3xl p-8 reveal">
              <h3 className="font-display text-xl font-bold mb-5 text-white/90">Personal Highlights</h3>
              <div className="space-y-3">
                {profile.highlights.map((h) => (
                  <div key={h.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white/60">{h.label}</span>
                    <span className="font-display font-bold text-cyan-300">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
