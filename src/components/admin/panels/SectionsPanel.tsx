import { useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowUp, Copy, Eye, EyeOff, Pencil, Trash2,
} from 'lucide-react';
import type { CustomSection, CustomSectionType, MiniGameKind } from '@/lib/types';
import { GAME_REGISTRY, DEFAULT_GAME_ORDER } from '@/components/games/registry';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  Select, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData } from '@/components/admin/useAdminData';

const TYPE_OPTIONS: { value: CustomSectionType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'media', label: 'Media' },
  { value: 'widget', label: 'Widget cards' },
  { value: 'game', label: 'Mini-game' },
];

const TYPE_HELP: Record<CustomSectionType, string> = {
  text: 'Body copy. Supports ## headings, - bullets, > quotes, ``` code blocks, **bold** and *italic*.',
  media: 'Renders the media URL as an image, an embeddable video (YouTube/Vimeo), a direct video or audio file, or a clean external link card.',
  widget: 'Paste a JSON array for a card grid, e.g. [{"label":"Projects","value":"27","description":"shipped"}]. Anything else falls back to text.',
  game: 'Embeds a playable mini-game. No install, no assets, no cost.',
};

const GAME_OPTIONS = DEFAULT_GAME_ORDER.map((id) => ({ value: id as MiniGameKind, label: GAME_REGISTRY[id].title }));

const BLANK: Omit<CustomSection, 'id'> = {
  title: '',
  type: 'text',
  category: '',
  content: '',
  mediaUrl: '',
  linkLabel: '',
  game: 'tic-tac-toe',
  isVisible: true,
  createdAt: new Date().toISOString(),
};

export default function SectionsPanel() {
  const {
    data, addCustomSection, updateCustomSection, deleteCustomSection,
    toggleCustomSectionVisible, moveCustomSection, duplicateCustomSection, notify,
  } = useAdminData();

  const [editing, setEditing] = useState<CustomSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomSection | null>(null);

  const sections = data.customSections ?? [];
  const open = (section: CustomSection | null) => {
    setEditing(section);
    setShowForm(true);
  };

  const save = (form: Omit<CustomSection, 'id'>) => {
    if (!form.title.trim()) {
      notify('A section title is required', 'error');
      return;
    }
    if (editing) {
      updateCustomSection(editing.id, { ...form, title: form.title.trim() });
      notify('Section updated');
    } else {
      addCustomSection(form);
      notify('Section added to the public page');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Section Builder"
        description="Extra pages built at runtime and appended after the ordered sections: prose, an embed, a card grid or a playable game."
        count={sections.length}
        addLabel="New section"
        onAdd={() => open(null)}
      />

      {sections.length === 0 ? (
        <p className="max-w-3xl text-[13px] text-[var(--muted)]">
          No custom sections yet. Create one and it appears on the public page, in the order shown here.
        </p>
      ) : (
        <ul className="grid max-w-3xl gap-3">
          {sections.map((section, index) => (
            <ItemRow
              key={section.id}
              dimmed={section.isVisible === false}
              title={section.title}
              meta={[
                section.type,
                section.type === 'game' ? GAME_REGISTRY[section.game]?.title ?? section.game : '',
                section.category,
              ].filter(Boolean).join(' · ')}
              chips={section.isVisible === false
                ? <span className="chip chip-ember">Hidden</span>
                : <span className="chip chip-accent">Public</span>}
              onSelect={() => open(section)}
              actions={(
                <>
                  <IconButton
                    label={`${section.isVisible === false ? 'Show' : 'Hide'} ${section.title}`}
                    onClick={() => {
                      toggleCustomSectionVisible(section.id);
                      notify(section.isVisible === false ? 'Section is public again' : 'Section hidden from the public page', 'info');
                    }}
                  >
                    {section.isVisible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label={`Move ${section.title} up`} disabled={index === 0} onClick={() => moveCustomSection(section.id, -1)}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Move ${section.title} down`} disabled={index === sections.length - 1} onClick={() => moveCustomSection(section.id, 1)}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Duplicate ${section.title}`}
                    onClick={() => {
                      duplicateCustomSection(section.id);
                      notify('Section duplicated');
                    }}
                  >
                    <Copy size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Edit ${section.title}`} onClick={() => open(section)}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${section.title}`} tone="danger" onClick={() => setPendingDelete(section)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <SectionForm
          key={editing?.id ?? 'new'}
          section={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this section?"
        message={`"${pendingDelete?.title ?? ''}" and its content will be removed from the public page.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteCustomSection(pendingDelete!.id);
          notify('Section deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function SectionForm({
  section, onClose, onSave,
}: {
  section: CustomSection | null;
  onClose: () => void;
  onSave: (form: Omit<CustomSection, 'id'>) => void;
}) {
  const draft = useDraftForm(draftKey('custom-section', section?.id), section ? { ...section } : { ...BLANK });
  const { value: form } = draft;

  // A media section always needs the URL, and a section with a button label is
  // using that same URL as the button's destination — so the two collapse into
  // one field. The old form rendered both, each bound to `mediaUrl`.
  const usesUrl = form.type === 'media' || Boolean(form.linkLabel.trim());

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      category: form.category.trim(),
      mediaUrl: form.mediaUrl.trim(),
      linkLabel: form.linkLabel.trim(),
    });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={section ? 'Edit section' : 'New section'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={section ? 'Save section' : 'Create section'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Section title" value={form.title} onChange={(title) => draft.patch({ title })} maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          value={form.type}
          options={TYPE_OPTIONS}
          onChange={(type) => draft.patch({ type: type as CustomSectionType })}
        />
        <Field label="Category" value={form.category} onChange={(category) => draft.patch({ category })} placeholder="Playground" />
      </div>

      <p className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--muted)]">
        {TYPE_HELP[form.type]}
      </p>

      {form.type === 'game' && (
        <Select
          label="Game"
          value={form.game}
          options={GAME_OPTIONS}
          onChange={(game) => draft.patch({ game: game as MiniGameKind })}
        />
      )}

      {form.type !== 'game' && (
        <Textarea
          label="Content"
          value={form.content}
          onChange={(content) => draft.patch({ content })}
          rows={8}
          mono
          placeholder={form.type === 'widget' ? '[{"label":"Projects","value":"27","description":"shipped"}]' : '## Heading, - bullet, > quote'}
        />
      )}

      <Field
        label="Button label"
        value={form.linkLabel}
        onChange={(linkLabel) => draft.patch({ linkLabel })}
        maxLength={60}
        placeholder="Open project"
      />

      {usesUrl && (
        <Field
          label={form.type === 'media' ? 'Media URL' : 'Media and button link URL'}
          type="url"
          value={form.mediaUrl}
          onChange={(mediaUrl) => draft.patch({ mediaUrl })}
          placeholder="https://…"
          hint={form.type === 'media'
            ? 'Image, embeddable video, direct media file, or an external link.'
            : 'The destination the button above opens.'}
        />
      )}

      <Toggle
        label="Visible on the public page"
        hint="Hidden sections keep their content and can be brought back."
        checked={form.isVisible}
        onChange={(isVisible) => draft.patch({ isVisible })}
      />
    </FormModal>
  );
}
