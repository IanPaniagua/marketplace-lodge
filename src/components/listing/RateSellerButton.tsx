'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RatingDialog from '@/components/rating/RatingDialog';
import type { Rating } from '@/types/db';

interface Props {
  rateeId: string;
  rateeName: string;
  listingId: string;
  existingRating: Rating | null;
}

export default function RateSellerButton({
  rateeId,
  rateeName,
  listingId,
  existingRating,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <Star className="h-4 w-4" />
        {existingRating ? 'Edit rating' : 'Rate seller'}
      </Button>
      <RatingDialog
        open={open}
        onOpenChange={setOpen}
        rateeId={rateeId}
        rateeName={rateeName}
        listingId={listingId}
        existingRating={existingRating}
      />
    </>
  );
}
