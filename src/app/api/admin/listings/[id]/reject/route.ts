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

  const { data, error } = await admin.database.rpc('reject_listing', {
    p_id: id,
    p_reason: reason,
  });

  if (error) {
    console.error('[reject] rpc failed', { id, error });
    return NextResponse.json({ error: 'Failed to reject listing', detail: error }, { status: 500 });
  }

  const rows = data as Array<{ id: string; status: string; rejection_reason: string | null }> | null;
  const row = rows?.[0] ?? null;
  if (!row || row.status !== 'rejected') {
    console.error('[reject] rpc did not persist rejected status', { id, row });
    return NextResponse.json(
      { error: 'Reject did not persist', persisted: row },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, persisted: row });
}
