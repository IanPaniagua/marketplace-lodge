import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';
import { getServerProfile } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { user_id?: string };
  if (!body.user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  // Caller must be notifying about themselves only
  if (body.user_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  admin.functions.invoke('push-admin-new-user', { body: { user_id: body.user_id } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
