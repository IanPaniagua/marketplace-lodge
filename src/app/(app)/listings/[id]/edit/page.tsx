import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import ListingForm from '@/components/listing/ListingForm';
import type { Listing, ListingPhoto, ListingCategory, ListingCondition } from '@/types/db';
import type { ExistingPhoto } from '@/components/listing/PhotoUpload';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Edit listing — Lodge' };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user) redirect('/login');

  const { data: listingRaw } = await client.database
    .from('listings')
    .select('id,owner_id,title,description,category,condition,is_gift,price_eur,status')
    .eq('id', id)
    .single();

  if (!listingRaw) notFound();
  const listing = listingRaw as Pick<
    Listing,
    'id' | 'owner_id' | 'title' | 'description' | 'category' | 'condition' | 'is_gift' | 'price_eur' | 'status'
  >;

  if (listing.owner_id !== userData.user.id) redirect(`/listings/${id}`);
  if (listing.status === 'sold' || listing.status === 'archived') notFound();

  const { data: photosRaw } = await client.database
    .from('listing_photos')
    .select('id,storage_path,sort_order')
    .eq('listing_id', id)
    .order('sort_order');

  const photos = (photosRaw ?? []) as Pick<ListingPhoto, 'id' | 'storage_path' | 'sort_order'>[];

  const photoBaseUrl = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/storage/listing-photos`;

  const existingPhotos: ExistingPhoto[] = photos.map((p) => ({
    type: 'existing',
    id: p.id,
    path: p.storage_path,
    url: `${photoBaseUrl}/${p.storage_path}`,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Edit listing
      </h1>
      <ListingForm
        mode="edit"
        listingId={id}
        defaultValues={{
          title: listing.title,
          description: listing.description,
          category: listing.category as ListingCategory,
          condition: listing.condition as ListingCondition,
          is_gift: listing.is_gift,
          price_eur: listing.price_eur,
        }}
        existingPhotos={existingPhotos}
      />
    </div>
  );
}
