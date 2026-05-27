import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/insforge-server';
import { getServerProfile } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { message_id?: string };
  if (!body.message_id) {
    return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify caller is the message sender — never fan-out for someone else's message
  const { data: msgRaw } = await admin.database
    .from('messages')
    .select('sender_id')
    .eq('id', body.message_id)
    .single();

  if (!msgRaw) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const msg = msgRaw as { sender_id: string };
  if (msg.sender_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  admin.functions.invoke('push-new-message', { body: { message_id: body.message_id } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
