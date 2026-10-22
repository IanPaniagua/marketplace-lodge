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
      if (!res.ok) { toast.error('No se pudo aprobar.'); return; }
      toast.success('Anuncio aprobado.');
      router.refresh();
      handleApproveSuccess();
    });
  }

  function handleReject() {
    if (!reason.trim()) { toast.error('Indica el motivo del rechazo.'); return; }
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/${listingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error('[reject] api error', body);
        toast.error('No se pudo rechazar.');
        return;
      }
      toast.success('Anuncio rechazado.');
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
        Aprobar
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isPending}>
            Rechazar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Rechazar este anuncio?</DialogTitle>
            <DialogDescription>
              La persona que vende verá el motivo. Sé claro y constructivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="p. ej., la foto está demasiado oscura"
              className="h-11 md:h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !reason.trim()}
            >
              {isPending ? 'Rechazando…' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
