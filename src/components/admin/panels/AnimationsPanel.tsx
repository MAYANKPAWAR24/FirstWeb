import { useState } from 'react';
import { AdminHeader, SectionCard, Select, Toggle } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';
import type { AnimationSettings, SoundSettings } from '@/lib/types';

const INTENSITY_OPTIONS = [
  { value: 'off', label: 'Off — no motion at all' },
  { value: 'subtle', label: 'Subtle — reveals and hover, no ambient layers' },
  { value: 'full', label: 'Full — everything, including the cursor layer' },
];

export default function AnimationsPanel() {
  const { data, setAnimationSettings, setSoundSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<AnimationSettings>(() => structuredClone(data.animationSettings));
  const [sound, setSound] = useState<SoundSettings>(() => structuredClone(data.soundSettings));

  const patch = <K extends keyof AnimationSettings>(key: K, value: AnimationSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const patchSound = <K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) =>
    setSound((current) => ({ ...current, [key]: value }));

  const saveSound = () => {
    setSoundSettings({
      ...sound,
      defaultVolume: Math.max(0, Math.min(1, Number(sound.defaultVolume) || 0)),
    });
    notify(sound.allowed ? 'Sound settings saved' : 'Sound disabled site-wide. Nothing will play.');
  };

  const save = () => {
    // `normalizeAnimationSettings` already forces intensity to 'off' when the
    // master switch is off; doing it here keeps the UI honest about what is saved.
    const intensity = draft.enabled ? draft.intensity : 'off';
    setAnimationSettings({
      ...draft,
      intensity,
      ambientEffects: draft.ambientEffects && intensity !== 'off',
      cursorEffects: draft.cursorEffects && intensity !== 'off',
    });
    notify('Motion settings saved');
  };

  return (
    <div>
      <AdminHeader
        title="Motion & Sound"
        description="Motion is a single switch plus an intensity, written to the document root so CSS and the pointer layers both read it. Sound is opt-in per visitor and never plays before they choose it."
      />

      <div className="max-w-2xl space-y-5">
        <SectionCard title="Master">
          <div className="space-y-4">
            <Toggle
              label="Animations enabled"
              hint="Off stops reveals, hovers and transitions site-wide."
              checked={draft.enabled}
              onChange={(enabled) => patch('enabled', enabled)}
            />
            <Select
              label="Intensity"
              value={draft.intensity}
              options={INTENSITY_OPTIONS}
              hint="Reduced-motion preferences in the visitor's OS always win over this."
              onChange={(value) => patch('intensity', value as AnimationSettings['intensity'])}
            />
          </div>
        </SectionCard>

        <SectionCard title="Layers" description="Each layer can be skipped independently. 'Subtle' drops the ambient layers regardless.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Ambient effects" hint="Gradient wash, film grain, structural grid." checked={draft.ambientEffects} onChange={(value) => patch('ambientEffects', value)} />
            <Toggle label="Cursor effects" hint="Custom cursor on fine pointers only." checked={draft.cursorEffects} onChange={(value) => patch('cursorEffects', value)} />
            <Toggle label="Section reveals" hint="Content fades up as each section enters." checked={draft.sectionReveal} onChange={(value) => patch('sectionReveal', value)} />
            <Toggle label="Hero parallax" hint="The hero tracks the pointer and scroll." checked={draft.heroParallax} onChange={(value) => patch('heroParallax', value)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Sound"
          description="Every sound is synthesised in the browser, so there are no audio files to download and nothing can autoplay. A visitor must opt in before hearing anything, and that choice is remembered on their device."
        >
          <div className="space-y-4">
            <Toggle
              label="Sound permitted"
              hint="Off removes the mute toggle from the nav and silences everything."
              checked={sound.allowed}
              onChange={(allowed) => patchSound('allowed', allowed)}
            />
            <Toggle
              label="Richer game sounds"
              hint="Games may use a slightly fuller palette. Interface sounds stay quiet either way."
              checked={sound.gameSounds}
              onChange={(gameSounds) => patchSound('gameSounds', gameSounds)}
            />
            <div>
              <label htmlFor="sound-volume" className="label">
                Default volume · {Math.round(sound.defaultVolume * 100)}%
              </label>
              <input
                id="sound-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sound.defaultVolume}
                onChange={(event) => patchSound('defaultVolume', Number(event.target.value))}
                disabled={!sound.allowed}
                className="w-full accent-[var(--accent)] disabled:opacity-40"
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Applies on a visitor&rsquo;s first visit only. It never overrides a volume they set themselves.
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save motion settings</button>
          <button type="button" onClick={saveSound} className="btn btn-primary px-5 text-[13px]">Save sound settings</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.animationSettings));
              setSound(structuredClone(data.soundSettings));
              notify('Reverted to the saved settings', 'info');
            }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}