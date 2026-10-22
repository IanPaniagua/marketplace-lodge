'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  conversationId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  listingTitle: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function ConversationRow({
  conversationId,
  otherUserName,
  otherUserAvatar,
  listingTitle,
  lastMessageBody,
  lastMessageAt,
  unreadCount,
}: Props) {
  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true, locale: es });
  const preview =
    lastMessageBody.length > 60
      ? lastMessageBody.slice(0, 60) + '…'
      : lastMessageBody;

  return (
    <Link
      href={`/chats/${conversationId}`}
      className="surface-card flex items-center gap-3 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/20 active:bg-accent/60"
    >
      <Avatar className="h-11 w-11 shrink-0">
        {otherUserAvatar && (
          <AvatarImage src={otherUserAvatar} alt={otherUserName} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
          {otherUserName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-sm">{otherUserName}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{listingTitle}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-foreground/70">{preview}</p>
      </div>

      {unreadCount > 0 && (
        <span className="ml-1 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
