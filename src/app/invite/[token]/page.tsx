import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, LockKeyhole, ShoppingBag, Users } from 'lucide-react';
import { SESSION_COOKIE } from '@/lib/insforge';
import { createServerClient } from '@/lib/insforge-server';
import { getFriendInvitePreview } from '@/lib/friend-invites';
import ClaimInviteButton from '@/components/friends/ClaimInviteButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const invitation = await getFriendInvitePreview(token);

  if (!invitation) return { title: 'Invitación no disponible — Círculo Market' };

  return {
    title: `${invitation.display_name} te invita a Círculo Market`,
    description: 'Regístrate con esta invitación y conecta automáticamente con tu amigo.',
    robots: { index: false, follow: false },
    openGraph: {
      title: `${invitation.display_name} te invita a Círculo Market`,
      description: 'El marketplace personal para vender entre amigos.',
      type: 'website',
    },
  };
}

export default async function FriendInvitePage({ params }: Props) {
  const { token } = await params;
  const invitation = await getFriendInvitePreview(token);
  if (!invitation) notFound();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE)?.value;
  let currentUserId: string | null = null;

  if (accessToken) {
    const client = createServerClient(accessToken);
    const { data } = await client.auth.getCurrentUser();
    currentUserId = data?.user?.id ?? null;
  }

  const isOwnInvite = currentUserId === invitation.inviter_id;
  const encodedNext = encodeURIComponent(`/invite/${token}`);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 md:px-6">
          <Link href={currentUserId ? '/friends' : '/login'} className="text-lg font-semibold tracking-tight">
            Círculo<span className="brand-gradient-text"> Market</span>
          </Link>
          {currentUserId ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/friends">Ir a mis amigos</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/login?next=${encodedNext}`}>Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-8 md:px-6 md:py-12">
        <section className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="brand-gradient relative overflow-hidden px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10" />
            <div className="relative flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-white/80 shadow-md">
                {invitation.avatar_url && (
                  <AvatarImage src={invitation.avatar_url} alt={invitation.display_name} />
                )}
                <AvatarFallback className="bg-white text-3xl font-semibold text-primary">
                  {invitation.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="mt-6 text-sm text-white/80">Invitación personal</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {invitation.display_name} te invita
              </h1>
              <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">
                Únete a Círculo Market y conecta con {invitation.display_name} automáticamente.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex gap-3 sm:block sm:text-center">
                <Users className="h-5 w-5 shrink-0 text-primary sm:mx-auto sm:mb-2" />
                <p className="text-sm font-medium">Conecta con amigos</p>
              </div>
              <div className="flex gap-3 sm:block sm:text-center">
                <ShoppingBag className="h-5 w-5 shrink-0 text-primary sm:mx-auto sm:mb-2" />
                <p className="text-sm font-medium">Compra y regala</p>
              </div>
              <div className="flex gap-3 sm:block sm:text-center">
                <LockKeyhole className="h-5 w-5 shrink-0 text-primary sm:mx-auto sm:mb-2" />
                <p className="text-sm font-medium">Comparte en privado</p>
              </div>
            </div>

            <div className="border-t pt-6 text-center">
              {isOwnInvite ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" />
                    Esta es tu invitación
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/friends">Volver a mis amigos</Link>
                  </Button>
                </div>
              ) : currentUserId ? (
                <ClaimInviteButton token={token} inviterName={invitation.display_name} />
              ) : (
                <div className="space-y-3">
                  <Button size="lg" className="w-full sm:w-auto" asChild>
                    <Link href={`/signup?invite=${encodeURIComponent(token)}`}>
                      Crear cuenta y ser amigos
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    ¿Ya tienes cuenta?{' '}
                    <Link href={`/login?next=${encodedNext}`} className="font-medium text-primary hover:underline">
                      Inicia sesión
                    </Link>
                  </p>
                </div>
              )}
            </div>

            <p className="rounded-lg bg-muted px-4 py-3 text-center text-xs text-muted-foreground">
              Al crear tu perfil entrarás directamente en Círculo Market y la amistad quedará activada.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
