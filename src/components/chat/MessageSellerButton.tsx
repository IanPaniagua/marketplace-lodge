'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getOrCreateConversation } from '@/app/(app)/chats/actions';

interface Props {
  listingId: string;
  sellerId: string;
}

export default function MessageSellerButton({ listingId, sellerId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const { data, error } = await getOrCreateConversation(listingId, sellerId);
    if (error || !data) {
      toast.error(error ?? 'Something went wrong');
      setLoading(false);
      return;
    }
    router.push(`/chats/${data.conversationId}`);
  }

  return (
    <Button
      size="sm"
      className="flex items-center gap-1.5"
      onClick={handleClick}
      disabled={loading}
    >
      <MessageCircle className="h-4 w-4" />
      {loading ? 'Opening…' : 'Message'}
    </Button>
  );
}
