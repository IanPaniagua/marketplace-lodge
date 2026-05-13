'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LogOutIcon, UserIcon, ShieldIcon, ShoppingBag, PlusSquare, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { insforge, SESSION_COOKIE } from '@/lib/insforge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile } from '@/types/db';

interface TopBarProps {
  profile: Profile;
}

const desktopNav = [
  { href: '/', label: 'Search', Icon: ShoppingBag },
  { href: '/listings/new', label: 'Post item', Icon: PlusSquare },
  { href: '/chats', label: 'Chats', Icon: MessageCircle },
];

export default function TopBar({ profile }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await insforge.auth.signOut();
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
    toast.success('Signed out.');
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background">
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Lodge<span className="text-primary"> Market</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {desktopNav.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                My profile
              </Link>
            </DropdownMenuItem>
            {profile.is_admin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2">
                    <ShieldIcon className="h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOutIcon className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
