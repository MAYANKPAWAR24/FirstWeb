import { useState, type FormEvent } from 'react';
import {
  BookOpen, Eye, EyeOff, FileText, Pencil, Star, Trash2,
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cls, formatDate } from '@/lib/utils';
import type { Poem } from '@/lib/types';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  Select, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData, today } from '@/components/admin/useAdminData';

const TYPE_OPTIONS = [
  { value: 'poem', label: 'Poem' },
  { value: 'novel', label: 'Novel' },
  { value: 'article', label: 'Article' },
];

/**
 * Tailwind gradient-stop classes, which is what `Literature` interpolates into
 * `bg-gradient-to-br`. Built from the theme's own variables so the admin cannot
 * pick a cover that belongs to no other surface on the site.
 */
const GRADIENTS = [
  'from-[var(--accent)] to-[var(--iris)]',
  'from-[var(--iris)] to-[var(--accent)]',
  'from-[var(--ember)] to-[var(--accent)]',
  'from-[var(--jade)] to-[var(--accent)]',
  'from-[var(--ink)] to-[var(--ink-2)]',
  'from-[var(--iris)] to-[var(--jade)]',
];

const BLANK: Omit<Poem, 'id'> = {
  type: 'poem',
  title: '',
  author: '',
  excerpt: '',
  content: '',
  category: '',
  date: today(),
  coverGradient: GRADIENTS[0],
  visible: true,
  featured: false,
};

const GLYPH: Record<Poem['type'], string> = { poem: '✦', novel: '❖', article: '▤' };

