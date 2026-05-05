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

  const { error } = await admin.database
    .from('listings')
    .update({ status: 'live', rejection_reason: null })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to approve listing' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
