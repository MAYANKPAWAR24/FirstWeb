import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscapeKey, useFocusTrap } from '@/hooks/useFocusTrap';
import { lockPageScroll } from '@/lib/utils';
import { cls } from '@/lib/utils';

/**
 * The single dialog primitive for the whole site.
 *
 * Before this existed the app had four independently-styled overlays (reading
 * modal, media lightbox, certificate preview, admin editor) at three different
 * z-indexes with three different scrim treatments, none of which trapped focus
 * and only some of which named themselves via `aria-labelledby`. Every one of
 * those differences is now gone.
 *
 * Layering rules this enforces, which the previous code violated:
 *  - One z-index for all dialogs.
 *  - The scrim is a sibling of the panel, never an ancestor carrying a
 *    transform, so `position: fixed` descendants stay viewport-anchored.
 *  - Scroll lock is ref-counted through the shared `lockPageScroll`.
 */

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Used for `aria-labelledby`; falls back to `aria-label` when absent. */
  labelledBy?: string;
  label?: string;
  children: ReactNode;
  /** Full-height sheet on mobile, centred panel on larger screens. */
  variant?: 'sheet' | 'center';
  panelClassName?: string;
  showClose?: boolean;
}

/**
 * How many overlays are currently applying `inert` to the page behind. Shared
 * across instances so a nested dialog closing cannot re-enable content that an
 * outer dialog is still covering.
 */
let inertDepth = 0;

export default function Overlay({  open,
  onClose,
  labelledBy,
  label,
  children,
  variant = 'center',
  panelClassName = '',
  showClose = true,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open);
  useEscapeKey(open, onClose);

  // Scrolling must not stay locked if the overlay unmounts while open (for
  // example when the item it was showing is deleted from the admin).
  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  // The page behind must leave the accessibility tree, not just the visual one.
  //
  // This is only safe because the panel is portalled to <body>: it is rendered
  // inline by sections that live inside <main>, so marking <main> inert would
  // otherwise make the dialog itself inert — unclickable and impossible to
  // close. The portal puts the dialog outside everything that gets marked.
  //
  // Ref-counted because overlays compose: the admin panel contains a modal, and
  // closing that inner modal must not re-enable the page behind a still-open
  // dashboard.
  useEffect(() => {
    if (!open) return;
    const hidden = ['main', 'nav'].map((selector) => document.querySelector(selector))
      .filter((element): element is Element => Boolean(element));
    hidden.forEach((element) => element.setAttribute('inert', ''));
    inertDepth += 1;
    return () => {
      inertDepth = Math.max(0, inertDepth - 1);
      if (inertDepth === 0) hidden.forEach((element) => element.removeAttribute('inert'));
    };
  }, [open]);

  // Nothing renders during SSR, where there is no document to portal into.
  if (!open || typeof document === 'undefined') return null;

  const isSheet = variant === 'sheet';

  return createPortal(
    <div
      className={cls(
        'fixed inset-0 z-[9200] flex justify-center',
        isSheet ? 'items-end sm:items-center sm:p-6' : 'items-center p-4 sm:p-6',
      )}
      onClick={onClose}
    >
      <div className="overlay-scrim absolute inset-0" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(labelledBy ? { 'aria-labelledby': labelledBy } : label ? { 'aria-label': label } : {})}
        onClick={(event) => event.stopPropagation()}
        className={cls(
          'overlay-panel relative flex w-full flex-col overflow-hidden',
          'max-h-[92dvh] sm:max-h-[86dvh]',
          isSheet
            ? 'rounded-t-3xl sm:rounded-3xl'
            : 'max-w-lg rounded-3xl',
          panelClassName,
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="overlay-close absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full"
            aria-label="Close dialog"
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface OverlayHeaderProps {
  title: string;
  /** Rendered under the title — a date, a category, a count. */
  meta?: string;
  children?: ReactNode;
}

export function OverlayHeader({ title, meta, children }: OverlayHeaderProps) {
  return (
    <div className="overlay-header shrink-0 border-b border-[var(--line)] px-5 py-4 pr-14 sm:px-6">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
      {meta && <p className="mt-0.5 text-xs text-[var(--muted)]">{meta}</p>}
      {children}
    </div>
  );
}
