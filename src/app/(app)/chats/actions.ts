'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { checkRateLimit } from '@/lib/rate-limit';
import type { Conversation, Message } from '@/types/db';

type DbMessage = Message;

type ListingIntent = 'buy' | 'offer';

interface ListingIntentResult {
  conversationId: string;
  message: DbMessage;
}

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
  sellerId: string
): Promise<{ data: { conversationId: string } | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const { data: listingRaw } = await client.database
    .from('listings')
    .select('owner_id,status')
    .eq('id', listingId)
    .single();

  const listing = listingRaw as unknown as {
    owner_id: string;
    status: string;
  } | null;

  if (!listing || listing.owner_id !== sellerId || listing.status !== 'live') {
    return { data: null, error: 'El anuncio ya no está disponible' };
  }

  // Prevent messaging yourself
  if (userId === sellerId) {
    return { data: null, error: 'No puedes enviarte un mensaje a ti mismo' };
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
    .insert([{ listing_id: listingId, buyer_id: userId, seller_id: sellerId }])
    .select('id')
    .single();

  if (error || !created) {
    // A second request may have created the unique conversation first.
    const { data: concurrent } = await client.database
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', userId)
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (concurrent) {
      const conv = concurrent as unknown as Pick<Conversation, 'id'>;
      return { data: { conversationId: conv.id }, error: null };
    }

    return { data: null, error: 'No se pudo crear la conversación' };
  }

  const conv = created as unknown as Pick<Conversation, 'id'>;
  return { data: { conversationId: conv.id }, error: null };
}

export async function sendMessage(
  conversationId: string,
  body: string
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

  if (!convRaw) return { data: null, error: 'No se encontró la conversación' };
  const conv = convRaw as unknown as Pick<Conversation, 'id' | 'buyer_id' | 'seller_id'>;
  if (conv.buyer_id !== userId && conv.seller_id !== userId) {
    return { data: null, error: 'Not a participant' };
  }

  const { data: msgRaw, error } = await client.database
    .from('messages')
    .insert([{ conversation_id: conversationId, sender_id: userId, body: trimmed }])
    .select('id,conversation_id,sender_id,body,read_at,created_at')
    .single();

  if (error || !msgRaw) {
    return { data: null, error: 'No se pudo enviar el mensaje' };
  }

  // Update last_message_at on the conversation
  await client.database
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  const message = msgRaw as unknown as DbMessage;
  return { data: { message }, error: null };
}

export async function sendListingIntent(
  listingId: string,
  intent: ListingIntent,
  offeredPrice?: number
): Promise<{ data: ListingIntentResult | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Inicia sesión para continuar' };
  if (intent !== 'buy' && intent !== 'offer') {
    return { data: null, error: 'Acción no válida' };
  }

  const { data: listingRaw } = await client.database
    .from('listings')
    .select('id,owner_id,title,is_gift,price_eur,status')
    .eq('id', listingId)
    .single();

  const listing = listingRaw as unknown as {
    id: string;
    owner_id: string;
    title: string;
    is_gift: boolean;
    price_eur: number | null;
    status: string;
  } | null;

  if (!listing || listing.status !== 'live') {
    return { data: null, error: 'El anuncio ya no está disponible' };
  }
  if (listing.owner_id === userId) {
    return { data: null, error: 'No puedes comprar tu propio artículo' };
  }

  let messageBody: string;
  if (intent === 'offer') {
    if (listing.is_gift || listing.price_eur == null || listing.price_eur <= 0.01) {
      return { data: null, error: 'Este artículo no admite ofertas de precio' };
    }

    const normalizedPrice = Math.round(Number(offeredPrice) * 100) / 100;
    if (
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0 ||
      normalizedPrice >= listing.price_eur
    ) {
      return {
        data: null,
        error: `La oferta debe ser mayor que 0 € y menor que ${formatEuro(listing.price_eur)}`,
      };
    }

    messageBody = `¡Hola! Te ofrezco ${formatEuro(normalizedPrice)} por “${listing.title}”. ¿Qué te parece?`;
  } else if (listing.is_gift) {
    messageBody = `¡Me interesa “${listing.title}”! ¿Sigue disponible?`;
  } else if (listing.price_eur != null) {
    messageBody = `¡Te lo compro por ${formatEuro(listing.price_eur)}! ¿Cuándo te viene bien que lo recoja?`;
  } else {
    return { data: null, error: 'El anuncio no tiene un precio válido' };
  }

  const conversation = await getOrCreateConversation(listing.id, listing.owner_id);
  if (conversation.error || !conversation.data) {
    return { data: null, error: conversation.error ?? 'No se pudo abrir la conversación' };
  }

  const sent = await sendMessage(conversation.data.conversationId, messageBody);
  if (sent.error || !sent.data) {
    return { data: null, error: sent.error ?? 'No se pudo enviar el mensaje' };
  }

  return {
    data: {
      conversationId: conversation.data.conversationId,
      message: sent.data.message,
    },
    error: null,
  };
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function getMessagesSince(
  conversationId: string,
  since: string
): Promise<{ data: Message[] | null; error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const { data: msgsRaw, error } = await client.database
    .from('messages')
    .select('id,conversation_id,sender_id,body,read_at,created_at')
    .eq('conversation_id', conversationId)
    .gt('created_at', since)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error: 'No se pudieron cargar los mensajes' };
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

export async function blockUser(targetUserId: string): Promise<{ error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { error: 'Not authenticated' };

  const { error } = await client.database
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: targetUserId });

  if (error) return { error: 'No se pudo bloquear al usuario' };
  return { error: null };
}

