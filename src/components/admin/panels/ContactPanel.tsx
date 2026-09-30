import { useState } from 'react';
import { AdminHeader, Field, SectionCard, Textarea, Toggle } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';
import type { ContactSettings } from '@/lib/types';

export default function ContactPanel() {
  const { data, setContactSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<ContactSettings>(() => structuredClone(data.contactSettings));

  const patch = <K extends keyof ContactSettings>(key: K, value: ContactSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const socialCount = data.profile.socials.filter((social) => social.visible !== false).length;

  const save = () => {
    const email = draft.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify('That email address does not look valid', 'error');
      return;
    }
    setContactSettings({
      ...draft,
      heading: draft.heading.trim() || 'Get in Touch',
      email,
      phone: draft.phone.trim(),
      ctaLabel: draft.ctaLabel.trim() || 'Send an Email',
    });
    notify('Contact settings saved');
  };

  return (
    <div>
      <AdminHeader
        title="Contact"
        description="The closing section: the direct line, the optional message form, and the social grid."
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Heading">
          <div className="space-y-4">
            <Field label="Section heading" value={draft.heading} onChange={(value) => patch('heading', value)} maxLength={60} />
            <Textarea label="Intro" value={draft.intro} onChange={(value) => patch('intro', value)} rows={3} />
          </div>
        </SectionCard>

        <SectionCard
          title="Direct line"
          description="The email here overrides the profile email on this section only, so a contact address can differ from the one in the About section."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email override" type="email" value={draft.email} onChange={(value) => patch('email', value)} placeholder={data.profile.email || 'you@example.com'} />
            <Field label="Phone" type="tel" value={draft.phone} onChange={(value) => patch('phone', value)} placeholder="Optional" />
          </div>
        </SectionCard>

        <SectionCard
          title="Layout"
          description={socialCount > 0
            ? `${socialCount} social profile${socialCount === 1 ? '' : 's'} are currently public. Their URLs live in the Site tab.`
            : 'No social profile is public right now, so the grid renders nothing even when it is switched on.'}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Message form"
              hint="Opens the visitor's mail app with the fields pre-filled."
              checked={draft.showForm}
              onChange={(showForm) => patch('showForm', showForm)}
            />
            <Toggle
              label="Social grid"
              hint="Show the public profiles under the email."
              checked={draft.showSocials}
              onChange={(showSocials) => patch('showSocials', showSocials)}
            />
          </div>
          <div className="mt-4">
            <Field label="Form button label" value={draft.ctaLabel} onChange={(value) => patch('ctaLabel', value)} maxLength={32} />
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save contact</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.contactSettings));
              notify('Reverted to the saved contact settings', 'info');
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