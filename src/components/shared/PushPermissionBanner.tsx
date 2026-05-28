'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getPushPermissionStatus,
  ensurePushSubscription,
  requestPermissionAndSubscribe,
} from '@/lib/push-notifications';

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export default function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const status = getPushPermissionStatus();
    if (status === 'unsupported' || status === 'denied') return;

    if (status === 'granted') {
      void ensurePushSubscription();
      return;
    }

    if (isIos() && !isStandalone()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  async function handleEnable() {
    setSubscribing(true);
    const result = await requestPermissionAndSubscribe();
    setSubscribing(false);
    if (result.ok) {
      setVisible(false);
    } else {
      toast.error(`Could not enable: ${result.reason}`);
      setVisible(false);
    }
  }

  return (
    <div className="border-b bg-muted/60 px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3 md:max-w-4xl">
        <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-sm text-foreground">
          Get notified about new items and messages.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => setVisible(false)}
            disabled={subscribing}
          >
            Not now
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleEnable}
            disabled={subscribing}
          >
            {subscribing ? 'Enabling…' : 'Enable'}
          </Button>
        </div>
      </div>
    </div>
  );
}
