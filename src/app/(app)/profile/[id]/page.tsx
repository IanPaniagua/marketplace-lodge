import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LockKeyhole, ShoppingBag, Star, Users } from 'lucide-react';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FriendshipActions, { type FriendshipViewState } from '@/components/friends/FriendshipActions';
import ListingCard from '@/components/listing/ListingCard';
import RatingsList from '@/components/rating/RatingsList';
import type { Friendship, Listing, ListingPhoto, Profile } from '@/types/db';

interface Props {
  params: Promise<{ id: string }>;
}

type CatalogListing = Pick<
  Listing,
  'id' | 'title' | 'price_eur' | 'is_gift' | 'category' | 'condition' | 'visibility'
>;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Catálogo ${id} — Lodge Market` };
}

export default async function FriendCatalogPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: currentUserData } = await client.auth.getCurrentUser();
  const currentUserId = currentUserData?.user?.id;
  if (!currentUserId) redirect('/login');
  if (id === currentUserId) redirect('/profile');

  const { data: profileRaw } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url,bio,is_approved,deleted_at,created_at')
    .eq('id', id)
    .maybeSingle();

  if (!profileRaw || profileRaw.deleted_at) notFound();
  const profile = profileRaw as Pick<
    Profile,
    'id' | 'display_name' | 'avatar_url' | 'bio' | 'is_approved' | 'deleted_at' | 'created_at'
  >;

  const { data: friendshipRaw } = await client.database
    .from('friendships')
    .select('id,requester_id,addressee_id,status,created_at,responded_at')
    .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUserId})`)
    .maybeSingle();
  const friendship = friendshipRaw as Friendship | null;

  let friendshipState: FriendshipViewState = 'none';
  if (friendship?.status === 'accepted') friendshipState = 'friends';
  else if (friendship?.status === 'pending') {
    friendshipState = friendship.requester_id === currentUserId ? 'sent' : 'received';
  }
  const isFriend = friendshipState === 'friends';

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

  const { data: ratingsData } = await client.database
    .from('ratings')
    .select('stars')
    .eq('ratee_id', id)
    .limit(100);
  const ratings = (ratingsData ?? []) as Array<{ stars: number }>;
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length
    : null;

  const memberSince = formatDistanceToNow(new Date(profile.created_at), {
    addSuffix: true,
    locale: es,
  });
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
              <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
                {isFriend && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    <Users className="h-3 w-3" /> Amigos
                  </span>
                )}
              </div>
              {profile.bio && <p className="max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
              <p className="text-xs text-muted-foreground">Miembro {memberSince}</p>
            </div>
          </div>
          <FriendshipActions
            targetUserId={profile.id}
            friendshipId={friendship?.id}
            state={friendshipState}
          />
        </div>

        <div className="grid grid-cols-2 divide-x rounded-lg border bg-card">
          <div className="flex flex-col items-center gap-0.5 py-4">
            <span className="text-lg font-semibold tabular-nums">{listings.length}</span>
            <span className="text-xs text-muted-foreground">Productos visibles</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-4">
            {averageRating !== null ? (
              <>
                <span className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">{ratings.length} valoraciones</span>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-muted-foreground">—</span>
                <span className="text-xs text-muted-foreground">Sin valoraciones</span>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Catálogo de {profile.display_name}</h2>
          <p className="text-sm text-muted-foreground">
            {isFriend
              ? 'Ves sus productos públicos y los reservados para amigos.'
              : 'Ves sus productos públicos. Al ser amigos también aparecerán los privados.'}
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-6 py-14 text-center">
            {isFriend ? <ShoppingBag className="h-8 w-8 text-muted-foreground" /> : <LockKeyhole className="h-8 w-8 text-muted-foreground" />}
            <p className="text-base font-medium">No hay productos visibles</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isFriend
                ? `${profile.display_name} todavía no ha publicado nada.`
                : 'Puede que su catálogo esté reservado para sus amigos.'}
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
                  showVisibility={isFriend}
                />
              );
            })}
          </div>
        )}
      </section>

      {ratings.length > 0 && (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-xl font-semibold tracking-tight">Valoraciones</h2>
          <RatingsList rateeId={profile.id} rateeName={profile.display_name} />
        </section>
      )}
    </div>
  );
}
