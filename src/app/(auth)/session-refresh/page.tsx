'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { insforge, SESSION_COOKIE } from '@/lib/insforge';
import { Loader2 } from 'lucide-react';

function SessionRefreshInner() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get('next') ?? '/';

    async function attemptRefresh() {
      const { data, error } = await insforge.auth.refreshSession();
      if (!error && data?.accessToken) {
        document.cookie = `${SESSION_COOKIE}=${data.accessToken}; path=/; max-age=2592000; SameSite=Lax`;
        window.location.href = next;
      } else {
        document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
        window.location.href = '/login';
      }
    }

    attemptRefresh();
  }, [params]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Refreshing your session…</p>
    </div>
  );
}

export default function SessionRefreshPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Refreshing your session…</p>
      </div>
    }>
      <SessionRefreshInner />
    </Suspense>
  );
}
