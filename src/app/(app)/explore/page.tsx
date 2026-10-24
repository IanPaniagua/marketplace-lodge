import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { Skeleton } from '@/components/ui/skeleton';
import FeedFilters from '@/components/shared/FeedFilters';
import ListingCard from '@/components/listing/ListingCard';
import type { Listing, ListingPhoto } from '@/types/db';

interface SearchParams {
  category?: string;
  free?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

type FeedListing = Pick<Listing, 'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition'>;
type FirstPhoto = Pick<ListingPhoto, 'listing_id' | 'storage_path'>;

async function FeedGrid({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const category = searchParams.category;
  const freeOnly = searchParams.free === '1';

  let query = client.database
    .from('listings')
    .select('id,title,price_eur,is_gift,category,condition')
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(60);

  if (category && category !== 'all') query = query.eq('category', category);
  if (freeOnly) query = query.eq('is_gift', true);

  const { data: listingsRaw } = await query;
  const listings = (listingsRaw ?? []) as FeedListing[];

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium">Aún no hay nada por aquí</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {freeOnly || (category && category !== 'all')
            ? 'Prueba a quitar algún filtro.'
            : 'Aquí aparecerán los anuncios públicos y los anuncios privados de tus amigos.'}
        </p>
      </div>
    );
  }

  const listingIds = listings.map((listing) => listing.id);
  const { data: photosRaw } = await client.database
    .from('listing_photos')
    .select('listing_id,storage_path,sort_order')
    .in('listing_id', listingIds)
    .eq('sort_order', 0)
    .limit(60);

  const photoMap = new Map<string, Pick<ListingPhoto, 'storage_path'>>();
  ((photosRaw ?? []) as FirstPhoto[]).forEach((photo) => {
    photoMap.set(photo.listing_id, { storage_path: photo.storage_path });
  });

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {listings.map((listing) => {
        const photo = photoMap.get(listing.id);
        const photoUrl = photo
          ? `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(photo.storage_path)}`
          : null;
        return <ListingCard key={listing.id} listing={listing} photoUrl={photoUrl} />;
      })}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const metadata = { title: 'Explorar — Círculo Market' };

export default async function ExplorePage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Explorar</h1>
        <p className="text-sm text-muted-foreground">
          Anuncios para todos y publicaciones privadas de tus amigos.
        </p>
      </div>
      <Suspense fallback={null}>
        <FeedFilters />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedGrid searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
