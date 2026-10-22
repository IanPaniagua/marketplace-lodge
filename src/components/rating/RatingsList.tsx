import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RatingEditTrigger from './RatingEditTrigger';
import type { Rating, Profile } from '@/types/db';

interface Props {
  rateeId: string;
  rateeName: string;
  currentUserId?: string;
}

type RatingRow = Pick<Rating, 'id' | 'rater_id' | 'ratee_id' | 'listing_id' | 'stars' | 'comment' | 'created_at' | 'edit_locked_at'>;
type RaterProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;

export default async function RatingsList({ rateeId, rateeName, currentUserId }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const client = createServerClient(token);

  const { data: ratingsRaw } = await client.database
    .from('ratings')
    .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
    .eq('ratee_id', rateeId)
    .order('created_at', { ascending: false })
    .limit(10);

  const ratings = (ratingsRaw ?? []) as unknown as RatingRow[];

  if (ratings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aún no hay valoraciones.</p>
    );
  }

  const raterIds = [...new Set(ratings.map((r) => r.rater_id))];

  const { data: profilesRaw } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url')
    .in('id', raterIds);

  const profiles = (profilesRaw ?? []) as unknown as RaterProfile[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const now = Date.now();

  return (
    <ul className="space-y-3">
      {ratings.map((r) => {
        const rater = profileMap.get(r.rater_id);
        const isEditable =
          currentUserId === r.rater_id &&
          now < new Date(r.edit_locked_at).getTime();

        return (
          <li
            key={r.id}
            className="rounded-lg border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  {rater?.avatar_url && (
                    <AvatarImage src={rater.avatar_url} alt={rater.display_name} />
                  )}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {(rater?.display_name ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {rater?.display_name ?? 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < r.stars
                          ? 'fill-primary text-primary'
                          : 'fill-none text-muted-foreground'
                      }`}
                    />
                  ))}
                </span>
                {isEditable && (
                  <RatingEditTrigger existingRating={r as Rating} rateeName={rateeName} />
                )}
              </div>
            </div>

            {r.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {r.comment}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
