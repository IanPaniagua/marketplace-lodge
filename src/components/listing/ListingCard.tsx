import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@/types/db';

interface Props {
  listing: Pick<Listing, 'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition'>;
  photoUrl: string | null;
}

export default function ListingCard({ listing, photoUrl }: Props) {
  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <article className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full bg-muted">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No photo
            </div>
          )}
          {listing.is_gift && (
            <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              FREE
            </span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-1 text-base font-medium">{listing.title}</h3>
          <p className="text-lg font-semibold tabular-nums text-primary">
            {listing.is_gift ? 'Free' : `€${listing.price_eur}`}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {listing.category} · {listing.condition.replace('_', ' ')}
          </p>
        </div>
      </article>
    </Link>
  );
}
