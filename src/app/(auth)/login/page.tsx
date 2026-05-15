'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { insforge, SESSION_COOKIE } from '@/lib/insforge';
import { LoginSchema, type LoginInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [forgotSent, setForgotSent] = useState(false);
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

      // Stranded unverified accounts: route to /verify-email so they can recover.
      const unverifiedFromError =
        error?.error === 'EMAIL_NOT_VERIFIED' ||
        /not verified|verify.*email/i.test(error?.message ?? '');
      const unverifiedFromData = data?.user && data.user.emailVerified === false;

      if (unverifiedFromError || unverifiedFromData) {
        await insforge.auth.resendVerificationEmail({ email: values.email });
        toast.success('Verify your email to continue. We sent you a new code.');
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }

      if (error || !data?.accessToken) {
        toast.error(error?.message ?? 'Wrong email or password.');
        return;
      }

      document.cookie = `${SESSION_COOKIE}=${data.accessToken}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.href = '/';
    } catch (e) {
      console.error('[login] unexpected error', e);
      toast.error('Something went wrong. Check the console.');
    } finally {
      setBusy(false);
    }
  }

  // ── Forgot: step 1 — send code ───────────────────────────────────────────
  async function sendForgot() {
    setBusy(true);
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: forgotEmail });
    setBusy(false);
    if (error) { toast.error('Could not send reset email.'); return; }
    toast.success('Code sent — check your email.');
    setStep('code');
  }

  // ── Forgot: step 2 — verify code ────────────────────────────────────────
  async function verifyCode() {
    setBusy(true);
    const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email: forgotEmail, code: forgotCode });
    setBusy(false);
    if (error || !data?.token) { toast.error('Invalid or expired code.'); return; }
    setForgotToken(data.token);
    setStep('newpw');
  }

  // ── Forgot: step 3 — set new password ───────────────────────────────────
  async function doReset() {
    setBusy(true);
    const { error } = await insforge.auth.resetPassword({ newPassword: newPw, otp: forgotToken });
    setBusy(false);
    if (error) { toast.error('Could not reset password.'); return; }
    toast.success('Password updated — sign in now.');
    setStep('login');
  }

  if (step === 'code') return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Enter reset code</h1>
        <p className="text-sm text-muted-foreground">We sent a 6-digit code to your email.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Code</Label>
          <Input inputMode="numeric" maxLength={6} placeholder="123456" autoComplete="one-time-code" className="h-11 text-center text-lg tracking-widest md:h-10" value={forgotCode} onChange={e => setForgotCode(e.target.value)} />
        </div>
        <Button size="lg" disabled={busy || forgotCode.length < 6} onClick={verifyCode}>{busy ? 'Checking…' : 'Continue'}</Button>
        <button type="button" className="block text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setStep('login')}>Back to sign in</button>
      </div>
    </div>
  );

  if (step === 'newpw') return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New password</h1>
        <p className="text-sm text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>New password</Label>
          <Input type="password" autoComplete="new-password" className="h-11 md:h-10" value={newPw} onChange={e => setNewPw(e.target.value)} />
        </div>
        <Button size="lg" disabled={busy || newPw.length < 8} onClick={doReset}>{busy ? 'Saving…' : 'Set password'}</Button>
      </div>
    </div>
  );

  // ── Main login form ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Welcome back.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" className="h-11 md:h-10" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setForgotEmail(form.getValues('email') ?? '');
                setForgotSent(false);
                setStep('code');
                const email = form.getValues('email');
                if (email) {
                  insforge.auth.sendResetPasswordEmail({ email });
                  toast.success('Code sent — check your email.');
                } else {
                  toast.error('Enter your email first, then click Forgot password.');
                  setStep('login');
                }
              }}
            >
              Forgot password?
            </button>
          </div>
          <Input id="password" type="password" placeholder="Your password" className="h-11 md:h-10" {...form.register('password')} />
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={busy || form.formState.isSubmitting}>
          {busy || form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        No account yet?{' '}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
