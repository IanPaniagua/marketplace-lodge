'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { checkRateLimit } from '@/lib/rate-limit';
import type { Conversation, Message } from '@/types/db';

type DbMessage = Message;

async function getClientAndUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return { client: null, userId: null, token: null };
  const client = createServerClient(token);
  const { data } = await client.auth.getCurrentUser();
  const userId = data?.user?.id ?? null;
  return { client, userId, token };
}

export async function getOrCreateConversation(
  listingId: string,
  sellerId: string,
): Promise<{ data: { conversationId: string } | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  // Prevent messaging yourself
  if (userId === sellerId) {
    return { data: null, error: 'Cannot message yourself' };
  }

  // Check for existing conversation
  const { data: existing } = await client.database
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', userId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (existing) {
    const conv = existing as unknown as Pick<Conversation, 'id'>;
    return { data: { conversationId: conv.id }, error: null };
  }

  // Create new conversation
  const { data: created, error } = await client.database
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: userId, seller_id: sellerId })
    .select('id')
    .single();

  if (error || !created) {
    return { data: null, error: 'Failed to create conversation' };
  }

  const conv = created as unknown as Pick<Conversation, 'id'>;
  return { data: { conversationId: conv.id }, error: null };
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ data: { message: DbMessage } | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const allowed = checkRateLimit(userId, 'message');
  if (!allowed) {
    return { data: null, error: 'Too many messages. Please wait a moment.' };
  }

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { data: null, error: 'Message must be 1–2000 characters.' };
  }

  // Verify user is a participant
  const { data: convRaw } = await client.database
    .from('conversations')
    .select('id,buyer_id,seller_id')
    .eq('id', conversationId)
    .single();

  if (!convRaw) return { data: null, error: 'Conversation not found' };
  const conv = convRaw as unknown as Pick<Conversation, 'id' | 'buyer_id' | 'seller_id'>;
  if (conv.buyer_id !== userId && conv.seller_id !== userId) {
    return { data: null, error: 'Not a participant' };
  }

  const { data: msgRaw, error } = await client.database
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, body: trimmed })
    .select('*')
    .single();

  if (error || !msgRaw) {
    return { data: null, error: 'Failed to send message' };
  }

  // Update last_message_at on the conversation
  await client.database
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  const message = msgRaw as unknown as DbMessage;
  return { data: { message }, error: null };
}

export async function getMessagesSince(
  conversationId: string,
  since: string,
): Promise<{ data: Message[] | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const { data: msgsRaw, error } = await client.database
    .from('messages')
    .select('id,conversation_id,sender_id,body,read_at,created_at')
    .eq('conversation_id', conversationId)
    .gt('created_at', since)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error: 'Failed to fetch messages' };
  return { data: (msgsRaw ?? []) as unknown as Message[], error: null };
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return;

  await client.database
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

export async function blockUser(
  targetUserId: string,
): Promise<{ error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { error: 'Not authenticated' };

  const { error } = await client.database
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: targetUserId });

  if (error) return { error: 'Failed to block user' };
  return { error: null };
}

export async function reportConversation(
  conversationId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { error: 'Not authenticated' };

  const allowed = checkRateLimit(userId, 'report');
  if (!allowed) {
    return { error: 'Report limit reached. Try again tomorrow.' };
  }

  const trimmed = reason.trim();
  if (trimmed.length < 5 || trimmed.length > 1000) {
    return { error: 'Reason must be 5–1000 characters.' };
  }

  const { error } = await client.database
    .from('reports')
    .insert({
      reporter_id: userId,
      target_type: 'conversation',
      target_id: conversationId,
      reason: trimmed,
      status: 'open',
    });

  if (error) return { error: 'Failed to submit report' };
  return { error: null };
}
