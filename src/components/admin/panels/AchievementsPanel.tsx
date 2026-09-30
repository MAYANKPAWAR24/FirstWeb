import { useState, type FormEvent } from 'react';
import { Award, Eye, EyeOff, Pencil, Star, Trash2 } from 'lucide-react';
import type { Achievement } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  Select, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData, today } from '@/components/admin/useAdminData';

/** Icon names `Achievements` maps to a lucide glyph; unknown names fall back. */
const ICON_OPTIONS = ['Award', 'BookOpen', 'Mic', 'Trophy', 'Camera', 'Certificate'].map((value) => ({ value, label: value }));

const CATEGORIES = ['Writing', 'Publishing', 'Speaking', 'Technology', 'Photography'];

const BLANK: Omit<Achievement, 'id'> = {
  title: '',
  description: '',
  date: today(),
  category: 'Writing',
  icon: 'Award',
  visible: true,
  featured: false,
};

export default function AchievementsPanel() {
  const { data, addAchievement, updateAchievement, deleteAchievement, notify } = useAdminData();
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Achievement | null>(null);

  const open = (item: Achievement | null) => {
    setEditing(item);
    setShowForm(true);
  };

  const save = (form: Omit<Achievement, 'id'>) => {
    if (!form.title.trim()) {
      notify('A title is required', 'error');
      return;
    }
    if (editing) {
      updateAchievement(editing.id, { ...form, title: form.title.trim(), category: form.category.trim() });
      notify('Achievement updated');
    } else {
      addAchievement(form);
      notify('Achievement added to the timeline');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Achievements"
        description="Awards, publications and talks, grouped by category on a vertical timeline."
        count={data.achievements.length}
        addLabel="Add achievement"
        onAdd={() => open(null)}
      />

      {data.achievements.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No achievements recorded yet.</p>
      ) : (
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {data.achievements.map((item) => (
            <ItemRow
              key={item.id}
              dimmed={item.visible === false}
              title={item.title}
              meta={`${item.category || 'Uncategorised'} · ${formatDate(item.date)}`}
              chips={(
                <>
                  {item.featured && <span className="chip chip-accent"><Star size={11} aria-hidden="true" /> Featured</span>}
                  {item.visible === false && <span className="chip chip-ember">Hidden</span>}
                </>
              )}
              thumb={(
                <span aria-hidden="true" className="grid h-12 w-12 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)]">
                  <Award size={18} />
                </span>
              )}
              onSelect={() => open(item)}
              actions={(
                <>
                  <IconButton
                    label={`${item.visible === false ? 'Show' : 'Hide'} ${item.title}`}
                    onClick={() => {
                      updateAchievement(item.id, { visible: item.visible === false });
                      notify(item.visible === false ? 'Achievement is public again' : 'Achievement hidden', 'info');
                    }}
                  >
                    {item.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton
                    label={item.featured ? `Unfeature ${item.title}` : `Feature ${item.title}`}
                    onClick={() => {
                      updateAchievement(item.id, { featured: !item.featured });
                      notify(item.featured ? 'Featured removed' : 'Promoted to the top of the timeline', 'info');
                    }}
                  >
                    <Star size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Edit ${item.title}`} onClick={() => open(item)}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${item.title}`} tone="danger" onClick={() => setPendingDelete(item)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <AchievementForm
          key={editing?.id ?? 'new'}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this achievement?"
        message={`"${pendingDelete?.title ?? ''}" will be removed from the timeline.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteAchievement(pendingDelete!.id);
          notify('Achievement deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function AchievementForm({
  item, onClose, onSave,
}: {
  item: Achievement | null;
  onClose: () => void;
  onSave: (form: Omit<Achievement, 'id'>) => void;
}) {
  const draft = useDraftForm(draftKey('achievement', item?.id), item ? { ...item } : { ...BLANK });
  const { value: form } = draft;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...form, title: form.title.trim() });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={item ? 'Edit achievement' : 'Add achievement'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={item ? 'Save achievement' : 'Add achievement'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={120} />
      <Textarea label="Description" value={form.description} onChange={(value) => draft.patch({ description: value })} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" type="date" value={form.date} onChange={(value) => draft.patch({ date: value })} />
        <Field label="Category" value={form.category} onChange={(value) => draft.patch({ category: value })} placeholder={CATEGORIES.join(', ')} />
      </div>
      <Select
        label="Icon"
        value={form.icon}
        options={ICON_OPTIONS}
        hint="Matched against the icon set the public section renders."
        onChange={(value) => draft.patch({ icon: value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Visible" hint="Show on the public timeline." checked={form.visible !== false} onChange={(visible) => draft.patch({ visible })} />
        <Toggle label="Featured" hint="Sort to the top of the timeline." checked={form.featured === true} onChange={(featured) => draft.patch({ featured })} />
      </div>
    </FormModal>
  );
}