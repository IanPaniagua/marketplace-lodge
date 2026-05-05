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

  // Call the edge function with the admin client
  const admin = createAdminClient();
  const { error } = await admin.functions.invoke('notify-admin-new-listing', {
    body: { listing_id },
  });

  if (error) {
    // Non-fatal — listing was created, notification is best-effort
    console.error('notify-admin-new-listing error:', error);
  }

  return NextResponse.json({ ok: true });
}
