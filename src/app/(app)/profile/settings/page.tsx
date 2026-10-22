import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsForm from '@/components/profile/SettingsForm';
import BlockedUsersList from '@/components/profile/BlockedUsersList';
import NotificationsToggle from '@/components/profile/NotificationsToggle';
import LanguageSettings from '@/components/profile/LanguageSettings';
import { getCurrentUserEmail } from '@/app/(app)/profile/actions';

export const metadata = { title: 'Ajustes — Lodge Market' };

export default async function ProfileSettingsPage() {
  const email = await getCurrentUserEmail();
  if (!email) redirect('/login');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Ajustes
        </h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Idioma</h2>
        <LanguageSettings />
      </section>

      <SettingsForm email={email} />

      <section className="space-y-4 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Notificaciones</h2>
        </div>
        <NotificationsToggle />
      </section>

      <section className="space-y-4 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Usuarios bloqueados</h2>
          <p className="text-sm text-muted-foreground">
            Al desbloquear a una persona volverás a ver su perfil, sus anuncios y
            las conversaciones que ya existieran.
          </p>
        </div>
        <BlockedUsersList />
      </section>

      <p className="border-t pt-4 text-xs text-muted-foreground">
        Consulta nuestra{' '}
        <Link
          href="/privacy"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
