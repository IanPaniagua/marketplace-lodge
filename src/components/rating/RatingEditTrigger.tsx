'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RatingDialog from './RatingDialog';
import type { Rating } from '@/types/db';

interface Props {
  existingRating: Rating;
  rateeName: string;
}

export default function RatingEditTrigger({ existingRating, rateeName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Editar valoración"
        className="h-8 w-8 p-0"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <RatingDialog
        open={open}
        onOpenChange={setOpen}
        rateeId={existingRating.ratee_id}
        rateeName={rateeName}
        listingId={existingRating.listing_id}
        existingRating={existingRating}
      />
    </>
  );
}
