import { useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowUp, Copy, Eye, EyeOff, Pencil, Star, Trash2,
} from 'lucide-react';
import type { PortfolioBlock, PortfolioBlockKind, PortfolioSettings } from '@/lib/types';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  SectionCard, Select, TagEditor, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData } from '@/components/admin/useAdminData';

const KIND_LABELS: Record<PortfolioBlockKind, string> = {
  summary: 'Summary',
  education: 'Education',
  capability: 'Capability',
  'case-study': 'Case study',
  project: 'Project',
};

const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }));

const BLANK: Omit<PortfolioBlock, 'id'> = {
  kind: 'capability',
  title: '',
  body: '',
  tags: [],
  url: '',
  visible: true,
  featured: false,
  order: 0,
};

export default function PortfolioPanel() {
  const {
    data, setPortfolioSettings, addPortfolioBlock, updatePortfolioBlock,
    deletePortfolioBlock, movePortfolioBlock, duplicatePortfolioBlock, notify,
  } = useAdminData();

  const [settings, setSettings] = useState<PortfolioSettings>(() => structuredClone(data.portfolioSettings));
  const [editing, setEditing] = useState<PortfolioBlock | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PortfolioBlock | null>(null);

  const ordered = [...data.portfolioBlocks].sort((a, b) => a.order - b.order);

  const patchSettings = <K extends keyof PortfolioSettings>(key: K, value: PortfolioSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const save = (form: Omit<PortfolioBlock, 'id'>) => {
    if (!form.title.trim()) {
      notify('A block needs a title', 'error');
      return;
    }
    if (editing) {
      updatePortfolioBlock(editing.id, { ...form, title: form.title.trim() });
      notify('Block updated');
    } else {
      addPortfolioBlock({ ...form, order: data.portfolioBlocks.length });
      notify('Block added to the portfolio');
    }
    closeForm();
  };

  return (
    <div>
      <AdminHeader
        title="Portfolio"
        description="The section a recruiter reads first: the header copy, the availability line, the resume link, and the sortable blocks below."
        count={data.portfolioBlocks.length}
        addLabel="Add block"
        onAdd={() => { setEditing(null); setShowForm(true); }}
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Section header">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" value={settings.eyebrow} onChange={(value) => patchSettings('eyebrow', value)} maxLength={40} />
              <Field label="Title" value={settings.title} onChange={(value) => patchSettings('title', value)} maxLength={80} />
            </div>
            <Textarea label="Intro" value={settings.intro} onChange={(value) => patchSettings('intro', value)} rows={3} />
          </div>
        </SectionCard>

        <SectionCard
          title="Availability"
          description="The green banner. An empty status hides the whole block, so a banner with no text can never be left dangling."
        >
          <div className="space-y-4">
            <Field
              label="Status"
              value={settings.availabilityStatus}
              onChange={(value) => patchSettings('availabilityStatus', value)}
              placeholder="Open to collaborations"
              maxLength={60}
            />
            <Field
              label="Note"
              value={settings.availabilityNote}
              onChange={(value) => patchSettings('availabilityNote', value)}
              maxLength={140}
            />
          </div>
        </SectionCard>

        <SectionCard title="Resume" description="A link only — the site never uploads a file here.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Resume URL" type="url" value={settings.resumeUrl} onChange={(value) => patchSettings('resumeUrl', value)} placeholder="https://…" />
            <Field label="Button label" value={settings.resumeLabel} onChange={(value) => patchSettings('resumeLabel', value)} maxLength={32} />
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPortfolioSettings({
                ...settings,
                eyebrow: settings.eyebrow.trim() || 'Portfolio',
                title: settings.title.trim() || 'Work & Capabilities',
                availabilityStatus: settings.availabilityStatus.trim(),
                availabilityNote: settings.availabilityNote.trim(),
                resumeUrl: settings.resumeUrl.trim(),
              });
              notify('Portfolio header saved');
            }}
            className="btn btn-primary px-5 text-[13px]"
          >
            Save header
          </button>
        </div>

        <SectionCard
          title="Blocks"
          description="Ordered as listed. The featured block is promoted to a wide card at the top of the grid; tags shared by two or more blocks become filters."
        >
          {ordered.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No blocks yet. Add a summary, a capability, a case study or an education entry.</p>
          ) : (
            <ul className="space-y-3">
              {ordered.map((block, index) => (
                <ItemRow
                  key={block.id}
                  dimmed={block.visible === false}
                  title={block.title}
                  meta={`${KIND_LABELS[block.kind]} · position ${index + 1}`}
                  chips={(
                    <>
                      {block.featured && <span className="chip chip-accent"><Star size={11} aria-hidden="true" /> Featured</span>}
                      {block.visible === false && <span className="chip chip-ember">Hidden</span>}
                      {block.url && <span className="chip">Link</span>}
                      {block.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                    </>
                  )}
                  onSelect={() => { setEditing(block); setShowForm(true); }}
                  actions={(
                    <>
                      <IconButton
                        label={`${block.visible === false ? 'Show' : 'Hide'} ${block.title}`}
                        onClick={() => {
                          updatePortfolioBlock(block.id, { visible: block.visible === false });
                          notify(block.visible === false ? 'Block is public again' : 'Block hidden from the public page', 'info');
                        }}
                      >
                        {block.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                      </IconButton>
                      <IconButton
                        label={block.featured ? `Unfeature ${block.title}` : `Feature ${block.title}`}
                        onClick={() => {
                          updatePortfolioBlock(block.id, { featured: !block.featured });
                          notify(block.featured ? 'Featured block removed' : 'Block promoted to featured', 'info');
                        }}
                      >
                        <Star size={15} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Move ${block.title} up`} disabled={index === 0} onClick={() => movePortfolioBlock(block.id, -1)}>
                        <ArrowUp size={15} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Move ${block.title} down`} disabled={index === ordered.length - 1} onClick={() => movePortfolioBlock(block.id, 1)}>
                        <ArrowDown size={15} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Duplicate ${block.title}`}
                        onClick={() => {
                          duplicatePortfolioBlock(block.id);
                          notify('Block duplicated');
                        }}
                      >
                        <Copy size={15} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Edit ${block.title}`} onClick={() => { setEditing(block); setShowForm(true); }}>
                        <Pencil size={15} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Delete ${block.title}`} tone="danger" onClick={() => setPendingDelete(block)}>
                        <Trash2 size={15} aria-hidden="true" />
                      </IconButton>
                    </>
                  )}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {showForm && (
        <BlockForm key={editing?.id ?? 'new'} block={editing} onClose={closeForm} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete block?"
        message={`"${pendingDelete?.title ?? ''}" will be removed from the portfolio. This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deletePortfolioBlock(pendingDelete!.id);
          notify('Block deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function BlockForm({
  block, onClose, onSave,
}: {
  block: PortfolioBlock | null;
  onClose: () => void;
  onSave: (form: Omit<PortfolioBlock, 'id'>) => void;
}) {
  const initial = block ? { ...block } : { ...BLANK };
  const draft = useDraftForm(draftKey('portfolio-block', block?.id), initial);
  const { value: form } = draft;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...form, title: form.title.trim(), url: form.url.trim() });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={block ? 'Edit block' : 'New block'}
      meta={block ? KIND_LABELS[block.kind] : 'Added to the end of the list'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={block ? 'Save block' : 'Add block'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={120} />
      <Select
        label="Kind"
        value={form.kind}
        options={KIND_OPTIONS}
        hint="Decides the card treatment on the public page."
        onChange={(value) => draft.patch({ kind: value as PortfolioBlockKind })}
      />
      <Textarea label="Body" value={form.body} onChange={(value) => draft.patch({ body: value })} rows={6} />
      <TagEditor label="Tags" tags={form.tags} onChange={(tags) => draft.patch({ tags })} hint="Shared tags become filters above the grid." />
      <Field label="Link URL" type="url" value={form.url} onChange={(value) => draft.patch({ url: value })} placeholder="https://…" hint="Optional. Turns the card into a link." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          label="Visible"
          hint="Show on the public page."
          checked={form.visible}
          onChange={(visible) => draft.patch({ visible })}
        />
        <Toggle
          label="Featured"
          hint="Promote to the wide card at the top."
          checked={form.featured}
          onChange={(featured) => draft.patch({ featured })}
        />
      </div>
    </FormModal>
  );
}