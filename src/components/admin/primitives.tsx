import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Info, Plus, X } from 'lucide-react';
import Overlay, { OverlayHeader } from '@/components/Overlay';
import { cls, formatDate } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { useUnsavedChanges } from './useUnsavedChanges';

/* ------------------------------------------------------------------ *
 * Panel chrome
 * ------------------------------------------------------------------ */

interface AdminHeaderProps {
  title: string;
  description?: string;
  count?: number;
  addLabel?: string;
  onAdd?: () => void;
  /** Extra controls rendered next to the add button. */
  children?: ReactNode;
}

export function AdminHeader({ title, description, count, addLabel = 'Add new', onAdd, children }: AdminHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
        {count !== undefined && (
          <p className="mt-1 text-xs font-medium text-[var(--faint)]">
            {count} item{count === 1 ? '' : 's'}
          </p>
        )}
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onAdd && (
          <button
            type="button"
            onClick={() => { sounds.click(); onAdd(); }}
            className="btn btn-primary px-4 text-[13px]"
          >
            <Plus size={15} aria-hidden="true" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
  return (
    <section className={cls('card card-sheen rounded-panel p-5 sm:p-6', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--ink)]">{title}</h3>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {body && <p className="empty-state-body">{body}</p>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Rows and buttons
 * ------------------------------------------------------------------ */

interface IconButtonProps {
  /** Required: an icon-only control is otherwise nameless. */
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}

export function IconButton({ label, onClick, children, tone = 'default', disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={() => { sounds.click(); onClick(); }}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cls(
        'btn-icon h-9 w-9 min-h-9',
        tone === 'accent' && 'text-[var(--accent)]',
        tone === 'danger' && 'text-[var(--ember)] hover:border-[rgba(230,79,55,0.36)] hover:text-[var(--ember)]',
      )}
    >
      {children}
    </button>
  );
}

interface ItemRowProps {
  title: string;
  meta?: ReactNode;
  /** Long-form content under the title — a message, a description. */
  body?: ReactNode;
  chips?: ReactNode;
  thumb?: ReactNode;
  /** Opacity cue for a row that is saved but hidden from the public page. */
  dimmed?: boolean;
  /** Opens the editor. */
  onSelect?: () => void;
  actions?: ReactNode;
}

export function ItemRow({ title, meta, body, chips, thumb, dimmed, onSelect, actions }: ItemRowProps) {
  const content = (
    <>
      <p className={cls('truncate text-[13.5px] font-semibold text-[var(--ink)]', onSelect && 'group-hover:text-[var(--accent)]')}>
        {title}
      </p>
      {meta && <p className="mt-0.5 text-xs text-[var(--muted)]">{meta}</p>}
      {body && <div className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">{body}</div>}
      {chips && <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div>}
    </>
  );

  return (
    <li className={cls('card card-sheen rounded-card p-3 sm:p-4', dimmed && 'opacity-60')}>
      <div className="flex items-start gap-3">
        {thumb && <div className="flex-none">{thumb}</div>}
        <div className="min-w-0 flex-1">
          {onSelect ? (
            <button
              type="button"
              onClick={() => { sounds.click(); onSelect(); }}
              className="group block w-full text-left"
            >
              {content}
              <span className="sr-only">Open the editor</span>
            </button>
          ) : content}
        </div>
      </div>
      {actions && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2.5">
          {actions}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * Form controls
 * ------------------------------------------------------------------ */

/**
 * A label bound to one control by id. Every input in the dashboard goes through
 * this or through `Field`/`Select`/`Textarea`, which generate the id themselves.
 */
export function FormField({ id, label, hint, children, className }: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function Field({
  id, label, value, onChange, type = 'text', placeholder, hint, maxLength, mono, required, autoFocus,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url' | 'tel' | 'date' | 'number' | 'search' | 'password';
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  mono?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} label={label} hint={hint}>
      <input
        id={fieldId}
        type={type}
        value={value}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cls('field', mono && 'font-mono text-xs')}
      />
    </FormField>
  );
}

export function Select({
  id, label, value, onChange, options, hint,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} label={label} hint={hint}>
      <select
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FormField>
  );
}

export function Textarea({
  id, label, value, onChange, rows = 4, hint, placeholder, mono, maxLength,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} label={label} hint={hint}>
      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cls('field', mono && 'font-mono text-xs')}
      />
    </FormField>
  );
}

/**
 * A switch. It is a real button carrying `aria-pressed` rather than a styled
 * checkbox, so its on/off state is announced and it is reachable by keyboard
 * without depending on a hidden native control.
 */
export function Toggle({
  label, checked, onChange, hint, disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => { sounds.toggle(); onChange(!checked); }}
      className="flex w-full items-center justify-between gap-3 rounded-card border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left transition-colors duration-[var(--dur-hover)] hover:border-[rgba(10,130,189,0.35)] disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[var(--ink)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cls(
          'flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
          checked ? 'chip chip-accent' : 'chip',
        )}
      >
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}

