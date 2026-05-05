'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ApproveButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' });
    setLoading(false);

    if (!res.ok) {
      toast.error('Failed to approve user.');
      return;
    }

    toast.success('User approved.');
    router.refresh();
  }

  return (
    <Button size="sm" onClick={approve} disabled={loading}>
      {loading ? 'Approving…' : 'Approve'}
    </Button>
  );
}
