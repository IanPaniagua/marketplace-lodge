import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';
import { getServerProfile } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getServerProfile();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Read first_approved_at before the update to detect first-time approval
  const { data: before } = await admin.database
    .from('listings')
    .select('first_approved_at')
    .eq('id', id)
    .single();

  const isFirstApproval = before != null && before.first_approved_at == null;

  const { error } = await admin.database
    .from('listings')
    .update({
      status: 'live',
      rejection_reason: null,
      // Preserve the original timestamp if already set (re-approval guard)
      ...(isFirstApproval ? { first_approved_at: new Date().toISOString() } : {}),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to approve listing' }, { status: 500 });
  }

  // Fan-out push only on the very first approval — best-effort, never blocks the response
  if (isFirstApproval) {
    admin.functions.invoke('push-new-listing', { body: { listing_id: id } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
