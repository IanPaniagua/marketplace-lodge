import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerProfile } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { formatDistanceToNow } from 'date-fns';
import AdminListingActions from '@/components/listing/AdminListingActions';
import type { Listing, Profile } from '@/types/db';

export const metadata = { title: 'Pending listings — Admin' };

export default async function AdminListingsPage() {
  const profile = await getServerProfile();
  if (!profile?.is_admin) redirect('/');

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const client = createServerClient(token);

  const { data: listingsRaw } = await client.database
    .from('listings')
    .select('id,owner_id,title,category,condition,is_gift,price_eur,created_at')
    .eq('status', 'pending')
    .order('created_at');

  const listings = (listingsRaw ?? []) as Array<
    Pick<Listing, 'id' | 'owner_id' | 'title' | 'category' | 'condition' | 'is_gift' | 'price_eur' | 'created_at'>
  >;

  // Fetch seller names for all listings in one query
  const ownerIds = [...new Set(listings.map((l) => l.owner_id))];
  const { data: sellersRaw } = ownerIds.length > 0
    ? await client.database
        .from('profiles')
        .select('id,display_name')
        .in('id', ownerIds)
    : { data: [] };

  const sellerMap = new Map(
    ((sellersRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]).map((s) => [s.id, s]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pending listings</h1>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Admin
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <p className="text-base font-medium">All clear</p>
          <p className="text-sm text-muted-foreground">No listings awaiting review.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {listings.map((listing) => {
            const seller = sellerMap.get(listing.owner_id);
            return (
              <li key={listing.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      by {seller?.display_name ?? 'Unknown'} ·{' '}
                      {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {listing.category}
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {listing.condition.replace('_', ' ')}
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs font-semibold tabular-nums text-primary">
                        {listing.is_gift ? 'Free' : `€${listing.price_eur}`}
                      </span>
                    </div>
                  </div>
                </div>
                <AdminListingActions listingId={listing.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
