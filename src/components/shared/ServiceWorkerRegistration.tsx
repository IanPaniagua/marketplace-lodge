'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ServiceWorkerRegistration() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    // Register service worker in production only
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failure is non-fatal
      });
    }

    // Detect iOS standalone check
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone;
    if (ios && !standalone) {
      const dismissed = sessionStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setIsIos(true);
        setShowIosBanner(true);
      }
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem('install-dismissed');
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setShowBanner(false);
  };

  const dismissAndroid = () => {
    sessionStorage.setItem('install-dismissed', '1');
    setShowBanner(false);
  };

  const dismissIos = () => {
    sessionStorage.setItem('ios-install-dismissed', '1');
    setShowIosBanner(false);
  };

  if (showBanner && !isIos) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border bg-background p-4 shadow-lg">
        <button
          onClick={dismissAndroid}
          className="absolute right-3 top-3 text-muted-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-3 text-sm font-medium">Instala Lodge Market en tu dispositivo</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Añádela a tu pantalla de inicio para disfrutar de la mejor experiencia.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleInstall} className="flex-1">
            Instalar
          </Button>
          <Button size="sm" variant="outline" onClick={dismissAndroid}>
            Ahora no
          </Button>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border bg-background p-4 shadow-lg">
        <button
          onClick={dismissIos}
          className="absolute right-3 top-3 text-muted-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-2 text-sm font-medium">Instala Lodge Market en iOS</p>
        <p className="text-xs text-muted-foreground">
          Pulsa <strong>Compartir</strong> en Safari y elige{' '}
          <strong>Añadir a pantalla de inicio</strong>.
        </p>
      </div>
    );
  }

  return null;
}
