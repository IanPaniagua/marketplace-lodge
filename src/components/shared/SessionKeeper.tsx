'use client';

import { useEffect } from 'react';
import { insforge, SESSION_COOKIE } from '@/lib/insforge';

const REFRESH_MS = 50 * 60 * 1000;

export default function SessionKeeper() {
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data, error } = await insforge.auth.refreshSession();
      if (cancelled) return;
      if (error || !data?.accessToken) return;
      document.cookie = `${SESSION_COOKIE}=${data.accessToken}; path=/; max-age=2592000; SameSite=Lax`;
    }

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
