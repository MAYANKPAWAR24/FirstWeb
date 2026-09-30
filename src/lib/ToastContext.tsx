import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { sounds } from './sound';
import { uid } from './utils';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  notify: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS = { success: Check, error: AlertCircle, info: Info } as const;
const TONES = {
  success: 'text-[var(--jade)]',
  error: 'text-[var(--ember)]',
  info: 'text-[var(--accent)]',
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = uid();
    setToasts((current) => [...current, { id, message, type }]);
    if (type === 'success') sounds.success();
    if (type === 'error') sounds.error();
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Toasts are the ONLY feedback channel for every admin action, so the container
 * is a polite live region.
 *
 * It had no `role="status"` or `aria-live` at all, which meant each `notify()`
 * was silently dropped for screen-reader users — a validation error, a failed
 * save and a successful delete were all indistinguishable from silence.
 *
 * `aria-atomic="false"` lets several queued messages be read in order rather
 * than only the newest.
 */
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  // Deliberately does NOT move focus. A toast appearing must never steal focus
  // from a form the user is mid-way through; the live region announces it
  // without interrupting.
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-fade-up items-start gap-3 rounded-card border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[0_14px_36px_-18px_rgba(12,12,17,0.4)]"
          >
            <Icon size={15} aria-hidden="true" className={`mt-0.5 flex-none ${TONES[toast.type]}`} />
            <p className="flex-1 text-[13px] font-medium leading-snug text-[var(--ink-2)]">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-mr-1 flex-none rounded p-0.5 text-[var(--faint)] transition-colors hover:text-[var(--ink)]"
              title="Dismiss"
            >
              <X size={14} aria-hidden="true" />
              <span className="sr-only">Dismiss notification</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