export default function PoemsPanel() {
  const { data, addPoem, updatePoem, deletePoem, notify } = useAdminData();
  const [editing, setEditing] = useState<Poem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Poem | null>(null);

  const open = (poem: Poem | null) => {
    setEditing(poem);
    setShowForm(true);
  };

  const save = (form: Omit<Poem, 'id'>) => {
    if (!form.title.trim() || !form.content.trim()) {
      notify('A title and the full text are both required', 'error');
      return;
    }
    if (editing) {
      updatePoem(editing.id, { ...form, title: form.title.trim() });
      notify('Work updated');
    } else {
      addPoem(form);
      notify('Work added to the library');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Literature"
        description="Poems, novels and long-form articles. Each opens in a distraction-free reader with a progress bar."
        count={data.poems.length}
        addLabel="Add work"
        onAdd={() => open(null)}
      />

      {data.poems.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">Nothing published yet.</p>
      ) : (
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {data.poems.map((poem) => (
            <ItemRow
              key={poem.id}
              dimmed={poem.visible === false}
              title={poem.title}
              meta={`${poem.type} · ${poem.category || 'uncategorised'} · ${formatDate(poem.date)}`}
              chips={(
                <>
                  {poem.featured && <span className="chip chip-accent"><Star size={11} aria-hidden="true" /> Featured</span>}
                  {poem.visible === false && <span className="chip chip-ember">Hidden</span>}
                </>
              )}
              thumb={(
                <span
                  aria-hidden="true"
                  className={cls('grid h-12 w-12 flex-none place-items-center rounded-card bg-gradient-to-br text-[var(--ink)]', poem.coverGradient)}
                >
                  <span className="text-base">{GLYPH[poem.type]}</span>
                </span>
              )}
              onSelect={() => open(poem)}
              actions={(
                <>
                  <IconButton
                    label={`${poem.visible === false ? 'Show' : 'Hide'} ${poem.title}`}
                    onClick={() => {
                      updatePoem(poem.id, { visible: poem.visible === false });
                      notify(poem.visible === false ? 'Work is public again' : 'Work hidden from the public page', 'info');
                    }}
                  >
                    {poem.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton
                    label={poem.featured ? `Unfeature ${poem.title}` : `Feature ${poem.title}`}
                    onClick={() => {
                      updatePoem(poem.id, { featured: !poem.featured });
                      notify(poem.featured ? 'Featured removed' : 'Pinned to the top of the grid', 'info');
                    }}
                  >
                    <Star size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Edit ${poem.title}`} onClick={() => open(poem)}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${poem.title}`} tone="danger" onClick={() => setPendingDelete(poem)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <PoemForm
          key={editing?.id ?? 'new'}
          poem={editing}
          authorFallback={data.profile.name}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this work?"
        message={`"${pendingDelete?.title ?? ''}" and its full text will be removed. This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deletePoem(pendingDelete!.id);
          notify('Work deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function PoemForm({
  poem, authorFallback, onClose, onSave,
}: {
  poem: Poem | null;
  authorFallback: string;
  onClose: () => void;
  onSave: (form: Omit<Poem, 'id'>) => void;
}) {
  const initial = poem ? { ...poem } : { ...BLANK, author: authorFallback };
  const draft = useDraftForm(draftKey('poem', poem?.id), initial);
  const { value: form } = draft;

  // An older record can carry a gradient from a retired palette; keep it
  // selectable rather than silently replacing the admin's choice.
  const gradients = form.coverGradient && !GRADIENTS.includes(form.coverGradient)
    ? [form.coverGradient, ...GRADIENTS]
    : GRADIENTS;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      author: form.author.trim() || authorFallback,
      category: form.category.trim(),
    });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={poem ? 'Edit work' : 'Add work'}
      meta={poem ? form.type : 'Drafts autosave while you type'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={poem ? 'Save work' : 'Add work'}
      wide
      dirty
    >
      <DraftHint visible={draft.restored} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          value={form.type}
          options={TYPE_OPTIONS}
          onChange={(value) => draft.patch({ type: value as Poem['type'] })}
        />
        <Field label="Category" value={form.category} onChange={(value) => draft.patch({ category: value })} placeholder="Nature" />
      </div>
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={140} />
      <Field label="Author" value={form.author} onChange={(value) => draft.patch({ author: value })} />
      <Field
        label="Excerpt"
        value={form.excerpt}
        onChange={(value) => draft.patch({ excerpt: value })}
        maxLength={180}
        hint="One line shown on the grid card and in search results."
      />
      <Textarea
        label="Full text"
        value={form.content}
        onChange={(value) => draft.patch({ content: value })}
        rows={12}
        mono
        hint="Blank lines separate paragraphs."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" type="date" value={form.date} onChange={(value) => draft.patch({ date: value })} />
        <div>
          <span className="label">Cover gradient</span>
          <div className="flex flex-wrap gap-2">
            {gradients.map((gradient) => (
              <button
                key={gradient}
                type="button"
                aria-label={`Cover gradient ${gradient}`}
                aria-pressed={form.coverGradient === gradient}
                onClick={() => {
                  sounds.click();
                  draft.patch({ coverGradient: gradient });
                }}
                className={cls(
                  'h-9 w-9 rounded-card bg-gradient-to-br ring-offset-2 ring-offset-[var(--surface)] transition-transform',
                  gradient,
                  form.coverGradient === gradient ? 'ring-2 ring-[var(--accent)]' : 'ring-1 ring-[var(--line)]',
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Visible" hint="Show on the public page." checked={form.visible !== false} onChange={(visible) => draft.patch({ visible })} />
        <Toggle label="Featured" hint="Pin to the top of the grid." checked={form.featured === true} onChange={(featured) => draft.patch({ featured })} />
      </div>

      {form.title.trim() && (
        <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
            {form.type === 'article' ? <FileText size={12} aria-hidden="true" /> : <BookOpen size={12} aria-hidden="true" />}
            Reader preview
          </p>
          <div className={cls('relative h-16 overflow-hidden rounded-card bg-gradient-to-br', form.coverGradient)}>
            <span aria-hidden="true" className="on-media absolute inset-0 grid place-items-center text-2xl">
              {GLYPH[form.type]}
            </span>
          </div>
          <p className="mt-2 text-[13px] font-semibold text-[var(--ink)]">{form.title}</p>
          <p className="text-xs text-[var(--muted)]">{form.excerpt || 'No excerpt yet.'}</p>
        </div>
      )}
    </FormModal>
  );
}