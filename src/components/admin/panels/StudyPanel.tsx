import { useState, type FormEvent } from 'react';
import { Download, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import type { StudyMaterial } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  Select, TagEditor, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData, today } from '@/components/admin/useAdminData';

const FILE_TYPES = ['PDF', 'DOC', 'PPT', 'XLS', 'ZIP', 'IMG'].map((value) => ({ value, label: value }));

const BLANK: Omit<StudyMaterial, 'id'> = {
  title: '',
  description: '',
  fileType: 'PDF',
  fileSize: '',
  url: '',
  tags: [],
  date: today(),
  visible: true,
};

export default function StudyPanel() {
  const { data, addStudyMaterial, updateStudyMaterial, deleteStudyMaterial, notify } = useAdminData();
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StudyMaterial | null>(null);

  const open = (material: StudyMaterial | null) => {
    setEditing(material);
    setShowForm(true);
  };

  const save = (form: Omit<StudyMaterial, 'id'>) => {
    if (!form.title.trim()) {
      notify('A title is required', 'error');
      return;
    }
    if (editing) {
      updateStudyMaterial(editing.id, { ...form, title: form.title.trim() });
      notify('Material updated');
    } else {
      addStudyMaterial(form);
      notify('Material added to the library');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Study Material"
        description="Guides, references and workshop notes. An entry with no file is still listed, marked as a draft."
        count={data.studyMaterials.length}
        addLabel="Add material"
        onAdd={() => open(null)}
      />

      {data.studyMaterials.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">The library is empty.</p>
      ) : (
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {data.studyMaterials.map((material) => (
            <ItemRow
              key={material.id}
              dimmed={material.visible === false}
              title={material.title}
              meta={`${material.fileType}${material.fileSize ? ` · ${material.fileSize}` : ''} · ${formatDate(material.date)}`}
              chips={(
                <>
                  {material.visible === false
                    ? <span className="chip chip-ember">Hidden</span>
                    : !material.url.trim()
                      ? <span className="chip">No file yet</span>
                      : <span className="chip chip-accent"><Download size={11} aria-hidden="true" /> Downloadable</span>}
                  {material.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                </>
              )}
              onSelect={() => open(material)}
              actions={(
                <>
                  <IconButton
                    label={`${material.visible === false ? 'Show' : 'Hide'} ${material.title}`}
                    onClick={() => {
                      updateStudyMaterial(material.id, { visible: material.visible === false });
                      notify(material.visible === false ? 'Material is public again' : 'Material hidden', 'info');
                    }}
                  >
                    {material.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  {material.url.trim() && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${material.title} file`}
                      title={`Open ${material.title} file`}
                      className="btn-icon h-9 w-9 min-h-9"
                    >
                      <Download size={15} aria-hidden="true" />
                    </a>
                  )}
                  <IconButton label={`Edit ${material.title}`} onClick={() => open(material)}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${material.title}`} tone="danger" onClick={() => setPendingDelete(material)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <StudyForm
          key={editing?.id ?? 'new'}
          material={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this material?"
        message={`"${pendingDelete?.title ?? ''}" will be removed from the library.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteStudyMaterial(pendingDelete!.id);
          notify('Material deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function StudyForm({
  material, onClose, onSave,
}: {
  material: StudyMaterial | null;
  onClose: () => void;
  onSave: (form: Omit<StudyMaterial, 'id'>) => void;
}) {
  const draft = useDraftForm(draftKey('study', material?.id), material ? { ...material } : { ...BLANK });
  const { value: form } = draft;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...form, title: form.title.trim(), url: form.url.trim(), fileSize: form.fileSize.trim() });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={material ? 'Edit material' : 'Add material'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={material ? 'Save material' : 'Add material'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={140} />
      <Textarea label="Description" value={form.description} onChange={(value) => draft.patch({ description: value })} rows={3} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="File type" value={form.fileType} options={FILE_TYPES} onChange={(value) => draft.patch({ fileType: value })} />
        <Field label="File size" value={form.fileSize} onChange={(value) => draft.patch({ fileSize: value })} placeholder="2.4 MB" />
        <Field label="Date" type="date" value={form.date} onChange={(value) => draft.patch({ date: value })} />
      </div>
      <Field
        label="File URL"
        type="url"
        value={form.url}
        onChange={(value) => draft.patch({ url: value })}
        placeholder="https://…"
        hint="Leave empty and the entry is published as a draft with no download."
      />
      <TagEditor label="Tags" tags={form.tags} onChange={(tags) => draft.patch({ tags })} />
      <Toggle label="Visible" hint="Show in the public library." checked={form.visible !== false} onChange={(visible) => draft.patch({ visible })} />
    </FormModal>
  );
}