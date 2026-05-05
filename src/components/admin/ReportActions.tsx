'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  reportId: string;
}

export default function ReportActions({ reportId }: Props) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  async function handleAction(action: 'resolve' | 'dismiss') {
    const setter = action === 'resolve' ? setResolving : setDismissing;
    setter(true);

    const res = await fetch(`/api/admin/reports/${reportId}/${action}`, {
      method: 'POST',
    });

    setter(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      toast.error(typeof json.error === 'string' ? json.error : `Failed to ${action} report`);
      return;
    }

    toast.success(action === 'resolve' ? 'Report resolved.' : 'Report dismissed.');
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => handleAction('resolve')}
        disabled={resolving || dismissing}
      >
        {resolving ? 'Resolving…' : 'Resolve'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('dismiss')}
        disabled={resolving || dismissing}
      >
        {dismissing ? 'Dismissing…' : 'Dismiss'}
      </Button>
    </div>
  );
}
