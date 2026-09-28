export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function cls(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(' ');
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}

/**
 * Scroll lock for modals.
 *
 * Deliberately avoids `position: fixed` on <body>: that pattern is what locks
 * scrolling permanently and blank/crash the page on iOS Safari. We use
 * `overflow: hidden` with a scrollbar-gutter-preserving width compensation
 * instead, which iOS handles correctly and costs no layout thrash.
 */
let scrollLockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

export function lockPageScroll() {
  if (scrollLockCount === 0) {
    const { body } = document;
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    // Reserve the scrollbar width so locking does not shift the layout.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const current = parseInt(window.getComputedStyle(body).paddingRight, 10) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
    body.classList.add('scroll-locked');
  }
  scrollLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount !== 0) return;
    const { body } = document;
    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
    body.classList.remove('scroll-locked');
  };
}
