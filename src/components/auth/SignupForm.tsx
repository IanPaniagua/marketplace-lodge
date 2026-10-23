'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { claimFriendInvite } from '@/app/invite/actions';
import { insforge } from '@/lib/insforge';
import { setSessionCookies } from '@/lib/session-client';
import { SignupSchema, type SignupInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  inviteToken?: string;
}

export default function SignupForm({ inviteToken }: Props) {
  const router = useRouter();
  const signupForm = useForm<SignupInput>({ resolver: zodResolver(SignupSchema) });

  async function onSignup(values: SignupInput) {
    const { data, error } = await insforge.auth.signUp({
      email: values.email,
      password: values.password,
      name: values.display_name,
    });

    if (error) {
      if (error.error === 'ALREADY_EXISTS' || error.statusCode === 409) {
        toast.error('Ya existe una cuenta con este correo. Inicia sesión para aceptar la invitación.');
        const next = inviteToken ? `/invite/${inviteToken}` : '/';
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      toast.error(error.message ?? 'No se pudo completar el registro. Inténtalo de nuevo.');
      return;
    }

    if (data?.accessToken && data.user) {
      await insertProfileAndRedirect(
        data.user.id,
        data.accessToken,
        data.refreshToken,
        values.display_name,
      );
      return;
    }

    toast.error('La cuenta se creó sin una sesión válida. Inicia sesión para continuar.');
    router.push('/login');
  }

  async function insertProfileAndRedirect(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    displayName: string,
  ) {
    const ok = await setSessionCookies({ accessToken, refreshToken });
    if (!ok) {
      toast.error('No se pudo guardar la sesión. Inténtalo de nuevo.');
      return;
    }

    const { error: profileError } = await insforge.database
      .from('profiles')
      .insert([{ id: userId, display_name: displayName }]);

    if (profileError) {
      toast.error('La cuenta se ha creado, pero no se pudo configurar el perfil. Contacta con soporte.');
      return;
    }

    let invitationClaimed = false;
    if (inviteToken) {
      const claim = await claimFriendInvite(inviteToken);
      invitationClaimed = !claim.error;
      if (claim.error) {
        toast.warning('Tu cuenta se ha creado, pero la invitación no se pudo activar.');
      }
    }

    fetch('/api/notify/new-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {});

    window.location.href = invitationClaimed ? '/pending?invited=1' : '/pending';
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Crear una cuenta</h1>
        <p className="text-sm text-muted-foreground">
          {inviteToken
            ? 'Regístrate para aceptar la invitación y conectar automáticamente.'
            : 'Solo para residentes de Lodge.'}
        </p>
      </div>

      <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Nombre visible</Label>
          <Input
            id="display_name"
            placeholder="Tu nombre"
            className="h-11 md:h-10"
            {...signupForm.register('display_name')}
          />
          {signupForm.formState.errors.display_name && (
            <p className="text-xs text-destructive">
              {signupForm.formState.errors.display_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-11 md:h-10"
            {...signupForm.register('email')}
          />
          {signupForm.formState.errors.email && (
            <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Al menos 8 caracteres"
            className="h-11 md:h-10"
            {...signupForm.register('password')}
          />
          {signupForm.formState.errors.password && (
            <p className="text-xs text-destructive">
              {signupForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
              {...signupForm.register('accept_privacy')}
            />
            <span className="text-muted-foreground">
              He leído y acepto la{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener"
                className="text-foreground underline underline-offset-4"
              >
                Política de privacidad
              </Link>
              .
            </span>
          </label>
          {signupForm.formState.errors.accept_privacy && (
            <p className="text-xs text-destructive">
              {signupForm.formState.errors.accept_privacy.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={signupForm.formState.isSubmitting}
        >
          {signupForm.formState.isSubmitting
            ? 'Creando cuenta…'
            : inviteToken
              ? 'Crear cuenta y aceptar invitación'
              : 'Crear cuenta'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href={inviteToken ? `/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'}
          className="text-foreground underline-offset-4 hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
