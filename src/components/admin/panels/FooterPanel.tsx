import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { uid } from '@/lib/utils';
import type { FooterColumn, FooterSettings, SectionId } from '@/lib/types';
import { PUBLIC_SECTIONS } from '@/lib/sectionOrder';
import {
  AdminHeader, ConfirmDialog, Field, IconButton, SectionCard, Select,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

const TARGET_OPTIONS = [
  { value: '', label: 'External link (use the URL)' },
  ...PUBLIC_SECTIONS.map(({ id, label }) => ({ value: id as SectionId, label })),
  { value: 'home', label: 'Home (top of page)' },
];

export default function FooterPanel() {
  const { data, setFooterSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<FooterSettings>(() => structuredClone(data.footerSettings));
  const [pendingLink, setPendingLink] = useState<{ columnId: string; linkId: string; label: string } | null>(null);

  const setColumns = (columns: FooterColumn[]) => setDraft((current) => ({ ...current, columns }));

  const patchColumn = (columnId: string, partial: Partial<FooterColumn>) =>
    setColumns(draft.columns.map((column) => (column.id === columnId ? { ...column, ...partial } : column)));

  const patchLink = (columnId: string, linkId: string, partial: Partial<FooterColumn['links'][number]>) => {
    const column = draft.columns.find((item) => item.id === columnId);
    if (!column) return;
    patchColumn(columnId, {
      links: column.links.map((link) => (link.id === linkId ? { ...link, ...partial } : link)),
    });
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.columns.length) return;
    sounds.click();
    const columns = [...draft.columns];
    [columns[index], columns[target]] = [columns[target], columns[index]];
    setColumns(columns);
  };

  const moveLink = (column: FooterColumn, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= column.links.length) return;
    sounds.click();
    const links = [...column.links];
    [links[index], links[target]] = [links[target], links[index]];
    patchColumn(column.id, { links });
  };

  const save = () => {
    const columns = draft.columns
      .map((column) => ({
        ...column,
        heading: column.heading.trim(),
        links: column.links
          .map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim(), section: link.section }))
          .filter((link) => link.label && (link.section || link.url)),
      }))
      .filter((column) => column.heading && column.links.length > 0);

    setFooterSettings({
      ...draft,
      note: draft.note.trim(),
      copyright: draft.copyright.trim(),
      columns,
    });
    setDraft((current) => ({ ...current, columns }));
    notify('Footer saved');
  };

  return (
    <div>
      <AdminHeader
        title="Footer"
        description="The closing bar: a short note, the copyright line, and the link columns. A column with no links is never rendered."
      />

      <div className="max-w-4xl space-y-5">
        <SectionCard title="Bar">
          <div className="space-y-4">
            <Field label="Note" value={draft.note} onChange={(value) => setDraft((current) => ({ ...current, note: value }))} />
            <Field label="Copyright" value={draft.copyright} onChange={(value) => setDraft((current) => ({ ...current, copyright: value }))} />
          </div>
        </SectionCard>

        {draft.columns.map((column, columnIndex) => (
          <SectionCard
            key={column.id}
            title={`Column ${columnIndex + 1}`}
            action={(
              <div className="flex items-center gap-1.5">
                <IconButton label={`Move column ${column.heading || columnIndex + 1} up`} disabled={columnIndex === 0} onClick={() => moveColumn(columnIndex, -1)}>
                  <ArrowUp size={15} aria-hidden="true" />
                </IconButton>
                <IconButton label={`Move column ${column.heading || columnIndex + 1} down`} disabled={columnIndex === draft.columns.length - 1} onClick={() => moveColumn(columnIndex, 1)}>
                  <ArrowDown size={15} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Delete column ${column.heading || columnIndex + 1}`}
                  tone="danger"
                  onClick={() => setColumns(draft.columns.filter((item) => item.id !== column.id))}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </IconButton>
              </div>
            )}
          >
            <Field label="Heading" value={column.heading} onChange={(value) => patchColumn(column.id, { heading: value })} />

            <ul className="mt-4 space-y-3">
              {column.links.map((link, linkIndex) => (
                <li key={link.id} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Label" value={link.label} onChange={(value) => patchLink(column.id, link.id, { label: value })} />
                    <Select
                      label="Goes to"
                      value={link.section}
                      options={TARGET_OPTIONS}
                      hint="Leave on the external option to use the URL below."
                      onChange={(value) => patchLink(column.id, link.id, { section: value as SectionId | '' })}
                    />
                  </div>
                  {link.section
                    ? <p className="mt-2 text-xs text-[var(--faint)]">Internal anchor — the URL field is unused.</p>
                    : (
                      <div className="mt-3">
                        <Field label="External URL" type="url" value={link.url} onChange={(value) => patchLink(column.id, link.id, { url: value })} placeholder="https://…" />
                      </div>
                    )}
                  <div className="mt-3 flex justify-end gap-1.5">
                    <IconButton label={`Move ${link.label || 'link'} up`} disabled={linkIndex === 0} onClick={() => moveLink(column, linkIndex, -1)}>
                      <ChevronUp size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Move ${link.label || 'link'} down`} disabled={linkIndex === column.links.length - 1} onClick={() => moveLink(column, linkIndex, 1)}>
                      <ChevronDown size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Remove ${link.label || 'link'}`} tone="danger" onClick={() => setPendingLink({ columnId: column.id, linkId: link.id, label: link.label })}>
                      <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                sounds.click();
                patchColumn(column.id, {
                  links: [...column.links, { id: uid(), label: '', section: '', url: '' }],
                });
              }}
              className="btn btn-secondary mt-4 w-full text-[13px]"
            >
              <Plus size={15} aria-hidden="true" />
              Add a link
            </button>
          </SectionCard>
        ))}

        <button
          type="button"
          onClick={() => {
            sounds.click();
            setColumns([...draft.columns, { id: uid(), heading: 'New column', links: [] }]);
          }}
          className="btn btn-secondary w-full text-[13px]"
        >
          <Plus size={15} aria-hidden="true" />
          Add a column
        </button>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save footer</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.footerSettings));
              notify('Reverted to the saved footer', 'info');
            }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingLink)}
        title="Remove this link?"
        message={`"${pendingLink?.label || 'Untitled link'}" will be removed from the footer.`}
        confirmLabel="Remove"
        onCancel={() => setPendingLink(null)}
        onConfirm={() => {
          const column = draft.columns.find((item) => item.id === pendingLink!.columnId);
          if (column) patchColumn(column.id, { links: column.links.filter((link) => link.id !== pendingLink!.linkId) });
          notify('Link removed');
          setPendingLink(null);
        }}
      />
    </div>
  );
}