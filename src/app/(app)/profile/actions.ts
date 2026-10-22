'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { ProfileEditSchema } from '@/lib/schemas';
import type { ProfileEditInput } from '@/lib/schemas';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, REFRESH_COOKIE } from '@/lib/insforge';

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

export async function updateProfile(
  input: ProfileEditInput,
): Promise<{ data: null; error: string | null }> {
  const parsed = ProfileEditSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    const { error } = await client.database
      .from('profiles')
      .update({
        display_name: parsed.data.display_name,
        bio: parsed.data.bio ?? null,
        room_number: parsed.data.room_number ?? null,
      })
      .eq('id', user.id);

    if (error) return { data: null, error: 'No se pudo guardar el perfil.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

export async function updateAvatarUrl(
  avatarUrl: string,
): Promise<{ data: null; error: string | null }> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    const { error } = await client.database
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (error) return { data: null, error: 'No se pudo actualizar la foto de perfil.' };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Not authenticated.' };
  }
}

/** Returns the current user's email (needed for the password-reset flow). */
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);
    return user.email;
  } catch {
    return null;
  }
}

export async function deleteMyAccount(): Promise<void> {
  try {
    const client = await getAuthClient();
    const user = await getCurrentUser(client);

    // Soft-delete + anonymize personal fields so past chats no longer
    // expose this user's name, avatar, bio, or room number to the other party.
    await client.database
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        display_name: 'Deleted user',
        bio: null,
        avatar_url: null,
        room_number: null,
      })
      .eq('id', user.id);

    await client.auth.signOut();
  } catch {
    // best-effort
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  redirect('/login');
}
