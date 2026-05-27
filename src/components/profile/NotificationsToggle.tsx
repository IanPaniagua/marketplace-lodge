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
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const permission = getPushPermissionStatus();
    if (permission === 'unsupported') { setStatus('unsupported'); return; }
    if (permission === 'denied') { setStatus('denied'); return; }

    hasActivePushSubscription().then((active) => {
      setStatus(active ? 'subscribed' : 'unsubscribed');
    });
  }, []);

  if (status === 'loading') return null;
  if (status === 'unsupported') return (
    <p className="text-sm text-muted-foreground">
      Push notifications are not supported in this browser.
    </p>
  );

  if (status === 'denied') return (
    <p className="text-sm text-muted-foreground">
      Notifications are blocked. Enable them in your browser or device settings to receive alerts.
    </p>
  );

  async function handleToggle() {
    setBusy(true);
    if (status === 'subscribed') {
      const ok = await unsubscribeFromPush();
      setBusy(false);
      if (ok) { setStatus('unsubscribed'); toast.success('Notifications disabled.'); }
      else toast.error('Could not disable notifications.');
    } else {
      const ok = await requestPermissionAndSubscribe();
      setBusy(false);
      if (ok) { setStatus('subscribed'); toast.success('Notifications enabled.'); }
      else toast.error('Could not enable notifications. Check your browser settings.');
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
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {status === 'subscribed' ? 'You will receive push notifications on this device.' : 'You will not receive push notifications on this device.'}
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
        {busy ? '…' : status === 'subscribed' ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}
