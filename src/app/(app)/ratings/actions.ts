'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { RatingSchema } from '@/lib/schemas';
import type { Rating } from '@/types/db';

async function getClientAndUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return { client: null, userId: null };
  const client = createServerClient(token);
  const { data } = await client.auth.getCurrentUser();
  const userId = data?.user?.id ?? null;
  return { client, userId };
}

export async function submitRating(
  rateeId: string,
  listingId: string,
  stars: number,
  comment?: string,
): Promise<{ data: Rating | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const parsed = RatingSchema.safeParse({ stars, comment });
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid rating' };
  }

  // Check if a rating already exists for this (rater, ratee, listing)
  const { data: existing } = await client.database
    .from('ratings')
    .select('id,edit_locked_at')
    .eq('rater_id', userId)
    .eq('ratee_id', rateeId)
    .eq('listing_id', listingId)
    .maybeSingle();

  const existingRow = existing as unknown as Pick<Rating, 'id' | 'edit_locked_at'> | null;

  if (existingRow) {
    // Update — RLS rejects if edit_locked_at has passed
    const { data: updated, error } = await client.database
      .from('ratings')
      .update({ stars: parsed.data.stars, comment: parsed.data.comment ?? null })
      .eq('id', existingRow.id)
      .eq('rater_id', userId)
      .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
      .single();

    if (error) {
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
      if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('rls')) {
        return { data: null, error: 'Ratings are locked after 7 days.' };
      }
      return { data: null, error: 'Failed to update rating.' };
    }

    return { data: updated as unknown as Rating, error: null };
  }

  // Insert — RLS rejects if no conversation with messages for this listing
  const { data: inserted, error } = await client.database
    .from('ratings')
    .insert({
      rater_id: userId,
      ratee_id: rateeId,
      listing_id: listingId,
      stars: parsed.data.stars,
      comment: parsed.data.comment ?? null,
    })
    .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
    .single();

  if (error) {
    return { data: null, error: 'Could not submit rating. Make sure you have chatted with this user about this listing.' };
  }

  return { data: inserted as unknown as Rating, error: null };
}

export async function getMyRatingForListing(
  rateeId: string,
  listingId: string,
): Promise<{ data: Rating | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const { data, error } = await client.database
    .from('ratings')
    .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
    .eq('rater_id', userId)
    .eq('ratee_id', rateeId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) return { data: null, error: 'Failed to fetch rating.' };
  return { data: data as unknown as Rating | null, error: null };
}
