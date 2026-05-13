import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { markMessagesRead } from '@/app/(app)/chats/actions';
import ChatView from '@/components/chat/ChatView';
import type { Conversation, Message, Profile, Listing, Rating } from '@/types/db';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  const me = userData?.user?.id;
  if (!me) redirect('/login');

  // Fetch conversation
  const { data: convRaw } = await client.database
    .from('conversations')
    .select('id,listing_id,buyer_id,seller_id,last_message_at,created_at')
    .eq('id', id)
    .single();

  if (!convRaw) notFound();
  const conv = convRaw as unknown as Conversation;

  // Verify participant
  if (conv.buyer_id !== me && conv.seller_id !== me) notFound();

  const otherId = conv.buyer_id === me ? conv.seller_id : conv.buyer_id;

  // Fetch listing title
  const { data: listingRaw } = await client.database
    .from('listings')
    .select('id,title')
    .eq('id', conv.listing_id)
    .single();
  const listing = listingRaw as unknown as Pick<Listing, 'id' | 'title'> | null;

  // Fetch other party profile
  const { data: otherRaw } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url')
    .eq('id', otherId)
    .single();
  const otherUser = otherRaw as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;

  if (!otherUser) notFound();

  // Fetch initial messages (last 50, ascending order)
  const { data: msgsRaw } = await client.database
    .from('messages')
    .select('id,conversation_id,sender_id,body,read_at,created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = ((msgsRaw ?? []) as unknown as Message[]).reverse();

  // Fetch current user's existing rating for the other party about this listing
  const { data: myRatingRaw } = await client.database
    .from('ratings')
    .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
    .eq('rater_id', me)
    .eq('ratee_id', otherId)
    .eq('listing_id', conv.listing_id)
    .maybeSingle();
  const existingRating = myRatingRaw as unknown as Rating | null;

  // Mark unread messages from the other party as read
  await markMessagesRead(id);

  return (
    <ChatView
      conversationId={id}
      currentUserId={me}
      otherUser={{
        id: otherUser.id,
        display_name: otherUser.display_name,
        avatar_url: otherUser.avatar_url,
      }}
      listingTitle={listing?.title ?? 'Listing'}
      initialMessages={initialMessages}
      listingId={conv.listing_id}
      existingRating={existingRating}
    />
  );
}
