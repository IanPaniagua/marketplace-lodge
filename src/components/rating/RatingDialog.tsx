'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitRating } from '@/app/(app)/ratings/actions';
import StarPicker from './StarPicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Rating } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateeId: string;
  rateeName: string;
  listingId: string;
  existingRating?: Rating | null;
}

export default function RatingDialog({
  open,
  onOpenChange,
  rateeId,
  rateeName,
  listingId,
  existingRating,
}: Props) {
  const router = useRouter();
  const [stars, setStars] = useState(existingRating?.stars ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? '');
  const [pending, startTransition] = useTransition();

  const isEdit = !!existingRating;

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset to existing values on close
      setStars(existingRating?.stars ?? 0);
      setComment(existingRating?.comment ?? '');
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (stars === 0) {
      toast.error('Pick a star rating before submitting.');
      return;
    }
    startTransition(async () => {
      const { error } = await submitRating(
        rateeId,
        listingId,
        stars,
        comment.trim() || undefined,
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(isEdit ? 'Rating updated.' : 'Rating submitted.');
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit rating' : `Rate ${rateeName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Stars</Label>
            <StarPicker value={stars} onChange={setStars} disabled={pending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating-comment" className="text-sm font-medium">
              Comment{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 280))}
              placeholder="Share your experience…"
              rows={3}
              disabled={pending}
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">
              {280 - comment.length} remaining
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || stars === 0}>
            {pending ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
