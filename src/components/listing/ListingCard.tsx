import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@/types/db';

interface Props {
  listing: Pick<Listing, 'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition'>
    & Partial<Pick<Listing, 'visibility'>>;
  photoUrl: string | null;
  showVisibility?: boolean;
  href?: string;
}

export default function ListingCard({ listing, photoUrl, showVisibility = false, href }: Props) {
  const categoryLabels: Record<string, string> = {
    furniture: 'Muebles', kitchen: 'Cocina', electronics: 'Electrónica',
    books: 'Libros', clothes: 'Ropa', other: 'Otros',
  };
  const conditionLabels: Record<string, string> = {
    new: 'Nuevo', like_new: 'Como nuevo', used: 'Usado', worn: 'Desgastado',
  };

  return (
    <Link href={href ?? `/listings/${listing.id}`} className="group block">
      <article className="overflow-hidden rounded-lg border bg-card transition-shadow duration-150 group-hover:shadow-md">
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
            <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              GRATIS
            </span>
          )}
          {showVisibility && listing.visibility && (
            <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
              {listing.visibility === 'friends' ? 'Solo amigos' : 'Todos'}
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
