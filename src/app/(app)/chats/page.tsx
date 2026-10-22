import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import ConversationRow from '@/components/chat/ConversationRow';
import type { Profile, Listing } from '@/types/db';

interface ConversationRow_ {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export default async function ChatsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  const me = userData?.user?.id;
  if (!me) redirect('/login');

  // Fetch all conversations where I am buyer or seller
  const { data: convsRaw } = await client.database
    .from('conversations')
    .select('id,listing_id,buyer_id,seller_id,last_message_at')
    .or(`buyer_id.eq.${me},seller_id.eq.${me}`)
    .order('last_message_at', { ascending: false });

  const convs = (convsRaw ?? []) as unknown as ConversationRow_[];

  if (convs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">Aún no hay conversaciones</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Encuentra algo que te guste y escribe a la persona que lo vende.
        </p>
      </div>
    );
  }

  // Collect unique other user ids and listing ids
  const otherUserIds = [...new Set(convs.map((c) => (c.buyer_id === me ? c.seller_id : c.buyer_id)))];
  const listingIds = [...new Set(convs.map((c) => c.listing_id))];
  const convIds = convs.map((c) => c.id);

  // Fetch profiles for other users
  const { data: profilesRaw } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url')
    .in('id', otherUserIds);
  const profiles = (profilesRaw ?? []) as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Fetch listing titles
  const { data: listingsRaw } = await client.database
    .from('listings')
    .select('id,title')
    .in('id', listingIds);
  const listings = (listingsRaw ?? []) as unknown as Pick<Listing, 'id' | 'title'>[];
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  // Fetch latest message per conversation + unread counts
  // We fetch all messages for these conversations and process in memory (acceptable for ~40 users)
  const { data: msgsRaw } = await client.database
    .from('messages')
    .select('id,conversation_id,sender_id,body,read_at,created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });
  const msgs = (msgsRaw ?? []) as unknown as MessageRow[];

  // Group messages by conversation_id
  const msgsByConv = new Map<string, MessageRow[]>();
  for (const msg of msgs) {
    const arr = msgsByConv.get(msg.conversation_id) ?? [];
    arr.push(msg);
    msgsByConv.set(msg.conversation_id, arr);
  }

  return (
    <div className="space-y-2 pb-4">
      <h1 className="text-xl font-semibold tracking-tight">Mensajes</h1>
      <div className="space-y-2">
        {convs.map((conv) => {
          const otherId = conv.buyer_id === me ? conv.seller_id : conv.buyer_id;
          const otherProfile = profileMap.get(otherId);
          const listing = listingMap.get(conv.listing_id);
          const convMsgs = msgsByConv.get(conv.id) ?? [];
          const latest = convMsgs[0]; // already sorted desc
          if (!latest) return null;
          const unread = convMsgs.filter(
            (m) => m.sender_id !== me && m.read_at === null,
          ).length;

          return (
            <ConversationRow
              key={conv.id}
              conversationId={conv.id}
              otherUserName={otherProfile?.display_name ?? 'Desconocido'}
              otherUserAvatar={otherProfile?.avatar_url ?? null}
              listingTitle={listing?.title ?? 'Anuncio desconocido'}
              lastMessageBody={latest.body}
              lastMessageAt={latest.created_at}
              unreadCount={unread}
            />
          );
        })}
      </div>
    </div>
  );
}
