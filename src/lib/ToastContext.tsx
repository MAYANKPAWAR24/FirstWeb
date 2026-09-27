import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = uid();
    setToasts((t) => [...t, { id, message, type }]);
    if (type === 'success') sounds.success();
    if (type === 'error') sounds.error();
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3.5 backdrop-blur-2xl border shadow-2xl min-w-[280px] max-w-sm toast-enter
            ${t.type === 'success' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100' : ''}
            ${t.type === 'error' ? 'bg-rose-500/15 border-rose-400/30 text-rose-100' : ''}
            ${t.type === 'info' ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100' : ''}
          `}
        >
          <span className="text-lg">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="text-sm font-medium leading-tight">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-auto text-white/50 hover:text-white transition-colors text-sm">✕</button>
        </div>
      ))}
    </div>
  );
}
