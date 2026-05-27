'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
  listingId: string;
}

export default function AdminListingActions({ listingId }: Props) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/${listingId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) { toast.error('Failed to approve.'); return; }
      toast.success('Listing approved.');
      router.refresh();
      handleApproveSuccess();
    });
  }

  function handleReject() {
    if (!reason.trim()) { toast.error('Enter a rejection reason.'); return; }
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/${listingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error('[reject] api error', body);
        toast.error('Failed to reject.');
        return;
      }
      toast.success('Listing rejected.');
      setRejectOpen(false);
      setReason('');
      router.refresh();
      window.dispatchEvent(new CustomEvent('admin:pending-changed'));
    });
  }

  function handleApproveSuccess() {
    window.dispatchEvent(new CustomEvent('admin:pending-changed'));
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleApprove} disabled={isPending}>
        Approve
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isPending}>
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this listing?</DialogTitle>
            <DialogDescription>
              The seller will see your reason. Be clear and constructive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Photo is too dark, please re-upload"
              className="h-11 md:h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !reason.trim()}
            >
              {isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
