'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  photos: Array<{ url: string; alt: string }>;
}

export default function ListingGallery({ photos }: Props) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="aspect-square w-full rounded-lg bg-muted" />
    );
  }

  return (
    <div className="space-y-2">
      {/* Main photo */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={photos[active].url}
          alt={photos[active].alt}
          fill
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover"
          priority={active === 0}
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                i === active ? 'border-primary' : 'border-transparent',
              )}
            >
              <Image src={photo.url} alt={`Thumb ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
