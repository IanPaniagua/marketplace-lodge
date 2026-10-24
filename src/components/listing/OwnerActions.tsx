'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { markAsSold, deleteListing } from '@/app/(app)/listings/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ListingStatus } from '@/types/db';

interface Props {
  listingId: string;
  status: ListingStatus;
}

export default function OwnerActions({ listingId, status }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMarkSold() {
    startTransition(async () => {
      const { error } = await markAsSold(listingId);
      if (error) { toast.error(error); return; }
      toast.success('Marcado como vendido.');
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const { error } = await deleteListing(listingId);
      if (error) { toast.error(error); return; }
      toast.success('Anuncio eliminado.');
      router.push('/friends');
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" asChild>
        <Link href={`/listings/${listingId}/edit`}>Editar</Link>
      </Button>

      {status === 'live' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkSold}
          disabled={isPending}
        >
          Marcar como vendido
        </Button>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">Eliminar</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este anuncio?</DialogTitle>
            <DialogDescription>
              Se eliminarán permanentemente el anuncio y todas sus fotos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
