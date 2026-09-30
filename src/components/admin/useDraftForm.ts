import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '@/lib/DataContext';

/** Drafts are written at most this often while an admin is typing. */
const DRAFT_DEBOUNCE_MS = 600;

export interface DraftForm<T> {
  value: T;
  set: (next: T) => void;
  /** Patch helper so panels do not spread by hand on every keystroke. */
  patch: (partial: Partial<T>) => void;
  /** A saved draft was found and used instead of the record's value. */
  restored: boolean;
  /** Called after a successful save or an explicit discard. */
  clear: () => void;
}

/**
 * Per-item draft state for a modal form.
 *
 * The key carries the item id, so a half-written *new* poem never overwrites the
 * draft of the poem being edited — the failure mode of a single global draft
 * key. `loadDraft` runs in the state initialiser, so the form mounts already
 * holding the restored values instead of flashing the record first.
 */
export function useDraftForm<T extends object>(key: string, initial: T): DraftForm<T> {
  const { loadDraft, saveDraft, clearDraft } = useData();
  const [value, setValue] = useState<T>(() => loadDraft<T>(key) ?? initial);
  const [restored] = useState(() => loadDraft<T>(key) !== null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    clearDraft(key);
  }, [clearDraft, key]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      saveDraft(key, value);
    }, DRAFT_DEBOUNCE_MS);
    // Closing the dialog before the debounce elapsed must not lose the last
    // keystrokes, so a pending write is flushed rather than dropped.
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      saveDraft(key, latest.current);
    };
  }, [key, saveDraft, value]);

  const patch = useCallback((partial: Partial<T>) => {
    setValue((current) => ({ ...current, ...partial }));
  }, []);

  return { value, set: setValue, patch, restored, clear };
}

/** `poem:p1`, `certificate:new` — one draft slot per item kind and identity. */
export function draftKey(kind: string, id?: string) {
  return `${kind}:${id ?? 'new'}`;
}