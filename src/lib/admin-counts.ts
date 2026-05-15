import { createAdminClient } from './insforge-server';

export interface AdminPendingCounts {
  users: number;
  listings: number;
  total: number;
}

/**
 * Counts pending users and pending listings for the admin badge.
 * Uses the service-role client. Callers MUST verify `profile.is_admin` first.
 */
export async function getAdminPendingCounts(): Promise<AdminPendingCounts> {
  const admin = createAdminClient();

  const [usersRes, listingsRes] = await Promise.all([
    admin.database
      .from('profiles')
      .select('id')
      .eq('is_approved', false)
      .is('deleted_at', null),
    admin.database
      .from('listings')
      .select('id')
      .eq('status', 'pending'),
  ]);

  const users = (usersRes.data ?? []).length;
  const listings = (listingsRes.data ?? []).length;

  return { users, listings, total: users + listings };
}
