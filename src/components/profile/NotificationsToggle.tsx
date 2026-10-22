'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getPushPermissionStatus,
  hasActivePushSubscription,
  requestPermissionAndSubscribe,
  unsubscribeFromPush,
} from '@/lib/push-notifications';

export default function NotificationsToggle() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('unsubscribed');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const permission = getPushPermissionStatus();
    if (permission === 'unsupported') { setStatus('unsupported'); return; }
    if (permission === 'denied') { setStatus('denied'); return; }

    hasActivePushSubscription()
      .then((active) => setStatus(active ? 'subscribed' : 'unsubscribed'))
      .catch(() => setStatus('unsubscribed'));
  }, []);

  if (status === 'loading') return null;
  if (status === 'unsupported') return (
    <p className="text-sm text-muted-foreground">
      Este navegador no admite notificaciones push.
    </p>
  );

  if (status === 'denied') return (
    <p className="text-sm text-muted-foreground">
      Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador o del dispositivo.
    </p>
  );

  async function handleToggle() {
    setBusy(true);
    if (status === 'subscribed') {
      const ok = await unsubscribeFromPush();
      setBusy(false);
      if (ok) { setStatus('unsubscribed'); toast.success('Notificaciones desactivadas.'); }
      else toast.error('No se pudieron desactivar las notificaciones.');
    } else {
      const result = await requestPermissionAndSubscribe();
      setBusy(false);
      if (result.ok) { setStatus('subscribed'); toast.success('Notificaciones activadas.'); }
      else toast.error(`No se pudieron activar: ${result.reason}`);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {status === 'subscribed'
          ? <Bell className="h-4 w-4 text-primary" />
          : <BellOff className="h-4 w-4 text-muted-foreground" />
        }
        <div>
          <p className="text-sm font-medium">Notificaciones</p>
          <p className="text-xs text-muted-foreground">
            {status === 'subscribed' ? 'Recibirás notificaciones en este dispositivo.' : 'No recibirás notificaciones en este dispositivo.'}
          </p>
        </div>
      </div>
      <Button
        variant={status === 'subscribed' ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={busy}
        className="shrink-0"
      >
        {busy ? '…' : status === 'subscribed' ? 'Desactivar' : 'Activar'}
      </Button>
    </div>
  );
}
