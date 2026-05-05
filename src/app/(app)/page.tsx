import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
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

  const category = searchParams.category as string | undefined;
  const freeOnly = searchParams.free === '1';

  let query = client.database
    .from('listings')
    .select('id,title,price_eur,is_gift,category,condition')
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (freeOnly) {
    query = query.eq('is_gift', true);
  }

  const { data: listingsRaw } = await query;
  const listings = (listingsRaw ?? []) as FeedListing[];

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20">
        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">
          {freeOnly || (category && category !== 'all')
            ? 'Try removing filters.'
            : 'Be the first to post a listing.'}
        </p>
      </div>
    );
  }

  // Fetch first photo for each listing
  const listingIds = listings.map((l) => l.id);
  const { data: photosRaw } = await client.database
    .from('listing_photos')
    .select('listing_id,storage_path,sort_order')
    .in('listing_id', listingIds)
    .eq('sort_order', 0);

  const photoMap = new Map<string, Pick<ListingPhoto, 'storage_path'>>();
  ((photosRaw ?? []) as FirstPhoto[]).forEach((p) => {
    photoMap.set(p.listing_id, { storage_path: p.storage_path });
  });

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {listings.map((listing) => {
        const photo = photoMap.get(listing.id) ?? null;
        const photoUrl = photo
          ? `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(photo.storage_path)}`
          : null;
        return (
          <ListingCard
            key={listing.id}
            listing={listing}
            photoUrl={photoUrl}
          />
        );
      })}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
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

export default async function FeedPage({ searchParams }: Props) {
  const sp = await searchParams;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Browse</h1>

      <Suspense fallback={null}>
        <FeedFilters />
      </Suspense>

      <Suspense fallback={<FeedSkeleton />}>
        <FeedGrid searchParams={sp} />
      </Suspense>
    </div>
  );
}
