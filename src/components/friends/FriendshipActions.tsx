'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, UserMinus, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
} from '@/app/(app)/friends/actions';

export type FriendshipViewState = 'none' | 'sent' | 'received' | 'friends';

interface Props {
  targetUserId: string;
  state: FriendshipViewState;
  friendshipId?: string;
  compact?: boolean;
}

export default function FriendshipActions({
  targetUserId,
  state,
  friendshipId,
  compact = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const size = compact ? 'sm' : 'default';

  function run(
    action: () => Promise<{ error: string | null }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  if (state === 'none') {
    return (
      <Button
        size={size}
        disabled={isPending}
        onClick={() => run(() => sendFriendRequest(targetUserId), 'Solicitud enviada.')}
      >
        <UserPlus className="h-4 w-4" />
        Añadir amigo
      </Button>
    );
  }

  if (!friendshipId) return null;

  if (state === 'received') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size={size}
          disabled={isPending}
          onClick={() => run(
            () => respondFriendRequest(friendshipId, true, targetUserId),
            'Ahora sois amigos.',
          )}
        >
          <Check className="h-4 w-4" />
          Aceptar
        </Button>
        <Button
          size={size}
          variant="ghost"
          disabled={isPending}
          onClick={() => run(
            () => respondFriendRequest(friendshipId, false, targetUserId),
            'Solicitud rechazada.',
          )}
        >
          <X className="h-4 w-4" />
          Rechazar
        </Button>
      </div>
    );
  }

  if (state === 'sent') {
    return (
      <Button
        size={size}
        variant="outline"
        disabled={isPending}
        onClick={() => run(
          () => removeFriendship(friendshipId, targetUserId),
          'Solicitud cancelada.',
        )}
      >
        <X className="h-4 w-4" />
        Solicitud enviada
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="ghost"
      className="text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => run(
        () => removeFriendship(friendshipId, targetUserId),
        'Amistad eliminada.',
      )}
    >
      <UserMinus className="h-4 w-4" />
      Eliminar amistad
    </Button>
  );
}
