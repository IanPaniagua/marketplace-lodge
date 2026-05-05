import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import type { Conversation, Message } from '@/types/db';

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ count: 0 });
  }

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  const me = userData?.user?.id;
  if (!me) {
    return NextResponse.json({ count: 0 });
  }

  // Get all conversation IDs for this user
  const { data: convsRaw } = await client.database
    .from('conversations')
    .select('id,buyer_id,seller_id')
    .or(`buyer_id.eq.${me},seller_id.eq.${me}`);

  const convs = (convsRaw ?? []) as unknown as Pick<Conversation, 'id' | 'buyer_id' | 'seller_id'>[];
  if (convs.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const convIds = convs.map((c) => c.id);

  // Count unread messages in those conversations not sent by me
  const { data: msgsRaw } = await client.database
    .from('messages')
    .select('id,sender_id,read_at')
    .in('conversation_id', convIds)
    .neq('sender_id', me)
    .is('read_at', null);

  const unread = (msgsRaw ?? []) as unknown as Pick<Message, 'id' | 'sender_id' | 'read_at'>[];

  return NextResponse.json({ count: unread.length });
}
