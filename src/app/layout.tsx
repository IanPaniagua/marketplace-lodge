import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorkerRegistration from '@/components/shared/ServiceWorkerRegistration';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lodge Market',
  description: 'Private marketplace for lodge residents.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lodge Market',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#8B1A1A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
