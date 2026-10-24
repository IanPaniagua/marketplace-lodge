'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { setSessionCookies } from '@/lib/session-client';
import { LoginSchema, type LoginInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [newPw, setNewPw] = useState('');
  const [step, setStep] = useState<'login' | 'code' | 'newpw'>('login');
  const [busy, setBusy] = useState(false);

  const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(values: LoginInput) {
    setBusy(true);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error || !data?.accessToken) {
        toast.error(error?.message ?? 'Correo o contraseña incorrectos.');
        return;
      }

      const ok = await setSessionCookies({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      if (!ok) {
        toast.error('No se pudo guardar la sesión. Inténtalo de nuevo.');
        return;
      }
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const nextPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/friends';
      window.location.href = nextPath;
    } catch (e) {
      console.error('[login] unexpected error', e);
      toast.error('Algo ha salido mal. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  // ── Forgot: step 2 — verify code ────────────────────────────────────────
  async function verifyCode() {
    setBusy(true);
    const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email: forgotEmail, code: forgotCode });
    setBusy(false);
    if (error || !data?.token) { toast.error('El código no es válido o ha caducado.'); return; }
    setForgotToken(data.token);
    setStep('newpw');
  }

  // ── Forgot: step 3 — set new password ───────────────────────────────────
  async function doReset() {
    setBusy(true);
    const { error } = await insforge.auth.resetPassword({ newPassword: newPw, otp: forgotToken });
    setBusy(false);
    if (error) { toast.error('No se pudo restablecer la contraseña.'); return; }
    toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
    setStep('login');
  }

  if (step === 'code') return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Introduce el código</h1>
        <p className="text-sm text-muted-foreground">Te hemos enviado un código de 6 dígitos por correo.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Código</Label>
          <Input inputMode="numeric" maxLength={6} placeholder="123456" autoComplete="one-time-code" className="h-11 text-center text-lg tracking-widest md:h-10" value={forgotCode} onChange={e => setForgotCode(e.target.value)} />
        </div>
        <Button size="lg" className="w-full" disabled={busy || forgotCode.length < 6} onClick={verifyCode}>{busy ? 'Comprobando…' : 'Continuar'}</Button>
        <button type="button" className="block text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setStep('login')}>Volver a iniciar sesión</button>
      </div>
    </div>
  );

  if (step === 'newpw') return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">Debe tener al menos 8 caracteres.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nueva contraseña</Label>
          <Input type="password" autoComplete="new-password" className="h-11 md:h-10" value={newPw} onChange={e => setNewPw(e.target.value)} />
        </div>
        <Button size="lg" className="w-full" disabled={busy || newPw.length < 8} onClick={doReset}>{busy ? 'Guardando…' : 'Guardar contraseña'}</Button>
      </div>
    </div>
  );

  // ── Main login form ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Te damos la bienvenida de nuevo.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="you@example.com" className="h-11 md:h-10" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setForgotEmail(form.getValues('email') ?? '');
                setStep('code');
                const email = form.getValues('email');
                if (email) {
                  insforge.auth.sendResetPasswordEmail({ email });
                  toast.success('Código enviado. Revisa tu correo.');
                } else {
                  toast.error('Introduce primero tu correo y vuelve a pulsar el enlace.');
                  setStep('login');
                }
              }}
            >
              ¿Has olvidado tu contraseña?
            </button>
          </div>
          <Input id="password" type="password" placeholder="Tu contraseña" className="h-11 md:h-10" {...form.register('password')} />
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={busy || form.formState.isSubmitting}>
          {busy || form.formState.isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{' '}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Crear una</Link>
      </p>
    </div>
  );
}
