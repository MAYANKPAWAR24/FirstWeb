import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { useToast, type ToastType } from '@/lib/ToastContext';

type DataContext = ReturnType<typeof useData>;

/** Keys `resetSection` accepts, read off its own signature. */
export type ResettableKey = Parameters<DataContext['resetSection']>[0];

export interface AdminData extends DataContext {
  notify: (message: string, type?: ToastType) => void;
}

/**
 * Everything a panel needs, in one call.
 *
 * Panels used to destructure `useData()` and `useToast()` separately and then
 * re-derive the same helpers in every file. Pulling both contexts together here
 * keeps each panel down to the records it actually owns.
 */
export function useAdminData(): AdminData {
  const data = useData();
  const { notify } = useToast();
  return useMemo(() => ({ ...data, notify }), [data, notify]);
}

/** Today, as the `YYYY-MM-DD` the date inputs expect. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}