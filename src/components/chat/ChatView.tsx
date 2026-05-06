'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Flag, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { sendMessage, markMessagesRead, blockUser, reportConversation, getMessagesSince } from '@/app/(app)/chats/actions';
import type { Message } from '@/types/db';

interface Props {
  conversationId: string;
  currentUserId: string;
  otherUser: { id: string; display_name: string; avatar_url: string | null };
  listingTitle: string;
  initialMessages: Message[];
  listingId: string;
}

export default function ChatView({
  conversationId,
  currentUserId,
  otherUser,
  listingTitle,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [blockSending, setBlockSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string>(
    initialMessages.at(-1)?.created_at ?? new Date(0).toISOString(),
  );

  // Realtime message handler
  const handleNewMessage = useCallback(
    async (socketMsg: { payload: Record<string, unknown> }) => {
      const msg = socketMsg.payload as unknown as Message;
      if (msg.sender_id === currentUserId) return; // already added optimistically
      setMessages((prev) => {
        // avoid duplicate
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      await markMessagesRead(conversationId);
    },
    [conversationId, currentUserId],
  );

  useEffect(() => {
    const channel = `conversation:${conversationId}`;
    let subscribed = false;

    async function setup() {
      await insforge.realtime.connect();
      await insforge.realtime.subscribe(channel);
      subscribed = true;
      insforge.realtime.on('new_message', handleNewMessage);
    }

    setup().catch(() => {
      // realtime is best-effort; chat still works via polling on refresh
    });

    return () => {
      insforge.realtime.off('new_message', handleNewMessage);
      if (subscribed) {
        void insforge.realtime.unsubscribe(channel);
      }
      insforge.realtime.disconnect();
    };
  }, [conversationId, handleNewMessage]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await getMessagesSince(conversationId, latestTimestampRef.current);
      if (!data || data.length === 0) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = data.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        latestTimestampRef.current = fresh.at(-1)!.created_at;
        return [...prev, ...fresh];
      });
      await markMessagesRead(conversationId);
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setBody('');

    const { data, error } = await sendMessage(conversationId, trimmed);
    setSending(false);

    if (error || !data) {
      toast.error(error ?? 'Failed to send message');
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setBody(trimmed);
      return;
    }

    // Replace optimistic with real message
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticMsg.id ? data.message : m)),
    );
    latestTimestampRef.current = data.message.created_at;

    // Publish to both channels
    const payload: Record<string, unknown> = {
      id: data.message.id,
      conversation_id: data.message.conversation_id,
      sender_id: data.message.sender_id,
      body: data.message.body,
      read_at: data.message.read_at,
      created_at: data.message.created_at,
    };

    insforge.realtime
      .publish(`conversation:${conversationId}`, 'new_message', payload)
      .catch(() => undefined);

    insforge.realtime
      .publish(`user:${otherUser.id}`, 'new_message', payload)
      .catch(() => undefined);
  }

  async function handleReport() {
    if (reportReason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters).');
      return;
    }
    setReportSending(true);
    const { error } = await reportConversation(conversationId, reportReason);
    setReportSending(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Report submitted. Our admin will review it.');
    setReportOpen(false);
    setReportReason('');
  }

  async function handleBlock() {
    setBlockSending(true);
    const { error } = await blockUser(otherUser.id);
    setBlockSending(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`${otherUser.display_name} has been blocked.`);
    router.push('/chats');
  }

  const remaining = 2000 - body.length;
  const nearLimit = remaining <= 200;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
        <Link href="/chats" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to chats</span>
        </Link>
        <Avatar className="h-8 w-8 shrink-0">
          {otherUser.avatar_url && (
            <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
          )}
          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
            {otherUser.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{otherUser.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">{listingTitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setReportOpen(true)}
            title="Report conversation"
          >
            <Flag className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setBlockOpen(true)}
            title="Block user"
          >
            <ShieldX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Privacy notice */}
      <p className="border-b bg-muted/40 px-4 py-2 text-center text-[11px] leading-snug text-muted-foreground">
        Messages are private between you and {otherUser.display_name}. Admins may read them only
        when reviewing a report.
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {msg.body}
              </div>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              maxLength={2000}
              disabled={sending}
            />
            {nearLimit && (
              <p className={`mt-0.5 text-right text-[10px] ${remaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {remaining} remaining
              </p>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="shrink-0"
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report conversation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Describe the issue. Our admin team will review this conversation.
          </p>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe the problem (min 5 characters)…"
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <p className="text-right text-[10px] text-muted-foreground">
            {1000 - reportReason.length} remaining
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportSending}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={reportSending || reportReason.trim().length < 5}>
              {reportSending ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirm dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {otherUser.display_name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            They will not be able to see your listings or message you. This action cannot be undone
            without contacting an admin.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBlockOpen(false)} disabled={blockSending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={blockSending}>
              {blockSending ? 'Blocking…' : `Block ${otherUser.display_name}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
