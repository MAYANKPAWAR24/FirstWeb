import { useState } from 'react';
import { Check, Clock, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { GuestbookEntry } from '@/lib/types';
import { AdminHeader, ConfirmDialog, IconButton, ItemRow } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

export default function GuestbookPanel() {
  const { data, updateGuestbookEntry, deleteGuestbookEntry, notify } = useAdminData();
  const [pendingDelete, setPendingDelete] = useState<GuestbookEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const entries = data.guestbook.filter((entry) => {
    if (filter === 'pending') return entry.approved === false;
    if (filter === 'approved') return entry.approved !== false;
    return true;
  });

  const pending = data.guestbook.filter((entry) => entry.approved === false).length;

  const setApproved = (entry: GuestbookEntry, approved: boolean) => {
    updateGuestbookEntry(entry.id, { approved });
    notify(approved ? `Approved ${entry.name}'s message` : `${entry.name}'s message is now hidden`, 'info');
  };

  return (
    <div>
      <AdminHeader
        title="Community"
        description="Messages visitors sign from the Community section. They arrive unapproved by default and only approved entries are rendered publicly."
        count={data.guestbook.length}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter guestbook entries" className="flex gap-1">
          {([['all', 'All'], ['pending', `Pending${pending ? ` (${pending})` : ''}`], ['approved', 'Approved']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className="filter-pill"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--faint)]">Entries are added by visitors — there is nothing to add by hand.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">
          {data.guestbook.length === 0 ? 'No messages yet.' : 'Nothing matches this filter.'}
        </p>
      ) : (
        <ul className="grid max-w-3xl gap-3">
          {entries.map((entry) => (
            <ItemRow
              key={entry.id}
              dimmed={entry.approved === false}
              title={entry.name}
              meta={formatDate(entry.date)}
              body={entry.message}
              chips={entry.approved === false
                ? <span className="chip chip-ember"><Clock size={11} aria-hidden="true" /> Awaiting approval</span>
                : <span className="chip chip-accent"><Check size={11} aria-hidden="true" /> Public</span>}
              thumb={(
                <span aria-hidden="true" className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[var(--surface-2)] font-display text-sm font-bold text-[var(--accent)]">
                  {entry.avatar || entry.name.charAt(0).toUpperCase()}
                </span>
              )}
              actions={(
                <>
                  <IconButton
                    label={entry.approved === false ? `Approve ${entry.name}'s message` : `Unapprove ${entry.name}'s message`}
                    tone={entry.approved === false ? 'accent' : 'default'}
                    onClick={() => setApproved(entry, entry.approved === false)}
                  >
                    {entry.approved === false ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label={`Delete ${entry.name}'s message`} tone="danger" onClick={() => setPendingDelete(entry)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this message?"
        message={`${pendingDelete?.name}'s message will be removed from the guestbook permanently.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteGuestbookEntry(pendingDelete!.id);
          notify('Message deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}