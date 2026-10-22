'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { setSessionCookies } from '@/lib/session-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function VerifyEmailInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || otp.length !== 6) return;
    setBusy(true);
    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (error || !data?.accessToken || !data.user) {
        toast.error(error?.message ?? 'El código no es válido o ha caducado.');
        return;
      }

      const sessionOk = await setSessionCookies({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      if (!sessionOk) {
        toast.error('No se pudo guardar la sesión. Inténtalo de nuevo.');
        return;
      }

      const displayName =
        (data.user.profile && typeof data.user.profile.name === 'string' && data.user.profile.name) ||
        email.split('@')[0];

      const { error: insertError } = await insforge.database
        .from('profiles')
        .insert({ id: data.user.id, display_name: displayName });

      // Ignore duplicate-key — a profile may already exist from an earlier attempt.
      if (insertError && !/duplicate|already exists|conflict/i.test(insertError.message ?? '')) {
        toast.error('Correo verificado, pero no se pudo configurar el perfil. Contacta con soporte.');
        return;
      }

      window.location.href = '/pending';
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!email) {
      toast.error('Introduce primero tu correo.');
      return;
    }
    setBusy(true);
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'No se pudo reenviar el código.');
      return;
    }
    toast.success('Código enviado. Revisa tu correo.');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verifica tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Introduce el código de 6 dígitos que te hemos enviado.
        </p>
      </div>

      <form onSubmit={onVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 md:h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp">Código de verificación</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 text-center text-lg tracking-widest md:h-10"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={busy || otp.length < 6 || !email}
        >
          {busy ? 'Verificando…' : 'Verificar correo'}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          className="self-start text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          onClick={onResend}
          disabled={busy}
        >
          Reenviar código
        </button>
        <Link
          href="/login"
          className="self-start text-muted-foreground underline-offset-4 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