export interface BlockedUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
}

export async function getBlockedUsers(): Promise<{
  data: BlockedUser[] | null;
  error: string | null;
}> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { data: null, error: 'Not authenticated' };

  const { data: blocksRaw, error: blocksError } = await client.database
    .from('blocks')
    .select('blocked_id,created_at')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });

  if (blocksError) return { data: null, error: 'No se pudieron cargar los bloqueos' };

  const blocks = (blocksRaw ?? []) as Array<{
    blocked_id: string;
    created_at: string;
  }>;

  if (blocks.length === 0) return { data: [], error: null };

  const blockedIds = blocks.map((b) => b.blocked_id);

  const { data: profilesRaw, error: profilesError } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url')
    .in('id', blockedIds);

  if (profilesError) return { data: null, error: 'No se pudieron cargar los perfiles' };

  const profiles = (profilesRaw ?? []) as Array<{
    id: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const result: BlockedUser[] = blocks.map((b) => {
    const p = profileMap.get(b.blocked_id);
    return {
      id: b.blocked_id,
      display_name: p?.display_name ?? 'Usuario desconocido',
      avatar_url: p?.avatar_url ?? null,
      blocked_at: b.created_at,
    };
  });

  return { data: result, error: null };
}

export async function unblockUser(targetUserId: string): Promise<{ error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { error: 'Not authenticated' };

  const { error } = await client.database
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', targetUserId);

  if (error) return { error: 'No se pudo desbloquear al usuario' };
  return { error: null };
}

export async function reportConversation(
  conversationId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { client, userId } = await getClientAndUser();
  if (!client || !userId) return { error: 'Not authenticated' };

  const allowed = checkRateLimit(userId, 'report');
  if (!allowed) {
    return { error: 'Has alcanzado el límite de reportes. Inténtalo de nuevo mañana.' };
  }

  const trimmed = reason.trim();
  if (trimmed.length < 5 || trimmed.length > 1000) {
    return { error: 'Reason must be 5–1000 characters.' };
  }

  const { error } = await client.database.from('reports').insert({
    reporter_id: userId,
    target_type: 'conversation',
    target_id: conversationId,
    reason: trimmed,
    status: 'open',
  });

  if (error) return { error: 'No se pudo enviar el reporte' };
  return { error: null };
}
