'use client';

import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { insforge } from '@/lib/insforge';
import { deleteMyAccount } from '@/app/(app)/profile/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
  email: string;
}

type PasswordStep = 'idle' | 'code-sent' | 'set-password';

const newPasswordSchema = z.string().min(8, 'At least 8 characters');

export default function SettingsForm({ email }: Props) {
  const [pwStep, setPwStep] = useState<PasswordStep>('idle');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const { error } = await insforge.auth.sendResetPasswordEmail({ email });
      if (error) {
        toast.error('Failed to send code. Try again.');
        return;
      }
      setPwStep('code-sent');
      toast.success('Check your email for a 6-digit code.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({
        email,
        code,
      });
      if (error || !data?.token) {
        toast.error('Invalid or expired code.');
        return;
      }
      setResetToken(data.token);
      setPwStep('set-password');
    } finally {
      setBusy(false);
    }
  }

  async function setNewPw() {
    const result = newPasswordSchema.safeParse(newPassword);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Invalid password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword,
        otp: resetToken,
      });
      if (error) {
        toast.error('Failed to update password.');
        return;
      }
      toast.success('Password updated.');
      setPwStep('idle');
      setCode('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== 'delete') return;
    setIsDeleting(true);
    await deleteMyAccount();
  }

  return (
    <div className="space-y-10">
      {/* Change password */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Change password</h2>

        {pwStep === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We will send a one-time code to{' '}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <Button
              onClick={sendCode}
              disabled={busy}
              className="w-full md:w-auto"
            >
              {busy ? 'Sending…' : 'Send code'}
            </Button>
          </div>
        )}

        {pwStep === 'code-sent' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code from email</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                maxLength={6}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11 md:h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyCode} disabled={busy} className="w-full md:w-auto">
                {busy ? 'Verifying…' : 'Verify code'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPwStep('idle')}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {pwStep === 'set-password' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newpw">New password</Label>
              <Input
                id="newpw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11 md:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmpw">Confirm password</Label>
              <Input
                id="confirmpw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11 md:h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={setNewPw}
                disabled={busy}
                className="w-full md:w-auto"
              >
                {busy ? 'Saving…' : 'Update password'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPwStep('idle')}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Deleting your account hides your profile and listings permanently. This
          cannot be undone.
        </p>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full md:w-auto">
              Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Your profile, listings, and chats will be hidden. Type{' '}
                <strong>delete</strong> to confirm.
              </DialogDescription>
            </DialogHeader>

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "delete" to confirm'
              className="h-11 md:h-10"
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== 'delete' || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
