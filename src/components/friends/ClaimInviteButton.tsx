'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { claimFriendInvite } from '@/app/invite/actions';
import { Button } from '@/components/ui/button';

interface Props {
  token: string;
  inviterName: string;
}

export default function ClaimInviteButton({ token, inviterName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function claim() {
    startTransition(async () => {
      const result = await claimFriendInvite(token);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.status === 'already_friends'
          ? `Ya eres amigo de ${inviterName}.`
          : `Ahora eres amigo de ${inviterName}.`,
      );
      router.push(result.inviterId ? `/profile/${result.inviterId}` : '/friends');
      router.refresh();
    });
  }

  return (
    <Button size="lg" className="w-full sm:w-auto" disabled={isPending} onClick={claim}>
      <UserRoundCheck />
      {isPending ? 'Aceptando…' : `Ser amigo de ${inviterName}`}
    </Button>
  );
}
