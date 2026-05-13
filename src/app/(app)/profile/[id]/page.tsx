import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Star } from 'lucide-react';
import RatingsList from '@/components/rating/RatingsList';
import type { Profile } from '@/types/db';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Profile ${id} — Lodge` };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);

  const { data: currentUserData } = await client.auth.getCurrentUser();
  const currentUserId = currentUserData?.user?.id;

  // Redirect own profile to /profile
  if (currentUserId && id === currentUserId) redirect('/profile');

  const { data: profile } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url,bio,is_approved,deleted_at,created_at')
    .eq('id', id)
    .maybeSingle();

  if (!profile || profile.deleted_at) notFound();

  const p = profile as Pick<
    Profile,
    'id' | 'display_name' | 'avatar_url' | 'bio' | 'is_approved' | 'deleted_at' | 'created_at'
  >;

  // Listings count (live only)
  const { count: listingsCount } = await client.database
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', id)
    .eq('status', 'live');

  // Average rating
  const { data: ratingsData } = await client.database
    .from('ratings')
    .select('stars')
    .eq('ratee_id', id);

  const ratings = (ratingsData ?? []) as Array<{ stars: number }>;
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
      : null;

  const memberSince = formatDistanceToNow(new Date(p.created_at), {
    addSuffix: true,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20 shrink-0">
          {p.avatar_url && (
            <AvatarImage src={p.avatar_url} alt={p.display_name} />
          )}
          <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
            {p.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {p.display_name}
          </h1>
          {p.bio && (
            <p className="text-sm text-muted-foreground">{p.bio}</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-0.5 py-4">
          <span className="text-lg font-semibold tabular-nums">
            {listingsCount ?? 0}
          </span>
          <span className="text-xs text-muted-foreground">Listings</span>
        </div>

        <div className="flex flex-col items-center gap-0.5 py-4">
          {avgRating !== null ? (
            <>
              <span className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground">No ratings yet</span>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5 py-4">
          <span className="text-xs text-muted-foreground">Member</span>
          <span className="text-center text-xs font-medium">{memberSince}</span>
        </div>
      </div>
      {/* Ratings list */}
      {ratings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Ratings</h2>
          <RatingsList rateeId={p.id} rateeName={p.display_name} />
        </section>
      )}
    </div>
  );
}
