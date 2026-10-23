import { createAdminClient } from './insforge-server';

export interface AdminPendingCounts {
  listings: number;
  total: number;
}

/**
 * Counts pending listings for the admin badge.
 * Uses the service-role client. Callers MUST verify `profile.is_admin` first.
 */
export async function getAdminPendingCounts(): Promise<AdminPendingCounts> {
  const admin = createAdminClient();

  const listingsRes = await admin.database
    .from('listings')
    .select('id')
    .eq('status', 'pending');
  const listings = (listingsRes.data ?? []).length;

  return { listings, total: listings };
}