export function TagEditor({
  id, label, tags, onChange, placeholder = 'Type a value and press Enter', hint,
}: {
  id?: string;
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [entry, setEntry] = useState('');

  const commit = () => {
    const value = entry.trim();
    if (!value) return;
    if (!tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) onChange([...tags, value]);
    setEntry('');
  };

  return (
    <FormField id={fieldId} label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          id={fieldId}
          value={entry}
          placeholder={placeholder}
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            commit();
          }}
          className="field"
        />
        <button
          type="button"
          onClick={() => { sounds.click(); commit(); }}
          aria-label={`Add to ${label.toLowerCase()}`}
          title={`Add to ${label.toLowerCase()}`}
          className="btn btn-secondary flex-none px-4"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => { sounds.click(); onChange(tags.filter((item) => item !== tag)); }}
                aria-label={`Remove ${tag}`}
                className="tag transition-colors duration-[var(--dur-hover)] hover:border-[rgba(230,79,55,0.35)] hover:text-[var(--ember)]"
              >
                {tag}
                <X size={11} aria-hidden="true" className="ml-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FormField>
  );
}

export function DraftHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p className="flex items-start gap-2 rounded-card border border-[rgba(10,130,189,0.24)] bg-[var(--accent-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--ink-2)]">
      <Info size={14} aria-hidden="true" className="mt-0.5 flex-none text-[var(--accent)]" />
      <span>
        <strong className="font-semibold">Draft restored.</strong> These unsaved edits came back from
        your last session. Save to keep them, or cancel to discard.
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Sync diagnostics
 * ------------------------------------------------------------------ */

const SYNC_TEXT: Record<string, string> = {
  loading: 'Connecting to the cloud…',
  saving: 'Saving changes…',
  synced: 'Cloud synced',
  offline: 'Offline — changes stay on this device',
  error: 'Cloud write failed — changes stay on this device',
};

export function SyncBadge({ status, lastSyncedAt }: {
  status: 'loading' | 'synced' | 'saving' | 'offline' | 'error';
  lastSyncedAt: number | null;
}) {
  const stamp = lastSyncedAt ? formatDate(new Date(lastSyncedAt).toISOString()) : null;
  const stale = status === 'offline' || status === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cls(
        'hidden items-center gap-2 text-xs font-medium sm:flex',
        stale ? 'text-[var(--ember)]' : 'text-[var(--muted)]',
      )}
    >
      <span
        aria-hidden="true"
        className={cls(
          'h-1.5 w-1.5 flex-none rounded-full',
          status === 'synced' && 'bg-[var(--jade)]',
          (status === 'saving' || status === 'loading') && 'bg-[var(--accent)]',
          stale && 'bg-[var(--ember)]',
        )}
      />
      <span>{SYNC_TEXT[status] ?? status}</span>
      {stamp && status === 'synced' && <span className="text-[var(--faint)]">· {stamp}</span>}
    </div>
  );
}

/** The same facts as `SyncBadge`, with room to explain the offline case. */
export function SyncPanel({ status, lastSyncedAt }: {
  status: 'loading' | 'synced' | 'saving' | 'offline' | 'error';
  lastSyncedAt: number | null;
}) {
  const stamp = lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : null;
  return (
    <div role="status" aria-live="polite" className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
      <p className="text-[13px] font-semibold text-[var(--ink)]">{SYNC_TEXT[status] ?? status}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        {stamp
          ? `Last successful cloud write: ${stamp}.`
          : 'No cloud write has completed in this session yet.'}
        {(status === 'offline' || status === 'error') && (
          <> Edits made now are local-only and will be pushed on the next successful connection.</>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dialogs
 * ------------------------------------------------------------------ */

/**
 * The single delete path. Nothing in the dashboard removes a record without
 * first telling the admin exactly what is about to go.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay open={open} onClose={onCancel} label={title} panelClassName="max-w-sm">
      <OverlayHeader title={title} />
      <div className="px-5 py-4 sm:px-6">
        <p className="text-[13px] leading-relaxed text-[var(--muted)]">{message}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-3.5 sm:px-6">
        <button type="button" onClick={onCancel} className="btn btn-ghost px-4 text-[13px]">Cancel</button>
        <button
          type="button"
          onClick={() => { sounds.success(); onConfirm(); }}
          className="btn btn-primary px-4 text-[13px]"
        >
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}

/**
 * Every record editor in the dashboard. `Overlay` supplies the focus trap,
 * focus restore, Escape handling, scroll lock and inert background — the reason
 * no panel opens a dialog by hand.
 */
export function FormModal({
  open, title, meta, onClose, onSubmit, submitLabel, dirty, wide, children,
}: {
  open: boolean;
  title: string;
  meta?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  /** Enables the browser-level guard against losing edits on reload. */
  dirty?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  useUnsavedChanges(Boolean(dirty) && open);

  return (
    <Overlay open={open} onClose={onClose} label={title} panelClassName={cls('max-w-lg', wide && 'sm:max-w-3xl')}>
      <OverlayHeader title={title} meta={meta} />
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-y min-h-0 flex-1 space-y-4 px-5 py-5 sm:px-6">
          {children}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-3.5 sm:px-6">
          <button type="button" onClick={onClose} className="btn btn-ghost px-4 text-[13px]">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 text-[13px]">{submitLabel}</button>
        </div>
      </form>
    </Overlay>
  );
}