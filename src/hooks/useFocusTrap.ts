import { useEffect, type RefObject } from 'react';

/**
 * Traps keyboard focus inside `ref` while `active`, and returns focus to the
 * element that opened it on teardown.
 *
 * `aria-modal="true"` alone is advisory: several screen-reader/browser pairs
 * still let Tab escape into the page behind, which is invisible but leaves
 * keyboard users tabbing through content they cannot see. A real trap is the
 * only reliable fix, and it has to pair with focus restoration or closing a
 * dialog drops the user back at the top of the document.
 *
 * Elements are matched through `querySelectorAll`, so anything rendered with
 * `display: none`, `hidden`, or `inert` is skipped automatically — that is how
 * "hidden elements must not be focusable" is satisfied without extra bookkeeping.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') return false;
    // `offsetParent` is null for `display: none` subtrees; fixed-position
    // elements report null too, so check the rect as well.
    const rect = element.getBoundingClientRect();
    return element.offsetParent !== null || rect.width > 0 || rect.height > 0;
  });
}

export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus in without stealing it from an input the caller has already
    // focused on open (the chat composer autofocuses itself).
    const initial = getFocusable(container)[0];
    if (initial && !container.contains(document.activeElement)) {
      initial.focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active_ = document.activeElement;

      if (event.shiftKey && (active_ === first || !container.contains(active_))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active_ === last || !container.contains(active_))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [ref, active]);
}

/**
 * Runs `onEscape` when Escape is pressed, and stops there.
 *
 * Overlays compose (a chat panel can open while the nav drawer is closing), so
 * Escape is consumed by the topmost layer only: the handler that fires first
 * calls `event.stopPropagation()`. Without that, one Escape press can close two
 * overlays at once.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, onEscape]);
}
