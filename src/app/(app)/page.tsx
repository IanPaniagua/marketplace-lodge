import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, Search, ShoppingBag, UserRoundPlus, Users } from 'lucide-react';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { getServerProfile } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FriendshipActions, { type FriendshipViewState } from '@/components/friends/FriendshipActions';
import type { Friendship, Listing, ListingPhoto, Profile } from '@/types/db';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

type FriendProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'bio'>;
type FriendListing = Pick<Listing, 'id' | 'owner_id' | 'title'>;

function relationshipState(
  friendship: Friendship | undefined,
  currentUserId: string,
): FriendshipViewState {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  return friendship.requester_id === currentUserId ? 'sent' : 'received';
}

export const metadata = { title: 'Amigos — Lodge Market' };

export default async function FriendsHomePage({ searchParams }: Props) {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const client = createServerClient(token);

  const { data: friendshipsRaw } = await client.database
    .from('friendships')
    .select('id,requester_id,addressee_id,status,created_at,responded_at')
    .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
    .order('created_at', { ascending: false })
    .limit(200);

  const friendships = (friendshipsRaw ?? []) as Friendship[];
  const otherUserIds = Array.from(new Set(friendships.map((friendship) =>
    friendship.requester_id === profile.id
      ? friendship.addressee_id
      : friendship.requester_id,
  )));

  let people: FriendProfile[] = [];
  if (otherUserIds.length > 0) {
    const { data } = await client.database
      .from('profiles')
      .select('id,display_name,avatar_url,bio')
      .in('id', otherUserIds)
      .limit(200);
    people = (data ?? []) as FriendProfile[];
  }
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const accepted = friendships.filter((friendship) => friendship.status === 'accepted');
  const received = friendships.filter((friendship) =>
    friendship.status === 'pending' && friendship.addressee_id === profile.id,
  );
  const acceptedFriendIds = accepted.map((friendship) =>
    friendship.requester_id === profile.id ? friendship.addressee_id : friendship.requester_id,
  );

  let friendListings: FriendListing[] = [];
  if (acceptedFriendIds.length > 0) {
    const { data } = await client.database
      .from('listings')
      .select('id,owner_id,title')
      .in('owner_id', acceptedFriendIds)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(120);
    friendListings = (data ?? []) as FriendListing[];
  }

  const listingCounts = new Map<string, number>();
  const firstListingByOwner = new Map<string, FriendListing>();
  friendListings.forEach((listing) => {
    listingCounts.set(listing.owner_id, (listingCounts.get(listing.owner_id) ?? 0) + 1);
    if (!firstListingByOwner.has(listing.owner_id)) firstListingByOwner.set(listing.owner_id, listing);
  });

  const firstListingIds = Array.from(firstListingByOwner.values()).map((listing) => listing.id);
  const coverByListing = new Map<string, string>();
  if (firstListingIds.length > 0) {
    const { data: photosRaw } = await client.database
      .from('listing_photos')
      .select('listing_id,storage_path,sort_order')
      .in('listing_id', firstListingIds)
      .eq('sort_order', 0)
      .limit(firstListingIds.length);
    ((photosRaw ?? []) as Array<Pick<ListingPhoto, 'listing_id' | 'storage_path'>>).forEach((photo) => {
      coverByListing.set(photo.listing_id, photo.storage_path);
    });
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  let searchResults: FriendProfile[] = [];
  if (query.length >= 2) {
    const { data } = await client.database
      .from('profiles')
      .select('id,display_name,avatar_url,bio')
      .ilike('display_name', `%${query}%`)
      .neq('id', profile.id)
      .eq('is_approved', true)
      .is('deleted_at', null)
      .limit(12);
    searchResults = (data ?? []) as FriendProfile[];
  }

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Hola, {profile.display_name}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tus amigos</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Entra en el perfil de una persona para ver únicamente su catálogo.
        </p>
      </header>

      {received.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Solicitudes</h2>
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {received.length}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {received.map((friendship) => {
              const person = peopleById.get(friendship.requester_id);
              if (!person) return null;
              return (
                <article key={friendship.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/profile/${person.id}`} className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-11 w-11">
                      {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.display_name} />}
                      <AvatarFallback>{person.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{person.display_name}</p>
                      <p className="text-xs text-muted-foreground">Quiere conectar contigo</p>
                    </div>
                  </Link>
                  <FriendshipActions compact targetUserId={person.id} friendshipId={friendship.id} state="received" />
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Catálogos de amigos</h2>
            <p className="text-sm text-muted-foreground">Una persona cada vez, sin mezclar productos.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/explore">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {accepted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-6 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-base font-medium">Aún no tienes amigos</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Busca a alguien por su nombre y envíale una solicitud.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accepted.map((friendship) => {
              const friendId = friendship.requester_id === profile.id ? friendship.addressee_id : friendship.requester_id;
              const person = peopleById.get(friendId);
              if (!person) return null;
              const firstListing = firstListingByOwner.get(friendId);
              const coverPath = firstListing ? coverByListing.get(firstListing.id) : undefined;
              const coverUrl = coverPath
                ? `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(coverPath)}`
                : null;

              return (
                <Link key={friendship.id} href={`/profile/${friendId}`} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
                  <div className="relative aspect-[16/9] bg-muted">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={firstListing?.title ?? `Catálogo de ${person.display_name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-11 w-11">
                      {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.display_name} />}
                      <AvatarFallback>{person.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-medium">{person.display_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {listingCounts.get(friendId) ?? 0} {(listingCounts.get(friendId) ?? 0) === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Encontrar personas</h2>
          <p className="text-sm text-muted-foreground">Busca por el nombre que utilizan en Lodge Market.</p>
        </div>
        <form className="flex gap-2" action="/">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={query} minLength={2} placeholder="Buscar por nombre" className="h-11 pl-9 md:h-10" />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>

        {query.length > 0 && query.length < 2 && (
          <p className="text-sm text-muted-foreground">Escribe al menos dos letras.</p>
        )}
        {query.length >= 2 && searchResults.length === 0 && (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No encontramos a nadie con ese nombre.</p>
        )}
        {searchResults.length > 0 && (
          <div className="divide-y rounded-lg border bg-card">
            {searchResults.map((person) => {
              const friendship = friendships.find((item) => item.requester_id === person.id || item.addressee_id === person.id);
              const state = relationshipState(friendship, profile.id);
              return (
                <div key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/profile/${person.id}`} className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-11 w-11">
                      {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.display_name} />}
                      <AvatarFallback>{person.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{person.display_name}</p>
                      {person.bio && <p className="line-clamp-1 text-xs text-muted-foreground">{person.bio}</p>}
                    </div>
                  </Link>
                  <FriendshipActions compact targetUserId={person.id} friendshipId={friendship?.id} state={state} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
