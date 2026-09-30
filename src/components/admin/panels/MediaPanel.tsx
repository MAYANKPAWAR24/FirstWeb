import { useState, type FormEvent } from 'react';
import {
  Eye, EyeOff, Image as ImageIcon, Music2, Pencil, Star, Trash2,
} from 'lucide-react';
import type { MediaItem } from '@/lib/types';
import { extractYouTubeId, getYouTubeThumbnail, resolveVideoSource } from '@/lib/media';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  SectionCard, Select, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData, today } from '@/components/admin/useAdminData';

const TYPE_OPTIONS = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'music', label: 'Music' },
];

const BLANK: Omit<MediaItem, 'id'> = {
  type: 'photo',
  title: '',
  url: '',
  thumbnail: '',
  category: '',
  date: today(),
  visible: true,
  featured: false,
};

/** Tells the admin exactly how a pasted video URL will be rendered publicly. */
function describeVideoSource(url: string) {
  const source = resolveVideoSource(url);
  if (source.kind === 'embed') return 'Plays inline in an embedded player.';
  if (source.kind === 'file') return 'Direct video file — plays in the native HTML5 player.';
  return 'This host cannot be embedded, so visitors get a link that opens in a new tab instead of a broken frame.';
}

const URL_LABEL: Record<MediaItem['type'], string> = {
  photo: 'Image URL',
  video: 'Video URL',
  music: 'Audio file URL',
};

export default function MediaPanel() {
  const { data, addMedia, updateMedia, deleteMedia, notify } = useAdminData();
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);

  const open = (item: MediaItem | null) => {
    setEditing(item);
    setShowForm(true);
  };

  const save = (form: Omit<MediaItem, 'id'>) => {
    if (!form.title.trim() || !form.url.trim()) {
      notify('A title and a URL are both required', 'error');
      return;
    }
    if (editing) {
      updateMedia(editing.id, { ...form, title: form.title.trim() });
      notify('Media item updated');
    } else {
      addMedia(form);
      notify('Media item added to the gallery');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Media"
        description="Photography, video and audio in one gallery with a full-screen viewer."
        count={data.media.length}
        onAdd={() => open(null)}
      />

      {data.media.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">The gallery is empty.</p>
      ) : (
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {data.media.map((item) => (
            <ItemRow
              key={item.id}
              dimmed={item.visible === false}
              title={item.title}
              meta={`${item.type} · ${item.category || 'uncategorised'}`}
              chips={(
                <>
                  {item.featured && <span className="chip chip-accent"><Star size={11} aria-hidden="true" /> Featured</span>}
                  {item.visible === false && <span className="chip chip-ember">Hidden</span>}
                </>
              )}
              thumb={item.thumbnail ? (
                <img src={item.thumbnail} alt="" loading="lazy" className="h-12 w-12 flex-none rounded-card border border-[var(--line)] object-cover" />
              ) : (
                <span aria-hidden="true" className="grid h-12 w-12 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--faint)]">
                  {item.type === 'music' ? <Music2 size={18} /> : <ImageIcon size={18} />}
                </span>
              )}
              onSelect={() => open(item)}
              actions={(
                <>
                  <IconButton
                    label={`${item.visible === false ? 'Show' : 'Hide'} ${item.title}`}
                    onClick={() => {
                      updateMedia(item.id, { visible: item.visible === false });
                      notify(item.visible === false ? 'Item is public again' : 'Item hidden from the public page', 'info');
                    }}
                  >
                    {item.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton
                    label={item.featured ? `Unfeature ${item.title}` : `Feature ${item.title}`}
                    onClick={() => {
                      updateMedia(item.id, { featured: !item.featured });
                      notify(item.featured ? 'Featured removed' : 'Item promoted to the front', 'info');
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
        <MediaForm
          key={editing?.id ?? 'new'}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this item?"
        message={`"${pendingDelete?.title ?? ''}" will be removed from the gallery. This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteMedia(pendingDelete!.id);
          notify('Media item deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function MediaForm({
  item, onClose, onSave,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onSave: (form: Omit<MediaItem, 'id'>) => void;
}) {
  const draft = useDraftForm(draftKey('media', item?.id), item ? { ...item } : { ...BLANK });
  const { value: form } = draft;

  const changeType = (type: MediaItem['type']) => {
    const patch: Partial<MediaItem> = { type };
    // A YouTube id is the only thumbnail source that can be derived; anything
    // else needs the URL typed in.
    if (type === 'video') {
      const id = extractYouTubeId(form.url);
      if (id) patch.thumbnail = getYouTubeThumbnail(id);
    }
    draft.patch(patch);
  };

  const changeUrl = (url: string) => {
    const patch: Partial<MediaItem> = { url };
    if (form.type === 'video') {
      const id = extractYouTubeId(url);
      if (id) patch.thumbnail = getYouTubeThumbnail(id);
    } else if (form.type === 'photo' && !form.thumbnail) {
      patch.thumbnail = url;
    }
    draft.patch(patch);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...form, title: form.title.trim(), url: form.url.trim(), category: form.category.trim() });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={item ? 'Edit media' : 'Add media'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={item ? 'Save item' : 'Add item'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Select
        label="Type"
        value={form.type}
        options={TYPE_OPTIONS}
        onChange={(value) => changeType(value as MediaItem['type'])}
      />
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={120} />
      <Field
        label={URL_LABEL[form.type]}
        type="url"
        value={form.url}
        onChange={changeUrl}
        placeholder={form.type === 'video' ? 'YouTube, MP4, or any video URL' : form.type === 'music' ? 'https://…/track.mp3' : 'https://…'}
        hint={form.type === 'video' && form.url.trim() ? describeVideoSource(form.url) : undefined}
      />
      <Field
        label={form.type === 'music' ? 'Cover image URL' : 'Thumbnail URL'}
        value={form.thumbnail}
        onChange={(value) => draft.patch({ thumbnail: value })}
        hint={form.type === 'video' ? 'Filled in automatically from a YouTube id; any URL works otherwise.' : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" value={form.category} onChange={(value) => draft.patch({ category: value })} />
        <Field label="Date" type="date" value={form.date} onChange={(value) => draft.patch({ date: value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Visible" hint="Show in the public gallery." checked={form.visible !== false} onChange={(visible) => draft.patch({ visible })} />
        <Toggle label="Featured" hint="Sort to the front of the grid." checked={form.featured === true} onChange={(featured) => draft.patch({ featured })} />
      </div>
      {form.thumbnail && (
        <SectionCard title="Preview">
          <img src={form.thumbnail} alt="Media thumbnail preview" className="h-40 w-full rounded-card border border-[var(--line)] object-cover" />
        </SectionCard>
      )}
    </FormModal>
  );
}