import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls to the element named by the URL hash (`/docs#loop`) after client-side navigation.
 * Waits a frame because the layout scrolls to the top on every route change, and its effect
 * runs after this one.
 */
export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);
}
