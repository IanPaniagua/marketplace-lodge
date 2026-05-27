'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { setSessionCookies } from '@/lib/session-client';
import { SignupSchema, VerifyEmailSchema, type SignupInput, type VerifyEmailInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [pendingEmail, setPendingEmail] = useState('');

  const signupForm = useForm<SignupInput>({ resolver: zodResolver(SignupSchema) });
  const verifyForm = useForm<VerifyEmailInput>({ resolver: zodResolver(VerifyEmailSchema) });

  async function onSignup(values: SignupInput) {
    const { data, error } = await insforge.auth.signUp({
      email: values.email,
      password: values.password,
      name: values.display_name,
    });

    if (error) {
      // Existing unverified account — send a new code and route to /verify-email.
      if (error.error === 'ALREADY_EXISTS' || error.statusCode === 409) {
        await insforge.auth.resendVerificationEmail({ email: values.email });
        toast.success('You already started signing up. We sent you a new code.');
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      toast.error(error.message ?? 'Sign up failed. Please try again.');
      return;
    }

    if (data?.requireEmailVerification) {
      setPendingEmail(values.email);
      setStep('verify');
      toast.success('Check your email for a 6-digit verification code.');
      return;
    }

    // Email verification not required — insert profile and continue
    if (data?.accessToken && data.user) {
      await insertProfileAndRedirect(data.user.id, data.accessToken, data.refreshToken, values.display_name);
    }
  }

  async function onVerify(values: VerifyEmailInput) {
    const { data, error } = await insforge.auth.verifyEmail({
      email: pendingEmail,
      otp: values.otp,
    });

    if (error || !data?.accessToken || !data.user) {
      toast.error(error?.message ?? 'Invalid code. Please try again.');
      return;
    }

    const signupValues = signupForm.getValues();
    await insertProfileAndRedirect(data.user.id, data.accessToken, data.refreshToken, signupValues.display_name);
  }

  async function insertProfileAndRedirect(userId: string, accessToken: string, refreshToken: string | undefined, displayName: string) {
    // Persist session via same-origin HttpOnly cookies (set by Route Handler).
    const ok = await setSessionCookies({ accessToken, refreshToken });
    if (!ok) {
      toast.error('Could not persist your session. Please try again.');
      return;
    }

    const { error: profileError } = await insforge.database
      .from('profiles')
      .insert({ id: userId, display_name: displayName });

    if (profileError) {
      toast.error('Account created but profile setup failed. Please contact support.');
      return;
    }

    // Best-effort admin push — don't block navigation on failure
    fetch('/api/notify/new-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {});

    window.location.href = '/pending';
  }

  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit verification code to your email address.
          </p>
        </div>

        <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Controller
              control={verifyForm.control}
              name="otp"
              defaultValue=""
              render={({ field }) => (
                <Input
                  {...field}
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
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                  className="h-11 text-center text-lg tracking-widest md:h-10"
                />
              )}
            />
            {verifyForm.formState.errors.otp && (
              <p className="text-xs text-destructive">{verifyForm.formState.errors.otp.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={verifyForm.formState.isSubmitting}
          >
            {verifyForm.formState.isSubmitting ? 'Verifying…' : 'Verify email'}
          </Button>
        </form>

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={async () => {
            await insforge.auth.resendVerificationEmail({ email: pendingEmail });
            toast.success('Code resent.');
          }}
        >
          Resend code
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">Lodge residents only.</p>
      </div>

      <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            placeholder="Your name"
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
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
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
              I have read and accept the{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener"
                className="text-foreground underline underline-offset-4"
              >
                Privacy Policy
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
          {signupForm.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
