import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Globe2, LockKeyhole, LogIn, Users } from 'lucide-react';
import { createPublicClient, createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { Button } from '@/components/ui/button';
import ListingGallery from '@/components/listing/ListingGallery';
import type { Listing, ListingPhoto } from '@/types/db';

interface Props {
  params: Promise<{ id: string; listingId: string }>;
}

type CatalogProfile = {
  id: string;
  display_name: string;
};

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Producto compartido — Círculo Market',
  robots: { index: false, follow: false },
};

export default async function SharedListingPage({ params }: Props) {
  const { id: ownerId, listingId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  let client = createPublicClient();
  let isSignedIn = false;
  if (token) {
    const authenticatedClient = createServerClient(token);
    const { data } = await authenticatedClient.auth.getCurrentUser();
    if (data?.user) {
      client = authenticatedClient;
      isSignedIn = true;
    }
  }

  const [{ data: profileData }, { data: listingRaw }] = await Promise.all([
    client.database.rpc('get_catalog_profile', { p_profile_id: ownerId }),
    client.database
      .from('listings')
      .select('id,owner_id,title,description,price_eur,is_gift,category,condition,visibility,status,created_at')
      .eq('id', listingId)
      .eq('owner_id', ownerId)
      .eq('status', 'live')
      .maybeSingle(),
  ]);

  const profile = ((profileData ?? []) as CatalogProfile[])[0];
  const listing = listingRaw as Pick<
    Listing,
    'id' | 'owner_id' | 'title' | 'description' | 'price_eur' | 'is_gift' | 'category' | 'condition' | 'visibility' | 'status' | 'created_at'
  > | null;
  if (!profile || !listing) notFound();

  const { data: photosRaw } = await client.database
    .from('listing_photos')
    .select('id,storage_path,sort_order')
    .eq('listing_id', listingId)
    .order('sort_order')
    .limit(5);
  const photos = (photosRaw ?? []) as Array<Pick<ListingPhoto, 'id' | 'storage_path' | 'sort_order'>>;
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const galleryPhotos = photos.map((photo) => ({
    url: `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(photo.storage_path)}`,
    alt: listing.title,
  }));

  const categoryLabels: Record<string, string> = {
    furniture: 'Muebles', kitchen: 'Cocina', electronics: 'Electrónica',
    books: 'Libros', clothes: 'Ropa', other: 'Otros',
  };
  const conditionLabels: Record<string, string> = {
    new: 'Nuevo', like_new: 'Como nuevo', used: 'Usado', worn: 'Desgastado',
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 md:px-6">
          <Link href={`/catalog/${ownerId}`} className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" />
            Catálogo de {profile.display_name}
          </Link>
          {!isSignedIn && (
            <Button size="sm" asChild>
              <Link href="/login"><LogIn className="h-4 w-4" /> Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-6">
        <ListingGallery photos={galleryPhotos} />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {listing.visibility === 'friends' ? <Users className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
              {listing.visibility === 'friends' ? 'Solo amigos' : 'Compartido con todos'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
          <p className="text-2xl font-bold tabular-nums text-primary">
            {listing.is_gift ? 'Gratis' : `${listing.price_eur} €`}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {categoryLabels[listing.category] ?? listing.category} · {conditionLabels[listing.condition] ?? listing.condition}
          </p>
        </div>

        {listing.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>
        )}

        {!isSignedIn && (
          <aside className="flex gap-3 rounded-lg border bg-muted p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Más productos pueden estar reservados para amigos</p>
              <p className="text-sm text-muted-foreground">Inicia sesión para abrir el catálogo con tu relación de amistad.</p>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
