'use client';

import { useRouter } from 'next/navigation';
import { Check, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { clearSessionCookies } from '@/lib/session-client';
import { Button } from '@/components/ui/button';

export default function PendingView({ invited }: { invited: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    await insforge.auth.signOut();
    await clearSessionCookies();
    toast.success('Sesión cerrada.');
    router.replace('/login');
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        {invited
          ? <Check className="h-8 w-8 text-primary" />
          : <ClockIcon className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invited ? 'Invitación aceptada' : 'Esperando aprobación'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invited
            ? 'La amistad ya está preparada. Cuando el equipo apruebe tu cuenta, podréis ver vuestros catálogos privados.'
            : 'Tu cuenta está pendiente de revisión. Podrás explorar y publicar anuncios cuando el equipo de administración la apruebe.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
