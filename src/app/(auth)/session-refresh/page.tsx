'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function SessionRefreshInner() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get('next') ?? '/';
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (cancelled) return;
        if (res.ok) {
          window.location.href = next;
        } else {
          window.location.href = '/login';
        }
      } catch {
        if (!cancelled) window.location.href = '/login';
      }
    })();

    return () => {
      cancelled = true;
    };
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
