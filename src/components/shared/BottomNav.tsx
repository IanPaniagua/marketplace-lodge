'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, PlusSquare, MessageCircle, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { insforge } from '@/lib/insforge';

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Amigos', Icon: Users },
  { href: '/explore', label: 'Explorar', Icon: Compass },
  { href: '/listings/new', label: 'Publicar', Icon: PlusSquare },
  { href: '/chats', label: 'Mensajes', Icon: MessageCircle },
  { href: '/profile', label: 'Perfil', Icon: User },
];

interface Props {
  userId?: string;
}

export default function BottomNav({ userId }: Props) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewMessage = useCallback(() => {
    setUnreadCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Reset badge when visiting chats
    if (pathname.startsWith('/chats')) {
      setUnreadCount(0);
    }

    // Fetch initial unread count
    fetch('/api/unread-count')
      .then((r) => r.json())
      .then((json: unknown) => {
        if (
          json !== null &&
          typeof json === 'object' &&
          'count' in json &&
          typeof (json as Record<string, unknown>).count === 'number'
        ) {
          setUnreadCount((json as { count: number }).count);
        }
      })
      .catch(() => undefined);

    // Subscribe to per-user inbox channel
    const channel = `user:${userId}`;
    let subscribed = false;

    async function setup() {
      await insforge.realtime.connect();
      await insforge.realtime.subscribe(channel);
      subscribed = true;
      insforge.realtime.on('new_message', handleNewMessage);
    }

    setup().catch(() => undefined);

    return () => {
      insforge.realtime.off('new_message', handleNewMessage);
      if (subscribed) {
        void insforge.realtime.unsubscribe(channel);
      }
    };
  }, [userId, pathname, handleNewMessage]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-background/90 shadow-[0_-10px_30px_-22px_hsl(var(--foreground)/0.35)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
        {navItems.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const isChats = href === '/chats';

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md transition-colors',
                  active
                    ? 'text-primary after:absolute after:bottom-0 after:h-0.5 after:w-5 after:rounded-full after:bg-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {isChats && unreadCount > 0 && !pathname.startsWith('/chats') && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
