import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LockKeyhole, LogIn, ShoppingBag, Users } from 'lucide-react';
import { createPublicClient, createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ListingCard from '@/components/listing/ListingCard';
import type { Listing, ListingPhoto } from '@/types/db';

interface Props {
  params: Promise<{ id: string }>;
}

type CatalogProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

type CatalogListing = Pick<
  Listing,
  'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition' | 'visibility'
>;

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Catálogo compartido — Lodge Market',
  robots: { index: false, follow: false },
};

export default async function SharedCatalogPage({ params }: Props) {
  const { id } = await params;
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

  const { data: profileData } = await client.database.rpc('get_catalog_profile', {
    p_profile_id: id,
  });
  const profileRows = (profileData ?? []) as CatalogProfile[];
  const profile = profileRows[0];
  if (!profile) notFound();

  const { data: listingsRaw } = await client.database
    .from('listings')
    .select('id,title,price_eur,is_gift,category,condition,visibility')
    .eq('owner_id', id)
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(60);
  const listings = (listingsRaw ?? []) as CatalogListing[];

  const photoMap = new Map<string, string>();
  if (listings.length > 0) {
    const { data: photosRaw } = await client.database
      .from('listing_photos')
      .select('listing_id,storage_path,sort_order')
      .in('listing_id', listings.map((listing) => listing.id))
      .eq('sort_order', 0)
      .limit(listings.length);
    ((photosRaw ?? []) as Array<Pick<ListingPhoto, 'listing_id' | 'storage_path'>>).forEach((photo) => {
      photoMap.set(photo.listing_id, photo.storage_path);
    });
  }

  const containsFriendsOnly = listings.some((listing) => listing.visibility === 'friends');
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 md:px-6">
          <Link href={isSignedIn ? '/' : '/login'} className="text-lg font-semibold tracking-tight">
            Lodge<span className="text-primary"> Market</span>
          </Link>
          <Button variant={isSignedIn ? 'outline' : 'default'} size="sm" asChild>
            <Link href={isSignedIn ? '/' : '/login'}>
              {isSignedIn ? <Users className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isSignedIn ? 'Mis amigos' : 'Iniciar sesión'}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 md:px-6">
        <section className="flex items-start gap-4">
          <Avatar className="h-20 w-20 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
            <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Catálogo personal</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{profile.display_name}</h1>
            {profile.bio && <p className="max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Productos</h2>
              <p className="text-sm text-muted-foreground">
                {isSignedIn
                  ? 'Los productos visibles según vuestra relación.'
                  : 'Productos que ha decidido compartir con cualquiera que tenga este enlace.'}
              </p>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">{listings.length}</span>
          </div>

          {listings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-6 py-14 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <p className="text-base font-medium">No hay productos visibles</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isSignedIn
                  ? 'Este catálogo está vacío o sus productos están reservados para amigos.'
                  : 'Inicia sesión si eres su amigo para comprobar si tiene un catálogo privado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {listings.map((listing) => {
                const storagePath = photoMap.get(listing.id);
                const photoUrl = storagePath
                  ? `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(storagePath)}`
                  : null;
                return (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    photoUrl={photoUrl}
                    showVisibility={isSignedIn && containsFriendsOnly}
                    href={`/catalog/${profile.id}/${listing.id}`}
                  />
                );
              })}
            </div>
          )}
        </section>

        {!isSignedIn && (
          <aside className="flex flex-col gap-3 rounded-lg border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">¿Sois amigos en Lodge Market?</p>
                <p className="text-sm text-muted-foreground">Inicia sesión para ver también los productos compartidos solo con amigos.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </aside>
        )}
      </main>
    </div>
  );
}
