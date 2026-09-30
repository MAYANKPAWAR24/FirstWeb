import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { uid } from '@/lib/utils';
import type { HeroCta, HeroSettings, SectionId } from '@/lib/types';
import { PUBLIC_SECTIONS } from '@/lib/sectionOrder';
import {
  AdminHeader, Field, IconButton, SectionCard, Select, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

const TARGET_OPTIONS = [
  { value: 'home', label: 'Home (top of page)' },
  ...PUBLIC_SECTIONS.map(({ id, label }) => ({ value: id as string, label })),
];

const EMPTY_CTA: HeroCta = { id: 'cta-new', label: '', target: 'portfolio' };

export default function HomepagePanel() {
  const { data, setHeroSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<HeroSettings>(() => structuredClone(data.heroSettings));

  const patch = <K extends keyof HeroSettings>(key: K, value: HeroSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const patchCta = (id: string, partial: Partial<HeroCta>) =>
    patch('ctas', draft.ctas.map((cta) => (cta.id === id ? { ...cta, ...partial } : cta)));

  const moveCta = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.ctas.length) return;
    sounds.click();
    const ctas = [...draft.ctas];
    [ctas[index], ctas[target]] = [ctas[target], ctas[index]];
    patch('ctas', ctas);
  };

  const save = () => {
    const ctas = draft.ctas
      .map((cta) => ({ ...cta, label: cta.label.trim() }))
      .filter((cta) => cta.label.length > 0);
    if (ctas.length === 0) {
      notify('At least one button needs a label', 'error');
      return;
    }
    setHeroSettings({ ...draft, ctas });
    notify('Homepage settings saved');
  };

  return (
    <div>
      <AdminHeader
        title="Homepage"
        description="The hero is the first thing a visitor reads: the greeting chip, the introduction, the buttons under it, and the two stat strips."
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Presentation" description="Each switch removes one element from the public hero.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Toggle
              label="Greeting chip"
              hint="Good morning / afternoon, from the visitor's clock."
              checked={draft.showGreeting}
              onChange={(next) => patch('showGreeting', next)}
            />
            <Toggle
              label="Stat strip"
              hint="The highlights row under the buttons."
              checked={draft.showStats}
              onChange={(next) => patch('showStats', next)}
            />
            <Toggle
              label="Visitor counter"
              hint="Session count, incremented by the cloud endpoint."
              checked={draft.showVisitorCount}
              onChange={(next) => patch('showVisitorCount', next)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Introduction"
          description="One crawlable paragraph. Longer copy pushes the buttons below the fold on a phone."
        >
          <Textarea
            label="Intro paragraph"
            value={draft.intro}
            onChange={(value) => patch('intro', value)}
            rows={4}
            maxLength={320}
            hint={`${draft.intro.length}/320 characters`}
          />
        </SectionCard>

        <SectionCard
          title="Call to action buttons"
          description="Shown in order. A button with no label is dropped on save, and one aimed at a hidden section is skipped at runtime."
        >
          <ul className="space-y-3">
            {draft.ctas.map((cta, index) => (
              <li key={cta.id} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Button label"
                    value={cta.label}
                    maxLength={40}
                    placeholder="View My Work"
                    onChange={(value) => patchCta(cta.id, { label: value })}
                  />
                  <Select
                    label="Target section"
                    value={cta.target}
                    options={TARGET_OPTIONS}
                    onChange={(value) => patchCta(cta.id, { target: value as SectionId })}
                  />
                </div>
                <div className="mt-3 flex justify-end gap-1.5">
                  <IconButton label={`Move ${cta.label || 'button'} up`} disabled={index === 0} onClick={() => moveCta(index, -1)}>
                    <ChevronUp size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Move ${cta.label || 'button'} down`} disabled={index === draft.ctas.length - 1} onClick={() => moveCta(index, 1)}>
                    <ChevronDown size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${cta.label || 'button'}`}
                    tone="danger"
                    onClick={() => patch('ctas', draft.ctas.filter((item) => item.id !== cta.id))}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              sounds.click();
              patch('ctas', [...draft.ctas, { ...EMPTY_CTA, id: uid() }]);
            }}
            className="btn btn-secondary mt-4 w-full text-[13px]"
          >
            <Plus size={15} aria-hidden="true" />
            Add a button
          </button>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save homepage</button>
          <button
            type="button"
            onClick={() => {
              sounds.click();
              setDraft(structuredClone(data.heroSettings));
              notify('Reverted to the saved homepage', 'info');
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