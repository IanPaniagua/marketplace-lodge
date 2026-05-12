'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserX } from 'lucide-react';
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUser,
} from '@/app/(app)/chats/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function BlockedUsersList() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: err } = await getBlockedUsers();
      if (cancelled) return;
      if (err) setError(err);
      else setUsers(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleUnblock(user: BlockedUser) {
    setUnblockingId(user.id);
    startTransition(async () => {
      const { error: err } = await unblockUser(user.id);
      setUnblockingId(null);
      if (err) {
        toast.error(err);
        return;
      }
      setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? null);
      toast.success(`${user.display_name} unblocked.`);
    });
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load blocked users. Refresh to try again.
      </p>
    );
  }

  if (users === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md border bg-card p-3"
          >
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border bg-card py-8">
        <UserX className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium">No blocked users</p>
        <p className="text-sm text-muted-foreground">
          Users you block from a chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => {
        const isThisOne = unblockingId === u.id && pending;
        return (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-md border bg-card p-3"
          >
            <Avatar className="h-9 w-9 shrink-0">
              {u.avatar_url && (
                <AvatarImage src={u.avatar_url} alt={u.display_name} />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground">
                {u.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.display_name}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblock(u)}
              disabled={isThisOne}
            >
              {isThisOne ? 'Unblocking…' : 'Unblock'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
