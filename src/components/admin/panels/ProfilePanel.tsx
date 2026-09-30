import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { Profile, SkillGroups } from '@/lib/types';
import {
  AdminHeader, Field, IconButton, SectionCard, TagEditor, Textarea,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

const SKILL_GROUPS: { id: keyof SkillGroups; label: string }[] = [
  { id: 'creative', label: 'Creative' },
  { id: 'technical', label: 'Technical' },
  { id: 'workflow', label: 'Workflow & Tools' },
  { id: 'communication', label: 'Communication' },
];

export default function ProfilePanel() {
  const { data, updateProfile, setSkillGroups, notify } = useAdminData();
  // Socials are owned by the Site tab, so they are carried through untouched.
  const [profile, setProfile] = useState<Profile>(() => structuredClone(data.profile));
  const [groups, setGroups] = useState<SkillGroups>(() => structuredClone(data.skillGroups));

  const patch = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const patchHighlight = (index: number, part: 'label' | 'value', value: string) =>
    patch('highlights', profile.highlights.map((item, position) => (
      position === index ? { ...item, [part]: value } : item
    )));

  const save = () => {
    if (!profile.name.trim()) {
      notify('A name is required', 'error');
      return;
    }
    updateProfile({
      ...profile,
      name: profile.name.trim(),
      email: profile.email.trim(),
      location: profile.location.trim(),
      highlights: profile.highlights.filter((item) => item.label.trim() || item.value.trim()),
    });
    setSkillGroups(groups);
    notify('Profile saved');
  };

  return (
    <div>
      <AdminHeader
        title="Profile"
        description="The About section: the portrait, the background text, the by-the-numbers highlights, and every skill chip."
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Identity">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={profile.name} onChange={(value) => patch('name', value)} />
              <Field label="Title" value={profile.title} onChange={(value) => patch('title', value)} placeholder="Writer · Developer" />
            </div>
            <Field label="Tagline" value={profile.tagline} onChange={(value) => patch('tagline', value)} maxLength={90} />
            <Textarea
              label="Background"
              value={profile.bio}
              onChange={(value) => patch('bio', value)}
              rows={6}
              hint="Blank lines become new paragraphs, and the first letter is set as a drop cap."
            />
          </div>
        </SectionCard>

        <SectionCard title="Portrait & contact">
          <div className="space-y-4">
            <Field
              label="Photo URL"
              type="url"
              value={profile.photo}
              onChange={(value) => patch('photo', value)}
              placeholder="https://…"
              hint="A portrait crops to 4:5. Leave empty for the placeholder card."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" type="email" value={profile.email} onChange={(value) => patch('email', value)} />
              <Field label="Location" value={profile.location} onChange={(value) => patch('location', value)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Highlights"
          description="The number cards under the skills. A row needs at least a label or a value to be saved."
          action={(
            <button
              type="button"
              onClick={() => {
                sounds.click();
                patch('highlights', [...profile.highlights, { label: '', value: '' }]);
              }}
              className="btn btn-secondary px-3 text-xs"
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          )}
        >
          {profile.highlights.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No highlights yet — the card is hidden entirely when this list is empty.</p>
          ) : (
            <ul className="space-y-2">
              {profile.highlights.map((item, index) => (
                <li key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                  <div>
                    <label className="sr-only" htmlFor={`highlight-label-${index}`}>Highlight {index + 1} label</label>
                    <input
                      id={`highlight-label-${index}`}
                      value={item.label}
                      placeholder="Label"
                      onChange={(event) => patchHighlight(index, 'label', event.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor={`highlight-value-${index}`}>Highlight {index + 1} value</label>
                    <input
                      id={`highlight-value-${index}`}
                      value={item.value}
                      placeholder="Value"
                      onChange={(event) => patchHighlight(index, 'value', event.target.value)}
                      className="field"
                    />
                  </div>
                  <IconButton
                    label={`Remove highlight ${item.label || index + 1}`}
                    tone="danger"
                    onClick={() => patch('highlights', profile.highlights.filter((_, position) => position !== index))}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Skills"
          description="The flat list is a fallback: the About section shows the groups below whenever any of them has entries."
        >
          <TagEditor label="Flat skills list" tags={profile.skills} onChange={(tags) => patch('skills', tags)} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {SKILL_GROUPS.map((group) => (
              <TagEditor
                key={group.id}
                label={group.label}
                tags={groups[group.id]}
                onChange={(tags) => setGroups((current) => ({ ...current, [group.id]: tags }))}
              />
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save profile</button>
          <button
            type="button"
            onClick={() => {
              sounds.click();
              setProfile(structuredClone(data.profile));
              setGroups(structuredClone(data.skillGroups));
              notify('Reverted to the saved profile', 'info');
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