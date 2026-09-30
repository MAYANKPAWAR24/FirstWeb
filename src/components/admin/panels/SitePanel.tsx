import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDown, ArrowUp, Download, Eye, EyeOff, Plus, RefreshCw, RotateCcw, Trash2, Upload,
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cls, downloadJSON } from '@/lib/utils';
import type { SocialLink } from '@/lib/types';
import {
  SOCIAL_PLATFORMS, SOCIAL_CATEGORY_LABELS, type SocialPlatform, type SocialCategory,
} from '@/lib/socialPlatforms';

/** Fixed order so the picker's sections do not reshuffle as entries are added. */
const CATEGORY_ORDER: SocialCategory[] = ['social', 'professional', 'dev', 'media', 'messaging'];
import { PUBLIC_SECTIONS, TOGGLEABLE_BLOCKS, type PublicSectionId, type ToggleableId } from '@/lib/sectionOrder';
import { AdminHeader, ConfirmDialog, IconButton, SectionCard, SyncPanel } from '@/components/admin/primitives';
import { useAdminData, type ResettableKey } from '@/components/admin/useAdminData';
import { useAdminTab, type AdminTabId } from '@/components/admin/adminTab';

interface AdminShellProps {
  sectionOrder: PublicSectionId[];
  onSectionOrderChange: (order: PublicSectionId[]) => void;
}

/** Every key `resetSection` accepts, with the tab that owns it. */
const RESETTABLE: { key: ResettableKey; label: string; tab: AdminTabId }[] = [
  { key: 'heroSettings', label: 'Homepage settings', tab: 'homepage' },
  { key: 'skillGroups', label: 'Skill groups', tab: 'profile' },
  { key: 'portfolioSettings', label: 'Portfolio header', tab: 'portfolio' },
  { key: 'portfolioBlocks', label: 'Portfolio blocks', tab: 'portfolio' },
  { key: 'contactSettings', label: 'Contact settings', tab: 'contact' },
  { key: 'footerSettings', label: 'Footer', tab: 'footer' },
  { key: 'seoSettings', label: 'SEO settings', tab: 'seo' },
  { key: 'animationSettings', label: 'Motion settings', tab: 'animations' },
  { key: 'gameSettings', label: 'Game settings', tab: 'games' },
  { key: 'chatbotSettings', label: 'Chatbot settings', tab: 'chatbot' },
  { key: 'poems', label: 'Literature', tab: 'poems' },
  { key: 'media', label: 'Media library', tab: 'media' },
  { key: 'studyMaterials', label: 'Study material', tab: 'study' },
  { key: 'achievements', label: 'Achievements', tab: 'achievements' },
  { key: 'certificates', label: 'Certificates', tab: 'certificates' },
  { key: 'guestbook', label: 'Guestbook', tab: 'guestbook' },
  { key: 'chatbotFAQs', label: 'Chatbot answers', tab: 'chatbot' },
  { key: 'customSections', label: 'Custom sections', tab: 'sections' },
];

const LABELS = new Map(PUBLIC_SECTIONS.map(({ id, label }) => [id, label]));

