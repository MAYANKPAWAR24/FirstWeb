import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  AdminHeader, Field, SectionCard, TagEditor, Toggle,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';
import type { SeoSettings } from '@/lib/types';

export default function SeoPanel() {
  const { data, setSeoSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<SeoSettings>(() => structuredClone(data.seoSettings));

  const patch = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = () => {
    const siteUrl = draft.siteUrl.trim().replace(/\/+$/, '');
    if (siteUrl && !/^https?:\/\//i.test(siteUrl)) {
      notify('The site URL must start with http:// or https://', 'error');
      return;
    }
    setSeoSettings({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      siteUrl,
      ogImage: draft.ogImage.trim(),
      twitterHandle: draft.twitterHandle.trim().replace(/^@/, ''),
      keywords: draft.keywords.map((keyword) => keyword.trim()).filter(Boolean),
    });
    notify('SEO settings saved');
  };

  return (
    <div>
      <AdminHeader
        title="SEO"
        description="Everything here is written into the document head at runtime, so it stays in step with the record instead of drifting from a static file."
      />

      <div className="max-w-2xl space-y-5">
        {!draft.indexable && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-card border border-[rgba(230,79,55,0.32)] bg-[var(--ember-soft)] px-4 py-3.5"
          >
            <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 flex-none text-[var(--ember)]" />
            <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
              <strong className="font-semibold">This site is set to noindex.</strong> While indexing is off, a{' '}
              <code className="font-mono text-xs">noindex</code> meta tag is emitted on every page, which tells
              search engines to drop it. The canonical URL and Open Graph tags are still written, so a share
              preview keeps working.
            </p>
          </div>
        )}

        <SectionCard title="Search result">
          <div className="space-y-4">
            <Field
              label="Title"
              value={draft.title}
              onChange={(value) => patch('title', value)}
              maxLength={70}
              hint={`${draft.title.length}/70 characters`}
            />
            <Field
              label="Description"
              value={draft.description}
              onChange={(value) => patch('description', value)}
              maxLength={180}
              hint={`${draft.description.length}/180 characters`}
            />
            <TagEditor
              label="Keywords"
              tags={draft.keywords}
              onChange={(keywords) => patch('keywords', keywords)}
              placeholder="React TypeScript"
              hint="Mostly ignored by modern crawlers, but still used by some link previews."
            />
          </div>
        </SectionCard>

        <SectionCard title="Canonical & sharing">
          <div className="space-y-4">
            <Field
              label="Site URL"
              type="url"
              value={draft.siteUrl}
              onChange={(value) => patch('siteUrl', value)}
              placeholder="https://example.com"
              hint="A bare origin, no trailing slash. Used for the canonical link and the JSON-LD."
            />
            <Field
              label="Share image"
              type="url"
              value={draft.ogImage}
              onChange={(value) => patch('ogImage', value)}
              placeholder="/og-image.png"
              hint="Shown when the site is shared. 1200×630 works everywhere."
            />
            <Field
              label="X / Twitter handle"
              value={draft.twitterHandle}
              onChange={(value) => patch('twitterHandle', value)}
              placeholder="mayankpawar"
              hint="Stored without the leading @."
            />
          </div>
        </SectionCard>

        <SectionCard title="Structured data and indexing">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="JSON-LD"
              hint="Emits Person and CreativeWork schema from the live records."
              checked={draft.jsonLdEnabled}
              onChange={(jsonLdEnabled) => patch('jsonLdEnabled', jsonLdEnabled)}
            />
            <Toggle
              label="Allow indexing"
              hint="Off emits a noindex meta on every page."
              checked={draft.indexable}
              onChange={(indexable) => patch('indexable', indexable)}
            />
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save SEO settings</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.seoSettings));
              notify('Reverted to the saved SEO settings', 'info');
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