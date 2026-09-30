import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Award, Eye, EyeOff, Pencil, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { cls, formatDate } from '@/lib/utils';
import type { Certificate } from '@/lib/types';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData, today } from '@/components/admin/useAdminData';

/** Inlined base64 travels inside the cloud record, so the payload is capped. */
const MAX_UPLOAD_BYTES = 512 * 1024;

const BLANK: Omit<Certificate, 'id'> = {
  title: '',
  imageUrl: '',
  issuedDate: today(),
  issuer: '',
  credentialId: '',
  credentialUrl: '',
  visible: true,
  featured: false,
};

export default function CertificatesPanel() {
  const { data, addCertificate, updateCertificate, deleteCertificate, notify } = useAdminData();
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Certificate | null>(null);

  const open = (certificate: Certificate | null) => {
    setEditing(certificate);
    setShowForm(true);
  };

  const save = (form: Omit<Certificate, 'id'>) => {
    if (!form.title.trim() || !form.issuedDate) {
      notify('A title and an issue date are required', 'error');
      return;
    }
    if (editing) {
      updateCertificate(editing.id, { ...form, title: form.title.trim() });
      notify('Certificate updated');
    } else {
      addCertificate(form);
      notify('Certificate added');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Certificates"
        description="Credentials with the issuer, the credential id and a verification link. The public section hides itself entirely when nothing is published."
        count={data.certificates.length}
        addLabel="Add certificate"
        onAdd={() => open(null)}
      />

      {data.certificates.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No certificates yet.</p>
      ) : (
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {data.certificates.map((certificate) => (
            <ItemRow
              key={certificate.id}
              dimmed={certificate.visible === false}
              title={certificate.title}
              meta={[
                certificate.issuer,
                `Issued ${formatDate(certificate.issuedDate)}`,
                certificate.credentialId ? `ID ${certificate.credentialId}` : '',
              ].filter(Boolean).join(' · ')}
              chips={(
                <>
                  {certificate.featured && <span className="chip chip-accent"><Star size={11} aria-hidden="true" /> Featured</span>}
                  {certificate.visible === false && <span className="chip chip-ember">Hidden</span>}
                  {certificate.credentialUrl && <span className="chip"><ShieldCheck size={11} aria-hidden="true" /> Verifiable</span>}
                </>
              )}
              thumb={certificate.imageUrl ? (
                <img
                  src={certificate.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-14 w-20 flex-none rounded-card border border-[var(--line)] bg-[var(--surface-2)] object-cover"
                />
              ) : (
                <span aria-hidden="true" className="grid h-14 w-20 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface-2)] text-[var(--faint)]">
                  <Award size={18} />
                </span>
              )}
              onSelect={() => open(certificate)}
              actions={(
                <>
                  <IconButton
                    label={`${certificate.visible === false ? 'Show' : 'Hide'} ${certificate.title}`}
                    onClick={() => {
                      updateCertificate(certificate.id, { visible: certificate.visible === false });
                      notify(certificate.visible === false ? 'Certificate is public again' : 'Certificate hidden', 'info');
                    }}
                  >
                    {certificate.visible === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton
                    label={certificate.featured ? `Unfeature ${certificate.title}` : `Feature ${certificate.title}`}
                    onClick={() => {
                      updateCertificate(certificate.id, { featured: !certificate.featured });
                      notify(certificate.featured ? 'Featured removed' : 'Sorted to the top', 'info');
                    }}
                  >
                    <Star size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Edit ${certificate.title}`} onClick={() => open(certificate)}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${certificate.title}`} tone="danger" onClick={() => setPendingDelete(certificate)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <CertificateForm
          key={editing?.id ?? 'new'}
          certificate={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this certificate?"
        message={`"${pendingDelete?.title ?? ''}" will be removed. This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteCertificate(pendingDelete!.id);
          notify('Certificate deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function CertificateForm({
  certificate, onClose, onSave,
}: {
  certificate: Certificate | null;
  onClose: () => void;
  onSave: (form: Omit<Certificate, 'id'>) => void;
}) {
  const { notify } = useAdminData();
  const draft = useDraftForm(draftKey('certificate', certificate?.id), certificate ? { ...certificate } : { ...BLANK });
  const { value: form } = draft;
  const isInline = form.imageUrl.startsWith('data:');

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file', 'error');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      notify('Local uploads are limited to 512 KB — host the image and paste its URL instead', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') draft.patch({ imageUrl: reader.result });
    };
    reader.onerror = () => notify('Could not read that image', 'error');
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      issuer: form.issuer?.trim(),
      credentialId: form.credentialId?.trim(),
      credentialUrl: form.credentialUrl?.trim(),
    });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={certificate ? 'Edit certificate' : 'Add certificate'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={certificate ? 'Save certificate' : 'Add certificate'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Title" value={form.title} onChange={(value) => draft.patch({ title: value })} maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issuer" value={form.issuer ?? ''} onChange={(value) => draft.patch({ issuer: value })} placeholder="Issuing body" />
        <Field label="Issue date" type="date" value={form.issuedDate} onChange={(value) => draft.patch({ issuedDate: value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Credential ID" value={form.credentialId ?? ''} onChange={(value) => draft.patch({ credentialId: value })} />
        <Field
          label="Verification URL"
          type="url"
          value={form.credentialUrl ?? ''}
          onChange={(value) => draft.patch({ credentialUrl: value })}
          placeholder="https://…"
        />
      </div>
      <Field
        label="Image URL"
        type="url"
        value={isInline ? '' : form.imageUrl}
        onChange={(value) => draft.patch({ imageUrl: value })}
        placeholder="https://…"
        hint={isInline ? 'An uploaded image is stored inline. Paste a URL to replace it.' : 'Any image host works.'}
      />
      <div>
        <label className="label" htmlFor="certificate-file">Upload an image (512 KB max)</label>
        <input
          id="certificate-file"
          type="file"
          accept="image/*"
          onChange={readImage}
          className={cls('field py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-1.5 file:text-xs file:text-[var(--ink-2)]')}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
          Inlined images travel inside the cloud record, which is why the size is capped. For anything
          larger, host the file and use the URL above.
        </p>
      </div>
      {form.imageUrl && (
        <img
          src={form.imageUrl}
          alt="Certificate preview"
          className="max-h-56 w-full rounded-card border border-[var(--line)] bg-[var(--surface-2)] object-contain"
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Visible" hint="Show on the public Credentials section." checked={form.visible !== false} onChange={(visible) => draft.patch({ visible })} />
        <Toggle label="Featured" hint="Sort above the rest." checked={form.featured === true} onChange={(featured) => draft.patch({ featured })} />
      </div>
    </FormModal>
  );
}