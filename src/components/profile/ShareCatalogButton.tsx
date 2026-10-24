'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ShareCatalogButton({ userId }: { userId: string }) {
  async function shareCatalog() {
    const url = `${window.location.origin}/catalog/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi catálogo en Círculo Market', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace del catálogo copiado.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('No se pudo compartir el enlace.');
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={shareCatalog}>
      <Share2 className="h-4 w-4" />
      Compartir catálogo
    </Button>
  );
}
