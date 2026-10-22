'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE } from '@/lib/insforge';
import type { ListingFieldsInput } from '@/lib/schemas';
import type { ListingStatus } from '@/types/db';

async function getAuthClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Not authenticated');
  return createServerClient(token);
}

async function getCurrentUser(client: ReturnType<typeof createServerClient>) {
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) throw new Error('Not authenticated');
  return data.user;
}

export async function createListingRecord(
  fields: ListingFieldsInput,
): Promise<{ data: { listingId: string } | null; error: string | null }> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    if (!checkRateLimit(user.id, 'listing')) {
      return { data: null, error: 'Too many listings today. Try again tomorrow.' };
    }

    const { data, error } = await client.database
      .from('listings')
      .insert({
        owner_id: user.id,
        title: fields.title,
        description: fields.description?.trim() || null,
        category: fields.category,
        condition: fields.condition,
        is_gift: fields.is_gift,
        price_eur: fields.price_eur,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[createListing] DB error:', error);
      return { data: null, error: 'No se pudo crear el anuncio.' };
    }
    return { data: { listingId: (data as { id: string }).id }, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function saveListingPhotos(
  listingId: string,
  storagePaths: string[],
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();

    const rows = storagePaths.map((path, i) => ({
      listing_id: listingId,
      storage_path: path,
      sort_order: i,
    }));

    const { error } = await client.database.from('listing_photos').insert(rows);
    if (error) return { data: null, error: 'No se pudieron guardar las fotos.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function updateListingRecord(
  listingId: string,
  fields: ListingFieldsInput,
  photosChanged: boolean,
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    // Fetch current listing to compare
    const { data: current } = await client.database
      .from('listings')
      .select('owner_id, status, title, price_eur, is_gift')
      .eq('id', listingId)
      .single();

    if (!current) return { data: null, error: 'Listing not found.' };
    const c = current as {
      owner_id: string;
      status: ListingStatus;
      title: string;
      price_eur: number | null;
      is_gift: boolean;
    };
    if (c.owner_id !== user.id) return { data: null, error: 'Not your listing.' };

    const keyFieldChanged =
      c.title !== fields.title ||
      c.price_eur !== fields.price_eur ||
      c.is_gift !== fields.is_gift ||
      photosChanged;

    const newStatus: ListingStatus =
      c.status === 'live' && keyFieldChanged ? 'pending' : c.status;

    const { error } = await client.database
      .from('listings')
      .update({
        title: fields.title,
        description: fields.description?.trim() || null,
        category: fields.category,
        condition: fields.condition,
        is_gift: fields.is_gift,
        price_eur: fields.price_eur,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('owner_id', user.id);

    if (error) return { data: null, error: 'No se pudo actualizar el anuncio.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function deleteListingPhotos(
  photoIds: string[],
): Promise<{ data: null; error: string | null }> {
  if (photoIds.length === 0) return { data: null, error: null };
  try {
    const client = await getAuthClient();
    const { error } = await client.database
      .from('listing_photos')
      .delete()
      .in('id', photoIds);
    if (error) return { data: null, error: 'No se pudieron eliminar las fotos.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function reorderListingPhotos(
  photos: Array<{ id: string; sort_order: number }>,
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();
    await Promise.all(
      photos.map(({ id, sort_order }) =>
        client.database
          .from('listing_photos')
          .update({ sort_order })
          .eq('id', id),
      ),
    );
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'No se pudieron ordenar las fotos.' };
  }
}

export async function markAsSold(
  listingId: string,
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    const { error } = await client.database
      .from('listings')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('owner_id', user.id);

    if (error) return { data: null, error: 'No se pudo marcar como vendido.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function deleteListing(
  listingId: string,
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    const { error } = await client.database
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('owner_id', user.id);

    if (error) return { data: null, error: 'No se pudo eliminar el anuncio.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}
