import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';
import { getServerProfile } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getServerProfile();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin.database
    .from('listings')
    .update({ status: 'pending', rejection_reason: reason })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to reject listing' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
