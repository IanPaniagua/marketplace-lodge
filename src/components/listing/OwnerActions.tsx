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
      toast.success('Marked as sold.');
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const { error } = await deleteListing(listingId);
      if (error) { toast.error(error); return; }
      toast.success('Listing deleted.');
      router.push('/');
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" asChild>
        <Link href={`/listings/${listingId}/edit`}>Edit</Link>
      </Button>

      {status === 'live' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkSold}
          disabled={isPending}
        >
          Mark as sold
        </Button>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">Delete</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              This will permanently remove the listing and all its photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
