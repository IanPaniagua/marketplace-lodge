'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/session-client';

// Refresh well within the ~1h access-token TTL set by /api/auth/session.
const REFRESH_MS = 40 * 60 * 1000;

export default function SessionKeeper() {
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        await refreshSession();
      } catch {
        // Network errors are non-fatal — middleware will redirect on the next nav.
      }
      if (cancelled) return;
    }

    // Refresh immediately on mount (covers cold-start in standalone PWA where
    // the access token may already be near expiry) and then on an interval.
    tick();
    const id = setInterval(tick, REFRESH_MS);

    // Also refresh when the PWA returns to the foreground.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
