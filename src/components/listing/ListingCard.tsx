import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@/types/db';

interface Props {
  listing: Pick<Listing, 'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition'>;
  photoUrl: string | null;
}

export default function ListingCard({ listing, photoUrl }: Props) {
  const categoryLabels: Record<string, string> = {
    furniture: 'Muebles', kitchen: 'Cocina', electronics: 'Electrónica',
    books: 'Libros', clothes: 'Ropa', other: 'Otros',
  };
  const conditionLabels: Record<string, string> = {
    new: 'Nuevo', like_new: 'Como nuevo', used: 'Usado', worn: 'Desgastado',
  };

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <article className="overflow-hidden rounded-xl border border-white/80 bg-card shadow-[0_10px_30px_-22px_hsl(var(--foreground)/0.4)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-lg">
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
              Sin foto
            </div>
          )}
          {listing.is_gift && (
            <span className="brand-gradient absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
              GRATIS
            </span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-1 text-base font-medium">{listing.title}</h3>
          <p className="text-lg font-semibold tabular-nums text-primary">
            {listing.is_gift ? 'Gratis' : `${listing.price_eur} €`}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {categoryLabels[listing.category] ?? listing.category} · {conditionLabels[listing.condition] ?? listing.condition}
          </p>
        </div>
      </article>
    </Link>
  );
}
