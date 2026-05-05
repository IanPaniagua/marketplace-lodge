import { cookies } from 'next/headers';
import { createServerClient } from './insforge-server';
import type { Profile } from '@/types/db';

export { SESSION_COOKIE } from './insforge';

/** Get the authenticated user on the server. Returns null if no valid session. */
export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('insforge_token')?.value;
  if (!token) return null;

  const client = createServerClient(token);
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Get the profile row for the current user. Returns null if unauthenticated or no profile. */
export async function getServerProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('insforge_token')?.value;
  if (!token) return null;

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user) return null;

  const { data: profile } = await client.database
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();

  return (profile as Profile) ?? null;
}