export default function SitePanel({ sectionOrder, onSectionOrderChange }: AdminShellProps) {
  const {
    data, sectionVisibility, toggleSectionVisible, updateProfile, resetSection,
    exportBackup, importBackup, resetData, syncStatus, lastSyncedAt, notify,
  } = useAdminData();
  const goToTab = useAdminTab();

  const [resetKey, setResetKey] = useState<ResettableKey | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingSocial, setPendingSocial] = useState<SocialLink | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const socials = data.profile.socials;
  const setSocials = (next: SocialLink[]) => updateProfile({ ...data.profile, socials: next });

  const moveSocial = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= socials.length) return;
    sounds.click();
    const next = [...socials];
    [next[index], next[target]] = [next[target], next[index]];
    setSocials(next);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sectionOrder.length) return;
    sounds.click();
    const order = [...sectionOrder];
    [order[index], order[target]] = [order[target], order[index]];
    onSectionOrderChange(order);
  };

  const flip = (id: ToggleableId, label: string) => {
    toggleSectionVisible(id);
    notify(
      sectionVisibility[id] === true ? `${label} is visible again` : `${label} is hidden from the public page`,
      'info',
    );
  };

  const pickImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      setPendingImport(parsed);
    } catch {
      notify('That file is not valid JSON', 'error');
    }
  };

  /**
   * Adds a catalogue platform that is not in the profile yet, pre-filled with
   * its handle placeholder so the admin only has to paste their handle.
   */
  const addPlatform = (platform: SocialPlatform) => {
    if (socials.some((social) => social.id === platform.id)) {
      notify(`${platform.label} is already in the list`, 'info');
      return;
    }
    sounds.click();
    setSocials([
      ...socials,
      {
        id: platform.id,
        label: platform.label,
        url: platform.example,
        icon: platform.icon ?? '',
        visible: true,
      },
    ]);
    notify(`${platform.label} added — paste your handle into the URL field`);
  };

  const missingPlatforms = useMemo(() => {
    const present = new Set(socials.map((social) => social.id));
    const term = query.trim().toLowerCase();
    return SOCIAL_PLATFORMS
      .filter((platform) => !present.has(platform.id))
      .filter((platform) => !term || platform.label.toLowerCase().includes(term));
  }, [socials, query]);

  const resetLabel = RESETTABLE.find((entry) => entry.key === resetKey)?.label ?? '';

  return (
    <div>
      <AdminHeader
        title="Site"
        description="The structure of the page: section order, what is hidden, the social links, and the whole-record tools."
      />

      <div className="max-w-4xl space-y-5">
        <SectionCard
          title="Section order"
          description="Controls the running order of the public page. Hidden sections keep their place and come back when unhidden."
        >
          <ol className="space-y-2">
            {sectionOrder.map((id, index) => {
              const label = LABELS.get(id) ?? id;
              const hidden = sectionVisibility[id] === true;
              return (
                <li
                  key={id}
                  className={cls('flex items-center gap-3 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5', hidden && 'opacity-60')}
                >
                  <span aria-hidden="true" className="w-5 flex-none text-center text-xs font-semibold text-[var(--faint)]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[var(--ink)]">{label}</span>
                  {hidden && <span className="chip chip-ember flex-none">Hidden</span>}
                  <IconButton label={hidden ? `Show ${label}` : `Hide ${label}`} onClick={() => flip(id, label)}>
                    {hidden ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label={`Move ${label} up`} disabled={index === 0} onClick={() => moveSection(index, -1)}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Move ${label} down`} disabled={index === sectionOrder.length - 1} onClick={() => moveSection(index, 1)}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ol>
        </SectionCard>

        <SectionCard
          title="Show / hide blocks"
          description="Hides a single block without deleting its content. Hidden content stays in the cloud record and returns intact."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {TOGGLEABLE_BLOCKS.map((block) => {
              const hidden = sectionVisibility[block.id] === true;
              return (
                <button
                  key={block.id}
                  type="button"
                  aria-pressed={!hidden}
                  onClick={() => flip(block.id, block.label)}
                  className={cls(
                    'flex items-center justify-between gap-3 rounded-card border px-3.5 py-3 text-left transition-colors duration-[var(--dur-hover)]',
                    hidden
                      ? 'border-[rgba(230,79,55,0.3)] bg-[var(--ember-soft)]'
                      : 'border-[var(--line)] bg-[var(--surface)] hover:border-[rgba(10,130,189,0.35)]',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{block.label}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">{block.group}</span>
                  </span>
                  <span className={cls('flex flex-none items-center gap-1.5 text-xs font-semibold', hidden ? 'text-[var(--ember)]' : 'text-[var(--jade)]')}>
                    {hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    {hidden ? 'Hidden' : 'Visible'}
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Social links"
          description="Shown in the footer, the Contact grid and the page head. Edits save as soon as they land."
          action={(
            <button
              type="button"
              aria-expanded={showPlatformPicker}
              onClick={() => { sounds.click(); setShowPlatformPicker((current) => !current); }}
              className="btn btn-secondary px-3 text-xs"
            >
              <Plus size={14} aria-hidden="true" />
              Add platform
            </button>
          )}
        >
          {showPlatformPicker && (
            <div className="mb-4 rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
              <label htmlFor="platform-search" className="label">Add a platform</label>
              <input
                id="platform-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search platforms…"
                className="field h-9 min-h-0 text-[13px]"
              />
              {missingPlatforms.length === 0 ? (
                <p className="mt-3 text-[12.5px] text-[var(--muted)]">
                  Every platform in the catalogue is already listed.
                </p>
              ) : (
                <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
                  {CATEGORY_ORDER.map((category) => {
                    const group = missingPlatforms.filter((platform) => platform.category === category);
                    if (group.length === 0) return null;
                    return (
                      <div key={category}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
                          {SOCIAL_CATEGORY_LABELS[category]}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {group.map((platform) => (
                            <li key={platform.id}>
                              <button
                                type="button"
                                onClick={() => addPlatform(platform)}
                                className="chip hover:border-[rgba(10,130,189,0.35)] hover:text-[var(--accent)]"
                              >
                                <Plus size={11} aria-hidden="true" />
                                {platform.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--faint)]">
                {SOCIAL_PLATFORMS.length} platforms available. Paste a bare handle into the URL field and it is
                expanded automatically, or use a full URL when a platform has no fixed base.
              </p>
            </div>
          )}
          {socials.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No profiles yet.</p>
          ) : (
            <ul className="space-y-3">
              {socials.map((social, index) => (
                <li key={social.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                  <div>
                    <label className="sr-only" htmlFor={`social-label-${social.id}`}>{social.label} name</label>
                    <input
                      id={`social-label-${social.id}`}
                      value={social.label}
                      onChange={(event) => setSocials(socials.map((item) => (
                        item.id === social.id ? { ...item, label: event.target.value } : item
                      )))}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor={`social-url-${social.id}`}>{social.label} URL</label>
                    <input
                      id={`social-url-${social.id}`}
                      type="url"
                      value={social.url}
                      onChange={(event) => setSocials(socials.map((item) => (
                        item.id === social.id ? { ...item, url: event.target.value } : item
                      )))}
                      className="field"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconButton
                      label={`${social.visible === false ? 'Show' : 'Hide'} ${social.label} on the public page`}
                      onClick={() => setSocials(socials.map((item) => (
                        item.id === social.id ? { ...item, visible: item.visible === false } : item
                      )))}
                    >
                      {social.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                    </IconButton>
                    <IconButton label={`Move ${social.label} up`} disabled={index === 0} onClick={() => moveSocial(index, -1)}>
                      <ArrowUp size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Move ${social.label} down`} disabled={index === socials.length - 1} onClick={() => moveSocial(index, 1)}>
                      <ArrowDown size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Delete ${social.label}`} tone="danger" onClick={() => setPendingSocial(social)}>
                      <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Cloud status">
          <SyncPanel status={syncStatus} lastSyncedAt={lastSyncedAt} />
        </SectionCard>

        <SectionCard
          title="Backup and restore"
          description="The export is the same payload the importer accepts, so a round trip restores every section, the section order and the visibility map."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                downloadJSON(exportBackup(), 'portfolio-backup.json');
                notify('Backup exported');
              }}
              className="btn btn-secondary px-4 text-[13px]"
            >
              <Download size={15} aria-hidden="true" />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn btn-secondary px-4 text-[13px]"
            >
              <Upload size={15} aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              onClick={() => setPendingReset(true)}
              className="btn btn-primary px-4 text-[13px]"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset everything to defaults
            </button>
            <label className="sr-only" htmlFor="admin-import-file">Backup file to import</label>
            <input
              ref={fileRef}
              id="admin-import-file"
              type="file"
              accept="application/json,.json"
              onChange={pickImport}
              className="sr-only"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Per-section reset"
          description="Restores one group of records to its seeded defaults and leaves everything else untouched."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {RESETTABLE.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-2 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                <span className="min-w-0 truncate text-[13px] font-medium text-[var(--ink-2)]">{entry.label}</span>
                <div className="flex flex-none items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToTab(entry.tab)}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    Open
                    <span className="sr-only"> the {entry.label} tab</span>
                  </button>
                  <IconButton label={`Reset ${entry.label}`} tone="danger" onClick={() => setResetKey(entry.key)}>
                    <RefreshCw size={14} aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={Boolean(pendingSocial)}
        title="Delete this profile?"
        message={`${pendingSocial?.label ?? ''} will be removed from the footer, the Contact grid and the page head.`}
        confirmLabel="Delete"
        onCancel={() => setPendingSocial(null)}
        onConfirm={() => {
          setSocials(socials.filter((item) => item.id !== pendingSocial!.id));
          notify('Social profile deleted');
          setPendingSocial(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(resetKey)}
        title={`Reset ${resetLabel}?`}
        message="Every record in this group goes back to its seeded default. The rest of the site is untouched, and this cannot be undone."
        confirmLabel="Reset"
        onCancel={() => setResetKey(null)}
        onConfirm={() => {
          resetSection(resetKey!);
          notify(`${resetLabel} reset to defaults`);
          setResetKey(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Replace everything?"
        message="This backup overwrites the current record in this browser and in the cloud. Anything edited since the export is lost."
        confirmLabel="Import"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          void importBackup(pendingImport!).then(() => {
            notify('Backup imported');
            setPendingImport(null);
          }).catch(() => {
            notify('The backup could not be written to the cloud', 'error');
            setPendingImport(null);
          });
        }}
      />

      <ConfirmDialog
        open={pendingReset}
        title="Reset the whole site?"
        message="Every section goes back to its defaults and the section order and visibility choices are cleared. Export a backup first if you might want this back."
        confirmLabel="Reset everything"
        onCancel={() => setPendingReset(false)}
        onConfirm={() => {
          resetData();
          notify('Portfolio reset to defaults — syncing to the cloud');
          setPendingReset(false);
        }}
      />
    </div>
  );
}