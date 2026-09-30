import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { AdminHeader, Field, SectionCard } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';
import { useAdminTab, type AdminTabId } from '@/components/admin/adminTab';

const FEATURES: { label: string; where: string; tab: AdminTabId }[] = [
  { label: 'Hero copy, greeting and buttons', where: 'Homepage', tab: 'homepage' },
  { label: 'Bio, highlights and skill groups', where: 'Profile', tab: 'profile' },
  { label: 'Availability line and portfolio blocks', where: 'Portfolio', tab: 'portfolio' },
  { label: 'Featured pinning for writing, media and achievements', where: 'Literature, Media, Achievements', tab: 'poems' },
  { label: 'Contact form, email override and social grid', where: 'Contact', tab: 'contact' },
  { label: 'Footer note, copyright and link columns', where: 'Footer', tab: 'footer' },
  { label: 'Section order, hidden blocks and social links', where: 'Site', tab: 'site' },
  { label: 'Assistant tone, quick replies and answers', where: 'Chatbot', tab: 'chatbot' },
  { label: 'Which games ship, and which one leads', where: 'Games', tab: 'games' },
  { label: 'Motion intensity, ambient layers, cursor', where: 'Motion', tab: 'animations' },
  { label: 'Title, description, canonical and noindex', where: 'SEO', tab: 'seo' },
  { label: 'Extra text, media, widget and game sections', where: 'Section Builder', tab: 'sections' },
];

export default function SettingsPanel() {
  const { setAdminPassword, syncStatus, notify } = useAdminData();
  const goToTab = useAdminTab();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.trim().length < 8) {
      notify('The password must be at least 8 characters', 'error');
      return;
    }
    if (password !== confirm) {
      notify('The two passwords do not match', 'error');
      return;
    }
    setSaving(true);
    try {
      await setAdminPassword(password);
      setPassword('');
      setConfirm('');
      notify('Admin password updated');
    } catch {
      notify('The cloud password could not be changed — try again when online', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Settings" description="Admin credentials, and a map of where every feature on this site is controlled." />

      <div className="max-w-2xl space-y-5">
        <SectionCard title="Admin password">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" type="password" value={password} onChange={setPassword} hint="At least 8 characters." />
              <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary px-5 text-[13px]">
              <Lock size={15} aria-hidden="true" />
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            Stored in the cloud alongside the content, never in the browser. Changing it signs nothing else
            out — this device keeps its session until it is logged out from the header.
            {syncStatus === 'offline' && ' The cloud is unreachable right now, so the change will fail until it recovers.'}
          </p>
        </SectionCard>

        <SectionCard
          title="Where things live"
          description="Every switch on this site is in the dashboard; nothing is hidden in a config file."
        >
          <ul className="space-y-1.5">
            {FEATURES.map((feature) => (
              <li key={feature.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-1.5 last:border-0">
                <span className="min-w-0 text-[13px] text-[var(--ink-2)]">{feature.label}</span>
                <button
                  type="button"
                  onClick={() => goToTab(feature.tab)}
                  className="flex-none text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  {feature.where}
                  <span className="sr-only"> — open this tab</span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}