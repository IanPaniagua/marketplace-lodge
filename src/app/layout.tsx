import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorkerRegistration from '@/components/shared/ServiceWorkerRegistration';
import './globals.css';

export const metadata: Metadata = {
  title: 'Círculo Market',
  description: 'Tu catálogo personal para vender entre amigos o compartir mediante enlace.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Círculo Market',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
