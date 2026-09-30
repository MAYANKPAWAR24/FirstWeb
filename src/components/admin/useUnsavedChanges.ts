import { useEffect } from 'react';

/**
 * Guards the browser's own close/refresh while an admin form holds edits that
 * were never written to the record.
 *
 * Modal *dismissals* are handled by the modal itself; this only covers the one
 * exit route JavaScript cannot intercept.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}