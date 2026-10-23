'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';

const IdSchema = z.string().uuid();

async function getAuthContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Not authenticated');

  const client = createServerClient(token);
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) throw new Error('Not authenticated');
  return { client, userId: data.user.id };
}

function refreshFriendViews(targetUserId?: string) {
  revalidatePath('/');
  if (targetUserId) revalidatePath(`/profile/${targetUserId}`);
}

export async function sendFriendRequest(
  targetUserId: string,
): Promise<{ error: string | null }> {
  const parsed = IdSchema.safeParse(targetUserId);
  if (!parsed.success) return { error: 'Usuario no válido.' };

  try {
    const { client, userId } = await getAuthContext();
    if (userId === parsed.data) return { error: 'No puedes añadirte a ti mismo.' };

    const { error } = await client.database.from('friendships').insert([{
      requester_id: userId,
      addressee_id: parsed.data,
      status: 'pending',
    }]);

    if (error) return { error: 'Ya existe una solicitud o no se pudo enviar.' };
    refreshFriendViews(parsed.data);
    return { error: null };
  } catch {
    return { error: 'No se pudo enviar la solicitud.' };
  }
}

export async function respondFriendRequest(
  friendshipId: string,
  accept: boolean,
  targetUserId?: string,
): Promise<{ error: string | null }> {
  const parsed = IdSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: 'Solicitud no válida.' };

  try {
    const { client } = await getAuthContext();
    const { data, error } = await client.database.rpc('respond_friend_request', {
      p_friendship_id: parsed.data,
      p_accept: accept,
    });

    if (error || data !== true) return { error: 'La solicitud ya no está disponible.' };
    refreshFriendViews(targetUserId);
    return { error: null };
  } catch {
    return { error: 'No se pudo responder a la solicitud.' };
  }
}

export async function removeFriendship(
  friendshipId: string,
  targetUserId?: string,
): Promise<{ error: string | null }> {
  const parsed = IdSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: 'Relación no válida.' };

  try {
    const { client } = await getAuthContext();
    const { error } = await client.database
      .from('friendships')
      .delete()
      .eq('id', parsed.data);

    if (error) return { error: 'No se pudo actualizar la amistad.' };
    refreshFriendViews(targetUserId);
    return { error: null };
  } catch {
    return { error: 'No se pudo actualizar la amistad.' };
  }
}
