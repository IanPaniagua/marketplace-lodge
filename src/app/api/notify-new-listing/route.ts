import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: userData } = await userClient.auth.getCurrentUser();
  if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { listing_id?: string };
  const { listing_id } = body;
  if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 });

  // Verify the listing belongs to this user
  const { data: listingCheck } = await userClient.database
    .from('listings')
    .select('id')
    .eq('id', listing_id)
    .eq('owner_id', userData.user.id)
    .single();

  if (!listingCheck) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  // Call the edge functions with the admin client — both are best-effort
  const admin = createAdminClient();
  const [emailResult] = await Promise.allSettled([
    admin.functions.invoke('notify-admin-new-listing', { body: { listing_id } }),
    admin.functions.invoke('push-admin-new-listing', { body: { listing_id } }),
  ]);

  if (emailResult.status === 'rejected' || (emailResult.status === 'fulfilled' && emailResult.value.error)) {
    console.error('notify-admin-new-listing error:', emailResult.status === 'rejected' ? emailResult.reason : emailResult.value.error);
  }

  return NextResponse.json({ ok: true });
}
