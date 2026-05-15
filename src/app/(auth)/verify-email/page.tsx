'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { insforge, SESSION_COOKIE } from '@/lib/insforge';
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
        toast.error(error?.message ?? 'Invalid or expired code.');
        return;
      }

      document.cookie = `${SESSION_COOKIE}=${data.accessToken}; path=/; max-age=2592000; SameSite=Lax`;

      const displayName =
        (data.user.profile && typeof data.user.profile.name === 'string' && data.user.profile.name) ||
        email.split('@')[0];

      const { error: insertError } = await insforge.database
        .from('profiles')
        .insert({ id: data.user.id, display_name: displayName });

      // Ignore duplicate-key — a profile may already exist from an earlier attempt.
      if (insertError && !/duplicate|already exists|conflict/i.test(insertError.message ?? '')) {
        toast.error('Verified, but profile setup failed. Contact support.');
        return;
      }

      window.location.href = '/pending';
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!email) {
      toast.error('Enter your email first.');
      return;
    }
    setBusy(true);
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'Could not resend code.');
      return;
    }
    toast.success('Code sent — check your email.');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we sent you.
        </p>
      </div>

      <form onSubmit={onVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="otp">Verification code</Label>
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
          {busy ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          className="self-start text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          onClick={onResend}
          disabled={busy}
        >
          Resend code
        </button>
        <Link
          href="/login"
          className="self-start text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
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
