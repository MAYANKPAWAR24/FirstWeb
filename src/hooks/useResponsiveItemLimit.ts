import { useEffect, useState, useCallback } from 'react';

export const MOBILE_ITEM_LIMIT = 2;
export const DESKTOP_ITEM_LIMIT = 5;

const MOBILE_QUERY = '(max-width: 1023px)';

function readLimit() {
  if (typeof window === 'undefined') return DESKTOP_ITEM_LIMIT;
  return window.matchMedia(MOBILE_QUERY).matches ? MOBILE_ITEM_LIMIT : DESKTOP_ITEM_LIMIT;
}

/**
 * Returns how many items a section should render before "SEE ALL" is used:
 * 2 on mobile/tablet viewports, 5 on laptop/desktop. Updates on viewport resize only.
 * Uses passive event listener and requestAnimationFrame for optimal performance.
 */
export function useResponsiveItemLimit(mobileLimit = MOBILE_ITEM_LIMIT, desktopLimit = DESKTOP_ITEM_LIMIT) {
  const [limit, setLimit] = useState(readLimit);

  const sync = useCallback(() => {
    setLimit(window.matchMedia(MOBILE_QUERY).matches ? mobileLimit : desktopLimit);
  }, [mobileLimit, desktopLimit]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    let raf = 0;
    const handler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    sync();
    media.addEventListener('change', handler, { passive: true });
    return () => {
      media.removeEventListener('change', handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sync]);

  return limit;
}
