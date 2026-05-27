import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';
import { getServerProfile } from '@/lib/auth';

interface SubscribeBody {
  endpoint?: string;
  p256dh_key?: string;
  auth_key?: string;
  user_agent?: string;
}

export async function POST(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as SubscribeBody;
  const { endpoint, p256dh_key, auth_key, user_agent } = body;

  if (!endpoint || !p256dh_key || !auth_key) {
    return NextResponse.json({ error: 'Missing required subscription fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert — (user_id, endpoint) is unique, so same device always overwrites
  const { error } = await admin.database
    .from('push_subscriptions')
    .upsert(
      {
        user_id: profile.id,
        endpoint,
        p256dh_key,
        auth_key,
        user_agent: user_agent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { endpoint?: string };
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const admin = createAdminClient();

  await admin.database
    .from('push_subscriptions')
    .delete()
    .eq('user_id', profile.id)
    .eq('endpoint', endpoint);

  return NextResponse.json({ ok: true });
}
