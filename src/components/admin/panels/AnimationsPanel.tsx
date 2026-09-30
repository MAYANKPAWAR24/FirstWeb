import { useState } from 'react';
import { AdminHeader, SectionCard, Select, Toggle } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';
import type { AnimationSettings } from '@/lib/types';

const INTENSITY_OPTIONS = [
  { value: 'off', label: 'Off — no motion at all' },
  { value: 'subtle', label: 'Subtle — reveals and hover, no ambient layers' },
  { value: 'full', label: 'Full — everything, including the cursor layer' },
];

export default function AnimationsPanel() {
  const { data, setAnimationSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<AnimationSettings>(() => structuredClone(data.animationSettings));

  const patch = <K extends keyof AnimationSettings>(key: K, value: AnimationSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

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
        title="Motion"
        description="Motion is a single switch plus an intensity. The settings are written to the document root, so CSS and the pointer layers both read them."
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

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save motion settings</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.animationSettings));
              notify('Reverted to the saved motion settings', 'info');
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