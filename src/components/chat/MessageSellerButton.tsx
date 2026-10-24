'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getOrCreateConversation } from '@/app/(app)/chats/actions';
import { cn } from '@/lib/utils';

interface Props {
  listingId: string;
  sellerId: string;
  className?: string;
}

export default function MessageSellerButton({ listingId, sellerId, className }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const { data, error } = await getOrCreateConversation(listingId, sellerId);
    if (error || !data) {
      toast.error(error ?? 'Algo ha salido mal');
      setLoading(false);
      return;
    }
    router.push(`/chats/${data.conversationId}`);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('flex items-center gap-1.5', className)}
      onClick={handleClick}
      disabled={loading}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {loading ? 'Abriendo…' : 'Mensaje'}
    </Button>
  );
}
