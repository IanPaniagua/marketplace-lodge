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

const newPasswordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');

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
        toast.error('No se pudo enviar el código. Inténtalo de nuevo.');
        return;
      }
      setPwStep('code-sent');
      toast.success('Revisa tu correo: te hemos enviado un código de 6 dígitos.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      toast.error('Introduce el código de 6 dígitos que recibiste por correo.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({
        email,
        code,
      });
      if (error || !data?.token) {
        toast.error('El código no es válido o ha caducado.');
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
      toast.error(result.error.issues[0]?.message ?? 'Contraseña no válida');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword,
        otp: resetToken,
      });
      if (error) {
        toast.error('No se pudo actualizar la contraseña.');
        return;
      }
      toast.success('Contraseña actualizada.');
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
    if (confirmText !== 'eliminar') return;
    setIsDeleting(true);
    await deleteMyAccount();
  }

  return (
    <div className="space-y-10">
      {/* Change password */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Cambiar contraseña</h2>

        {pwStep === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enviaremos un código de un solo uso a{' '}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <Button
              onClick={sendCode}
              disabled={busy}
              className="w-full md:w-auto"
            >
              {busy ? 'Enviando…' : 'Enviar código'}
            </Button>
          </div>
        )}

        {pwStep === 'code-sent' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código del correo</Label>
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
                {busy ? 'Verificando…' : 'Verificar código'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPwStep('idle')}
                disabled={busy}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {pwStep === 'set-password' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newpw">Nueva contraseña</Label>
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
              <Label htmlFor="confirmpw">Confirmar contraseña</Label>
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
                {busy ? 'Guardando…' : 'Actualizar contraseña'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPwStep('idle')}
                disabled={busy}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Zona de riesgo</h2>
        <p className="text-sm text-muted-foreground">
          Eliminar tu cuenta ocultará de forma permanente tu perfil y tus anuncios.
          Esta acción no se puede deshacer.
        </p>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full md:w-auto">
              Eliminar mi cuenta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
              <DialogDescription>
                Tu perfil, tus anuncios y tus conversaciones se ocultarán. Escribe{' '}
                <strong>eliminar</strong> para confirmar.
              </DialogDescription>
            </DialogHeader>

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Escribe "eliminar" para confirmar'
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
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== 'eliminar' || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar cuenta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
